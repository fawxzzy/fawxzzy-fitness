import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  createHostedCheckReceipt,
  evaluateHostedCheckObservation,
  parseHostedCheckWatcherArgs,
  watchHostedChecks,
} from "./fitness-hosted-check-watcher.mjs";

const BINDING = Object.freeze({
  repository: "fawxzzy/fawxzzy-fitness",
  pullRequest: 118,
  base: "4f7fd475d9e27e2226f900215468e0474017a16e",
  head: "85bbcce671aaa4ca8856f60a480d033fcaa1bc46",
  tree: "4bb509274519ee0f6fedeac9493107851f068fd3",
});
const EXPECTED_CHECKS = Object.freeze([
  {
    name: "Playbook clean-environment validation",
    workflowName: "CI",
    appSlug: "github-actions",
  },
  {
    name: "contract-check",
    workflowName: "atlas-contracts",
    appSlug: "github-actions",
  },
  {
    name: "coverage-contract",
    workflowName: "Planning coverage contract",
    appSlug: "github-actions",
  },
  {
    name: "ranking-contract",
    workflowName: "Planning candidate ranking contract",
    appSlug: "github-actions",
  },
  {
    name: "selection-contract",
    workflowName: "Planning global selection contract",
    appSlug: "github-actions",
  },
  {
    name: "session-allocation-contract",
    workflowName: "Planning session allocation contract",
    appSlug: "github-actions",
  },
  { name: "verify", workflowName: "CI", appSlug: "github-actions" },
]);
const POLICY = Object.freeze({
  expectedChecks: EXPECTED_CHECKS,
  timeoutMs: 55_000,
  pollIntervalMs: 10_000,
});
const OBSERVED_IDENTITY = Object.freeze({
  pullRequest: 118,
  base: BINDING.base,
  head: BINDING.head,
  tree: BINDING.tree,
  state: "OPEN",
  isDraft: true,
  mergeable: "MERGEABLE",
  mergeStateStatus: "CLEAN",
  url: "https://github.com/fawxzzy/fawxzzy-fitness/pull/118",
});

function check(name, workflowName, detailsUrl, overrides = {}) {
  return {
    __typename: "CheckRun",
    name,
    workflowName,
    detailsUrl,
    appSlug: "github-actions",
    status: "COMPLETED",
    conclusion: "SUCCESS",
    ...overrides,
  };
}

const SUCCESS_GRAPH = Object.freeze([
  check(
    "verify",
    "CI",
    "https://github.com/fawxzzy/fawxzzy-fitness/actions/runs/30430286347/job/90505705187",
  ),
  check(
    "ranking-contract",
    "Planning candidate ranking contract",
    "https://github.com/fawxzzy/fawxzzy-fitness/actions/runs/30430286320/job/90505704989",
  ),
  check(
    "coverage-contract",
    "Planning coverage contract",
    "https://github.com/fawxzzy/fawxzzy-fitness/actions/runs/30430286329/job/90505705069",
  ),
  check(
    "selection-contract",
    "Planning global selection contract",
    "https://github.com/fawxzzy/fawxzzy-fitness/actions/runs/30430286305/job/90505705536",
  ),
  check(
    "session-allocation-contract",
    "Planning session allocation contract",
    "https://github.com/fawxzzy/fawxzzy-fitness/actions/runs/30430286346/job/90505705653",
  ),
  check(
    "contract-check",
    "atlas-contracts",
    "https://github.com/fawxzzy/fawxzzy-fitness/actions/runs/30430286275/job/90505704958",
  ),
  check(
    "Playbook clean-environment validation",
    "CI",
    "https://github.com/fawxzzy/fawxzzy-fitness/actions/runs/30430286347/job/90505705269",
  ),
]);

test("authenticated PR 118 timeout and later success produce distinct v2 receipts", () => {
  const timeoutGraph = structuredClone(SUCCESS_GRAPH);
  timeoutGraph.find((entry) => entry.name === "verify").status = "IN_PROGRESS";
  timeoutGraph.find((entry) => entry.name === "verify").conclusion = "";
  const timeoutReceipt = createHostedCheckReceipt({
    binding: BINDING,
    policy: POLICY,
    observedIdentity: OBSERVED_IDENTITY,
    statusCheckRollup: timeoutGraph,
    startedAt: null,
    finishedAt: null,
    observationCount: null,
    timedOut: true,
    observationBasis: "RECONSTRUCTED_FROM_BOUND_READBACK",
  });
  const successReceipt = createHostedCheckReceipt({
    binding: BINDING,
    policy: POLICY,
    observedIdentity: OBSERVED_IDENTITY,
    statusCheckRollup: SUCCESS_GRAPH,
    startedAt: null,
    finishedAt: null,
    observationCount: null,
    timedOut: false,
    observationBasis: "RECONSTRUCTED_FROM_BOUND_READBACK",
  });

  assert.equal(timeoutReceipt.outcome, "TIMEOUT");
  assert.deepEqual(timeoutReceipt.observation.pendingCheckNames, ["verify"]);
  assert.equal(successReceipt.outcome, "SUCCESS");
  assert.deepEqual(successReceipt.observation.pendingCheckNames, []);
  assert.notEqual(timeoutReceipt.receiptDigest, successReceipt.receiptDigest);
});

