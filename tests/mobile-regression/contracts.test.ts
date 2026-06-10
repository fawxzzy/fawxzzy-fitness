import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { mobileRegressionScenarios } from "../../src/features/mobile-regression/fixtures.ts";
import { validateMobileScenarioContracts } from "../../src/features/mobile-regression/contracts.ts";

function requireScenario(id: string) {
  const scenario = mobileRegressionScenarios.find((candidate) => candidate.id === id);
  assert.ok(scenario, `Missing fixture: ${id}`);
  return scenario;
}

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));

function readSource(relativePathFromTestsDir: string) {
  return readFileSync(path.resolve(THIS_DIR, relativePathFromTestsDir), "utf8");
}

test("dock and safe-area regressions are detected", () => {
  const baseline = requireScenario("today-default");
  const contracts = validateMobileScenarioContracts({
    ...baseline,
    geometry: {
      ...baseline.geometry,
      titleTop: baseline.geometry.safeAreaTop - 1,
      lastInteractiveRowBottom: baseline.geometry.dockTop + 1,
    },
  });

  assert.equal(contracts.titleRespectsSafeArea, false);
  assert.equal(contracts.finalRowVisibleAboveDock, false);
});

test("single-owner spacing regressions are detected", () => {
  const baseline = requireScenario("today-default");
  const contracts = validateMobileScenarioContracts({
    ...baseline,
    geometry: {
      ...baseline.geometry,
      topSpacingOwners: 2,
      bottomDockSpacingOwners: 2,
    },
  });

  assert.equal(contracts.hasSingleTopSpacingOwner, false);
  assert.equal(contracts.hasSingleBottomDockSpacingOwner, false);
});

test("card state correctness contract catches conflicting highlighted states", () => {
  const baseline = requireScenario("active-workout-session");
  const contracts = validateMobileScenarioContracts({
    ...baseline,
    cardStates: [
      { cardId: "a", state: "selected" },
      { cardId: "b", state: "selected" },
    ],
  });

  assert.equal(contracts.cardStateCorrectness, false);
});

test("reorder text stability catches non-deterministic numbering", () => {
  const baseline = requireScenario("edit-day-reorder");
  const contracts = validateMobileScenarioContracts({
    ...baseline,
    reorderText: {
      heading: "Reorder exercises",
      dragHandleLabel: "Drag",
      items: ["2. Back Squat", "1. Romanian Deadlift"],
    },
  });

  assert.equal(contracts.reorderTextStable, false);
});

test("goal form readability catches unreadable labels and missing helper copy", () => {
  const baseline = requireScenario("create-routine");
  const contracts = validateMobileScenarioContracts({
    ...baseline,
    goalForm: {
      heading: "Create routine",
      fieldLabels: ["Routine label that is dramatically long and not mobile safe"],
      helperCopy: [],
    },
  });

  assert.equal(contracts.goalFormReadable, false);
});

test("shell, goal-row, detailed-mode, and Exercise Info analytics regressions are detected", () => {
  const dayBaseline = requireScenario("view-day");
  const dayContracts = validateMobileScenarioContracts({
    ...dayBaseline,
    sectionChromeOwnedByShell: false,
    goalRowLayout: {
      titleMaxLines: 3,
      goalMaxLines: 3,
      dedicatedRow: false,
      wrapsBeforeTruncation: false,
    },
  });
  assert.equal(dayContracts.sectionChromeOwnedByShell, false);
  assert.equal(dayContracts.goalRowBehaviorStable, false);

  const historyBaseline = requireScenario("history-sessions-detailed");
  const historyContracts = validateMobileScenarioContracts({
    ...historyBaseline,
    detailedMode: { extraMetricCount: 1, analyticsSlotsReady: false },
  });
  assert.equal(historyContracts.detailedModeClearlyRicher, false);

  const exerciseInfoBaseline = requireScenario("exercise-detail-strength");
  const exerciseInfoContracts = validateMobileScenarioContracts({
    ...exerciseInfoBaseline,
    exerciseInfoLayout: {
      mediaFullyVisible: false,
      quickMetricCount: 3,
      hasProgressBlock: false,
      hasRecentHistoryBlock: false,
      sectionOrder: ["Overview", "Progress", "Performance", "Recent History"],
      topSafePaddingRelaxed: false,
    },
  });
  assert.equal(exerciseInfoContracts.exerciseInfoAnalyticsLayoutReady, false);
});

