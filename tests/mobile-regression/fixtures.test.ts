import assert from "node:assert/strict";
import test from "node:test";

import {
  applySessionRegressionScenarioState,
  mobileRegressionSessionScenarioFixturesById,
  mobileRegressionSelectedSessionExerciseByScenarioId,
} from "../../src/app/dev/mobile-regression/sessionScenarioFixtures.ts";
import { SESSION_COPILOT_FEEDBACK_SIGNALS } from "../../src/lib/session-copilot-feedback.ts";
import {
  mobileRegressionScenarios,
  resolveMobileRegressionScenario,
} from "../../src/features/mobile-regression/fixtures.ts";
import { validateMobileScenarioContracts } from "../../src/features/mobile-regression/contracts.ts";

const expectedScenarioIds = [
  "today-default",
  "today-detailed",
  "today-progression-status",
  "today-progression-linked",
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
  "session-post-close-feedback",
  "session-auto-progression-confirmation",
  "session-logger-cardio-time",
  "session-logger-cardio-time-distance",
  "session-logger-cardio-distance",
  "session-logger-calories",
  "routines-current-view",
  "routines-current-add-day-duplicate",
  "routines-list-view",
  "routines-list-create-duplicate",
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
  "history-detail-progression-expanded",
  "history-detail-feedback-note",
  "history-detail-long-metrics",
  "settings-default",
  "settings-data-export",
  "settings-achievements",
  "exercise-detail-strength",
  "exercise-detail-cardio",
  "exercise-detail-bodyweight",
  "exercise-detail-weighted-strength",
  "exercise-detail-weighted-strength-long-target",
  "exercise-detail-long-scroll",
] as const;

const expectedScenarioFamilies = [
  ["today-default", "Exercise cards"],
  ["today-detailed", "Exercise cards"],
  ["today-progression-status", "Exercise cards"],
  ["today-progression-linked", "Exercise cards"],
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
  ["session-post-close-feedback", "Session / logging"],
  ["session-auto-progression-confirmation", "Session / logging"],
  ["session-logger-cardio-time", "Session / logging"],
  ["session-logger-cardio-time-distance", "Session / logging"],
  ["session-logger-cardio-distance", "Session / logging"],
  ["session-logger-calories", "Session / logging"],
  ["routines-current-view", "Exercise cards"],
  ["routines-current-add-day-duplicate", "Exercise cards"],
  ["routines-list-view", "Exercise cards"],
  ["routines-list-create-duplicate", "Exercise cards"],
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
  ["history-detail-progression-expanded", "Session summaries"],
  ["history-detail-feedback-note", "Session summaries"],
  ["history-detail-long-metrics", "Session summaries"],
  ["settings-default", "Settings / detail"],
  ["settings-data-export", "Settings / detail"],
  ["settings-achievements", "Settings / detail"],
  ["exercise-detail-strength", "Settings / detail"],
  ["exercise-detail-cardio", "Settings / detail"],
  ["exercise-detail-bodyweight", "Settings / detail"],
  ["exercise-detail-weighted-strength", "Settings / detail"],
  ["exercise-detail-weighted-strength-long-target", "Settings / detail"],
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
  assert.equal(resolveMobileRegressionScenario({ screen: "routines", fixture: "current-add-day-duplicate" })?.id, "routines-current-add-day-duplicate");
  assert.equal(resolveMobileRegressionScenario({ screen: "routines", fixture: "list-create-duplicate" })?.id, "routines-list-create-duplicate");
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
  assert.equal(resolveMobileRegressionScenario({ screen: "exercise-detail", fixture: "weighted-strength" })?.id, "exercise-detail-weighted-strength");
  assert.equal(resolveMobileRegressionScenario({ screen: "exercise-detail", fixture: "weighted-strength-long-target" })?.id, "exercise-detail-weighted-strength-long-target");
  assert.equal(resolveMobileRegressionScenario({ screen: "exercise-detail", fixture: "long-scroll" })?.id, "exercise-detail-long-scroll");
  assert.equal(resolveMobileRegressionScenario({ scenario: "settings-default" })?.id, "settings-default");
  assert.equal(resolveMobileRegressionScenario({ screen: "settings", fixture: "data-export" })?.id, "settings-data-export");
});

test("expanded session regression fixture seeds a deterministic copilot feedback selection", () => {
  const capturePerformedAt = "2026-06-29T01:15:00.000Z";
  const seededExercises = applySessionRegressionScenarioState(
    "active-workout-session-expanded",
    [
      {
        id: "session-ex-1",
        copilotFeedbackSignal: "too_easy" as const,
        copilotFeedbackNote: "old note",
        copilotFeedbackUpdatedAt: "2026-06-28T23:00:00.000Z",
        copilotFeedbackEffort: 4,
      },
      {
        id: "session-ex-2",
        copilotFeedbackSignal: null,
        copilotFeedbackNote: null,
        copilotFeedbackUpdatedAt: null,
        copilotFeedbackEffort: null,
      },
    ],
    capturePerformedAt,
  );

  assert.equal(
    mobileRegressionSelectedSessionExerciseByScenarioId["active-workout-session-expanded"],
    "session-ex-2",
  );
  assert.equal(seededExercises[0]?.copilotFeedbackSignal ?? null, null);
  assert.equal(seededExercises[0]?.copilotFeedbackNote ?? null, null);
  assert.equal(seededExercises[0]?.copilotFeedbackUpdatedAt ?? null, null);
  assert.equal(seededExercises[0]?.copilotFeedbackEffort ?? null, null);
  assert.equal(seededExercises[1]?.copilotFeedbackSignal ?? null, "too_hard");
  assert.equal(seededExercises[1]?.copilotFeedbackNote ?? null, null);
  assert.equal(seededExercises[1]?.copilotFeedbackUpdatedAt ?? null, capturePerformedAt);
  assert.equal(seededExercises[1]?.copilotFeedbackEffort ?? null, 9);
});

