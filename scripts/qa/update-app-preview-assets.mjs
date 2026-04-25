#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { getOptionalEnv, repoRoot } from "./fitness-qa-config.mjs";

const execFileAsync = promisify(execFile);
const runnerPath = path.resolve(repoRoot, "scripts", "qa", "cdp-edge.mjs");
const outputDir = path.resolve(repoRoot, "public", "app", "previews");
const scriptPath = fileURLToPath(import.meta.url);

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

async function ensureFreshDirectory(directoryPath) {
  await fs.rm(directoryPath, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 100,
  }).catch(() => {});
  await fs.mkdir(directoryPath, { recursive: true });
}

async function ensureServerIsReachable(baseUrl) {
  const response = await fetch(`${baseUrl}/login`, {
    redirect: "manual",
  }).catch((error) => {
    throw new Error(`Local Fitness dev server is not reachable at ${baseUrl}: ${error instanceof Error ? error.message : String(error)}`);
  });

  if (!response || (response.status >= 500 && response.status <= 599)) {
    throw new Error(`Local Fitness dev server responded with ${response?.status ?? "unknown"} at ${baseUrl}/login.`);
  }
}

function buildCapturePlan(baseUrl) {
  return [
    {
      key: "today",
      label: "Today screen with active workout summary",
      url: `${baseUrl}/dev/mobile-regression?screen=today&fixture=default`,
      width: 430,
      height: 932,
      mobile: true,
      finalWaitMs: 700,
      actions: [
        { type: "waitForSelector", selector: '[data-mobile-regression-id="today-default"]', timeoutMs: 10000 },
      ],
      cookies: [],
      expectedPath: "/dev/mobile-regression",
    },
    {
      key: "routines",
      label: "Routine list and split overview",
      url: `${baseUrl}/dev/mobile-regression?screen=routines&fixture=current-view`,
      width: 430,
      height: 932,
      mobile: true,
      finalWaitMs: 700,
      actions: [
        { type: "waitForSelector", selector: '[data-mobile-regression-id="routines-current-view"]', timeoutMs: 10000 },
      ],
      cookies: [],
      expectedPath: "/dev/mobile-regression",
    },
    {
      key: "history",
      label: "Session history overview",
      url: `${baseUrl}/dev/mobile-regression?screen=history-sessions&fixture=compact`,
      width: 430,
      height: 932,
      mobile: true,
      finalWaitMs: 700,
      actions: [
        { type: "waitForSelector", selector: '[data-mobile-regression-id="history-sessions-compact"]', timeoutMs: 10000 },
      ],
      cookies: [],
      expectedPath: "/dev/mobile-regression",
    },
    {
      key: "add-exercise",
      label: "Add exercise flow with configure goal cards",
      url: `${baseUrl}/dev/mobile-regression?screen=add-exercise&fixture=default`,
      width: 430,
      height: 932,
      mobile: true,
      finalWaitMs: 700,
      actions: [
        { type: "waitForSelector", selector: '[data-mobile-regression-id="add-exercise-default"]', timeoutMs: 10000 },
      ],
      cookies: [],
      expectedPath: "/dev/mobile-regression",
    },
  ];
}

async function runCapture(config) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fitness-preview-assets-"));
  const tempConfigPath = path.join(tempDir, `${config.key}.capture.json`);
  const effectiveConfig = {
    ...config,
    outPath: path.join(outputDir, `${config.key}.png`),
  };

  try {
    await fs.writeFile(tempConfigPath, `${JSON.stringify(effectiveConfig, null, 2)}\n`, "utf8");
    await execFileAsync(process.execPath, [runnerPath, tempConfigPath], {
      cwd: repoRoot,
      windowsHide: true,
    });
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    }).catch(() => {});
  }

  return {
    key: config.key,
    label: config.label,
    screenshot: `${config.key}.png`,
    url: config.url,
    expectedPath: config.expectedPath,
  };
}

async function main() {
  const flags = parseArgs();
  const configuredBaseUrl = typeof flags["base-url"] === "string"
    ? String(flags["base-url"])
    : getOptionalEnv("FITNESS_QA_LOCAL_BASE_URL") ?? "http://127.0.0.1:3000";
  const baseUrl = configuredBaseUrl.replace(/\/$/, "");

  await ensureServerIsReachable(baseUrl);
  await ensureFreshDirectory(outputDir);

  const captures = [];
  for (const config of buildCapturePlan(baseUrl)) {
    captures.push(await runCapture(config));
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    helper: scriptPath,
    runner: runnerPath,
    outputDir,
    baseUrl,
    source: "dev-mobile-regression",
    captures,
  };

  await fs.writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