test("mobile chrome/day editing contract regressions are detected", () => {
  const todayBaseline = requireScenario("today-default");
  const todayContracts = validateMobileScenarioContracts({
    ...todayBaseline,
    todayHeaderMatchesSelectedDay: false,
    exerciseInfoHeaderPinned: false,
  });
  assert.equal(todayContracts.todayHeaderMatchesSelectedDay, false);
  assert.equal(todayContracts.exerciseInfoUsesPinnedFloatingHeader, false);

  const viewDayBaseline = requireScenario("view-day");
  const viewDayContracts = validateMobileScenarioContracts({
    ...viewDayBaseline,
    restDay: true,
    hasExtraLowerFillerBox: true,
  });
  assert.equal(viewDayContracts.restDayHasNoExtraLowerFillerBox, false);

  const editDayBaseline = requireScenario("edit-day-reorder");
  const editDayContracts = validateMobileScenarioContracts({
    ...editDayBaseline,
    headerPinned: false,
    reorderActionVisible: false,
    manualOrderEdit: { listSize: 3, attemptedOrders: [0, 99], normalizedOrders: [2, 3], surroundingItemsShifted: false },
  });
  assert.equal(editDayContracts.editDayHeaderPinned, false);
  assert.equal(editDayContracts.editDayReorderActionVisible, false);
  assert.equal(editDayContracts.editDayManualOrderEditClamps, false);

  const createRoutineBaseline = requireScenario("create-routine");
  const createRoutineContracts = validateMobileScenarioContracts({
    ...createRoutineBaseline,
    bottomDockLayout: "stacked",
  });
  assert.equal(createRoutineContracts.routineDetailsBottomDockLayoutConsistent, false);

  const historyLogBaseline = requireScenario("routines-list-view");
  const historyLogContracts = validateMobileScenarioContracts({
    ...historyLogBaseline,
    historyLogHeaderCount: 2,
  });
  assert.equal(historyLogContracts.historyLogViewHasOneHeader, false);

  const sessionBaseline = requireScenario("active-workout-session");
  const sessionContracts = validateMobileScenarioContracts({
    ...sessionBaseline,
    currentSessionSaveSetHeaderPinned: false,
  });
  assert.equal(sessionContracts.currentSessionSaveSetUsesPinnedFloatingHeader, false);
});

test("history family contracts catch floating-header, header-owner, and surface-token drift", () => {
  const sessionsBaseline = requireScenario("history-sessions-compact");
  const sessionsContracts = validateMobileScenarioContracts({
    ...sessionsBaseline,
    usesFloatingHeader: false,
  });
  assert.equal(sessionsContracts.historyRoutesUseFloatingHeader, false);

  const detailBaseline = requireScenario("history-detail-broken-images");
  const detailContracts = validateMobileScenarioContracts({
    ...detailBaseline,
    historyHeaderOwnerCount: 2,
  });
  assert.equal(detailContracts.historyRoutesHaveSingleHeaderOwner, false);

  const exercisesBaseline = requireScenario("history-exercises-compact");
  const exercisesContracts = validateMobileScenarioContracts({
    ...exercisesBaseline,
    historySurfaceToken: "history-detail",
  });
  assert.equal(exercisesContracts.historySurfaceMatchesRouteFamily, false);
});

test("history browser source stays on the history-browser surface contract", () => {
  const source = readSource("../../src/components/history/HistoryExerciseCard.tsx");

  assert.match(source, /surface="history-browser"/);
  assert.doesNotMatch(source, /surface="current-session"/);
});