test("terminal non-success and identity drift fail closed", () => {
  const failedGraph = structuredClone(SUCCESS_GRAPH);
  failedGraph.find((entry) => entry.name === "verify").conclusion = "FAILURE";
  const failed = createHostedCheckReceipt({
    binding: BINDING,
    policy: POLICY,
    observedIdentity: OBSERVED_IDENTITY,
    statusCheckRollup: failedGraph,
    startedAt: null,
    finishedAt: null,
    observationCount: 7,
    observationBasis: "SYNTHETIC_FAILURE_REGRESSION",
  });
  assert.equal(failed.outcome, "FAILURE");
  assert.match(failed.errors.join("\n"), /terminal non-success/);

  const drifted = evaluateHostedCheckObservation({
    binding: BINDING,
    expectedChecks: EXPECTED_CHECKS,
    observedIdentity: {
      ...OBSERVED_IDENTITY,
      head: "0".repeat(40),
    },
    statusCheckRollup: SUCCESS_GRAPH,
  });
  assert.equal(drifted.outcome, "FAILURE");
  assert.match(drifted.errors.join("\n"), /does not equal bound/);
});

test("missing checks remain pending until the bounded timeout", () => {
  const partial = SUCCESS_GRAPH.filter((entry) => entry.name !== "verify");
  assert.equal(
    evaluateHostedCheckObservation({
      binding: BINDING,
      expectedChecks: EXPECTED_CHECKS,
      observedIdentity: OBSERVED_IDENTITY,
      statusCheckRollup: partial,
    }).outcome,
    null,
  );
  const timedOut = evaluateHostedCheckObservation({
    binding: BINDING,
    expectedChecks: EXPECTED_CHECKS,
    observedIdentity: OBSERVED_IDENTITY,
    statusCheckRollup: partial,
    timedOut: true,
  });
  assert.equal(timedOut.outcome, "TIMEOUT");
  assert.deepEqual(timedOut.missingCheckNames, ["verify"]);
});

test("status contexts and forged workflow provenance fail closed", () => {
  const statusContexts = SUCCESS_GRAPH.map((entry) => ({
    __typename: "StatusContext",
    context: entry.name,
    state: "SUCCESS",
    targetUrl: "https://example.com/not-github-actions",
  }));
  const substituted = evaluateHostedCheckObservation({
    binding: BINDING,
    expectedChecks: EXPECTED_CHECKS,
    observedIdentity: OBSERVED_IDENTITY,
    statusCheckRollup: statusContexts,
  });
  assert.equal(substituted.outcome, "FAILURE");
  assert.match(substituted.errors.join("\n"), /must be a GitHub Actions CheckRun/);

  const wrongWorkflow = structuredClone(SUCCESS_GRAPH);
  wrongWorkflow.find((entry) => entry.name === "verify").workflowName =
    "Unrelated workflow";
  const workflowSubstitution = evaluateHostedCheckObservation({
    binding: BINDING,
    expectedChecks: EXPECTED_CHECKS,
    observedIdentity: OBSERVED_IDENTITY,
    statusCheckRollup: wrongWorkflow,
  });
  assert.equal(workflowSubstitution.outcome, "FAILURE");
  assert.match(workflowSubstitution.errors.join("\n"), /does not equal bound CI/);

  const wrongRepository = structuredClone(SUCCESS_GRAPH);
  wrongRepository.find((entry) => entry.name === "verify").detailsUrl =
    "https://github.com/attacker/forged/actions/runs/1/job/2";
  const urlSubstitution = evaluateHostedCheckObservation({
    binding: BINDING,
    expectedChecks: EXPECTED_CHECKS,
    observedIdentity: OBSERVED_IDENTITY,
    statusCheckRollup: wrongRepository,
  });
  assert.equal(urlSubstitution.outcome, "FAILURE");
  assert.match(
    urlSubstitution.errors.join("\n"),
    /not a bound GitHub Actions run\/job URL/,
  );

  const wrongApp = structuredClone(SUCCESS_GRAPH);
  wrongApp.find((entry) => entry.name === "verify").appSlug = "forged-app";
  const appSubstitution = evaluateHostedCheckObservation({
    binding: BINDING,
    expectedChecks: EXPECTED_CHECKS,
    observedIdentity: OBSERVED_IDENTITY,
    statusCheckRollup: wrongApp,
  });
  assert.equal(appSubstitution.outcome, "FAILURE");
  assert.match(appSubstitution.errors.join("\n"), /does not equal bound github-actions/);
});

