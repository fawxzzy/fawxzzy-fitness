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
  const probeUrl = `${baseUrl}/dev/mobile-regression?scenario=today-default`;
  const response = await fetch(probeUrl, {
    redirect: "manual",
  }).catch((error) => {
    throw new Error(`Local Fitness dev server is not reachable at ${probeUrl}: ${error instanceof Error ? error.message : String(error)}`);
  });

  if (!response || (response.status >= 500 && response.status <= 599)) {
    throw new Error(`Local Fitness dev server responded with ${response?.status ?? "unknown"} at ${probeUrl}.`);
  }
}

function buildCapturePlan(baseUrl) {
  const previewScreens = [
    {
      key: "today",
      label: "Today overview with the Atlas routine",
      scenarioId: "today-default",
      sentinelText: "Atlas Routine",
    },
    {
      key: "session",
      label: "Active workout logging for the Atlas routine",
      scenarioId: "active-workout-session",
      sentinelText: "Atlas Routine",
    },
    {
      key: "routines",
      label: "Current Atlas routine overview",
      scenarioId: "routines-current-view",
      sentinelText: "Atlas Routine",
    },
    {
      key: "routine-list",
      label: "Routine library and split switcher",
      scenarioId: "routines-list-view",
      sentinelText: "Atlas Hypertrophy",
    },
    {
      key: "view-day",
      label: "Atlas routine day plan",
      scenarioId: "view-day",
      sentinelText: "Atlas Routine",
    },
    {
      key: "edit-day",
      label: "Atlas routine day editor",
      scenarioId: "edit-day-default",
      sentinelText: "Lower A",
    },
    {
      key: "add-exercise",
      label: "Exercise picker for routine building",
      scenarioId: "add-exercise-default",
      sentinelText: "Add Exercise to",
    },
    {
      key: "history",
      label: "Session history with progress summaries",
      scenarioId: "history-sessions-detailed",
      sentinelText: "Atlas Routine",
    },
    {
      key: "history-detail",
      label: "Workout log detail with set breakdowns",
      scenarioId: "history-detail-broken-images",
      sentinelText: "Atlas Routine",
    },
    {
      key: "exercise-detail",
      label: "Exercise analytics and movement detail",
      scenarioId: "exercise-detail-strength",
      sentinelText: "Back Squat",
    },
  ];

  return previewScreens.map((screen) => ({
    key: screen.key,
    label: screen.label,
    url: `${baseUrl}/dev/mobile-regression?scenario=${screen.scenarioId}`,
    width: 430,
    height: 932,
    mobile: true,
    initialWaitMs: 900,
    finalWaitMs: 700,
    actions: [
      { type: "waitForText", text: screen.sentinelText, timeoutMs: 10000 },
    ],
    cookies: [],
    expectedPath: "/dev/mobile-regression",
  }));
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
