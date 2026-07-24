"use client";

import { type MetricDatum } from "@/components/ui/MetricItem";
import { HistoryMetricsDisclosure } from "@/components/history/HistoryMetricsDisclosure";
import type { HistoryMonthlyProgressSummary } from "@/lib/history-monthly-progress";

function formatVolume(summary: HistoryMonthlyProgressSummary) {
  if (summary.volumeByUnit.length === 0) {
    return "No load data";
  }
  return summary.volumeByUnit
    .map(({ unit, value }) => `${Math.round(value).toLocaleString()} ${unit}`)
    .join(" + ");
}

function buildMetrics(summary: HistoryMonthlyProgressSummary): MetricDatum[] {
  return [
    { label: "Sessions", value: String(summary.completedWorkoutCount), valueTone: summary.completedWorkoutCount > 0 ? "success" : "muted" },
    { label: "Active Days", value: String(summary.activeDayCount), valueTone: summary.activeDayCount > 0 ? "default" : "muted" },
    { label: "Sets", value: String(summary.setCount), valueTone: summary.setCount > 0 ? "default" : "muted" },
    { label: "Reps", value: String(summary.repCount), valueTone: summary.repCount > 0 ? "default" : "muted" },
    { label: "PR Moments", value: String(summary.prMomentCount), valueTone: summary.prMomentCount > 0 ? "success" : "muted" },
    { label: "Volume", value: formatVolume(summary), valueTone: summary.volumeByUnit.length > 0 ? "default" : "muted" },
  ];
}

export function MonthlyProgressSurface({ summary, viewMode }: { summary: HistoryMonthlyProgressSummary; viewMode: "compact" | "detailed" }) {
  const supportingLine = summary.topExerciseName
    ? `${summary.trend.detail} Most repeated: ${summary.topExerciseName}.`
    : summary.trend.detail;

  return (
    <HistoryMetricsDisclosure
      title={(
        <>
          Monthly <span className="px-1 text-[rgb(var(--accent-yellow-on)/0.98)]">|</span><span className="text-[rgb(var(--accent-yellow-on)/0.98)]">{summary.monthLabel}</span>
        </>
      )}
      summary={viewMode === "detailed" ? supportingLine : undefined}
      items={buildMetrics(summary)}
      viewMode={viewMode}
    />
  );
}
