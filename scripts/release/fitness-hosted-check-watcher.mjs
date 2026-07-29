import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const HOSTED_CHECK_WATCHER_VERSION =
  "fitness.hosted-check-watcher.2026-07-29.v2";
export const HOSTED_CHECK_RECEIPT_SCHEMA =
  "fitness.hosted-check-watch-receipt.v2";
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
      appSlug: normalizeString(check.appSlug ?? check.app?.slug),
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
      appSlug: null,
      status: state === "PENDING" ? "IN_PROGRESS" : "COMPLETED",
      conclusion: state,
      detailsUrl: normalizeString(check.targetUrl),
    };
  }
  return {
    kind: "unknown",
    name: normalizeString(check?.name ?? check?.context),
    workflowName: normalizeString(check?.workflowName),
    appSlug: normalizeString(check?.appSlug ?? check?.app?.slug),
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

function normalizeExpectedChecks(values) {
  return values
    .map((value) => ({
      name: normalizeString(value?.name),
      workflowName: normalizeString(value?.workflowName),
      appSlug: normalizeString(value?.appSlug),
    }))
    .sort((left, right) => canonicalCompare(
      `${left.name ?? ""}\u0000${left.workflowName ?? ""}\u0000${left.appSlug ?? ""}`,
      `${right.name ?? ""}\u0000${right.workflowName ?? ""}\u0000${right.appSlug ?? ""}`,
    ));
}

function validateExpectedChecks(expectedChecks) {
  const errors = [];
  if (expectedChecks.length === 0) {
    errors.push("At least one exact expected check policy is required.");
    return errors;
  }
  if (
    expectedChecks.some(
      (check) => (
        check.name === null
        || check.workflowName === null
        || check.appSlug === null
      ),
    )
  ) {
    errors.push(
      "Every expected check policy requires a non-empty name, workflowName, and appSlug.",
    );
  }
  const names = expectedChecks
    .map((check) => check.name)
    .filter((name) => name !== null);
  const duplicateNames = names.filter(
    (name, index) => names.indexOf(name) !== index,
  );
  if (duplicateNames.length > 0) {
    errors.push(
      `Expected duplicate check names: ${uniqueCanonicalStrings(duplicateNames).join(", ")}.`,
    );
  }
  return errors;
}

function isBoundGitHubActionsJobUrl(detailsUrl, repository) {
  try {
    const url = new URL(detailsUrl);
    const escapedRepository = repository
      .split("/")
      .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("/");
    return (
      url.protocol === "https:"
      && url.hostname === "github.com"
      && url.username === ""
      && url.password === ""
      && url.search === ""
      && url.hash === ""
      && new RegExp(
        `^/${escapedRepository}/actions/runs/[1-9][0-9]*/job/[1-9][0-9]*/?$`,
      ).test(url.pathname)
    );
  } catch {
    return false;
  }
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
  expectedChecks,
  observedIdentity,
  statusCheckRollup,
  timedOut = false,
}) {
  const expected = normalizeExpectedChecks(expectedChecks ?? []);
  const expectedNames = expected
    .map((check) => check.name)
    .filter((name) => name !== null);
  const graph = normalizeHostedCheckGraph(statusCheckRollup);
  const errors = [
    ...validateBinding(binding),
    ...validateExpectedChecks(expected),
    ...identityErrors(binding, observedIdentity),
  ];

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
    actualNames.filter((name) => !expectedNames.includes(name)),
  );
  if (unexpected.length > 0) {
    errors.push(`Observed unexpected checks: ${unexpected.join(", ")}.`);
  }

  const missing = expectedNames.filter((name) => !actualNames.includes(name));
  const observedExpectedChecks = graph.filter(
    (check) => check.name !== null && expectedNames.includes(check.name),
  );
  for (const policyEntry of expected) {
    if (policyEntry.name === null) continue;
    const observed = observedExpectedChecks.find(
      (check) => check.name === policyEntry.name,
    );
    if (!observed) continue;
    if (observed.kind !== "check_run") {
      errors.push(
        `Observed ${policyEntry.name} must be a GitHub Actions CheckRun.`,
      );
    }
    if (observed.workflowName !== policyEntry.workflowName) {
      errors.push(
        `Observed ${policyEntry.name} workflow ${String(observed.workflowName)} does not equal bound ${String(policyEntry.workflowName)}.`,
      );
    }
    if (observed.appSlug !== policyEntry.appSlug) {
      errors.push(
        `Observed ${policyEntry.name} app ${String(observed.appSlug)} does not equal bound ${String(policyEntry.appSlug)}.`,
      );
    }
    if (!isBoundGitHubActionsJobUrl(observed.detailsUrl, binding.repository)) {
      errors.push(
        `Observed ${policyEntry.name} detailsUrl is not a bound GitHub Actions run/job URL.`,
      );
    }
  }
  const failed = observedExpectedChecks.filter(
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

  const pending = expectedNames.filter((name) => {
    const check = observedExpectedChecks.find((entry) => entry.name === name);
    return !check || check.status !== "COMPLETED";
  });
  const allSuccessful = (
    errors.length === 0
    && missing.length === 0
    && observedExpectedChecks.length === expectedNames.length
    && observedExpectedChecks.every(
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
    expectedChecks: expected,
    expectedCheckNames: expectedNames,
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
    expectedChecks: policy.expectedChecks,
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
      expectedChecks: evaluation.expectedChecks,
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
    expectedChecks: [],
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
    else if (flag === "--check") {
      const separatorIndex = value?.indexOf("::") ?? -1;
      const secondSeparatorIndex = value?.indexOf(
        "::",
        separatorIndex + 2,
      ) ?? -1;
      if (
        separatorIndex < 1
        || secondSeparatorIndex <= separatorIndex + 2
        || secondSeparatorIndex === value.length - 2
      ) {
        throw new Error(
          "--check must use the exact name::workflowName::appSlug form.",
        );
      }
      options.expectedChecks.push({
        name: value.slice(0, separatorIndex),
        workflowName: value.slice(
          separatorIndex + 2,
          secondSeparatorIndex,
        ),
        appSlug: value.slice(secondSeparatorIndex + 2),
      });
    }
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
  if (options.expectedChecks.length === 0) {
    throw new Error("At least one --check is required.");
  }
  const expectedChecks = normalizeExpectedChecks(options.expectedChecks);
  const policyErrors = validateExpectedChecks(expectedChecks);
  if (policyErrors.length > 0) throw new Error(policyErrors.join("\n"));
  return {
    binding,
    policy: {
      expectedChecks,
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
  const checkRunsResponse = runGh([
    "api",
    `repos/${binding.repository}/commits/${pr.headRefOid}/check-runs?per_page=100`,
  ]);
  const checkRuns = Array.isArray(checkRunsResponse?.check_runs)
    ? checkRunsResponse.check_runs
    : [];
  if (checkRunsResponse?.total_count !== checkRuns.length) {
    throw new Error(
      "GitHub check-run provenance readback was not exhaustive.",
    );
  }
  const checkRunsByIdentity = new Map();
  for (const checkRun of checkRuns) {
    const key = `${checkRun.name ?? ""}\u0000${checkRun.details_url ?? ""}`;
    if (checkRunsByIdentity.has(key)) {
      checkRunsByIdentity.set(key, null);
    } else {
      checkRunsByIdentity.set(key, checkRun);
    }
  }
  const authenticatedRollup = pr.statusCheckRollup.map((check) => {
    if (check.__typename !== "CheckRun") return check;
    const key = `${check.name ?? ""}\u0000${check.detailsUrl ?? ""}`;
    const matchingCheckRun = checkRunsByIdentity.get(key);
    return {
      ...check,
      appSlug: matchingCheckRun?.app?.slug ?? null,
    };
  });
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
    statusCheckRollup: authenticatedRollup,
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
      expectedChecks: policy.expectedChecks,
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
