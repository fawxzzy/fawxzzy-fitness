import type { FitnessGrowthShadowReport } from "./fitness-growth-shadow.ts";

export type TodayRecoveryShadowPlacement = {
  placementId: string;
  surfaceId: string;
  memberId: string;
  sourceOutboundId: string;
  cohortId: string;
  observedDay: string;
  destinationHref: string;
  destinationPath: string;
};

export function buildTodayRecoveryShadowPlacementHref(candidate: {
  pathname: string;
  params: Record<string, string>;
}): string {
  const query = new URLSearchParams(candidate.params);
  query.set("shadowPlacement", "recovery_reset_shadow_placement");
  query.set("focus", "recovery_reset_shadow");
  return `${candidate.pathname}?${query.toString()}`;
}

export function buildTodayRecoveryShadowPlacementModel(input: {
  report: FitnessGrowthShadowReport;
  memberId: string;
  observedDay: string;
}): TodayRecoveryShadowPlacement | null {
  const candidate = input.report.candidates
    .filter(
      (entry) =>
        entry.member_id === input.memberId
        && entry.observed_day === input.observedDay
        && entry.placement_status === "shadow_placed",
    )
    .sort((left, right) => right.trigger_occurred_at.localeCompare(left.trigger_occurred_at))[0];

  if (!candidate) {
    return null;
  }

  return {
    placementId: candidate.placement_id,
    surfaceId: input.report.placement_contract.surface_id,
    memberId: candidate.member_id,
    sourceOutboundId: candidate.source_outbound_id,
    cohortId: candidate.cohort_id,
    observedDay: candidate.observed_day,
    destinationPath: buildTodayRecoveryShadowPlacementHref(candidate.deep_link),
    destinationHref: buildTodayRecoveryShadowPlacementHref(candidate.deep_link),
  };
}
