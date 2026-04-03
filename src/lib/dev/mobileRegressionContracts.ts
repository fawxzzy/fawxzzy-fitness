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
  };
}
