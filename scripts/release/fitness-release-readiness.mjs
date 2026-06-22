import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getMigrationHistoryDrift } from "../migration/validate-supabase-chain.mjs";
import { QA_LLEL_CAPTURE_ROOT } from "../qa/fitness-auth-state.mjs";
import {
  parseLedgerLines,
  RELEASE_DRAFT_PATH,
  RELEASE_LEDGER_PATH,
} from "./fitness-release-note.mjs";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const defaultRepoRoot = path.resolve(currentDir, "..", "..");
const DEFAULT_LLEL_REPORT_PATH = path.join(QA_LLEL_CAPTURE_ROOT, "latest", "report.json");
export const RELEASE_READINESS_MARKDOWN_PATH = "runtime/fitness/release-readiness.latest.md";
export const RELEASE_READINESS_JSON_PATH = "runtime/fitness/release-readiness.latest.json";
export const RELEASE_READINESS_DOC_PATH = path.join(defaultRepoRoot, "docs", "ops", "FITNESS-RELEASE-READINESS-REPORTS.md");
const REQUIRED_LLEL_ROUTES = [
  "today-progression-status",
  "progression-history",
  "progression-history-filtered",
];

function normalizeRepoPath(value) {
  return String(value).replace(/\\/g, "/");
}

function readBoolean(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function isPlaceholderString(value) {
  return typeof value !== "string"
    || value.trim().length === 0
    || /^todo[:\s-]/i.test(value.trim())
    || /fill in/i.test(value);
}

function hasConcreteStringArray(values) {
  return Array.isArray(values) && values.some((value) => typeof value === "string" && !isPlaceholderString(value));
}

function getStatusRank(status) {
  switch (status) {
    case "fail":
      return 3;
    case "warn":
      return 2;
    default:
      return 1;
  }
}

function mergeStatus(...statuses) {
  return statuses.reduce((current, candidate) => (
    getStatusRank(candidate) > getStatusRank(current) ? candidate : current
  ), "pass");
}

function createCheck({ status, summary, details = [], nextActions = [] }) {
  return { status, summary, details, nextActions };
}

function runCommand(command, args, { cwd = defaultRepoRoot } = {}) {
  const shouldUseShell = process.platform === "win32" && /\.cmd$/i.test(command);
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    shell: shouldUseShell,
  });

  return {
    ok: !result.error && (result.status ?? 1) === 0,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error ? `${result.error.name}: ${result.error.message}` : "",
  };
}

function runGit(args, { cwd = defaultRepoRoot } = {}) {
  return runCommand("git", args, { cwd });
}

function runNpmScript(scriptName, { cwd = defaultRepoRoot } = {}) {
  const command = process.platform === "win32" ? "npm.cmd" : "npm";
  return runCommand(command, ["run", scriptName], { cwd });
}

