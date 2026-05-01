export type DaySummaryTaxonomy = "strength" | "cardio" | "bodyweight" | "rest" | "unknown";

export const DAY_SUMMARY_TAXONOMY: readonly DaySummaryTaxonomy[] = ["strength", "cardio", "bodyweight", "rest", "unknown"];

export function formatDaySummaryTaxonomyLabel(taxonomy: Exclude<DaySummaryTaxonomy, "rest">, count: number): string {
  return `${count} ${taxonomy}`;
}

export function formatDaySummaryTotalLabel(count: number): string {
  return `${count} total`;
}

export function formatDaySummaryRestLabel(): string {
  return "Rest day";
}
