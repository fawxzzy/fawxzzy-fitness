import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
export const repoRoot = path.resolve(scriptDir, "..");
export const FITNESS_PILOT_READINESS_DOC_PATH = path.join(repoRoot, "docs", "ops", "FITNESS-PILOT-READINESS-REPORTS.md");

function findAtlasRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);

  for (;;) {
    if (fs.existsSync(path.join(current, "stack.yaml"))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(startDir);
    }

    current = parent;
  }
}

function parseReceiptRoot(argv) {
  const flagIndex = argv.findIndex((value) => value === "--receipt-root");
  if (flagIndex === -1) {
    return path.join(findAtlasRoot(), "runtime", "receipts", "events");
  }

  const nextValue = argv[flagIndex + 1];
  if (!nextValue) {
    throw new Error("Expected a path after --receipt-root");
  }

  return path.resolve(nextValue);
}

export function getFitnessPilotReadinessArtifactPaths(atlasRoot = findAtlasRoot()) {
  const artifactRoot = path.join(atlasRoot, "runtime", "fitness", "pilot-readiness");
  return {
    json: path.join(artifactRoot, "latest.json"),
    markdown: path.join(artifactRoot, "latest.md"),
  };
}

export function renderFitnessPilotReadinessMarkdown(report, receiptRoot) {
  const lines = [
    "# Fitness pilot readiness",
    "",
    `Decision: ${report.decision}`,
    `Receipt root: ${receiptRoot}`,
    `Warehouse receipt count: ${report.warehouse_receipt_count}`,
    `Stay-shadow reasons: ${Array.isArray(report.stay_shadow_reasons) && report.stay_shadow_reasons.length > 0 ? report.stay_shadow_reasons.join(" | ") : "none"}`,
    `Rollback alerts: ${Array.isArray(report.rollback_alerts) && report.rollback_alerts.length > 0 ? report.rollback_alerts.join(" | ") : "none"}`,
    "",
    "## Evaluation scope",
    `- placement: ${report.evaluation_scope?.placement_id ?? "<unknown>"}`,
    `- surface: ${report.evaluation_scope?.surface_id ?? "<unknown>"}`,
    `- app: ${report.evaluation_scope?.pilot_app_id ?? "<unknown>"}`,
    "",
    "## Metrics",
  ];

  for (const metric of report.metrics ?? []) {
    lines.push(`- ${metric.metric_id}: ${metric.value} (${metric.observable ? "observable" : "not observable"})`);
  }

  lines.push("");
  lines.push("## Threshold checks");
  for (const check of report.threshold_checks ?? []) {
    lines.push(`- ${check.threshold_id}: ${check.passed ? "pass" : "fail"} (${check.observed_value} ${check.comparator} ${check.threshold_value})`);
  }

  lines.push("");
  lines.push("## Acceptance checks");
  for (const check of report.acceptance_checks ?? []) {
    lines.push(`- ${check.check_id}: ${check.passed ? "pass" : "fail"}`);
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

export async function writeFitnessPilotReadinessArtifacts(report, receiptRoot, paths = getFitnessPilotReadinessArtifactPaths()) {
  await fsp.mkdir(path.dirname(paths.json), { recursive: true });
  await fsp.writeFile(paths.json, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await fsp.writeFile(paths.markdown, renderFitnessPilotReadinessMarkdown(report, receiptRoot), "utf8");
}

async function main(argv = process.argv.slice(2)) {
  const receiptRoot = parseReceiptRoot(argv);
  const moduleUrl = pathToFileURL(path.join(repoRoot, "src", "lib", "ecosystem", "fitness-growth-pilot-readiness.ts")).href;
  const { buildFitnessGrowthPilotReadinessReport } = await import(moduleUrl);

  const report = buildFitnessGrowthPilotReadinessReport({
    receiptRoot,
  });

  await writeFitnessPilotReadinessArtifacts(report, receiptRoot);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

  if (report.decision !== "allow_narrow_sticky_pilot") {
    process.exitCode = 1;
  }
}

const isEntrypoint = process.argv[1] && path.resolve(process.argv[1]) === scriptPath;

if (isEntrypoint) {
  main().catch((error) => {
    console.error(`evaluate-fitness-pilot-readiness failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
