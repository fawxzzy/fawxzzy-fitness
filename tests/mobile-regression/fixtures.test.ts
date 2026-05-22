import assert from "node:assert/strict";
import test from "node:test";

import {
  mobileRegressionScenarios,
  resolveMobileRegressionScenario,
} from "../../src/features/mobile-regression/fixtures.ts";
import { validateMobileScenarioContracts } from "../../src/features/mobile-regression/contracts.ts";

const expectedScenarioIds = [
  "today-default",
  "today-detailed",
  "today-progression-status",
  "today-rest",
  "today-empty",
  "today-in-session-summary",
  "active-workout-session",
  "active-workout-session-expanded",
  "session-logger-combo-board",
  "session-logger-combo-board-2",
  "session-logger-combo-board-3",
  "session-logger-combo-board-4",
  "session-logger-strength-weight",
  "session-logger-bodyweight-reps",
  "session-logger-cardio-time",
  "session-logger-cardio-time-distance",
  "session-logger-cardio-distance",
  "session-logger-calories",
  "routines-current-view",
  "routines-list-view",
  "view-day",
  "view-day-rest",
  "view-day-empty",
  "edit-day-default",
  "edit-day-reorder",
  "edit-day-empty",
  "edit-day-edit-exercise",
  "edit-day-add-exercise",
  "edit-day-card-parity",
  "create-routine",
  "edit-routine",
  "add-exercise-default",
  "add-exercise-custom-taxonomy",
  "history-sessions-compact",
  "history-sessions-detailed",
  "history-progression-default",
  "history-progression-filtered",
  "history-exercises-zero-results",
  "history-exercises-compact",
  "history-exercises-detailed",
  "history-exercises-media-fallback",
  "history-exercises-cardio-taxonomy",
  "history-detail-broken-images",
  "settings-default",
  "settings-data-export",
  "exercise-detail-strength",
  "exercise-detail-cardio",
  "exercise-detail-bodyweight",
  "exercise-detail-long-scroll",
] as const;

