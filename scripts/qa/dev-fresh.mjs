#!/usr/bin/env node
import fs from "node:fs";
import { promises as fsp } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile, spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import {
  assertExpectedFitnessSupabaseHost,
  assertSafeLocalSupabaseDev,
  parseDotenvFiles,
  resolveEnvFilePath,
  resolveEnvFilePaths,
} from "../env-file.mjs";
import {
  cleanNextOutput,
  isSafeRepoProcess,
  listActiveRecordedDevServers,
  readListeningProcesses,
  readRepoLocalNextProcesses,
  stopProcessTrees,
  waitForPortToClose,
} from "../next-workspace-guard.mjs";

const execFileAsync = promisify(execFile);
const HEALTH_TIMEOUT_MS = 90000;
const ROUTE_POLL_INTERVAL_MS = 750;
const PORT_CLOSE_TIMEOUT_MS = 15000;
const CHUNK_CHECK_LIMIT = 20;
const DEFAULT_QA_PORT = 3002;
const DEFAULT_QA_HOST = "127.0.0.1";
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const atlasRoot = path.resolve(repoRoot, "..", "..");
const runtimeRoot = path.join(atlasRoot, "runtime", "fitness");
const envPaths = resolveEnvFilePaths(repoRoot);
const envPath = resolveEnvFilePath(repoRoot);
let cachedEnv = null;

function loadPinnedEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const fileEnv = parseDotenvFiles(envPaths);
  cachedEnv = {
    ...process.env,
    ...fileEnv,
  };
  assertSafeLocalSupabaseDev({
    env: cachedEnv,
    envFilePath: envPath,
    commandName: "fitness QA workflow",
  });
  assertExpectedFitnessSupabaseHost({
    env: cachedEnv,
    commandName: "fitness QA workflow",
  });

  return cachedEnv;
}

function parseArgs(argv = process.argv.slice(2)) {
  const flags = {};

  for (let index = 0; index < argv.length; index += 1) {
    const entry = argv[index];
    if (!entry.startsWith("--")) {
      continue;
    }

    const body = entry.slice(2);
    const equalsIndex = body.indexOf("=");
    if (equalsIndex >= 0) {
      flags[body.slice(0, equalsIndex)] = body.slice(equalsIndex + 1);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      flags[body] = next;
      index += 1;
      continue;
    }

    flags[body] = true;
  }

  return flags;
}

function formatCommand(command, args) {
  return [command, ...args]
    .map((part) => (/\s/.test(part) ? JSON.stringify(part) : part))
    .join(" ");
}

function toIso(value) {
  return new Date(value).toISOString();
}

