import assert from "node:assert/strict";
import test from "node:test";

import {
  mobileRegressionScenarios,
  resolveMobileRegressionScenario,
} from "./mobileRegressionFixtures.ts";
import { validateMobileScenarioContracts } from "./mobileRegressionContracts.ts";

const expectedScenarioIds = [
  "today-default",
  "today-rest",
  "today-empty",
  "today-in-session-summary",
  "active-workout-session",
  "routines-current-view",
  "routines-list-view",
  "view-day",
  "view-day-rest",
  "view-day-empty",
  "edit-day-default",
  "edit-day-reorder",
  "edit-day-rest",
  "edit-day-empty",
  "edit-day-edit-exercise",
  "edit-day-add-exercise",
  "edit-day-card-parity",
  "create-routine",
  "edit-routine",
  "add-exercise-default",
  "history-sessions-extreme",
  "history-exercises-zero-results",
  "history-exercises-detailed",
  "history-detail-broken-images",
  "settings-default",
  "exercise-detail-broken-images",
  "exercise-detail-long-scroll",
] as const;

const expectedScenarioFamilies = [
  ["today-default", "Exercise cards"],
  ["today-rest", "Exercise cards"],
  ["today-empty", "Exercise cards"],
  ["today-in-session-summary", "Exercise cards"],
  ["active-workout-session", "Session / logging"],
  ["routines-current-view", "Exercise cards"],
  ["routines-list-view", "Exercise cards"],
  ["view-day", "Exercise cards"],
  ["view-day-rest", "Exercise cards"],
  ["view-day-empty", "Exercise cards"],
  ["edit-day-default", "Exercise cards"],
  ["edit-day-reorder", "Exercise cards"],
  ["edit-day-rest", "Exercise cards"],
  ["edit-day-empty", "Exercise cards"],
  ["edit-day-edit-exercise", "Exercise cards"],
  ["edit-day-add-exercise", "Exercise cards"],
  ["edit-day-card-parity", "Exercise cards"],
  ["create-routine", "Exercise cards"],
  ["edit-routine", "Exercise cards"],
  ["add-exercise-default", "Exercise cards"],
  ["history-sessions-extreme", "Session summaries"],
  ["history-exercises-zero-results", "Exercise cards"],
  ["history-exercises-detailed", "Exercise cards"],
  ["history-detail-broken-images", "Session summaries"],
  ["settings-default", "Settings / detail"],
  ["exercise-detail-broken-images", "Settings / detail"],
  ["exercise-detail-long-scroll", "Settings / detail"],
] as const;

test("mobile regression fixtures include the deterministic screenshot contract inventory", () => {
  assert.deepEqual(
    mobileRegressionScenarios.map((scenario) => scenario.id),
    expectedScenarioIds,
  );
  assert.ok(mobileRegressionScenarios.every((scenario) => /-v\d+$/.test(scenario.fixtureState)));
});

test("mobile regression fixtures pin explicit board families", () => {
  assert.deepEqual(
    mobileRegressionScenarios.map((scenario) => [scenario.id, scenario.family]),
    expectedScenarioFamilies,
  );
});

test("mobile regression fixture contracts pass for the full fixture suite", () => {
  for (const scenario of mobileRegressionScenarios) {
    const contracts = validateMobileScenarioContracts(scenario);
    assert.equal(contracts.finalRowVisibleAboveDock, true, `${scenario.id}: final row clipped by bottom dock`);
    assert.equal(contracts.titleRespectsSafeArea, true, `${scenario.id}: title rendered under safe area`);
    assert.equal(contracts.hasSingleTopSpacingOwner, true, `${scenario.id}: duplicate top safe-area spacing owners`);
    assert.equal(contracts.hasSingleBottomDockSpacingOwner, true, `${scenario.id}: duplicate bottom dock spacing owners`);
    assert.equal(contracts.chipsStayWithinViewport, true, `${scenario.id}: filter chips clipped off screen`);
    assert.equal(contracts.sectionChromeOwnedByShell, true, `${scenario.id}: a shared section still owns rectangular chrome outside the rounded shell`);
    assert.equal(contracts.longTextLayoutStable, true, `${scenario.id}: long title/metadata layout became unstable`);
    assert.equal(contracts.noImpossibleLoggedSkippedMix, true, `${scenario.id}: invalid logged+skipped mixed state`);
    assert.equal(contracts.cardStateCorrectness, true, `${scenario.id}: invalid card state mapping`);
    assert.equal(contracts.reorderTextStable, true, `${scenario.id}: reorder text drifted`);
    assert.equal(contracts.goalFormReadable, true, `${scenario.id}: goal form readability regressed`);
    assert.equal(contracts.goalRowBehaviorStable, true, `${scenario.id}: goal copy no longer has its own readable row`);
    assert.equal(contracts.detailedModeClearlyRicher, true, `${scenario.id}: detailed mode no longer adds enough analytics density`);
    assert.equal(contracts.exerciseInfoAnalyticsLayoutReady, true, `${scenario.id}: Exercise Info lost media visibility or analytics density`);
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

test("mobile regression fixtures expose stable screen/fixture query pairs", () => {
  const pairs = mobileRegressionScenarios.map((scenario) => `${scenario.screen}:${scenario.fixture}`);
  assert.equal(new Set(pairs).size, mobileRegressionScenarios.length);
  assert.equal(resolveMobileRegressionScenario({ screen: "today", fixture: "default" })?.id, "today-default");
  assert.equal(resolveMobileRegressionScenario({ screen: "today", fixture: "rest" })?.id, "today-rest");
  assert.equal(resolveMobileRegressionScenario({ screen: "today", fixture: "empty" })?.id, "today-empty");
  assert.equal(resolveMobileRegressionScenario({ screen: "view-day", fixture: "rest" })?.id, "view-day-rest");
  assert.equal(resolveMobileRegressionScenario({ screen: "view-day", fixture: "empty" })?.id, "view-day-empty");
  assert.equal(resolveMobileRegressionScenario({ screen: "edit-day", fixture: "reorder" })?.id, "edit-day-reorder");
  assert.equal(resolveMobileRegressionScenario({ screen: "edit-day", fixture: "empty" })?.id, "edit-day-empty");
  assert.equal(resolveMobileRegressionScenario({ screen: "edit-day", fixture: "card-parity" })?.id, "edit-day-card-parity");
  assert.equal(resolveMobileRegressionScenario({ screen: "routines", fixture: "default" })?.id, "routines-current-view");
  assert.equal(resolveMobileRegressionScenario({ screen: "history", fixture: "default" })?.id, "history-sessions-extreme");
  assert.equal(resolveMobileRegressionScenario({ screen: "history-exercises", fixture: "detailed" })?.id, "history-exercises-detailed");
  assert.equal(resolveMobileRegressionScenario({ screen: "exercise-detail", fixture: "default" })?.id, "exercise-detail-broken-images");
  assert.equal(resolveMobileRegressionScenario({ screen: "exercise-detail", fixture: "long-scroll" })?.id, "exercise-detail-long-scroll");
  assert.equal(resolveMobileRegressionScenario({ scenario: "settings-default" })?.id, "settings-default");
});
