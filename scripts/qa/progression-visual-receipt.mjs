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

export const PROGRESSION_RECEIPT_SCENARIOS = [
  {
    id: "today-progression-status",
    captureKey: "today-progression-status",
    surface: "Today selected-day Progression Status",
    screenshotFilename: "today-progression-status.png",
    notes: [
      "Visual receipt covers the read-only status surface only.",
      "No production deploy or mutation checks are implied by this scenario.",
    ],
    actions: [
      {
        id: "promote-affordance-renders",
        label: "Ready-only Promote affordance renders",
        type: "waitForText",
        text: "Promote",
        timeoutMs: 15000,
      },
      {
        id: "primary-progression-card-renders",
        label: "Primary progression card renders the targeted exercise",
        type: "waitForText",
        text: "Back Squat",
        timeoutMs: 15000,
      },
      {
        id: "next-target-renders",
        label: "Next progression target renders inline on the Today card",
        type: "waitForText",
        text: "230 lbs",
        timeoutMs: 15000,
      },
      {
        id: "companion-card-renders",
        label: "Companion exercise cards remain visible in the captured stack",
        type: "waitForText",
        text: "Walking Lunge",
        timeoutMs: 15000,
      },
      {
        id: "card-surface-keeps-progression-summary",
        label: "Today card keeps the progression summary compact and visible",
        type: "assertExpression",
        expression: "(document.body?.innerText ?? '').includes('Promote') && (document.body?.innerText ?? '').includes('230 lbs') && (document.body?.innerText ?? '').includes('Back Squat')",
        message: "Today seam is missing the inline promote summary for the progression-ready card.",
      },
    ],
  },
  {
    id: "history-progression-default",
    captureKey: "progression-history",
    surface: "History > Progression History",
    screenshotFilename: "progression-history.png",
    notes: [
      "This seam validates the read-only progression ledger route.",
    ],
    actions: [
      {
        id: "history-title-renders",
        label: "Progression History title renders",
        type: "waitForText",
        text: "Progression History",
        timeoutMs: 15000,
      },
      {
        id: "ledger-label-renders",
        label: "Event ledger section renders",
        type: "waitForText",
        text: "Event Ledger",
        timeoutMs: 15000,
      },
      {
        id: "dashboard-card-renders",
        label: "Dashboard cards render deterministic insights",
        type: "waitForText",
        text: "Latest change",
        timeoutMs: 15000,
      },
      {
        id: "monthly-chart-renders",
        label: "Monthly activity chart renders",
        type: "waitForText",
        text: "Monthly activity",
        timeoutMs: 15000,
      },
      {
        id: "event-mix-chart-renders",
        label: "Event mix chart renders",
        type: "waitForText",
        text: "Event mix",
        timeoutMs: 15000,
      },
      {
        id: "vector-card-renders",
        label: "Most active vector card renders",
        type: "waitForText",
        text: "Most active vector",
        timeoutMs: 15000,
      },
      {
        id: "event-row-renders",
        label: "Ledger event rows render promotion data",
        type: "waitForText",
        text: "Promotion applied",
        timeoutMs: 15000,
      },
      {
        id: "history-read-only",
        label: "Replay/Revert controls stay absent",
        type: "assertExpression",
        expression: "Array.from(document.querySelectorAll('button,a,[role=\"button\"]')).every((node) => { const text = (node.textContent || '').trim(); return text !== 'Replay' && text !== 'Revert'; })",
        message: "Progression History must stay read-only and should not expose replay or revert controls.",
      },
    ],
  },
  {
    id: "history-progression-filtered",
    captureKey: "progression-history-filtered",
    surface: "History > Progression History (Filtered)",
    screenshotFilename: "progression-history-filtered.png",
    notes: [
      "Filtered charts and cards should reflect the same narrowed event set as the visible rows.",
    ],
    actions: [
      {
        id: "filtered-history-title-renders",
        label: "Filtered progression history title renders",
        type: "waitForText",
        text: "Progression History",
        timeoutMs: 15000,
      },
      {
        id: "filtered-state-renders",
        label: "Filtered state banner renders",
        type: "waitForText",
        text: "Showing filtered results",
        timeoutMs: 15000,
      },
      {
        id: "filtered-monthly-chart-renders",
        label: "Filtered monthly activity chart renders",
        type: "waitForText",
        text: "Monthly activity",
        timeoutMs: 15000,
      },
      {
        id: "filtered-event-row-renders",
        label: "Filtered event row renders promotion data",
        type: "waitForText",
        text: "Promotion applied",
        timeoutMs: 15000,
      },
      {
        id: "clear-filters-renders",
        label: "Clear filters affordance renders",
        type: "waitForText",
        text: "Clear filters",
        timeoutMs: 15000,
      },
      {
        id: "event-type-filter-applies",
        label: "Visible ledger rows match the selected event type filter",
        type: "assertExpression",
        expression: "Array.from(document.querySelectorAll('[data-progression-history-row]')).every((node) => node.getAttribute('data-progression-history-event-type') === 'promotion_applied')",
        message: "Filtered progression history should narrow the visible event list to the selected event type.",
      },
    ],
  },
];

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

