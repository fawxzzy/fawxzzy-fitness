export type DaySummaryTaxonomy = "strength" | "cardio" | "rest" | "unknown";

export const DAY_SUMMARY_TAXONOMY: readonly DaySummaryTaxonomy[] = ["strength", "cardio", "rest", "unknown"];

export function formatDaySummaryRestLabel(): string {
  return "Rest day";
}