function normalizePort(rawValue, fallback = DEFAULT_QA_PORT) {
  const parsed = rawValue ? Number.parseInt(String(rawValue), 10) : fallback;
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Expected a valid TCP port. Received: ${rawValue}`);
  }

  return parsed;
}

function isTruthyFlag(value) {
  if (value === true) {
    return true;
  }

  if (typeof value !== "string") {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

function isInterimNextErrorMarkup(markup) {
  return typeof markup === "string" && markup.toLowerCase().includes("missing required error components");
}

function extractChunkPaths(markup) {
  if (typeof markup !== "string" || markup.length === 0) {
    return [];
  }

  const matches = new Set();
  const regex = /(?:src|href)=["']([^"']*\/_next\/static\/[^"']+)["']/gi;
  let match = regex.exec(markup);

  while (match) {
    matches.add(match[1]);
    match = regex.exec(markup);
  }

  return [...matches];
}

function normalizeRelativeLocation(baseUrl, location) {
  if (typeof location !== "string" || location.length === 0) {
    return null;
  }

  try {
    return new URL(location, baseUrl).toString();
  } catch {
    return location;
  }
}

async function requestRoute(url) {
  const response = await fetch(url, { redirect: "manual" });
  const body = await response.text();

  return {
    url,
    status: response.status,
    ok: response.ok,
    location: normalizeRelativeLocation(url, response.headers.get("location")),
    contentType: response.headers.get("content-type"),
    interimErrorMarkup: isInterimNextErrorMarkup(body),
    chunkPaths: extractChunkPaths(body),
    bodyPreview: body.replace(/\s+/g, " ").trim().slice(0, 240),
  };
}

async function waitForLoginHealth(loginUrl, timeoutMs) {
  const startedAt = Date.now();
  let lastResult = null;
  let lastError = null;

  while ((Date.now() - startedAt) < timeoutMs) {
    try {
      const result = await requestRoute(loginUrl);
      lastResult = result;
      lastError = null;

      if (result.status === 200 && !result.interimErrorMarkup) {
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(ROUTE_POLL_INTERVAL_MS);
  }

  throw new Error(
    `Timed out waiting for ${loginUrl} to return HTTP 200.${lastError ? ` Last error: ${lastError}` : ""}`
    + (lastResult ? ` Last status: ${lastResult.status}.` : ""),
  );
}

async function waitForTodayHealth(todayUrl, timeoutMs) {
  const startedAt = Date.now();
  let lastResult = null;
  let lastError = null;

  while ((Date.now() - startedAt) < timeoutMs) {
    try {
      const result = await requestRoute(todayUrl);
      lastResult = result;
      lastError = null;

      const acceptableRedirect = result.status >= 300 && result.status < 400 && Boolean(result.location);
      const acceptableAuthGate = result.status === 401 || result.status === 403;
      const acceptable200 = result.status === 200 && !result.interimErrorMarkup;
      if (acceptable200 || acceptableRedirect || acceptableAuthGate) {
        return {
          ...result,
          healthy: true,
        };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(ROUTE_POLL_INTERVAL_MS);
  }

  return {
    url: todayUrl,
    status: null,
    ok: false,
    location: null,
    contentType: null,
    interimErrorMarkup: false,
    chunkPaths: [],
    bodyPreview: lastError ?? "",
    healthy: false,
    error: `Timed out waiting for an honest /today response.${lastError ? ` Last error: ${lastError}` : ""}`
      + (lastResult ? ` Last status: ${lastResult.status}.` : ""),
  };
}

async function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function getGitMetadata() {
  function runGit(args) {
    return new Promise((resolve) => {
      execFile("git", ["-C", repoRoot, ...args], { windowsHide: true }, (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }

        resolve(stdout.trim() || null);
      });
    });
  }

  const [ref, sha, dirtyOutput] = await Promise.all([
    runGit(["rev-parse", "--abbrev-ref", "HEAD"]),
    runGit(["rev-parse", "HEAD"]),
    runGit(["status", "--short"]),
  ]);

  return {
    ref,
    sha,
    dirty: Boolean(dirtyOutput),
  };
}

async function writeReceipt(receiptRoot, receipt) {
  await fsp.mkdir(receiptRoot, { recursive: true });
  const timestamp = receipt.startedAt.replace(/[:.]/g, "-");
  const timestampedPath = path.join(receiptRoot, `dev-server-${timestamp}.json`);
  const latestPath = path.join(receiptRoot, "dev-server.latest.json");
  const payload = `${JSON.stringify(receipt, null, 2)}\n`;
  await fsp.writeFile(timestampedPath, payload, "utf8");
  await fsp.writeFile(latestPath, payload, "utf8");
  return {
    latestPath,
    timestampedPath,
  };
}

async function verifyChunks(baseUrl, routeChecks) {
  const candidates = [];
  const seen = new Set();

  for (const routeCheck of routeChecks) {
    for (const chunkPath of routeCheck.chunkPaths ?? []) {
      const normalized = normalizeRelativeLocation(baseUrl, chunkPath);
      if (!normalized || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      candidates.push({
        route: routeCheck.route,
        url: normalized,
      });
    }
  }

  const selected = candidates.slice(0, CHUNK_CHECK_LIMIT);
  const results = [];

  for (const candidate of selected) {
    try {
      const response = await fetch(candidate.url, { redirect: "manual" });
      results.push({
        route: candidate.route,
        url: candidate.url,
        status: response.status,
        ok: response.status >= 200 && response.status < 400,
      });
    } catch (error) {
      results.push({
        route: candidate.route,
        url: candidate.url,
        status: null,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const okCount = results.filter((entry) => entry.ok).length;

  return {
    checked: results,
    okCount,
    totalDiscovered: candidates.length,
    totalChecked: results.length,
    truncated: candidates.length > selected.length,
    healthy: results.length > 0 && okCount === results.length,
  };
}

function summarizePortOwner(processInfo) {
  return {
    pid: processInfo.pid,
    name: processInfo.name,
    executablePath: processInfo.executablePath,
    commandLine: processInfo.commandLine,
    safeToStop: isSafeRepoProcess(processInfo),
  };
}

function enrichPortOwners(owners, recordedDevServers, port, { trustPortFallback = false } = {}) {
  return owners.map((owner) => {
    const exactRecorded = recordedDevServers.find((entry) => (
      entry.port === port
      && Number.isInteger(entry.pid)
      && entry.pid === owner.pid
    ));
    const fallbackRecorded = trustPortFallback
      && !owner.name
      && !owner.executablePath
      && !owner.commandLine
      ? recordedDevServers.find((entry) => entry.port === port && typeof entry.commandLine === "string" && entry.commandLine.length > 0)
      : null;
    const recorded = exactRecorded ?? fallbackRecorded;
    if (!recorded) {
      return summarizePortOwner(owner);
    }

    return summarizePortOwner({
      pid: owner.pid,
      name: owner.name ?? recorded.processName ?? recorded.name ?? "next-dev",
      executablePath: owner.executablePath ?? recorded.executablePath ?? null,
      commandLine: owner.commandLine ?? recorded.commandLine ?? null,
    });
  });
}

async function attemptLaunch({
  port,
  hostname,
  cleanedNext,
}) {
  const healthHost = hostname === "0.0.0.0" || hostname === "::" ? DEFAULT_QA_HOST : hostname;
  const baseUrl = `http://${healthHost}:${port}`;
  const loginUrl = `${baseUrl}/login`;
  const todayUrl = `${baseUrl}/today`;
  const attemptStartedAtMs = Date.now();
  const logDir = runtimeRoot;
  const stdoutLogPath = path.join(logDir, `qa-dev-fresh-${port}.out.log`);
  const stderrLogPath = path.join(logDir, `qa-dev-fresh-${port}.err.log`);
  const childArgs = [path.join(repoRoot, "scripts", "dev.mjs"), "--hostname", hostname, "--port", String(port)];
  const command = formatCommand(process.execPath, childArgs);
  const env = loadPinnedEnv();
  const recordedDevServers = await listActiveRecordedDevServers();
  let existingOwners = enrichPortOwners(
    await readListeningProcesses(port),
    recordedDevServers,
    port,
  );
  const existingRepoDevProcesses = (await readRepoLocalNextProcesses()).map(summarizePortOwner);
  let childPid = null;
  let stoppedProcesses = [];
  let healthStatus = {
    status: "starting",
    loginHealthy: false,
    todayHealthy: false,
    chunkHealthy: false,
  };
  let loginStatus = null;
  let todayStatus = null;
  let chunkChecks = {
    checked: [],
    okCount: 0,
    totalDiscovered: 0,
    totalChecked: 0,
    truncated: false,
    healthy: false,
  };
  let failure = null;

  try {
    let unsafeOwners = existingOwners.filter((entry) => !entry.safeToStop);
    if (
      unsafeOwners.length > 0
      && recordedDevServers.some((entry) => entry.port === port)
      && unsafeOwners.every((entry) => !entry.name && !entry.executablePath && !entry.commandLine)
    ) {
      try {
        const loginProbe = await requestRoute(loginUrl);
        if (loginProbe.status === 200 && !loginProbe.interimErrorMarkup) {
          existingOwners = enrichPortOwners(
            await readListeningProcesses(port),
            recordedDevServers,
            port,
            { trustPortFallback: true },
          );
          unsafeOwners = existingOwners.filter((entry) => !entry.safeToStop);
        }
      } catch {
        // Keep the original unsafe-owner classification if the probe itself fails.
      }
    }

    if (unsafeOwners.length > 0) {
      throw new Error(
        `Port ${port} is already owned by a non-Fitness process: ${unsafeOwners.map((entry) => `${entry.pid}:${entry.name ?? "unknown"}`).join(", ")}.`,
      );
    }

    const staleRepoProcessesByPid = new Map();
    for (const processInfo of [...existingOwners, ...existingRepoDevProcesses]) {
      staleRepoProcessesByPid.set(processInfo.pid, processInfo);
    }
    const staleRepoProcesses = [...staleRepoProcessesByPid.values()];

    if (staleRepoProcesses.length > 0) {
      stoppedProcesses = staleRepoProcesses;
      await stopProcessTrees(staleRepoProcesses);
      await waitForPortToClose(port);
      await delay(500);
    }

    if (cleanedNext) {
      await cleanNextOutput();
    }

    await fsp.mkdir(logDir, { recursive: true });
    const stdoutFd = fs.openSync(stdoutLogPath, "w");
    const stderrFd = fs.openSync(stderrLogPath, "w");

    try {
      const child = spawn(process.execPath, childArgs, {
        cwd: repoRoot,
        env,
        detached: true,
        windowsHide: true,
        stdio: ["ignore", stdoutFd, stderrFd],
      });
      childPid = child.pid ?? null;
      child.on("error", (error) => {
        failure = error instanceof Error ? error.message : String(error);
      });
      child.unref();
    } finally {
      fs.closeSync(stdoutFd);
      fs.closeSync(stderrFd);
    }

    if (!childPid) {
      throw new Error("Dev server failed to start because no child pid was returned.");
    }

    const loginCheck = await waitForLoginHealth(loginUrl, HEALTH_TIMEOUT_MS);
    loginStatus = {
      route: "/login",
      url: loginUrl,
      status: loginCheck.status,
      healthy: true,
      checkedAt: toIso(Date.now()),
    };

    const todayCheck = await waitForTodayHealth(todayUrl, HEALTH_TIMEOUT_MS);
    todayStatus = {
      route: "/today",
      url: todayUrl,
      status: todayCheck.status,
      location: todayCheck.location,
      healthy: Boolean(todayCheck.healthy),
      checkedAt: toIso(Date.now()),
      bodyPreview: todayCheck.bodyPreview,
      error: todayCheck.error ?? null,
    };

    const routeChecks = [
      { route: "/login", chunkPaths: loginCheck.chunkPaths },
    ];
    if (todayCheck.status === 200) {
      routeChecks.push({ route: "/today", chunkPaths: todayCheck.chunkPaths });
    }

    chunkChecks = await verifyChunks(baseUrl, routeChecks);

    healthStatus = {
      status: loginStatus.healthy && todayStatus.healthy && chunkChecks.healthy ? "healthy" : "degraded",
      loginHealthy: loginStatus.healthy,
      todayHealthy: todayStatus.healthy,
      chunkHealthy: chunkChecks.healthy,
    };

    if (healthStatus.status !== "healthy") {
      throw new Error("Fresh dev launcher completed with degraded health.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failure = failure ?? message;
    healthStatus = {
      ...healthStatus,
      status: "failed",
      failure,
    };
  }

  const attemptEndedAtMs = Date.now();
  return {
    startedAt: toIso(attemptStartedAtMs),
    endedAt: toIso(attemptEndedAtMs),
    durationMs: attemptEndedAtMs - attemptStartedAtMs,
    port,
    bindHost: hostname,
    baseUrl,
    pid: childPid,
    healthStatus,
    loginStatus,
    todayStatus,
    chunkChecks,
    cleanedNext,
    command,
    existingPortOwners: existingOwners,
    existingRepoDevProcesses,
    stoppedProcesses,
    logs: {
      stdout: stdoutLogPath,
      stderr: stderrLogPath,
    },
  };
}

async function main() {
  const flags = parseArgs();
  const requestedPort = normalizePort(flags.port, DEFAULT_QA_PORT);
  const portWasExplicit = Object.prototype.hasOwnProperty.call(flags, "port");
  const hostname = typeof flags.hostname === "string" && flags.hostname.trim().length > 0
    ? flags.hostname.trim()
    : DEFAULT_QA_HOST;
  const cleanedNext = isTruthyFlag(flags["clean-next"]);
  const startedAtMs = Date.now();
  const receiptRoot = path.join(atlasRoot, "runtime", "receipts", "dev");
  const git = await getGitMetadata();
  const candidatePorts = portWasExplicit
    ? [requestedPort]
    : [...new Set([requestedPort, 3010])];
  const attempts = [];
  let finalAttempt = null;

  for (const port of candidatePorts) {
    const attempt = await attemptLaunch({
      port,
      hostname,
      cleanedNext,
    });
    attempts.push(attempt);

    if (attempt.healthStatus.status === "healthy") {
      finalAttempt = attempt;
      break;
    }

    const hasMoreCandidates = attempts.length < candidatePorts.length;
    if (hasMoreCandidates) {
      const cleanupTargetsByPid = new Map();
      if (Number.isInteger(attempt.pid)) {
        cleanupTargetsByPid.set(attempt.pid, { pid: attempt.pid });
      }

      const residualOwners = (await readListeningProcesses(port)).map(summarizePortOwner);
      for (const owner of residualOwners) {
        cleanupTargetsByPid.set(owner.pid, owner);
      }

      const cleanupTargets = [...cleanupTargetsByPid.values()];
      if (cleanupTargets.length > 0) {
        await stopProcessTrees(cleanupTargets);
        await waitForPortToClose(port).catch(() => {});
      }
    }
  }

  finalAttempt ??= attempts[attempts.length - 1];
  const endedAtMs = Date.now();
  const fallbackUsed = Boolean(finalAttempt) && finalAttempt.port !== requestedPort;
  const receipt = {
    schemaVersion: 1,
    startedAt: toIso(startedAtMs),
    endedAt: toIso(endedAtMs),
    durationMs: endedAtMs - startedAtMs,
    repoRoot,
    atlasRoot,
    receiptRoot,
    hostname: os.hostname(),
    platform: process.platform,
    nodeVersion: process.version,
    requestedPort,
    fallbackUsed,
    port: finalAttempt?.port ?? requestedPort,
    bindHost: finalAttempt?.bindHost ?? hostname,
    baseUrl: finalAttempt?.baseUrl ?? `http://${hostname}:${requestedPort}`,
    pid: finalAttempt?.pid ?? null,
    healthStatus: finalAttempt?.healthStatus ?? {
      status: "failed",
      failure: "No launch attempts were recorded.",
    },
    loginStatus: finalAttempt?.loginStatus ?? null,
    todayStatus: finalAttempt?.todayStatus ?? null,
    chunkChecks: finalAttempt?.chunkChecks ?? {
      checked: [],
      okCount: 0,
      totalDiscovered: 0,
      totalChecked: 0,
      truncated: false,
      healthy: false,
    },
    cleanedNext,
    command: finalAttempt?.command ?? null,
    git,
    existingPortOwners: finalAttempt?.existingPortOwners ?? [],
    existingRepoDevProcesses: finalAttempt?.existingRepoDevProcesses ?? [],
    stoppedProcesses: finalAttempt?.stoppedProcesses ?? [],
    logs: finalAttempt?.logs ?? null,
    attempts,
  };
  const receiptPaths = await writeReceipt(receiptRoot, receipt);

  if (receipt.healthStatus.status === "healthy") {
    const fallbackNote = fallbackUsed ? ` (requested ${requestedPort}, promoted to ${receipt.port})` : "";
    process.stdout.write(`server started: ${receipt.baseUrl} (pid ${receipt.pid})${fallbackNote}\n`);
    process.stdout.write(`route healthy: /login ${receipt.loginStatus.status}; /today ${receipt.todayStatus.status}${receipt.todayStatus.location ? ` -> ${receipt.todayStatus.location}` : ""}\n`);
    process.stdout.write(`chunks healthy: ${receipt.chunkChecks.okCount}/${receipt.chunkChecks.totalChecked} verified\n`);
    process.stdout.write(`receipt path: ${receiptPaths.latestPath}\n`);
    return;
  }

  process.stderr.write(`Fresh dev launcher failed: ${receipt.healthStatus.failure ?? "unknown error"}\n`);
  process.stderr.write(`receipt path: ${receiptPaths.latestPath}\n`);
  process.exit(1);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