async function readJsonFileIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function readTextFileIfExists(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function resolveMissingRemoteMigrationVersions({ repoRoot, mismatches }) {
  const migrationRoot = path.join(repoRoot, "supabase", "migrations");
  const filenames = await fs.readdir(migrationRoot).catch(() => []);

  return mismatches
    .filter((mismatch) => mismatch.remote === "<missing>" && mismatch.local !== "<missing>")
    .map((mismatch) => filenames.find((filename) => filename.startsWith(`${mismatch.local}_`)) ?? mismatch.local)
    .sort((left, right) => left.localeCompare(right));
}

async function collectGitState({ repoRoot = defaultRepoRoot } = {}) {
  const branchResult = runGit(["branch", "--show-current"], { cwd: repoRoot });
  const statusResult = runGit(["status", "--short"], { cwd: repoRoot });
  const branch = branchResult.ok ? branchResult.stdout.trim() : "";
  const dirtyFiles = statusResult.stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  return {
    branch,
    branchOk: branchResult.ok,
    branchError: branchResult.ok ? null : branchResult.stderr.trim() || branchResult.stdout.trim() || "Unable to read branch.",
    dirtyFiles,
    dirty: dirtyFiles.length > 0,
  };
}

async function collectMigrationState({ repoRoot = defaultRepoRoot } = {}) {
  const drift = getMigrationHistoryDrift();
  if (!drift.ok) {
    return {
      ok: false,
      command: drift.command,
      classification: "drift-check-failed",
      missingRemoteVersions: [],
      result: drift.result,
      productionDeployBlocked: true,
    };
  }

  const missingRemoteVersions = await resolveMissingRemoteMigrationVersions({
    repoRoot,
    mismatches: drift.mismatches,
  });

  return {
    ok: true,
    command: drift.command,
    classification: missingRemoteVersions.length > 0 ? "expected-red" : "clean",
    missingRemoteVersions,
    mismatches: drift.mismatches,
    result: drift.result,
    productionDeployBlocked: missingRemoteVersions.length > 0,
  };
}

function evaluateGitCheck(gitState) {
  if (!gitState.branchOk) {
    return createCheck({
      status: "fail",
      summary: "Unable to resolve the current git branch.",
      details: gitState.branchError ? [gitState.branchError] : [],
      nextActions: ["Fix local git state before attempting production readiness checks."],
    });
  }

  if (gitState.dirty) {
    return createCheck({
      status: "fail",
      summary: `Working tree is dirty on ${gitState.branch}.`,
      details: gitState.dirtyFiles.slice(0, 20),
      nextActions: ["Commit, stash, or intentionally separate unrelated local changes before a production deploy."],
    });
  }

  return createCheck({
    status: "pass",
    summary: `Working tree is clean on ${gitState.branch}.`,
  });
}

function evaluateVerifyCheck(verifyResult) {
  if (!verifyResult.ok) {
    return createCheck({
      status: "fail",
      summary: "`npm run verify` failed.",
      details: [verifyResult.stderr.trim() || verifyResult.stdout.trim() || verifyResult.error || "Verification exited non-zero."],
      nextActions: ["Run `npm run verify` and fix the reported failures before production deploy."],
    });
  }

  return createCheck({
    status: "pass",
    summary: "`npm run verify` passed.",
  });
}

function evaluateReleaseDraftCheck({ draft, latestLedgerEntry, draftPath }) {
  if (!draft) {
    return createCheck({
      status: "fail",
      summary: "Release draft is missing.",
      details: [`Missing ${normalizeRepoPath(draftPath)}.`],
      nextActions: [
        "Run `npm run release:fitness:prepare`.",
        "Review the generated draft and refresh `npm run release:fitness:diff` before production deploy.",
      ],
    });
  }

  const incompleteFields = [];
  if (isPlaceholderString(draft.summary)) {
    incompleteFields.push("summary");
  }
  if (!hasConcreteStringArray(draft.lanes)) {
    incompleteFields.push("lanes");
  }
  if (!hasConcreteStringArray(draft.userFacingChanges)) {
    incompleteFields.push("userFacingChanges");
  }
  if (!hasConcreteStringArray(draft.verification)) {
    incompleteFields.push("verification");
  }

  if (incompleteFields.length > 0) {
    return createCheck({
      status: "fail",
      summary: "Release draft exists but still contains placeholder or incomplete fields.",
      details: [`Incomplete fields: ${incompleteFields.join(", ")}`],
      nextActions: [
        "Fill in the release draft with real summary, lanes, user-facing changes, and verification commands.",
        "Run `npm run release:fitness:diff` after updating the draft.",
      ],
    });
  }

  const details = [
    `Draft version: ${draft.version ?? "<unset>"}`,
  ];
  if (latestLedgerEntry?.version) {
    details.push(`Latest recorded release: ${latestLedgerEntry.version}`);
  }

  return createCheck({
    status: "pass",
    summary: "Release draft is present and populated enough for deploy readiness review.",
    details,
  });
}

function evaluateLedgerCheck(latestLedgerEntry, ledgerPath) {
  if (!latestLedgerEntry) {
    return createCheck({
      status: "pass",
      summary: "Release ledger is present but has no recorded production releases yet.",
      details: [`Ledger path: ${normalizeRepoPath(ledgerPath)}`],
    });
  }

  return createCheck({
    status: "pass",
    summary: `Latest recorded release is ${latestLedgerEntry.version}.`,
    details: [
      `Commit: ${latestLedgerEntry.commit ?? "<unknown>"}`,
      `Deployed at: ${latestLedgerEntry.deployedAt ?? "<unknown>"}`,
    ],
  });
}

function evaluateLlelCheck({ report, reportPath, migrationState }) {
  if (!report) {
    return createCheck({
      status: "fail",
      summary: "Progression LLEL receipt is missing.",
      details: [`Missing ${normalizeRepoPath(reportPath)}.`],
      nextActions: ["Run `npm run qa:llel:progression` before production deploy."],
    });
  }

  const routesByKey = new Map(
    Array.isArray(report.routesChecked)
      ? report.routesChecked.map((route) => [route.key, route])
      : [],
  );
  const missingRoutes = REQUIRED_LLEL_ROUTES.filter((key) => !routesByKey.has(key));
  const failedRoutes = REQUIRED_LLEL_ROUTES
    .map((key) => routesByKey.get(key))
    .filter((route) => route && route.status !== "captured");
  const staleMigrationSnapshot = Array.isArray(report.migrationValidation?.missingRemoteVersions)
    && report.migrationValidation.missingRemoteVersions.join("|") !== migrationState.missingRemoteVersions.join("|");

  const failures = [];
  if (missingRoutes.length > 0) {
    failures.push(`Missing receipt routes: ${missingRoutes.join(", ")}`);
  }
  if (failedRoutes.length > 0) {
    failures.push(...failedRoutes.map((route) => `${route.key}: ${route.failureReason ?? route.status}`));
  }
  if (report.exportCoverage?.status !== "passed") {
    failures.push("Account export progression coverage did not pass in the receipt.");
  }
  if (staleMigrationSnapshot) {
    failures.push("Receipt migration snapshot is stale relative to current `migration:validate` output.");
  }

  if (failures.length > 0) {
    return createCheck({
      status: "fail",
      summary: "Progression LLEL receipt is incomplete or stale.",
      details: failures,
      nextActions: ["Run `npm run qa:llel:progression` and confirm the receipt includes all required progression surfaces."],
    });
  }

  return createCheck({
    status: "pass",
    summary: "Progression LLEL receipt is current and complete.",
    details: REQUIRED_LLEL_ROUTES.map((key) => `${key}: captured`),
  });
}

function evaluateMigrationCheck(migrationState) {
  if (!migrationState.ok) {
    return createCheck({
      status: "fail",
      summary: "`npm run migration:validate` could not read linked-remote migration drift.",
      details: [migrationState.result?.combined?.trim() || "Supabase migration list command failed."],
      nextActions: ["Fix linked Supabase access before relying on production migration readiness."],
    });
  }

  if (migrationState.missingRemoteVersions.length === 0) {
    return createCheck({
      status: "pass",
      summary: "Migration history is clean for production deploy.",
    });
  }

  return createCheck({
    status: "fail",
    summary: "Production deploy is blocked by pending branch-stack migrations.",
    details: migrationState.missingRemoteVersions.map((version, index) => `${index + 1}. ${version}`),
    nextActions: [
      "Apply the pending migrations remotely in the documented order before production deploy.",
      "Re-run `npm run migration:validate` after the remote chain is updated.",
    ],
  });
}

export async function buildFitnessReleaseReadinessReport(options = {}) {
  const repoRoot = options.repoRoot ?? defaultRepoRoot;
  const releaseDraftPath = options.releaseDraftPath ?? path.join(repoRoot, RELEASE_DRAFT_PATH);
  const releaseLedgerPath = options.releaseLedgerPath ?? path.join(repoRoot, RELEASE_LEDGER_PATH);
  const llelReportPath = options.llelReportPath ?? DEFAULT_LLEL_REPORT_PATH;
  const runVerify = options.runVerify ?? (() => runNpmScript("verify", { cwd: repoRoot }));
  const gitState = options.gitState ?? await collectGitState({ repoRoot });
  const migrationState = options.migrationState ?? await collectMigrationState({ repoRoot });
  const draft = options.draft !== undefined ? options.draft : await readJsonFileIfExists(releaseDraftPath);
  const llelReport = options.llelReport !== undefined ? options.llelReport : await readJsonFileIfExists(llelReportPath);
  const ledgerRaw = options.ledgerRaw !== undefined ? options.ledgerRaw : await readTextFileIfExists(releaseLedgerPath);
  const ledgerEntries = ledgerRaw && ledgerRaw.trim().length > 0 ? parseLedgerLines(ledgerRaw) : [];
  const latestLedgerEntry = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1] : null;
  const verifyResult = options.verifyResult ?? runVerify();

  const checks = {
    git: evaluateGitCheck(gitState),
    verify: evaluateVerifyCheck(verifyResult),
    releaseDraft: evaluateReleaseDraftCheck({
      draft,
      latestLedgerEntry,
      draftPath: releaseDraftPath,
    }),
    releaseLedger: evaluateLedgerCheck(latestLedgerEntry, releaseLedgerPath),
    llel: evaluateLlelCheck({
      report: llelReport,
      reportPath: llelReportPath,
      migrationState,
    }),
    migration: evaluateMigrationCheck(migrationState),
  };

  const status = Object.values(checks).reduce(
    (current, check) => mergeStatus(current, check.status),
    "pass",
  );
  const nextActions = [...new Set(Object.values(checks).flatMap((check) => check.nextActions))];

  return {
    command: "npm run release:fitness:ready",
    status,
    productionDeployReady: status === "pass",
    repoRoot: normalizeRepoPath(repoRoot),
    branch: gitState.branch,
    dirty: gitState.dirty,
    expectedRedMigrations: migrationState.missingRemoteVersions,
    checks,
    nextActions,
  };
}

