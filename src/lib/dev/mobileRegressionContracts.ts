import type { MobileFixtureScenario } from "./mobileRegressionFixtures";

const MIN_METADATA_COLUMN_WIDTH = 120;
const MAX_GOAL_FORM_LABEL_LENGTH = 36;

export function finalRowVisibleAboveDock(scenario: MobileFixtureScenario) {
  return scenario.geometry.lastInteractiveRowBottom <= scenario.geometry.dockTop;
}

export function titleRespectsSafeArea(scenario: MobileFixtureScenario) {
  return scenario.geometry.titleTop >= scenario.geometry.safeAreaTop;
}

export function hasSingleTopSpacingOwner(scenario: MobileFixtureScenario) {
  return scenario.geometry.topSpacingOwners === 1;
}

export function hasSingleBottomDockSpacingOwner(scenario: MobileFixtureScenario) {
  return scenario.geometry.bottomDockSpacingOwners === 1;
}

export function chipsStayWithinViewport(scenario: MobileFixtureScenario) {
  return (scenario.filterChipFrames ?? []).every((chip) => chip.left >= 0 && chip.right <= scenario.geometry.viewportWidth);
}

export function longTextLayoutStable(scenario: MobileFixtureScenario) {
  if (!scenario.libraryCardTextLayout) return true;
  return scenario.libraryCardTextLayout.titleLineCount <= 3
    && scenario.libraryCardTextLayout.metadataColumnWidth >= MIN_METADATA_COLUMN_WIDTH;
}

export function noImpossibleLoggedSkippedMix(scenario: MobileFixtureScenario) {
  const hasLogged = scenario.statusChips?.includes("logged") ?? false;
  const hasSkipped = scenario.statusChips?.includes("skipped") ?? false;
  if (!hasLogged || !hasSkipped) return true;
  return Boolean(scenario.allowLoggedAndSkipped);
}

export function cardStateCorrectness(scenario: MobileFixtureScenario) {
  if (!scenario.cardStates || scenario.cardStates.length === 0) return true;

  const selectedCount = scenario.cardStates.filter((card) => card.state === "selected").length;
  const activeCount = scenario.cardStates.filter((card) => card.state === "active").length;
  if (selectedCount > 1 || activeCount > 1) {
    return false;
  }

  return scenario.cardStates.every((card) => {
    if (card.state === "empty") {
      return card.badgeText === undefined || card.badgeText === "Rest";
    }
    return true;
  });
}

export function reorderTextStable(scenario: MobileFixtureScenario) {
  if (!scenario.reorderText) return true;
  return scenario.reorderText.items.every((item, index) => item.startsWith(`${index + 1}. `))
    && scenario.reorderText.dragHandleLabel.length > 0;
}

export function goalFormReadable(scenario: MobileFixtureScenario) {
  if (!scenario.goalForm) return true;

  const hasLabelOverflow = scenario.goalForm.fieldLabels.some((label) => label.length > MAX_GOAL_FORM_LABEL_LENGTH);
  const hasAnyHelperText = scenario.goalForm.helperCopy.length > 0;

  return !hasLabelOverflow && hasAnyHelperText;
}

export function routeUsesFloatingHeader(scenario: MobileFixtureScenario) {
  return scenario.usesFloatingHeader;
}

export function todayHeaderMatchesSelectedDay(scenario: MobileFixtureScenario) {
  if (scenario.route !== "today") return true;
  return scenario.todayHeaderMatchesSelectedDay ?? true;
}

export function restDayHasNoExtraLowerFillerBox(scenario: MobileFixtureScenario) {
  if (!scenario.restDay && scenario.route !== "today" && scenario.route !== "viewDay") return true;
  if (scenario.route === "editDay" || scenario.route === "viewDay" || scenario.route === "today") {
    return scenario.hasExtraLowerFillerBox !== true;
  }
  return true;
}

export function editDayHeaderPinned(scenario: MobileFixtureScenario) {
  if (scenario.route !== "editDay") return true;
  return scenario.headerPinned === true;
}

export function editDayReorderActionVisible(scenario: MobileFixtureScenario) {
  if (scenario.id !== "edit-day-reorder") return true;
  return scenario.reorderActionVisible === true;
}

export function editDayManualOrderEditClamps(scenario: MobileFixtureScenario) {
  if (!scenario.manualOrderEdit) return true;
  const { listSize, attemptedOrders, normalizedOrders, surroundingItemsShifted } = scenario.manualOrderEdit;
  if (attemptedOrders.length !== normalizedOrders.length || attemptedOrders.length === 0) return false;

  const valuesClampCorrectly = attemptedOrders.every((value, index) => {
    const expected = Math.min(Math.max(value, 1), listSize);
    return normalizedOrders[index] === expected;
  });

  return valuesClampCorrectly && surroundingItemsShifted;
}

export function routineDetailsBottomDockLayoutConsistent(scenario: MobileFixtureScenario) {
  if (scenario.route !== "createRoutine" && scenario.route !== "editRoutine") return true;
  return scenario.bottomDockLayout === "split";
}

export function historyLogViewHasOneHeader(scenario: MobileFixtureScenario) {
  if (scenario.id !== "routines-list-view") return true;
  return scenario.historyLogHeaderCount === 1;
}

export function exerciseInfoUsesPinnedFloatingHeader(scenario: MobileFixtureScenario) {
  if (scenario.route !== "today") return true;
  return scenario.exerciseInfoHeaderPinned ?? true;
}

export function currentSessionSaveSetUsesPinnedFloatingHeader(scenario: MobileFixtureScenario) {
  if (scenario.route !== "session") return true;
  return scenario.currentSessionSaveSetHeaderPinned ?? true;
}

export function validateMobileScenarioContracts(scenario: MobileFixtureScenario) {
  return {
    finalRowVisibleAboveDock: finalRowVisibleAboveDock(scenario),
    titleRespectsSafeArea: titleRespectsSafeArea(scenario),
    hasSingleTopSpacingOwner: hasSingleTopSpacingOwner(scenario),
    hasSingleBottomDockSpacingOwner: hasSingleBottomDockSpacingOwner(scenario),
    chipsStayWithinViewport: chipsStayWithinViewport(scenario),
    longTextLayoutStable: longTextLayoutStable(scenario),
    noImpossibleLoggedSkippedMix: noImpossibleLoggedSkippedMix(scenario),
    cardStateCorrectness: cardStateCorrectness(scenario),
    reorderTextStable: reorderTextStable(scenario),
    goalFormReadable: goalFormReadable(scenario),
    routeUsesFloatingHeader: routeUsesFloatingHeader(scenario),
    todayHeaderMatchesSelectedDay: todayHeaderMatchesSelectedDay(scenario),
    restDayHasNoExtraLowerFillerBox: restDayHasNoExtraLowerFillerBox(scenario),
    editDayHeaderPinned: editDayHeaderPinned(scenario),
    editDayReorderActionVisible: editDayReorderActionVisible(scenario),
    editDayManualOrderEditClamps: editDayManualOrderEditClamps(scenario),
    routineDetailsBottomDockLayoutConsistent: routineDetailsBottomDockLayoutConsistent(scenario),
    historyLogViewHasOneHeader: historyLogViewHasOneHeader(scenario),
    exerciseInfoUsesPinnedFloatingHeader: exerciseInfoUsesPinnedFloatingHeader(scenario),
    currentSessionSaveSetUsesPinnedFloatingHeader: currentSessionSaveSetUsesPinnedFloatingHeader(scenario),
  };
}