function parseJsonObject(text) {
  if (typeof text !== "string" || text.trim().length === 0) {
    return null;
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
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
    const runnerSummary = parseJsonObject(result.stdout);

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
      actionResults: Array.isArray(runnerSummary?.actionResults) ? runnerSummary.actionResults : [],
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
  const missingRemoteVersions = drift.mismatches
    .filter((mismatch) => mismatch.remote === "<missing>" && mismatch.local !== "<missing>")
    .map((mismatch) => {
      const matchedFilename = filenames.find((filename) => filename.startsWith(`${mismatch.local}_`));
      return matchedFilename ?? mismatch.local;
    });

  if (missingRemoteVersions.length === 0) {
    return {
      status: "passed",
      classification: "clean",
      missingRemoteVersions,
      remoteStateMutated: false,
      command: drift.command,
      stderr: null,
    };
  }

  return {
    status: "expected-red",
    classification: "branch-stack pending migrations",
    missingRemoteVersions,
    remoteStateMutated: false,
    command: drift.command,
    stderr: null,
  };
}

function createSkippedAssertionResult(assertion, reason) {
  return {
    id: assertion.id,
    label: assertion.label,
    status: "skipped",
    reason,
  };
}

export function buildScenarioMatrixRow({ scenario, capture }) {
  const screenshotProduced = capture.status === "captured";
  const actionResultsById = new Map(
    Array.isArray(capture.actionResults)
      ? capture.actionResults.map((result) => [result.id, result])
      : [],
  );
  const screenshotReason = screenshotProduced
    ? null
    : (capture.reason ?? "Screenshot was not produced.");

  const assertions = scenario.actions.map((assertion) => {
    const result = actionResultsById.get(assertion.id);
    if (result) {
      return {
        id: assertion.id,
        label: assertion.label,
        status: result.status,
        reason: result.reason ?? undefined,
      };
    }

    if (capture.status === "captured") {
      return {
        id: assertion.id,
        label: assertion.label,
        status: "passed",
      };
    }

    return createSkippedAssertionResult(assertion, screenshotReason ?? "Scenario capture did not complete.");
  });

  const hasFailedAssertion = assertions.some((assertion) => assertion.status === "failed");
  const hasSkippedAssertion = assertions.some((assertion) => assertion.status === "skipped");
  const status = hasFailedAssertion
    ? "failed"
    : hasSkippedAssertion || !screenshotProduced
      ? "skipped"
      : "passed";

  return {
    id: scenario.id,
    surface: scenario.surface,
    route: capture.route,
    status,
    assertions,
    screenshot: {
      produced: screenshotProduced,
      path: screenshotProduced ? capture.screenshotPath : undefined,
      reason: screenshotReason ?? undefined,
    },
    notes: scenario.notes,
  };
}

export function buildProgressionReceiptScenarioMatrix({ scenarios, captures }) {
  const capturesByKey = new Map(captures.map((capture) => [capture.key, capture]));

  return scenarios.map((scenario) => buildScenarioMatrixRow({
    scenario,
    capture: capturesByKey.get(scenario.captureKey) ?? {
      key: scenario.captureKey,
      route: `/dev/mobile-regression?scenario=${scenario.id}`,
      screenshotPath: path.join(QA_LLEL_CAPTURE_ROOT, "latest", scenario.screenshotFilename),
      status: "blocked",
      reason: "Scenario capture did not run.",
      actionResults: scenario.actions.map((assertion) => ({
        id: assertion.id,
        status: "skipped",
        reason: "Scenario capture did not run.",
      })),
    },
  }));
}

export function formatProgressionReceiptConsoleSummary({ scenarioMatrix }) {
  const lines = ["LLEL progression receipt"];

  for (const row of scenarioMatrix) {
    const screenshotSummary = row.screenshot.produced
      ? "screenshot produced"
      : `screenshot missing${row.screenshot.reason ? ` (${row.screenshot.reason})` : ""}`;
    lines.push(`- ${row.id}: ${row.status}, ${screenshotSummary}`);
  }

  return `${lines.join("\n")}\n`;
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

  const captures = await Promise.all(PROGRESSION_RECEIPT_SCENARIOS.map((scenario) => runCapture({
    key: scenario.captureKey,
    url: `${baseUrl}/dev/mobile-regression?scenario=${scenario.id}`,
    width: 430,
    height: 932,
    mobile: true,
    finalWaitMs: 650,
    captureBeyondViewport: true,
    outPath: path.join(outputDir, scenario.screenshotFilename),
    actions: scenario.actions,
  })));

  const exportCoverage = await runNodeCommand([
    "--import",
    pathToFileURL(registerAliasesPath).href,
    "--test",
    "src/lib/account-workout-export.test.ts",
  ]);
  const migrationValidation = await resolveExpectedRedMigrations();
  const scenarioMatrix = buildProgressionReceiptScenarioMatrix({
    scenarios: PROGRESSION_RECEIPT_SCENARIOS,
    captures,
  });

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
    scenarioMatrix,
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
  process.stdout.write(formatProgressionReceiptConsoleSummary(report));
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
      scenarioMatrix: [],
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
