import assert from "node:assert/strict";
import test from "node:test";

import { mobileRegressionScenarios } from "./mobileRegressionFixtures.ts";
import { validateMobileScenarioContracts } from "./mobileRegressionContracts.ts";

const expectedScenarioIds = [
  "today-default",
  "today-in-session-summary",
  "active-workout-session",
  "routines-current-view",
  "routines-list-view",
  "view-day",
  "edit-day-default",
  "edit-day-reorder",
  "edit-day-rest",
  "edit-day-edit-exercise",
  "edit-day-add-exercise",
  "create-routine",
  "edit-routine",
  "add-exercise-default",
] as const;

test("mobile regression fixtures include the deterministic screenshot contract inventory", () => {
  assert.deepEqual(
    mobileRegressionScenarios.map((scenario) => scenario.id),
    expectedScenarioIds,
  );
  assert.ok(mobileRegressionScenarios.every((scenario) => scenario.fixtureState.endsWith("-v1")));
});

test("mobile regression fixture contracts pass for the full fixture suite", () => {
  for (const scenario of mobileRegressionScenarios) {
    const contracts = validateMobileScenarioContracts(scenario);
    assert.equal(contracts.finalRowVisibleAboveDock, true, `${scenario.id}: final row clipped by bottom dock`);
    assert.equal(contracts.titleRespectsSafeArea, true, `${scenario.id}: title rendered under safe area`);
    assert.equal(contracts.chipsStayWithinViewport, true, `${scenario.id}: filter chips clipped off screen`);
    assert.equal(contracts.longTextLayoutStable, true, `${scenario.id}: long title/metadata layout became unstable`);
    assert.equal(contracts.noImpossibleLoggedSkippedMix, true, `${scenario.id}: invalid logged+skipped mixed state`);
    assert.equal(contracts.cardStateCorrectness, true, `${scenario.id}: invalid card state mapping`);
    assert.equal(contracts.reorderTextStable, true, `${scenario.id}: reorder text drifted`);
    assert.equal(contracts.goalFormReadable, true, `${scenario.id}: goal form readability regressed`);
  }
});
