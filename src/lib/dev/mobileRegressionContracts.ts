import type { MobileFixtureScenario } from "./mobileRegressionFixtures";

const MIN_METADATA_COLUMN_WIDTH = 120;

export function finalRowVisibleAboveDock(scenario: MobileFixtureScenario) {
  return scenario.geometry.lastInteractiveRowBottom <= scenario.geometry.dockTop;
}

export function titleRespectsSafeArea(scenario: MobileFixtureScenario) {
  return scenario.geometry.titleTop >= scenario.geometry.safeAreaTop;
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

export function validateMobileScenarioContracts(scenario: MobileFixtureScenario) {
  return {
    finalRowVisibleAboveDock: finalRowVisibleAboveDock(scenario),
    titleRespectsSafeArea: titleRespectsSafeArea(scenario),
    chipsStayWithinViewport: chipsStayWithinViewport(scenario),
    longTextLayoutStable: longTextLayoutStable(scenario),
    noImpossibleLoggedSkippedMix: noImpossibleLoggedSkippedMix(scenario),
  };
}