const expectedScenarioFamilies = [
  ["today-default", "Exercise cards"],
  ["today-detailed", "Exercise cards"],
  ["today-progression-status", "Exercise cards"],
  ["today-rest", "Exercise cards"],
  ["today-empty", "Exercise cards"],
  ["today-in-session-summary", "Exercise cards"],
  ["active-workout-session", "Session / logging"],
  ["active-workout-session-expanded", "Session / logging"],
  ["session-logger-combo-board", "Session / logging"],
  ["session-logger-combo-board-2", "Session / logging"],
  ["session-logger-combo-board-3", "Session / logging"],
  ["session-logger-combo-board-4", "Session / logging"],
  ["session-logger-strength-weight", "Session / logging"],
  ["session-logger-bodyweight-reps", "Session / logging"],
  ["session-logger-cardio-time", "Session / logging"],
  ["session-logger-cardio-time-distance", "Session / logging"],
  ["session-logger-cardio-distance", "Session / logging"],
  ["session-logger-calories", "Session / logging"],
  ["routines-current-view", "Exercise cards"],
  ["routines-list-view", "Exercise cards"],
  ["view-day", "Exercise cards"],
  ["view-day-rest", "Exercise cards"],
  ["view-day-empty", "Exercise cards"],
  ["edit-day-default", "Exercise cards"],
  ["edit-day-reorder", "Exercise cards"],
  ["edit-day-empty", "Exercise cards"],
  ["edit-day-edit-exercise", "Exercise cards"],
  ["edit-day-add-exercise", "Exercise cards"],
  ["edit-day-card-parity", "Exercise cards"],
  ["create-routine", "Exercise cards"],
  ["edit-routine", "Exercise cards"],
  ["add-exercise-default", "Exercise cards"],
  ["add-exercise-custom-taxonomy", "Exercise cards"],
  ["history-sessions-compact", "Session summaries"],
  ["history-sessions-detailed", "Session summaries"],
  ["history-progression-default", "Session summaries"],
  ["history-progression-filtered", "Session summaries"],
  ["history-exercises-zero-results", "Exercise cards"],
  ["history-exercises-compact", "Exercise cards"],
  ["history-exercises-detailed", "Exercise cards"],
  ["history-exercises-media-fallback", "Exercise cards"],
  ["history-exercises-cardio-taxonomy", "Exercise cards"],
  ["history-detail-broken-images", "Session summaries"],
  ["settings-default", "Settings / detail"],
  ["settings-data-export", "Settings / detail"],
  ["exercise-detail-strength", "Settings / detail"],
  ["exercise-detail-cardio", "Settings / detail"],
  ["exercise-detail-bodyweight", "Settings / detail"],
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
    assert.equal(contracts.historyRoutesUseFloatingHeader, true, `${scenario.id}: history route lost floatingHeader ownership`);
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
    assert.equal(contracts.historyRoutesHaveSingleHeaderOwner, true, `${scenario.id}: history route now has duplicate header owners`);
    assert.equal(contracts.historySurfaceMatchesRouteFamily, true, `${scenario.id}: history route surface token drifted from its family contract`);
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
  assert.equal(resolveMobileRegressionScenario({ screen: "today", fixture: "detailed" })?.id, "today-detailed");
  assert.equal(resolveMobileRegressionScenario({ screen: "today", fixture: "rest" })?.id, "today-rest");
  assert.equal(resolveMobileRegressionScenario({ screen: "today", fixture: "empty" })?.id, "today-empty");
  assert.equal(resolveMobileRegressionScenario({ screen: "view-day", fixture: "rest" })?.id, "view-day-rest");
  assert.equal(resolveMobileRegressionScenario({ screen: "view-day", fixture: "empty" })?.id, "view-day-empty");
  assert.equal(resolveMobileRegressionScenario({ screen: "edit-day", fixture: "reorder" })?.id, "edit-day-reorder");
  assert.equal(resolveMobileRegressionScenario({ screen: "edit-day", fixture: "empty" })?.id, "edit-day-empty");
  assert.equal(resolveMobileRegressionScenario({ screen: "edit-day", fixture: "card-parity" })?.id, "edit-day-card-parity");
  assert.equal(resolveMobileRegressionScenario({ screen: "routines", fixture: "default" })?.id, "routines-current-view");
  assert.equal(resolveMobileRegressionScenario({ screen: "history", fixture: "default" })?.id, "history-sessions-compact");
  assert.equal(resolveMobileRegressionScenario({ screen: "history-sessions", fixture: "detailed" })?.id, "history-sessions-detailed");
  assert.equal(resolveMobileRegressionScenario({ screen: "history-exercises", fixture: "compact" })?.id, "history-exercises-compact");
  assert.equal(resolveMobileRegressionScenario({ screen: "history-exercises", fixture: "detailed" })?.id, "history-exercises-detailed");
  assert.equal(resolveMobileRegressionScenario({ screen: "history-exercises", fixture: "media-fallback" })?.id, "history-exercises-media-fallback");
  assert.equal(resolveMobileRegressionScenario({ screen: "history-exercises", fixture: "cardio-taxonomy" })?.id, "history-exercises-cardio-taxonomy");
  assert.equal(resolveMobileRegressionScenario({ screen: "exercise-detail", fixture: "default" })?.id, "exercise-detail-strength");
  assert.equal(resolveMobileRegressionScenario({ screen: "exercise-detail", fixture: "cardio" })?.id, "exercise-detail-cardio");
  assert.equal(resolveMobileRegressionScenario({ screen: "exercise-detail", fixture: "bodyweight" })?.id, "exercise-detail-bodyweight");
  assert.equal(resolveMobileRegressionScenario({ screen: "exercise-detail", fixture: "long-scroll" })?.id, "exercise-detail-long-scroll");
  assert.equal(resolveMobileRegressionScenario({ scenario: "settings-default" })?.id, "settings-default");
  assert.equal(resolveMobileRegressionScenario({ screen: "settings", fixture: "data-export" })?.id, "settings-data-export");
});
