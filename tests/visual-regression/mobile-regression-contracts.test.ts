import assert from "node:assert/strict";
import test from "node:test";

import { mobileRegressionScenarios } from "../../src/lib/dev/mobileRegressionFixtures.ts";
import { validateMobileScenarioContracts } from "../../src/lib/dev/mobileRegressionContracts.ts";

function requireScenario(id: string) {
  const scenario = mobileRegressionScenarios.find((candidate) => candidate.id === id);
  assert.ok(scenario, `Missing fixture: ${id}`);
  return scenario;
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
