#!/usr/bin/env node
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const tscBin = require.resolve("typescript/bin/tsc");
const scriptPath = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(scriptPath);
const repoRoot = path.resolve(scriptDir, "..");
const typecheckArgs = ["-p", "tsconfig.json", "--pretty", "false"];
const groupDefinitions = [
  {
    id: "curated-onboarding",
    label: "curated-onboarding",
    scope: "test-only",
    recommendedLane: "curated-onboarding type debt",
    patterns: [/^src\/features\/curated-onboarding\//],
  },
  {
    id: "history-day-summary",
    label: "history/day-summary",
    scope: "test-only",
    recommendedLane: "test-only type debt",
    patterns: [/^src\/lib\/day-summary\.test\.ts$/, /^src\/lib\/history-.*\.test\.ts$/],
  },
  {
    id: "ecosystem",
    label: "ecosystem",
    scope: "test-only",
    recommendedLane: "test-only type debt",
    patterns: [/^src\/lib\/ecosystem\//],
  },
  {
    id: "migration",
    label: "migration",
    scope: "migration-only",
    recommendedLane: "migration/archive type debt",
    patterns: [/^src\/lib\/migration\//],
  },
  {
    id: "mobile-regression-tests",
    label: "mobile-regression tests",
    scope: "evidence-only",
    recommendedLane: "mobile-regression type debt",
    patterns: [/^tests\/mobile-regression\//],
  },
];

function toIso(value) {
  return new Date(value).toISOString();
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findAtlasRoot(startDir) {
  let current = startDir;

  while (true) {
    const candidate = path.join(current, "stack.yaml");
    if (await pathExists(candidate)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function normalizeFilePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function inferScopeFromFile(filePath) {
  if (/^tests\/mobile-regression\//.test(filePath)) {
    return "evidence-only";
  }

  if (/^src\/lib\/migration\//.test(filePath)) {
    return "migration-only";
  }

  if (/\.test\.[cm]?tsx?$/.test(filePath)) {
    return "test-only";
  }

  return "product-runtime";
}

function classifyFile(filePath) {
  for (const definition of groupDefinitions) {
    if (definition.patterns.some((pattern) => pattern.test(filePath))) {
      return definition;
    }
  }

  return {
    id: "other",
    label: "other",
    scope: inferScopeFromFile(filePath),
    recommendedLane: inferScopeFromFile(filePath) === "product-runtime" ? "runtime type debt" : "test-only type debt",
  };
}

function parseTypecheckOutput(outputText) {
  const errorPattern = /^(?<file>.+?)\((?<line>\d+),(?<column>\d+)\): error (?<code>TS\d+): (?<message>.*)$/;
  const lines = outputText.split(/\r?\n/);
  const errors = [];
  let current = null;

  function pushCurrent() {
    if (!current) {
      return;
    }

    const classification = classifyFile(current.file);
    const scope = classification.scope ?? inferScopeFromFile(current.file);
    errors.push({
      file: current.file,
      line: current.line,
      column: current.column,
      code: current.code,
      categoryId: classification.id,
      categoryLabel: classification.label,
      scope,
      recommendedLane: classification.recommendedLane,
      message: current.message,
      detailLines: current.detailLines,
    });
    current = null;
  }

  for (const line of lines) {
    const match = line.match(errorPattern);
    if (match?.groups) {
      pushCurrent();
      current = {
        file: normalizeFilePath(match.groups.file.trim()),
        line: Number(match.groups.line),
        column: Number(match.groups.column),
        code: match.groups.code,
        message: match.groups.message,
        detailLines: [],
      };
      continue;
    }

    if (current && line.trim().length > 0) {
      current.detailLines.push(line);
    }
  }

  pushCurrent();
  return errors;
}

function summarizeGroups(errors) {
  const grouped = new Map();

  for (const error of errors) {
    const key = error.categoryId;
    const existing = grouped.get(key) ?? {
      id: error.categoryId,
      label: error.categoryLabel,
      scope: error.scope,
      recommendedLane: error.recommendedLane,
      errorCount: 0,
      fileSet: new Set(),
      codeCounts: new Map(),
    };

    existing.errorCount += 1;
    existing.fileSet.add(error.file);
    existing.codeCounts.set(error.code, (existing.codeCounts.get(error.code) ?? 0) + 1);
    grouped.set(key, existing);
  }

  return [...grouped.values()]
    .map((group) => ({
      id: group.id,
      label: group.label,
      scope: group.scope,
      recommendedLane: group.recommendedLane,
      errorCount: group.errorCount,
      fileCount: group.fileSet.size,
      files: [...group.fileSet].sort(),
      codes: [...group.codeCounts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
        .map(([code, count]) => ({ code, count })),
    }))
    .sort((left, right) => right.errorCount - left.errorCount || left.label.localeCompare(right.label));
}

function summarizeFiles(errors) {
  const counts = new Map();

  for (const error of errors) {
    const existing = counts.get(error.file) ?? {
      file: error.file,
      errorCount: 0,
      categoryId: error.categoryId,
      categoryLabel: error.categoryLabel,
      scope: error.scope,
    };
    existing.errorCount += 1;
    counts.set(error.file, existing);
  }

  return [...counts.values()]
    .sort((left, right) => right.errorCount - left.errorCount || left.file.localeCompare(right.file));
}

function summarizeCodes(errors) {
  const codeCounts = new Map();
  for (const error of errors) {
    codeCounts.set(error.code, (codeCounts.get(error.code) ?? 0) + 1);
  }

  return [...codeCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([code, count]) => ({ code, count }));
}

function buildRecommendedLanes(groups) {
  const lanes = new Map();

  for (const group of groups) {
    if (!lanes.has(group.recommendedLane)) {
      lanes.set(group.recommendedLane, {
        lane: group.recommendedLane,
        scopes: new Set(),
        groups: [],
        errorCount: 0,
        fileCount: 0,
      });
    }

    const current = lanes.get(group.recommendedLane);
    current.scopes.add(group.scope);
    current.groups.push(group.label);
    current.errorCount += group.errorCount;
    current.fileCount += group.fileCount;
  }

  return [...lanes.values()]
    .map((lane) => ({
      lane: lane.lane,
      scopes: [...lane.scopes].sort(),
      groups: lane.groups.sort(),
      errorCount: lane.errorCount,
      fileCount: lane.fileCount,
    }))
    .sort((left, right) => right.errorCount - left.errorCount || left.lane.localeCompare(right.lane));
}

function formatCommand(command, args) {
  return [command, ...args]
    .map((part) => (/\s/.test(part) ? JSON.stringify(part) : part))
    .join(" ");
}

function runTypecheck() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [tscBin, ...typecheckArgs], {
      cwd: repoRoot,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("exit", (code, signal) => {
      resolve({
        exitCode: code ?? null,
        signal,
        output: `${stdout}${stderr}`,
      });
    });
  });
}

async function writeReceipt(receiptRoot, receipt) {
  await fs.mkdir(receiptRoot, { recursive: true });
  const timestamp = receipt.generatedAt.replace(/[:.]/g, "-");
  const timestampedPath = path.join(receiptRoot, `typecheck-debt-${timestamp}.json`);
  const latestPath = path.join(receiptRoot, "typecheck-debt.latest.json");
  const payload = `${JSON.stringify(receipt, null, 2)}\n`;
  await fs.writeFile(timestampedPath, payload, "utf8");
  await fs.writeFile(latestPath, payload, "utf8");
  return { latestPath, timestampedPath };
}

function printSummary(receipt, latestPath) {
  console.log("");
  console.log("Typecheck debt inventory");
  console.log(`Receipt: ${latestPath}`);
  console.log(`- errors: ${receipt.summary.totalErrors}`);
  console.log(`- files: ${receipt.summary.fileCount}`);
  console.log(`- failing groups: ${receipt.summary.groupCount}`);

  for (const group of receipt.groups) {
    console.log(`- ${group.label}: ${group.errorCount} errors across ${group.fileCount} file(s) [${group.scope}]`);
  }
}

async function main() {
  const atlasRoot = await findAtlasRoot(repoRoot);
  const receiptRoot = atlasRoot
    ? path.join(atlasRoot, "runtime", "receipts", "typecheck")
    : path.join(repoRoot, "runtime", "receipts", "typecheck");
  const startedAt = Date.now();
  const typecheck = await runTypecheck();
  const finishedAt = Date.now();
  const errors = parseTypecheckOutput(typecheck.output);
  const groups = summarizeGroups(errors);
  const topFiles = summarizeFiles(errors);
  const receipt = {
    schemaVersion: 1,
    generatedAt: toIso(finishedAt),
    startedAt: toIso(startedAt),
    finishedAt: toIso(finishedAt),
    durationMs: finishedAt - startedAt,
    repoRoot,
    atlasRoot,
    receiptRoot,
    hostname: os.hostname(),
    platform: process.platform,
    nodeVersion: process.version,
    command: formatCommand(process.execPath, [tscBin, ...typecheckArgs]),
    typecheck: {
      success: typecheck.exitCode === 0,
      exitCode: typecheck.exitCode,
      signal: typecheck.signal,
    },
    summary: {
      totalErrors: errors.length,
      fileCount: topFiles.length,
      groupCount: groups.length,
      topCodes: summarizeCodes(errors),
      productRuntimeErrorCount: errors.filter((error) => error.scope === "product-runtime").length,
      testOnlyErrorCount: errors.filter((error) => error.scope === "test-only").length,
      migrationOnlyErrorCount: errors.filter((error) => error.scope === "migration-only").length,
      evidenceOnlyErrorCount: errors.filter((error) => error.scope === "evidence-only").length,
    },
    groups,
    topFiles,
    recommendedPullRequestLanes: buildRecommendedLanes(groups),
    errors,
  };

  const paths = await writeReceipt(receiptRoot, receipt);
  printSummary(receipt, paths.latestPath);

  if (typecheck.exitCode === null && typecheck.signal) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Typecheck debt inventory failed:", error);
  process.exit(1);
});
