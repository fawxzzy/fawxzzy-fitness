import assert from "node:assert/strict";
import test from "node:test";

import {
  PROGRESSION_RECEIPT_SCENARIOS,
  buildProgressionReceiptScenarioMatrix,
  buildScenarioMatrixRow,
  formatProgressionReceiptConsoleSummary,
} from "./progression-visual-receipt.mjs";

test("scenario matrix includes every required progression scenario", () => {
  const matrix = buildProgressionReceiptScenarioMatrix({
    scenarios: PROGRESSION_RECEIPT_SCENARIOS,
    captures: PROGRESSION_RECEIPT_SCENARIOS.map((scenario) => ({
      key: scenario.captureKey,
      route: `/dev/mobile-regression?scenario=${scenario.id}`,
      screenshotPath: `C:/ATLAS/runtime/fitness/llel-captures/latest/${scenario.screenshotFilename}`,
      status: "captured",
      reason: null,
      actionResults: scenario.actions.map((action) => ({
        id: action.id,
        status: "passed",
      })),
    })),
  });

  assert.deepEqual(matrix.map((row) => row.id), [
    "today-progression-status",
    "history-progression-default",
    "history-progression-filtered",
  ]);
});

test("scenario matrix preserves screenshot status and passing assertions", () => {
  const scenario = PROGRESSION_RECEIPT_SCENARIOS[0];
  const row = buildScenarioMatrixRow({
    scenario,
    capture: {
      key: scenario.captureKey,
      route: `/dev/mobile-regression?scenario=${scenario.id}`,
      screenshotPath: `C:/ATLAS/runtime/fitness/llel-captures/latest/${scenario.screenshotFilename}`,
      status: "captured",
      reason: null,
      actionResults: scenario.actions.map((action) => ({
        id: action.id,
        status: "passed",
      })),
    },
  });

  assert.equal(row.status, "passed");
  assert.equal(row.screenshot.produced, true);
  assert.equal(row.assertions.every((assertion) => assertion.status === "passed"), true);
});

test("failed assertions preserve reasons and later assertions stay skipped", () => {
  const scenario = PROGRESSION_RECEIPT_SCENARIOS[1];
  const row = buildScenarioMatrixRow({
    scenario,
    capture: {
      key: scenario.captureKey,
      route: `/dev/mobile-regression?scenario=${scenario.id}`,
      screenshotPath: `C:/ATLAS/runtime/fitness/llel-captures/latest/${scenario.screenshotFilename}`,
      status: "blocked",
      reason: "Progression History must stay read-only and should not expose replay or revert controls.",
      actionResults: [
        { id: "history-title-renders", status: "passed" },
        { id: "ledger-label-renders", status: "passed" },
        { id: "dashboard-card-renders", status: "failed", reason: "Card chrome missing." },
        { id: "monthly-chart-renders", status: "skipped", reason: "Skipped after dashboard-card-renders failed." },
        { id: "event-mix-chart-renders", status: "skipped", reason: "Skipped after dashboard-card-renders failed." },
        { id: "vector-card-renders", status: "skipped", reason: "Skipped after dashboard-card-renders failed." },
        { id: "event-row-renders", status: "skipped", reason: "Skipped after dashboard-card-renders failed." },
        { id: "history-read-only", status: "skipped", reason: "Skipped after dashboard-card-renders failed." },
      ],
    },
  });

  assert.equal(row.status, "failed");
  assert.equal(row.screenshot.produced, false);
  assert.equal(row.assertions[2]?.status, "failed");
  assert.equal(row.assertions[2]?.reason, "Card chrome missing.");
  assert.equal(row.assertions[3]?.status, "skipped");
  assert.match(row.assertions[3]?.reason ?? "", /Skipped after dashboard-card-renders failed/);
});

test("missing captures fail safely and include a reason", () => {
  const matrix = buildProgressionReceiptScenarioMatrix({
    scenarios: PROGRESSION_RECEIPT_SCENARIOS,
    captures: [],
  });

  assert.equal(matrix.every((row) => row.screenshot.produced === false), true);
  assert.equal(matrix.every((row) => row.assertions.every((assertion) => assertion.status === "skipped")), true);
  assert.equal(matrix.every((row) => row.assertions.every((assertion) => assertion.reason?.length)), true);
});

test("console summary stays deterministic", () => {
  const summary = formatProgressionReceiptConsoleSummary({
    scenarioMatrix: [
      {
        id: "today-progression-status",
        screenshot: { produced: true },
        status: "passed",
      },
      {
        id: "history-progression-filtered",
        screenshot: { produced: false, reason: "Capture failed." },
        status: "failed",
      },
    ],
  });

  assert.equal(summary, [
    "LLEL progression receipt",
    "- today-progression-status: passed, screenshot produced",
    "- history-progression-filtered: failed, screenshot missing (Capture failed.)",
    "",
  ].join("\n"));
});