test("history-browser compact rows stay on the shared history card wrapper with recovered media", () => {
  const browserSource = readSource("../../src/app/history/exercises/ExerciseBrowserClient.tsx");
  const cardSource = readSource("../../src/components/history/HistoryExerciseCard.tsx");

  assert.match(browserSource, /<HistoryExerciseCard/);
  assert.match(browserSource, /density=\{viewMode\}/);
  assert.doesNotMatch(browserSource, /<StandardExerciseRow/);
  assert.match(cardSource, /data-history-card="exercise"/);
  assert.match(cardSource, /leadingVisual=\{/);
  assert.match(cardSource, /<ExerciseThumb/);
});

test("standard exercise rows gate rail media behind the surface policy", () => {
  const source = readSource("../../src/components/StandardExerciseRow.tsx");

  assert.match(source, /resolveWorkoutCardSurfacePolicy/);
  assert.match(source, /const mediaRailWidth = surfacePolicy\.mediaRailWidth/);
  assert.match(source, /surfacePolicy\.showMedia && mediaRailWidth > 0/);
  assert.match(source, /leadingVisual=\{resolvedLeadingVisual\}/);
});

test("exercise card body stays clipping-safe while exposing shared media and density markers", () => {
  const source = readSource("../../src/components/ExerciseCard.tsx");

  assert.match(source, /overflow-visible/);
  assert.match(source, /data-exercise-card-density=\{resolvedDensity\}/);
  assert.match(source, /data-exercise-card-media=\{usesRailMedia \? "rail" : usesInlineMedia \? "inline" : "none"\}/);
  assert.match(source, /bottom-px left-px top-px w-\[4px\] rounded-r-full/);
});

test("history sessions keep compact chips and detailed metrics on the shared card shell", () => {
  const source = readSource("../../src/app/history/HistorySessionsClient.tsx");

  assert.match(source, /<HistorySessionCard/);
  assert.match(source, /viewMode=\{viewMode\}/);
  assert.match(source, /href=\{`\/history\/\$\{session\.id\}\?returnTab=sessions`\}/);
  assert.doesNotMatch(source, /<SessionSummaryCard/);
});

test("history session wrapper owns the shared card contract directly", () => {
  const source = readSource("../../src/components/history/HistorySessionCard.tsx");

  assert.match(source, /<ExerciseCard/);
  assert.match(source, /data-history-card="session"/);
  assert.match(source, /appTokens\.historyExerciseCardShell/);
  assert.doesNotMatch(source, /SessionSummaryCard/);
});

test("history detail stays on explicit history wrappers instead of raw generic cards", () => {
  const source = readSource("../../src/app/history/[sessionId]/LogAuditClient.tsx");

  assert.match(source, /<HistorySessionCard/);
  assert.match(source, /<HistoryDetailExerciseCard/);
  assert.doesNotMatch(source, /<SessionSummaryCard/);
  assert.doesNotMatch(source, /<StandardExerciseRow/);
});

test("history detail progression uses the shared activity and chart lane", () => {
  const source = readSource("../../src/app/history/[sessionId]/LogAuditClient.tsx");

  assert.match(source, /ExerciseProgressionActivityPanel/);
  assert.match(source, /headingClassName=\{FOCUSED_SUBSECTION_HEADING_CLASS_NAME\}/);
  assert.doesNotMatch(source, /timelineSummary/);
  assert.doesNotMatch(source, /Progression Graphs/);
});

test("history detail compact exercise rows keep the session-native summary rhythm", () => {
  const source = readSource("../../src/app/history/[sessionId]/LogAuditClient.tsx");

  assert.match(source, /summaryLabel=\{bestSet \? "Top Set" : "Session"\}/);
  assert.match(source, /metadata=\{renderMetaTags\(collapsedCardBadgeItems\.signalItems\)\}/);
  assert.match(source, /buildCollapsedExerciseCardBadgeItems/);
  assert.match(source, /badgeItems=\{\[collapsedCardBadgeItems\.countLabel\]\}/);
});