test("session logger regression fixtures seed deterministic effort feedback across measurement families", () => {
  const capturePerformedAt = "2026-06-29T01:15:00.000Z";
  const seededScenarioChecks = [
    ["session-logger-strength-weight", "session-ex-1", "completed_as_planned", null, 5],
    ["session-logger-bodyweight-reps", "session-ex-4", "too_easy", null, 3],
    ["session-logger-cardio-time", "session-ex-5", "bad_day", null, 7],
    ["session-logger-cardio-time-distance", "session-ex-3", "form_breakdown", "Stride felt sloppy.", 8],
    ["session-logger-cardio-distance", "session-ex-6", "pain_flag", null, 10],
    ["session-logger-calories", "session-ex-7", "override_used", null, 6],
  ] as const;

  for (const [scenarioId, seededExerciseId, signal, note, effort] of seededScenarioChecks) {
    const seededExercises = applySessionRegressionScenarioState(
      scenarioId,
      [
        {
          id: seededExerciseId,
          copilotFeedbackSignal: null,
          copilotFeedbackNote: null,
          copilotFeedbackUpdatedAt: null,
          copilotFeedbackEffort: null,
        },
        {
          id: "other-exercise",
          copilotFeedbackSignal: "too_hard" as const,
          copilotFeedbackNote: "remove me",
          copilotFeedbackUpdatedAt: "2026-06-28T23:00:00.000Z",
          copilotFeedbackEffort: 9,
        },
      ],
      capturePerformedAt,
    );

    assert.equal(mobileRegressionSessionScenarioFixturesById[scenarioId]?.selectedExerciseId, seededExerciseId);
    assert.equal(mobileRegressionSelectedSessionExerciseByScenarioId[scenarioId], seededExerciseId);
    assert.equal(seededExercises[0]?.copilotFeedbackSignal ?? null, signal);
    assert.equal(seededExercises[0]?.copilotFeedbackNote ?? null, note);
    assert.equal(seededExercises[0]?.copilotFeedbackUpdatedAt ?? null, capturePerformedAt);
    assert.equal(seededExercises[0]?.copilotFeedbackEffort ?? null, effort);
    assert.equal(seededExercises[1]?.copilotFeedbackSignal ?? null, null);
    assert.equal(seededExercises[1]?.copilotFeedbackNote ?? null, null);
    assert.equal(seededExercises[1]?.copilotFeedbackUpdatedAt ?? null, null);
    assert.equal(seededExercises[1]?.copilotFeedbackEffort ?? null, null);
  }
});

test("session logger regression fixtures cover every effort feedback signal on a selected exercise", () => {
  const seededSignals = Object.values(mobileRegressionSessionScenarioFixturesById)
    .flatMap((fixture) => fixture.feedback ? [fixture.feedback.signal] : []);

  assert.deepEqual(
    [...new Set(seededSignals)].sort(),
    [...SESSION_COPILOT_FEEDBACK_SIGNALS].sort(),
  );

  for (const [scenarioId, fixture] of Object.entries(mobileRegressionSessionScenarioFixturesById)) {
    if (!fixture.feedback) {
      continue;
    }

    assert.ok(
      fixture.selectedExerciseId,
      `Expected ${scenarioId} to keep a selected exercise for seeded effort feedback.`,
    );
    assert.equal(
      fixture.feedback.exerciseId,
      fixture.selectedExerciseId,
      `Expected ${scenarioId} feedback seed to target the selected exercise.`,
    );
  }
});

test("non-expanded session regression fixtures do not inject copilot feedback state", () => {
  const baseExercises = [
    {
      id: "session-ex-1",
      copilotFeedbackSignal: "too_easy" as const,
      copilotFeedbackNote: "keep",
      copilotFeedbackUpdatedAt: "2026-06-28T23:00:00.000Z",
    },
  ];

  const seededExercises = applySessionRegressionScenarioState(
    "active-workout-session",
    baseExercises,
    "2026-06-29T01:15:00.000Z",
  );

  assert.notEqual(seededExercises, baseExercises);
  assert.deepEqual(seededExercises, baseExercises);
});

test("session logger combo-board fixture keeps feedback unseeded until a specific logger variant is selected", () => {
  const seededExercises = applySessionRegressionScenarioState(
    "session-logger-combo-board",
    [
      {
        id: "session-ex-1",
        copilotFeedbackSignal: "too_easy" as const,
        copilotFeedbackNote: "keep",
        copilotFeedbackUpdatedAt: "2026-06-28T23:00:00.000Z",
        copilotFeedbackEffort: 4,
      },
    ],
    "2026-06-29T01:15:00.000Z",
  );

  assert.equal(mobileRegressionSessionScenarioFixturesById["session-logger-combo-board"]?.selectedExerciseId ?? null, null);
  assert.equal(mobileRegressionSelectedSessionExerciseByScenarioId["session-logger-combo-board"] ?? null, null);
  assert.deepEqual(seededExercises, [
      {
        id: "session-ex-1",
        copilotFeedbackSignal: "too_easy",
        copilotFeedbackNote: "keep",
        copilotFeedbackUpdatedAt: "2026-06-28T23:00:00.000Z",
        copilotFeedbackEffort: 4,
      },
  ]);
});
