"use client";

import { type MetricDatum } from "@/components/ui/MetricItem";
import { HistoryMetricsDisclosure } from "@/components/history/HistoryMetricsDisclosure";
import type { HistoryWorkoutStreakSummary } from "@/lib/history-workout-streak";

function formatLastCompleted(dayKey: string | null) {
  if (!dayKey) {
    return "No workouts yet";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dayKey}T12:00:00.000Z`));
}

function buildMetrics(summary: HistoryWorkoutStreakSummary): MetricDatum[] {
  return [
    { label: "Current", value: `${summary.currentWeekCount} ${summary.currentWeekCount === 1 ? "week" : "weeks"}`, valueTone: summary.currentWeekCount > 0 ? "success" : "muted" },
    { label: "Best", value: `${summary.bestWeekCount} ${summary.bestWeekCount === 1 ? "week" : "weeks"}`, valueTone: summary.bestWeekCount > 0 ? "default" : "muted" },
    { label: "Active Weeks", value: String(summary.activeWeekCount), valueTone: summary.activeWeekCount > 0 ? "default" : "muted" },
    { label: "Last Workout", value: formatLastCompleted(summary.lastCompletedDayKey), valueTone: summary.lastCompletedDayKey ? "default" : "muted" },
  ];
}

export function WorkoutStreakSurface({ summary, viewMode }: { summary: HistoryWorkoutStreakSummary; viewMode: "compact" | "detailed" }) {
  const streakLabel = `${summary.currentWeekCount} ${summary.currentWeekCount === 1 ? "week" : "weeks"}`;

  return (
    <HistoryMetricsDisclosure
      title={(
        <>
          Weekly Streak <span className="px-1 text-[rgb(var(--accent)/0.98)]">|</span><span className="text-[rgb(var(--accent)/0.98)]">{streakLabel} 🔥</span>
        </>
      )}
      items={buildMetrics(summary)}
      viewMode={viewMode}
    />
  );
}
