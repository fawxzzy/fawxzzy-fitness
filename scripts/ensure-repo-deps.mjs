#!/usr/bin/env node
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { listActiveRecordedDevServers, readRepoLocalNextProcesses } from "./next-workspace-guard.mjs";

export const DEFAULT_REQUIRED_MARKERS = [
  "node_modules/next/package.json",
  "node_modules/next/dist/bin/next",
  "node_modules/eslint-config-next/package.json",
  "node_modules/eslint/package.json",
  "node_modules/eslint-plugin-react/index.js",
  "node_modules/eslint-plugin-jsx-a11y/lib/index.js",
  "node_modules/jsx-ast-utils/lib/values/expressions/index.js",
  "node_modules/typescript/package.json",
  "node_modules/typescript/lib/tsc.js",
  "node_modules/@supabase/supabase-js/package.json",
  "node_modules/playwright/package.json",
  "node_modules/ajv/lib/refs/json-schema-draft-07.json",
  "node_modules/@alloc/quick-lru/package.json",
];
const DEFAULT_LOCK_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_STALE_LOCK_MS = 30 * 60 * 1000;
const POLL_INTERVAL_MS = 1000;
const DEFAULT_READY_TIMEOUT_MS = 15 * 1000;
const DEFAULT_RECENT_SUCCESS_WINDOW_MS = 60 * 1000;
const DEV_RECEIPT_RELATIVE_PATH = path.join("..", "..", "runtime", "receipts", "dev", "dev-server.latest.json");

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function shouldUseShellForExecutable(executablePath) {
  return process.platform === "win32" && /\.(cmd|bat)$/i.test(executablePath);
}

function markerExists(repoRoot, marker) {
  return fs.existsSync(path.join(repoRoot, marker));
}

function repoDepsReady(repoRoot, requiredMarkers) {
  return requiredMarkers.every((marker) => markerExists(repoRoot, marker));
}

function listMissingMarkers(repoRoot, requiredMarkers) {
  return requiredMarkers.filter((marker) => !markerExists(repoRoot, marker));
}

function normalizePathForCompare(filePath) {
  return path.resolve(filePath).replace(/\\/g, "/").toLowerCase();
}

function processIsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readActiveRepoDevReceipt(repoRoot) {
  const receiptPath = path.resolve(repoRoot, DEV_RECEIPT_RELATIVE_PATH);

  try {
    const receipt = JSON.parse(await fsp.readFile(receiptPath, "utf8"));
    const receiptRepoRoot = typeof receipt?.repoRoot === "string" ? receipt.repoRoot : null;
    const receiptPid = Number.isInteger(receipt?.pid) ? receipt.pid : Number.NaN;

    if (!receiptRepoRoot || normalizePathForCompare(receiptRepoRoot) !== normalizePathForCompare(repoRoot)) {
      return null;
    }

    if (!processIsAlive(receiptPid)) {
      return null;
    }

    return {
      pid: receiptPid,
      receiptPath,
      baseUrl: typeof receipt?.baseUrl === "string" ? receipt.baseUrl : null,
      healthStatus: typeof receipt?.healthStatus?.status === "string" ? receipt.healthStatus.status : null,
    };
  } catch {
    return null;
  }
}

function formatActiveRepoDevServerLabel(server) {
  const pidLabel = Number.isInteger(server?.pid) ? `pid ${server.pid}` : "pid unknown";
  const baseUrlLabel = typeof server?.baseUrl === "string" && server.baseUrl
    ? server.baseUrl
    : Number.isInteger(server?.port)
      ? `http://${server?.hostname || "127.0.0.1"}:${server.port}`
      : null;
  const portLabel = Number.isInteger(server?.port) ? `port ${server.port}` : null;
  return [pidLabel, baseUrlLabel, portLabel].filter(Boolean).join(" @ ");
}

