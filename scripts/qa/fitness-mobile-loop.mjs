#!/usr/bin/env node
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import {
  DEFAULT_QA_LAN_HOST,
  devServerErrorLogPath,
  devServerLogPath,
  ensureDirectoryForFile,
  getConfiguredQaPort,
  mobileLoopStatusPath,
  repoRoot,
  resolveMobileLoopUrls,
  sessionArtifactPath,
  tunnelErrorLogPath,
  tunnelLogPath,
} from "./fitness-qa-config.mjs";
import { bootstrapQaSession, resetQaUserData } from "./fitness-qa-user.mjs";

const SERVER_READY_TIMEOUT_MS = 60000;

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

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function readStatus() {
  try {
    return JSON.parse(await fs.readFile(mobileLoopStatusPath, "utf8"));
  } catch {
    return {};
  }
}

async function writeStatus(patch) {
  const previous = await readStatus();
  const next = {
    ...previous,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  ensureDirectoryForFile(mobileLoopStatusPath);
  await fs.writeFile(mobileLoopStatusPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

async function probeServer(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/login`, { redirect: "manual" });
    return Boolean(response && response.status < 500);
  } catch {
    return false;
  }
}

async function waitForServer(baseUrl, timeoutMs = SERVER_READY_TIMEOUT_MS) {
  const startedAt = Date.now();
  while ((Date.now() - startedAt) < timeoutMs) {
    if (await probeServer(baseUrl)) {
      return true;
    }

    await delay(500);
  }

  return false;
}

function startDetachedDevServer({ port }) {
  ensureDirectoryForFile(devServerLogPath);
  const out = fsSync.openSync(devServerLogPath, "a");
  const err = fsSync.openSync(devServerErrorLogPath, "a");
  const child = spawn(
    process.execPath,
    [path.join(repoRoot, "scripts", "dev.mjs"), "--hostname", DEFAULT_QA_LAN_HOST, "--port", String(port)],
    {
      cwd: repoRoot,
      detached: true,
      env: {
        ...process.env,
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", out, err],
      windowsHide: true,
    },
  );

  child.unref();
  return child.pid ?? null;
}

function startDetachedTunnel({ port, localUrl }) {
  ensureDirectoryForFile(tunnelLogPath);
  const out = fsSync.openSync(tunnelLogPath, "a");
  const err = fsSync.openSync(tunnelErrorLogPath, "a");
  const child = spawn(
    process.execPath,
    [path.join(repoRoot, "scripts", "qa", "fitness-tunnel.mjs"), "--port", String(port), "--local-url", localUrl],
    {
      cwd: repoRoot,
      detached: true,
      env: process.env,
      stdio: ["ignore", out, err],
      windowsHide: true,
    },
  );

  child.unref();
  return child.pid ?? null;
}

function qrImageUrl(targetUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(targetUrl)}`;
}

function printSummary({ urls, serverStarted, devServerPid, qaSession, tunnelStarted, tunnelPid, status }) {
  const phoneUrl = urls.primaryLanUrl ?? urls.localUrl;
  const tunnelUrl = status.tunnelUrl ?? urls.tunnelUrl ?? null;
  const lines = [
    "",
    "Fitness mobile QA loop",
    "----------------------",
    `Local:      ${urls.localUrl}`,
    `LAN:        ${urls.primaryLanUrl ?? "No active LAN IPv4 address found"}`,
    `Tunnel:     ${tunnelUrl ?? "Not configured or not started"}`,
    `QA email:   ${qaSession.email}`,
    `Session:    ${sessionArtifactPath}`,
    `Status:     ${mobileLoopStatusPath}`,
    `Dev log:    ${devServerLogPath}`,
    serverStarted ? `Dev PID:    ${devServerPid}` : "Dev PID:    existing server reused",
    tunnelStarted ? `Tunnel PID: ${tunnelPid}` : null,
    "",
    "Phone copy block",
    "----------------",
    phoneUrl,
    tunnelUrl ? tunnelUrl : null,
    "",
    `QR image:   ${qrImageUrl(tunnelUrl ?? phoneUrl)}`,
    "",
  ].filter((line) => line !== null);

  process.stdout.write(`${lines.join("\n")}\n`);
}

async function main() {
  const flags = parseArgs();
  const port = typeof flags.port === "string" ? Number.parseInt(flags.port, 10) : getConfiguredQaPort();
  const urls = resolveMobileLoopUrls({ port });
  const baseUrl = typeof flags["base-url"] === "string" ? String(flags["base-url"]).replace(/\/$/, "") : urls.localUrl;

  let resetResult = null;
  if (flags["no-reset"] !== true) {
    resetResult = await resetQaUserData();
  }

  const qaSession = await bootstrapQaSession();
  const reachableBeforeStart = await probeServer(baseUrl);
  let serverStarted = false;
  let devServerPid = null;

  if (!reachableBeforeStart) {
    if (flags["no-start"] === true) {
      throw new Error(`Local dev server is not reachable at ${baseUrl}. Start it with npm run qa:dev:lan.`);
    }

    devServerPid = startDetachedDevServer({ port });
    serverStarted = true;
  }

  const reachable = await waitForServer(baseUrl);
  if (!reachable) {
    throw new Error(`Local dev server did not become reachable at ${baseUrl}. Check ${devServerErrorLogPath}.`);
  }

  let tunnelStarted = false;
  let tunnelPid = null;
  if (flags.tunnel === true) {
    tunnelPid = startDetachedTunnel({ port, localUrl: urls.localUrl });
    tunnelStarted = true;
    await delay(1500);
  }

  const priorStatus = await readStatus();
  const latestUrls = resolveMobileLoopUrls({
    port,
    tunnelUrl: priorStatus.tunnelUrl ?? urls.tunnelUrl ?? null,
  });
  const status = await writeStatus({
    mode: "mobile",
    baseUrl,
    devServerReachable: true,
    devServerPid,
    devServerStartedAt: serverStarted ? new Date().toISOString() : priorStatus.devServerStartedAt ?? null,
    resetResult,
    qaSession: {
      email: qaSession.email,
      userId: qaSession.userId,
      latestSessionId: qaSession.latestSessionId,
      sessionArtifactPath,
    },
    urls: latestUrls,
  });

  printSummary({
    urls: latestUrls,
    serverStarted,
    devServerPid,
    qaSession,
    tunnelStarted,
    tunnelPid,
    status,
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