test("arguments require exact identity and canonicalize the check policy", () => {
  const parsed = parseHostedCheckWatcherArgs([
    "--repo",
    BINDING.repository,
    "--pr",
    String(BINDING.pullRequest),
    "--base",
    BINDING.base,
    "--head",
    BINDING.head,
    "--tree",
    BINDING.tree,
    "--check",
    "verify::CI::github-actions",
    "--check",
    "contract-check::atlas-contracts::github-actions",
    "--timeout-ms",
    "55000",
    "--poll-ms",
    "10000",
  ]);
  assert.deepEqual(parsed.policy.expectedChecks, [
    {
      name: "contract-check",
      workflowName: "atlas-contracts",
      appSlug: "github-actions",
    },
    { name: "verify", workflowName: "CI", appSlug: "github-actions" },
  ]);
  assert.equal(parsed.policy.timeoutMs, 55_000);
  assert.throws(
    () => parseHostedCheckWatcherArgs(["--repo", BINDING.repository]),
    /binding.pullRequest/,
  );
  assert.throws(
    () => parseHostedCheckWatcherArgs([
      "--repo",
      BINDING.repository,
      "--pr",
      String(BINDING.pullRequest),
      "--base",
      BINDING.base,
      "--head",
      BINDING.head,
      "--tree",
      BINDING.tree,
      "--check",
      "verify",
    ]),
    /name::workflowName::appSlug/,
  );
  assert.throws(
    () => parseHostedCheckWatcherArgs([
      "--repo",
      BINDING.repository,
      "--pr",
      String(BINDING.pullRequest),
      "--base",
      BINDING.base,
      "--head",
      BINDING.head,
      "--tree",
      BINDING.tree,
      "--check",
      "verify::CI::github-actions",
      "--check",
      "verify::CI::github-actions",
    ]),
    /duplicate check names/,
  );
});

test("the dedicated workflow watches and executes the watcher contract", async () => {
  const workflow = await fs.readFile(
    path.resolve(
      ".github",
      "workflows",
      "planning-session-allocation-contract.yml",
    ),
    "utf8",
  );
  for (const watcherPath of [
    "scripts/release/fitness-hosted-check-watcher.mjs",
    "scripts/release/fitness-hosted-check-watcher.test.mjs",
  ]) {
    assert.equal(
      workflow.split(`- "${watcherPath}"`).length - 1,
      2,
      `${watcherPath} must be watched on pull requests and main pushes.`,
    );
  }
  assert.match(
    workflow,
    /node --test scripts\/release\/fitness-hosted-check-watcher\.test\.mjs/,
  );
});

test("a terminal observation writes one immutable content-addressed receipt", async (t) => {
  const receiptRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "fitness-hosted-check-watcher-"),
  );
  t.after(() => fs.rm(receiptRoot, { recursive: true, force: true }));
  const timestamps = [
    new Date("2026-07-29T07:04:01.000Z"),
    new Date("2026-07-29T07:04:02.000Z"),
  ];
  const result = await watchHostedChecks({
    binding: BINDING,
    policy: POLICY,
    receiptRoot,
    readObservation: () => ({
      observedIdentity: OBSERVED_IDENTITY,
      statusCheckRollup: SUCCESS_GRAPH,
    }),
    now: () => timestamps.shift() ?? new Date("2026-07-29T07:04:02.000Z"),
    waitFor: () => {
      throw new Error("A terminal graph must not wait.");
    },
  });
  assert.equal(result.receipt.outcome, "SUCCESS");
  assert.equal(
    path.basename(result.receiptPath),
    `${result.receipt.receiptDigest.slice("sha256:".length)}.json`,
  );
  assert.deepEqual(
    JSON.parse(await fs.readFile(result.receiptPath, "utf8")),
    result.receipt,
  );
});
