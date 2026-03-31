import assert from "node:assert/strict";
import test from "node:test";

import { mobileRegressionScenarios } from "./mobileRegressionFixtures.ts";
import { validateMobileScenarioContracts } from "./mobileRegressionContracts.ts";

const expectedScenarioIds = [
  "today-selected-day",
  "today-day-picker-open",
  "today-rest-day",
  "today-in-session-summary",
  "active-workout-session",
  "add-exercise-default",
  "add-exercise-filters-expanded",
  "add-exercise-long-title-metadata",
  "add-exercise-goal-configuration",
  "exercise-detail-view",
] as const;

test("mobile regression fixtures include every required route-level scenario", () => {
  assert.deepEqual(
    mobileRegressionScenarios.map((scenario) => scenario.id),
    expectedScenarioIds,
  );
});

test("mobile regression fixture contracts pass for the full fixture suite", () => {
  for (const scenario of mobileRegressionScenarios) {
    const contracts = validateMobileScenarioContracts(scenario);
    assert.equal(contracts.finalRowVisibleAboveDock, true, `${scenario.id}: final row clipped by bottom dock`);
    assert.equal(contracts.titleRespectsSafeArea, true, `${scenario.id}: title rendered under safe area`);
    assert.equal(contracts.chipsStayWithinViewport, true, `${scenario.id}: filter chips clipped off screen`);
    assert.equal(contracts.longTextLayoutStable, true, `${scenario.id}: long title/metadata layout became unstable`);
    assert.equal(contracts.noImpossibleLoggedSkippedMix, true, `${scenario.id}: invalid logged+skipped mixed state`);
  }
});

test("logged + skipped mixed state only renders when explicitly modeled", () => {
  const baselineScenario = mobileRegressionScenarios.find((scenario) => scenario.id === "active-workout-session");
  assert.ok(baselineScenario, "Missing active-workout-session fixture");

  const shouldFail = validateMobileScenarioContracts({
    ...baselineScenario,
    statusChips: ["logged", "skipped"],
  });
  assert.equal(shouldFail.noImpossibleLoggedSkippedMix, false);

  const shouldPass = validateMobileScenarioContracts({
    ...baselineScenario,
    statusChips: ["logged", "skipped"],
    allowLoggedAndSkipped: true,
  });
  assert.equal(shouldPass.noImpossibleLoggedSkippedMix, true);
});
