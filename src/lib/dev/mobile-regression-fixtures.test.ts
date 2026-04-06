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
    assert.equal(contracts.hasSingleTopSpacingOwner, true, `${scenario.id}: duplicate top safe-area spacing owners`);
    assert.equal(contracts.hasSingleBottomDockSpacingOwner, true, `${scenario.id}: duplicate bottom dock spacing owners`);
    assert.equal(contracts.chipsStayWithinViewport, true, `${scenario.id}: filter chips clipped off screen`);
    assert.equal(contracts.longTextLayoutStable, true, `${scenario.id}: long title/metadata layout became unstable`);
    assert.equal(contracts.noImpossibleLoggedSkippedMix, true, `${scenario.id}: invalid logged+skipped mixed state`);
    assert.equal(contracts.cardStateCorrectness, true, `${scenario.id}: invalid card state mapping`);
    assert.equal(contracts.reorderTextStable, true, `${scenario.id}: reorder text drifted`);
    assert.equal(contracts.goalFormReadable, true, `${scenario.id}: goal form readability regressed`);
    assert.equal(contracts.routeUsesFloatingHeader, true, `${scenario.id}: route header is not using floatingHeader`);
    assert.equal(contracts.todayHeaderMatchesSelectedDay, true, `${scenario.id}: Today header drifted from selected day`);
    assert.equal(contracts.restDayHasNoExtraLowerFillerBox, true, `${scenario.id}: rest day introduced lower filler box`);
    assert.equal(contracts.editDayHeaderPinned, true, `${scenario.id}: Edit Day header is not pinned`);
    assert.equal(contracts.editDayReorderActionVisible, true, `${scenario.id}: Edit Day reorder action is hidden`);
    assert.equal(contracts.editDayManualOrderEditClamps, true, `${scenario.id}: Edit Day manual order editing no longer clamps`);
    assert.equal(
      contracts.routineDetailsBottomDockLayoutConsistent,
      true,
      `${scenario.id}: Routine Details dock layout diverged between new/edit`,
    );
    assert.equal(contracts.historyLogViewHasOneHeader, true, `${scenario.id}: History Log view header count regressed`);
    assert.equal(
      contracts.exerciseInfoUsesPinnedFloatingHeader,
      true,
      `${scenario.id}: Exercise Info lost pinned floating header`,
    );
    assert.equal(
      contracts.currentSessionSaveSetUsesPinnedFloatingHeader,
      true,
      `${scenario.id}: Current Session Save Set lost pinned floating header`,
    );
  }
});