export function formatFitnessReleaseReadinessReport(report, { json = false } = {}) {
  if (json) {
    return `${JSON.stringify(report, null, 2)}\n`;
  }

  const lines = [
    `Fitness release readiness: ${report.status.toUpperCase()}`,
    `- Production deploy ready: ${report.productionDeployReady ? "yes" : "no"}`,
    `- Branch: ${report.branch || "<unknown>"}`,
    `- Dirty working tree: ${report.dirty ? "yes" : "no"}`,
  ];

  for (const [name, check] of Object.entries(report.checks)) {
    lines.push(`- ${name}: ${check.status.toUpperCase()} - ${check.summary}`);
    for (const detail of check.details ?? []) {
      lines.push(`  ${detail}`);
    }
  }

  if (report.nextActions.length > 0) {
    lines.push("- Next actions:");
    for (const action of report.nextActions) {
      lines.push(`  - ${action}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function parseArgs(argv = process.argv.slice(2)) {
  return {
    json: argv.some((entry) => entry === "--json"),
  };
}

export function getReleaseReadinessArtifactPaths(repoRoot = defaultRepoRoot) {
  return {
    markdown: path.join(repoRoot, RELEASE_READINESS_MARKDOWN_PATH),
    json: path.join(repoRoot, RELEASE_READINESS_JSON_PATH),
  };
}

export async function writeFitnessReleaseReadinessArtifacts(report, { repoRoot = defaultRepoRoot } = {}) {
  const paths = getReleaseReadinessArtifactPaths(repoRoot);
  await fs.mkdir(path.dirname(paths.markdown), { recursive: true });
  await fs.writeFile(paths.markdown, formatFitnessReleaseReadinessReport(report), "utf8");
  await fs.writeFile(paths.json, formatFitnessReleaseReadinessReport(report, { json: true }), "utf8");
  return paths;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = await buildFitnessReleaseReadinessReport();
  await writeFitnessReleaseReadinessArtifacts(report);
  process.stdout.write(formatFitnessReleaseReadinessReport(report, { json: args.json }));
  process.exit(report.productionDeployReady ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
