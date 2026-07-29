import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const HOSTED_CHECK_WATCHER_VERSION =
  "fitness.hosted-check-watcher.2026-07-29.v1";
export const HOSTED_CHECK_RECEIPT_SCHEMA =
  "fitness.hosted-check-watch-receipt.v1";
export const HOSTED_CHECK_OUTCOMES = Object.freeze([
  "SUCCESS",
  "FAILURE",
  "TIMEOUT",
]);

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const defaultRepoRoot = path.resolve(currentDir, "..", "..");
const DEFAULT_RECEIPT_ROOT = path.join(
  defaultRepoRoot,
  "runtime",
  "receipts",
  "hosted-checks",
);
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const CHECK_SUCCESS_CONCLUSIONS = new Set(["SUCCESS"]);

function canonicalCompare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalize(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort(canonicalCompare)
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function digestCanonicalJson(value) {
  return crypto
    .createHash("sha256")
    .update(canonicalJson(value))
    .digest("hex");
}

function normalizeString(value) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function normalizeUpper(value) {
  return normalizeString(value)?.toUpperCase() ?? null;
}

function normalizeCheckRun(check) {
  const type = normalizeString(check?.__typename);
  if (type === "CheckRun") {
    return {
      kind: "check_run",
      name: normalizeString(check.name),
      workflowName: normalizeString(check.workflowName),
      status: normalizeUpper(check.status),
      conclusion: normalizeUpper(check.conclusion),
      detailsUrl: normalizeString(check.detailsUrl),
    };
  }
  if (type === "StatusContext") {
    const state = normalizeUpper(check.state);
    return {
      kind: "status_context",
      name: normalizeString(check.context),
      workflowName: null,
      status: state === "PENDING" ? "IN_PROGRESS" : "COMPLETED",
      conclusion: state,
      detailsUrl: normalizeString(check.targetUrl),
    };
  }
  return {
    kind: "unknown",
    name: normalizeString(check?.name ?? check?.context),
    workflowName: normalizeString(check?.workflowName),
    status: normalizeUpper(check?.status ?? check?.state),
    conclusion: normalizeUpper(check?.conclusion ?? check?.state),
    detailsUrl: normalizeString(check?.detailsUrl ?? check?.targetUrl),
  };
}

export function normalizeHostedCheckGraph(statusCheckRollup) {
  if (!Array.isArray(statusCheckRollup)) return [];
  return statusCheckRollup
    .map(normalizeCheckRun)
    .sort((left, right) => (
      canonicalCompare(
        `${left.name ?? ""}\u0000${left.workflowName ?? ""}\u0000${left.detailsUrl ?? ""}`,
        `${right.name ?? ""}\u0000${right.workflowName ?? ""}\u0000${right.detailsUrl ?? ""}`,
      )
    ));
}

function uniqueCanonicalStrings(values) {
  return [...new Set(
    values
      .map(normalizeString)
      .filter((value) => value !== null),
  )].sort(canonicalCompare);
}

function validateBinding(binding) {
  const errors = [];
  if (!/^[^/\s]+\/[^/\s]+$/.test(binding?.repository ?? "")) {
    errors.push("binding.repository must be owner/name.");
  }
  if (!Number.isInteger(binding?.pullRequest) || binding.pullRequest < 1) {
    errors.push("binding.pullRequest must be a positive integer.");
  }
  for (const key of ["base", "head", "tree"]) {
    if (!SHA_PATTERN.test(binding?.[key] ?? "")) {
      errors.push(`binding.${key} must be a lowercase 40-character Git SHA.`);
    }
  }
  return errors;
}

function identityErrors(binding, observedIdentity) {
  const errors = [];
  const comparisons = [
    ["pullRequest", binding.pullRequest, observedIdentity?.pullRequest],
    ["base", binding.base, observedIdentity?.base],
    ["head", binding.head, observedIdentity?.head],
    ["tree", binding.tree, observedIdentity?.tree],
  ];
  for (const [key, expected, actual] of comparisons) {
    if (expected !== actual) {
      errors.push(
        `Observed ${key} ${String(actual)} does not equal bound ${String(expected)}.`,
      );
    }
  }
  return errors;
}

export function evaluateHostedCheckObservation({
  binding,
  expectedCheckNames,
  observedIdentity,
  statusCheckRollup,
  timedOut = false,
}) {
  const expected = uniqueCanonicalStrings(expectedCheckNames ?? []);
  const graph = normalizeHostedCheckGraph(statusCheckRollup);
  const errors = [
    ...validateBinding(binding),
    ...identityErrors(binding, observedIdentity),
  ];
  if (expected.length === 0) {
    errors.push("At least one exact expected check name is required.");
  }

  const actualNames = graph
    .map((check) => check.name)
    .filter((name) => name !== null);
  const duplicateNames = actualNames.filter(
    (name, index) => actualNames.indexOf(name) !== index,
  );
  if (duplicateNames.length > 0) {
    errors.push(
      `Observed duplicate check names: ${uniqueCanonicalStrings(duplicateNames).join(", ")}.`,
    );
  }
  if (graph.some((check) => check.name === null || check.kind === "unknown")) {
    errors.push("Observed check graph contains an unsupported check record.");
  }

  const unexpected = uniqueCanonicalStrings(
    actualNames.filter((name) => !expected.includes(name)),
  );
  if (unexpected.length > 0) {
    errors.push(`Observed unexpected checks: ${unexpected.join(", ")}.`);
  }

  const missing = expected.filter((name) => !actualNames.includes(name));
  const expectedChecks = graph.filter(
    (check) => check.name !== null && expected.includes(check.name),
  );
  const failed = expectedChecks.filter(
    (check) => (
      check.status === "COMPLETED"
      && !CHECK_SUCCESS_CONCLUSIONS.has(check.conclusion)
    ),
  );
  if (failed.length > 0) {
    errors.push(
      `Observed terminal non-success checks: ${failed
        .map((check) => `${check.name}:${check.conclusion ?? "UNKNOWN"}`)
        .join(", ")}.`,
    );
  }

  const pending = expected.filter((name) => {
    const check = expectedChecks.find((entry) => entry.name === name);
    return !check || check.status !== "COMPLETED";
  });
  const allSuccessful = (
    errors.length === 0
    && missing.length === 0
    && expectedChecks.length === expected.length
    && expectedChecks.every(
      (check) => (
        check.status === "COMPLETED"
        && CHECK_SUCCESS_CONCLUSIONS.has(check.conclusion)
      ),
    )
  );

  let outcome = null;
  if (allSuccessful) {
    outcome = "SUCCESS";
  } else if (errors.length > 0) {
    outcome = "FAILURE";
  } else if (timedOut) {
    outcome = "TIMEOUT";
  }

  return {
    outcome,
    errors,
    expectedCheckNames: expected,
    missingCheckNames: missing,
    pendingCheckNames: pending,
    checkGraph: graph,
    checkGraphDigest: digestCanonicalJson(graph),
  };
}

export function createHostedCheckReceipt({
  binding,
  policy,
  observedIdentity,
  statusCheckRollup,
  startedAt,
  finishedAt,
  observationCount,
  timedOut = false,
  observationBasis = "LIVE_WATCH",
}) {
  const evaluation = evaluateHostedCheckObservation({
    binding,
    expectedCheckNames: policy.expectedCheckNames,
    observedIdentity,
    statusCheckRollup,
    timedOut,
  });
  if (!HOSTED_CHECK_OUTCOMES.includes(evaluation.outcome)) {
    throw new Error(
      "Cannot create a terminal receipt from a pending hosted-check observation.",
    );
  }
  const projection = {
    schema: HOSTED_CHECK_RECEIPT_SCHEMA,
    watcherVersion: HOSTED_CHECK_WATCHER_VERSION,
    binding: {
      repository: binding.repository,
      pullRequest: binding.pullRequest,
      base: binding.base,
      head: binding.head,
      tree: binding.tree,
    },
    policy: {
      expectedCheckNames: evaluation.expectedCheckNames,
      timeoutMs: policy.timeoutMs,
      pollIntervalMs: policy.pollIntervalMs,
    },
    observation: {
      basis: observationBasis,
      startedAt,
      finishedAt,
      observationCount,
      observedIdentity,
      checkGraph: evaluation.checkGraph,
      checkGraphDigest: evaluation.checkGraphDigest,
      missingCheckNames: evaluation.missingCheckNames,
      pendingCheckNames: evaluation.pendingCheckNames,
    },
    outcome: evaluation.outcome,
    errors: evaluation.errors,
    mutationTruth:
      "READ_ONLY_HOSTED_CHECK_OBSERVATION; NO_CHECK_RERUN_OR_DISPATCH; NO_SOURCE_GITHUB_LIFECYCLE_PROVIDER_OR_PRODUCTION_MUTATION",
  };
  const receiptDigest = digestCanonicalJson(projection);
  return {
    ...projection,
    receiptId: `fitness-hosted-check-watch:${receiptDigest}`,
    receiptDigest: `sha256:${receiptDigest}`,
  };
}

function parsePositiveInteger(value, flag) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${flag} must be a positive integer.`);
  }
  return parsed;
}

export function parseHostedCheckWatcherArgs(argv) {
  const options = {
    expectedCheckNames: [],
    timeoutMs: 120_000,
    pollIntervalMs: 10_000,
    receiptRoot: DEFAULT_RECEIPT_ROOT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag === "--repo") options.repository = value;
    else if (flag === "--pr") options.pullRequest = parsePositiveInteger(value, flag);
    else if (flag === "--base") options.base = value;
    else if (flag === "--head") options.head = value;
    else if (flag === "--tree") options.tree = value;
    else if (flag === "--check") options.expectedCheckNames.push(value);
    else if (flag === "--timeout-ms") options.timeoutMs = parsePositiveInteger(value, flag);
    else if (flag === "--poll-ms") options.pollIntervalMs = parsePositiveInteger(value, flag);
    else if (flag === "--receipt-dir") options.receiptRoot = path.resolve(value);
    else throw new Error(`Unknown or incomplete argument: ${flag}`);
    index += 1;
  }
  const binding = {
    repository: options.repository,
    pullRequest: options.pullRequest,
    base: options.base,
    head: options.head,
    tree: options.tree,
  };
  const errors = validateBinding(binding);
  if (errors.length > 0) throw new Error(errors.join("\n"));
  if (options.expectedCheckNames.length === 0) {
    throw new Error("At least one --check is required.");
  }
  return {
    binding,
    policy: {
      expectedCheckNames: uniqueCanonicalStrings(options.expectedCheckNames),
      timeoutMs: options.timeoutMs,
      pollIntervalMs: options.pollIntervalMs,
    },
    receiptRoot: options.receiptRoot,
  };
}

function runGh(args, cwd = defaultRepoRoot) {
  const command = process.platform === "win32" ? "gh.exe" : "gh";
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error(
      result.stderr?.trim()
      || result.stdout?.trim()
      || result.error?.message
      || `gh exited ${result.status}.`,
    );
  }
  return JSON.parse(result.stdout);
}

export function readHostedCheckObservation(binding) {
  const pr = runGh([
    "pr",
    "view",
    String(binding.pullRequest),
    "--repo",
    binding.repository,
    "--json",
    "number,state,isDraft,mergeable,mergeStateStatus,baseRefOid,headRefOid,statusCheckRollup,url",
  ]);
  const commit = runGh([
    "api",
    `repos/${binding.repository}/git/commits/${pr.headRefOid}`,
  ]);
  return {
    observedIdentity: {
      pullRequest: pr.number,
      base: pr.baseRefOid,
      head: pr.headRefOid,
      tree: commit.tree?.sha ?? null,
      state: pr.state,
      isDraft: pr.isDraft,
      mergeable: pr.mergeable,
      mergeStateStatus: pr.mergeStateStatus,
      url: pr.url,
    },
    statusCheckRollup: pr.statusCheckRollup,
  };
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

export async function watchHostedChecks({
  binding,
  policy,
  receiptRoot = DEFAULT_RECEIPT_ROOT,
  readObservation = readHostedCheckObservation,
  now = () => new Date(),
  waitFor = wait,
}) {
  const started = now();
  let observationCount = 0;
  let latest = null;
  while (true) {
    observationCount += 1;
    latest = readObservation(binding);
    const current = now();
    const elapsedMs = current.getTime() - started.getTime();
    const evaluation = evaluateHostedCheckObservation({
      binding,
      expectedCheckNames: policy.expectedCheckNames,
      ...latest,
      timedOut: elapsedMs >= policy.timeoutMs,
    });
    if (evaluation.outcome !== null) {
      const receipt = createHostedCheckReceipt({
        binding,
        policy,
        ...latest,
        startedAt: started.toISOString(),
        finishedAt: current.toISOString(),
        observationCount,
        timedOut: elapsedMs >= policy.timeoutMs,
        observationBasis: "LIVE_WATCH",
      });
      await fs.mkdir(receiptRoot, { recursive: true });
      const receiptPath = path.join(
        receiptRoot,
        `${receipt.receiptDigest.slice("sha256:".length)}.json`,
      );
      await fs.writeFile(
        receiptPath,
        `${JSON.stringify(receipt, null, 2)}\n`,
        { flag: "wx" },
      ).catch(async (error) => {
        if (error?.code !== "EEXIST") throw error;
        const existing = JSON.parse(await fs.readFile(receiptPath, "utf8"));
        if (canonicalJson(existing) !== canonicalJson(receipt)) {
          throw new Error("Existing content-addressed receipt does not match.");
        }
      });
      return { receipt, receiptPath };
    }
    await waitFor(
      Math.min(
        policy.pollIntervalMs,
        Math.max(1, policy.timeoutMs - elapsedMs),
      ),
    );
  }
}

async function main() {
  const options = parseHostedCheckWatcherArgs(process.argv.slice(2));
  const { receipt, receiptPath } = await watchHostedChecks(options);
  process.stdout.write(`${JSON.stringify({ receiptPath, receipt }, null, 2)}\n`);
  process.exitCode = receipt.outcome === "SUCCESS"
    ? 0
    : receipt.outcome === "FAILURE"
      ? 1
      : 2;
}

if (path.resolve(process.argv[1] ?? "") === currentFilePath) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 1;
  });
}
