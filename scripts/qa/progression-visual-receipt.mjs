#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { QA_LLEL_CAPTURE_ROOT, resolveFitnessAppUrl } from "./fitness-auth-state.mjs";
import { getMigrationHistoryDrift } from "../migration/validate-supabase-chain.mjs";

const execFileAsync = promisify(execFile);
const currentFilePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(currentFilePath), "..", "..");
const cdpRunnerPath = path.resolve(repoRoot, "scripts", "qa", "cdp-edge.mjs");
const registerAliasesPath = path.resolve(repoRoot, "scripts", "register-test-aliases.mjs");
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

function toIso(value) {
  return new Date(value).toISOString();
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

async function runNodeCommand(args, { cwd = repoRoot } = {}) {
  const startedAt = Date.now();
  try {
    const result = await execFileAsync(process.execPath, args, {
      cwd,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return {
      ok: true,
      exitCode: 0,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      startedAt: toIso(startedAt),
      endedAt: toIso(Date.now()),
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      exitCode: error?.code ?? 1,
      stdout: error?.stdout ?? "",
      stderr: error?.stderr ?? "",
      startedAt: toIso(startedAt),
      endedAt: toIso(Date.now()),
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runCapture(config) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "fitness-progression-receipt-"));
  const configPath = path.join(tempDir, `${config.key}.json`);
  try {
    await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    const result = await runNodeCommand([cdpRunnerPath, configPath]);
    return {
      key: config.key,
      route: new URL(config.url).pathname + new URL(config.url).search,
      screenshotPath: config.outPath,
      status: result.ok ? "captured" : "blocked",
      reason: result.ok ? null : (result.message ?? (result.stderr.trim() || "Capture failed.")),
      command: `node ${path.relative(repoRoot, cdpRunnerPath)} ${path.basename(configPath)}`,
      stdout: result.stdout.trim() || null,
      stderr: result.stderr.trim() || null,
      durationMs: result.durationMs,
    };
  } finally {
    await fs.rm(tempDir, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 100,
    }).catch(() => {});
  }
}

async function resolveExpectedRedMigrations() {
  const drift = getMigrationHistoryDrift();
  if (!drift.ok) {
    return {
      status: "drift-check-failed",
      classification: "unknown",
      missingRemoteVersions: [],
      remoteStateMutated: false,
      command: drift.command,
      stderr: drift.result.combined.trim() || null,
    };
  }

  const filenames = await fs.readdir(path.join(repoRoot, "supabase", "migrations"));
  const missingRemoteVersions = drift.mismatches.map((mismatch) => {
    const matchedFilename = filenames.find((filename) => filename.startsWith(`${mismatch.local}_`));
    return matchedFilename ?? mismatch.local;
  });

  return {
    status: "expected-red",
    classification: "branch-stack pending migrations",
    missingRemoteVersions,
    remoteStateMutated: false,
    command: drift.command,
    stderr: null,
  };
}

async function main() {
  const flags = parseArgs();
  const baseUrl = String(typeof flags["base-url"] === "string" ? flags["base-url"] : resolveFitnessAppUrl()).replace(/\/$/, "");
  const outputDir = typeof flags["output-dir"] === "string"
    ? path.resolve(String(flags["output-dir"]))
    : path.join(QA_LLEL_CAPTURE_ROOT, "latest");
  const reportPath = path.join(outputDir, "report.json");

  await ensureServerIsReachable(baseUrl);
  await ensureFreshDirectory(outputDir);

  const captures = await Promise.all([
    runCapture({
      key: "today-progression-status",
      url: `${baseUrl}/dev/mobile-regression?scenario=today-progression-status`,
      width: 430,
      height: 932,
      mobile: true,
      finalWaitMs: 650,
      captureBeyondViewport: true,
      outPath: path.join(outputDir, "today-progression-status.png"),
      actions: [
        { type: "waitForText", text: "Promote", timeoutMs: 15000 },
        { type: "waitForText", text: "Progress Status", timeoutMs: 15000 },
        { type: "waitForText", text: "Weight only", timeoutMs: 15000 },
        { type: "waitForText", text: "Top half of range (10+ reps)", timeoutMs: 15000 },
        {
          type: "assertExpression",
          expression: "document.querySelector('[aria-label=\"Progress status\"]') !== null",
          message: "Today seam is missing either the ready-only promote affordance or the Progress Status section.",
        },
      ],
    }),
    runCapture({
      key: "progression-history",
      url: `${baseUrl}/dev/mobile-regression?scenario=history-progression-default`,
      width: 430,
      height: 932,
      mobile: true,
      finalWaitMs: 650,
      captureBeyondViewport: true,
      outPath: path.join(outputDir, "progression-history.png"),
      actions: [
        { type: "waitForText", text: "Progression History", timeoutMs: 15000 },
        { type: "waitForText", text: "Event Ledger", timeoutMs: 15000 },
        { type: "waitForText", text: "Latest change", timeoutMs: 15000 },
        { type: "waitForText", text: "Most active vector", timeoutMs: 15000 },
        { type: "waitForText", text: "Promotion applied", timeoutMs: 15000 },
        {
          type: "assertExpression",
          expression: "Array.from(document.querySelectorAll('button,a,[role=\"button\"]')).every((node) => { const text = (node.textContent || '').trim(); return text !== 'Replay' && text !== 'Revert'; })",
          message: "Progression History must stay read-only and should not expose replay or revert controls.",
        },
      ],
    }),
    runCapture({
      key: "progression-history-filtered",
      url: `${baseUrl}/dev/mobile-regression?scenario=history-progression-filtered`,
      width: 430,
      height: 932,
      mobile: true,
      finalWaitMs: 650,
      captureBeyondViewport: true,
      outPath: path.join(outputDir, "progression-history-filtered.png"),
      actions: [
        { type: "waitForText", text: "Progression History", timeoutMs: 15000 },
        { type: "waitForText", text: "Showing filtered results", timeoutMs: 15000 },
        { type: "waitForText", text: "Promotion applied", timeoutMs: 15000 },
        { type: "waitForText", text: "Clear filters", timeoutMs: 15000 },
        {
          type: "assertExpression",
          expression: "Array.from(document.querySelectorAll('[data-progression-history-row]')).every((node) => node.getAttribute('data-progression-history-event-type') === 'promotion_applied')",
          message: "Filtered progression history should narrow the visible event list to the selected event type.",
        },
      ],
    }),
  ]);

  const exportCoverage = await runNodeCommand([
    "--import",
    pathToFileURL(registerAliasesPath).href,
    "--test",
    "src/lib/account-workout-export.test.ts",
  ]);
  const migrationValidation = await resolveExpectedRedMigrations();

  const report = {
    generatedAt: new Date().toISOString(),
    command: "npm run qa:llel:progression",
    baseUrl,
    outputDir,
    screenshotsProduced: captures.every((capture) => capture.status === "captured"),
    routesChecked: captures.map((capture) => ({
      key: capture.key,
      route: capture.route,
      status: capture.status,
      screenshotPath: capture.status === "captured" ? capture.screenshotPath : null,
      failureReason: capture.reason,
    })),
    exportCoverage: {
      command: "node --import ./scripts/register-test-aliases.mjs --test src/lib/account-workout-export.test.ts",
      status: exportCoverage.ok ? "passed" : "failed",
      exitCode: exportCoverage.exitCode,
      durationMs: exportCoverage.durationMs,
      stdout: exportCoverage.stdout.trim() || null,
      stderr: exportCoverage.stderr.trim() || null,
    },
    migrationValidation,
  };

  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({
    ...report,
    reportPath,
  }, null, 2)}\n`);

  if (captures.some((capture) => capture.status !== "captured") || !exportCoverage.ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFilePath)) {
  main().catch(async (error) => {
    const baseUrl = resolveFitnessAppUrl();
    const outputDir = path.join(QA_LLEL_CAPTURE_ROOT, "latest");
    const reportPath = path.join(outputDir, "report.json");
    const report = {
      generatedAt: new Date().toISOString(),
      command: "npm run qa:llel:progression",
      baseUrl,
      outputDir,
      screenshotsProduced: false,
      routesChecked: [],
      exportCoverage: null,
      migrationValidation: await resolveExpectedRedMigrations(),
      fatalError: error instanceof Error ? error.stack ?? error.message : String(error),
    };

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    process.stderr.write(`${report.fatalError}\n`);
    process.exit(1);
  });
}