async function readActiveRepoDevServers(repoRoot) {
  const activeServers = await listActiveRecordedDevServers().catch(() => []);
  const filteredRecordedServers = activeServers.filter((server) => server?.repoRoot === repoRoot);
  if (filteredRecordedServers.length > 0) {
    return filteredRecordedServers.map((server) => ({
      pid: Number.isInteger(server?.pid) ? server.pid : null,
      port: Number.isInteger(server?.port) ? server.port : null,
      hostname: typeof server?.hostname === "string" ? server.hostname : null,
      baseUrl: Number.isInteger(server?.port)
        ? `http://${typeof server?.hostname === "string" && server.hostname ? server.hostname : "127.0.0.1"}:${server.port}`
        : null,
      source: "recorded-dev-server",
    }));
  }

  const repoLocalNextProcesses = await readRepoLocalNextProcesses().catch(() => []);
  return repoLocalNextProcesses.map((processInfo) => ({
    pid: Number.isInteger(processInfo?.pid) ? processInfo.pid : null,
    port: null,
    hostname: null,
    baseUrl: null,
    source: "repo-local-next-process",
  }));
}

async function readBootstrapSuccessMetadata(successPath) {
  try {
    return JSON.parse(await fsp.readFile(successPath, "utf8"));
  } catch {
    return null;
  }
}

async function writeBootstrapSuccessMetadata(successPath) {
  await fsp.writeFile(successPath, `${JSON.stringify({
    pid: process.pid,
    hostname: process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? null,
    completedAt: new Date().toISOString(),
  }, null, 2)}\n`, "utf8");
}

async function hasRecentBootstrapSuccess(
  successPath,
  recentWindowMs = DEFAULT_RECENT_SUCCESS_WINDOW_MS,
) {
  const metadata = await readBootstrapSuccessMetadata(successPath);
  const completedAt = typeof metadata?.completedAt === "string" ? Date.parse(metadata.completedAt) : Number.NaN;
  if (!Number.isFinite(completedAt)) {
    return false;
  }

  return (Date.now() - completedAt) < recentWindowMs;
}

async function waitForRepoDepsReady(
  repoRoot,
  requiredMarkers,
  { timeoutMs = DEFAULT_READY_TIMEOUT_MS } = {},
) {
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    if (repoDepsReady(repoRoot, requiredMarkers)) {
      return true;
    }

    await delay(POLL_INTERVAL_MS);
  }

  return repoDepsReady(repoRoot, requiredMarkers);
}

async function readLockMetadata(lockDir) {
  const metadataPath = path.join(lockDir, "owner.json");
  try {
    return JSON.parse(await fsp.readFile(metadataPath, "utf8"));
  } catch {
    return null;
  }
}

async function tryRemoveStaleLock(lockDir, staleAfterMs) {
  const metadata = await readLockMetadata(lockDir);
  const startedAt = typeof metadata?.startedAt === "string" ? Date.parse(metadata.startedAt) : Number.NaN;
  if (!Number.isFinite(startedAt)) {
    return false;
  }

  if ((Date.now() - startedAt) < staleAfterMs) {
    return false;
  }

  await fsp.rm(lockDir, { recursive: true, force: true });
  return true;
}

async function acquireLock(lockDir, { timeoutMs = DEFAULT_LOCK_TIMEOUT_MS, staleAfterMs = DEFAULT_STALE_LOCK_MS } = {}) {
  const startedAt = Date.now();

  while ((Date.now() - startedAt) < timeoutMs) {
    try {
      await fsp.mkdir(lockDir, { recursive: false });
      await fsp.writeFile(path.join(lockDir, "owner.json"), `${JSON.stringify({
        pid: process.pid,
        hostname: process.env.COMPUTERNAME ?? process.env.HOSTNAME ?? null,
        startedAt: new Date().toISOString(),
      }, null, 2)}\n`, "utf8");

      return async () => {
        await fsp.rm(lockDir, { recursive: true, force: true });
      };
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code !== "EEXIST") {
        throw error;
      }

      const removedStaleLock = await tryRemoveStaleLock(lockDir, staleAfterMs);
      if (!removedStaleLock) {
        await delay(POLL_INTERVAL_MS);
      }
    }
  }

  throw new Error(`Timed out waiting for dependency lock: ${lockDir}`);
}

