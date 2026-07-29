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
  "Playbook clean-environment validation",
  "contract-check",
  "coverage-contract",
  "ranking-contract",
  "selection-contract",
  "session-allocation-contract",
  "verify",
]);
const POLICY = Object.freeze({
  expectedCheckNames: EXPECTED_CHECKS,
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

test("observed PR 118 timeout and later success produce distinct pinned receipts", () => {
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
  assert.equal(
    timeoutReceipt.receiptDigest,
    "sha256:a43cf648c2a3c37fae89a652e36c60634e4f187fb921bf9c9fefe6219b395b6a",
  );
  assert.equal(
    successReceipt.receiptDigest,
    "sha256:4dd52d9dbd10ffd75e39f4887ad2afddfa645a055de1110e7588744accd8ce27",
  );
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
  assert.equal(
    failed.receiptDigest,
    "sha256:bc283b3a4edeb7b6ca79175d28c028fb2b625fe3369c6074813bc105763b9b4a",
  );

  const drifted = evaluateHostedCheckObservation({
    binding: BINDING,
    expectedCheckNames: EXPECTED_CHECKS,
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
      expectedCheckNames: EXPECTED_CHECKS,
      observedIdentity: OBSERVED_IDENTITY,
      statusCheckRollup: partial,
    }).outcome,
    null,
  );
  const timedOut = evaluateHostedCheckObservation({
    binding: BINDING,
    expectedCheckNames: EXPECTED_CHECKS,
    observedIdentity: OBSERVED_IDENTITY,
    statusCheckRollup: partial,
    timedOut: true,
  });
  assert.equal(timedOut.outcome, "TIMEOUT");
  assert.deepEqual(timedOut.missingCheckNames, ["verify"]);
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
    "verify",
    "--check",
    "contract-check",
    "--check",
    "verify",
    "--timeout-ms",
    "55000",
    "--poll-ms",
    "10000",
  ]);
  assert.deepEqual(parsed.policy.expectedCheckNames, [
    "contract-check",
    "verify",
  ]);
  assert.equal(parsed.policy.timeoutMs, 55_000);
  assert.throws(
    () => parseHostedCheckWatcherArgs(["--repo", BINDING.repository]),
    /binding.pullRequest/,
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