async function runNpmCi(repoRoot) {
  await new Promise((resolve, reject) => {
    const child = spawn(getNpmCommand(), ["ci"], {
      cwd: repoRoot,
      stdio: "inherit",
      windowsHide: true,
      env: process.env,
      shell: shouldUseShellForExecutable(getNpmCommand()),
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`npm ci exited via signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`npm ci exited with code ${code ?? "unknown"}`));
        return;
      }

      resolve();
    });
  });
}

export async function ensureRepoDependencies({
  repoRoot,
  reason = "repo script",
  requiredMarkers = DEFAULT_REQUIRED_MARKERS,
  runtimeDirName = path.join(".playbook", "runtime"),
} = {}) {
  if (!repoRoot) {
    throw new Error("ensureRepoDependencies requires repoRoot.");
  }

  if (repoDepsReady(repoRoot, requiredMarkers)) {
    return { installed: false, reason };
  }

  const lockDir = path.join(repoRoot, runtimeDirName, ".dependency-bootstrap.lock");
  const successPath = path.join(repoRoot, runtimeDirName, ".dependency-bootstrap.success.json");
  await fsp.mkdir(path.dirname(lockDir), { recursive: true });
  const releaseLock = await acquireLock(lockDir);

  try {
    if (await waitForRepoDepsReady(repoRoot, requiredMarkers, { timeoutMs: 5_000 })) {
      return { installed: false, reason };
    }

    if (await hasRecentBootstrapSuccess(successPath)) {
      if (await waitForRepoDepsReady(repoRoot, requiredMarkers, { timeoutMs: DEFAULT_RECENT_SUCCESS_WINDOW_MS })) {
        return { installed: false, reason };
      }
    }

    const activeRepoDevServers = await readActiveRepoDevServers(repoRoot);
    if (activeRepoDevServers.length > 0) {
      const serverSummary = activeRepoDevServers.map(formatActiveRepoDevServerLabel).join(", ");
      throw new Error(
        `Refusing to run npm ci for ${reason} while repo dev server(s) are still alive: ${serverSummary}. ` +
        "Stop or refresh the repo dev servers before bootstrapping dependencies again.",
      );
    }

    const activeRepoDevReceipt = await readActiveRepoDevReceipt(repoRoot);
    if (activeRepoDevReceipt) {
      const baseUrlLabel = activeRepoDevReceipt.baseUrl ? ` at ${activeRepoDevReceipt.baseUrl}` : "";
      const healthLabel = activeRepoDevReceipt.healthStatus ? ` (${activeRepoDevReceipt.healthStatus})` : "";
      throw new Error(
        `Refusing to run npm ci for ${reason} while the repo dev server pid ${activeRepoDevReceipt.pid}${baseUrlLabel}${healthLabel} is still alive. ` +
        "Stop or refresh the dev server before bootstrapping dependencies again.",
      );
    }

    const missingMarkers = listMissingMarkers(repoRoot, requiredMarkers);
    process.stderr.write(
      `[deps] Missing repo dependencies for ${reason}. Running npm ci in ${repoRoot}.\n` +
      `[deps] Missing markers: ${missingMarkers.join(", ")}\n`,
    );
    await runNpmCi(repoRoot);

    if (!await waitForRepoDepsReady(repoRoot, requiredMarkers)) {
      throw new Error(`Dependency bootstrap for ${reason} completed, but required modules are still missing.`);
    }

    await writeBootstrapSuccessMetadata(successPath);

    return { installed: true, reason };
  } finally {
    await releaseLock();
  }
}
