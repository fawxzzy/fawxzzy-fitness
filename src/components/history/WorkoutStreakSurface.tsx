"use client";

import { type MetricDatum } from "@/components/ui/MetricItem";
import { HistoryDisclosureTitle, HistoryMetricsDisclosure } from "@/components/history/HistoryMetricsDisclosure";
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
    { label: "Current", value: `${summary.currentSessionCount} ${summary.currentSessionCount === 1 ? "session" : "sessions"}`, valueTone: summary.currentSessionCount > 0 ? "success" : "muted" },
    { label: "Best", value: `${summary.bestSessionCount} ${summary.bestSessionCount === 1 ? "session" : "sessions"}`, valueTone: summary.bestSessionCount > 0 ? "default" : "muted" },
    { label: "Planned Logged", value: `${summary.completedPlannedSessionCount} / ${summary.trackedPlannedSessionCount}`, valueTone: summary.completedPlannedSessionCount > 0 ? "default" : "muted" },
    { label: "Last Workout", value: formatLastCompleted(summary.lastCompletedDayKey), valueTone: summary.lastCompletedDayKey ? "default" : "muted" },
  ];
}

function formatStreakRange(summary: HistoryWorkoutStreakSummary) {
  if (!summary.currentStartDayKey || !summary.currentEndDayKey) {
    return "No active streak";
  }

  const format = (dayKey: string) => new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${dayKey}T12:00:00.000Z`));

  if (summary.currentStartDayKey === summary.currentEndDayKey) {
    return format(summary.currentStartDayKey);
  }
  return `${format(summary.currentStartDayKey)} - ${format(summary.currentEndDayKey)}`;
}

export function WorkoutStreakSurface({ summary, viewMode }: { summary: HistoryWorkoutStreakSummary; viewMode: "compact" | "detailed" }) {
  const streakLabel = `${summary.currentSessionCount} ${summary.currentSessionCount === 1 ? "session" : "sessions"}`;
  const bestLabel = `Best ${summary.bestSessionCount} ${summary.bestSessionCount === 1 ? "session" : "sessions"}`;
  const plannedLabel = `${summary.completedPlannedSessionCount} of ${summary.trackedPlannedSessionCount} planned`;
  const lastWorkoutLabel = summary.lastCompletedDayKey ? `Last ${formatLastCompleted(summary.lastCompletedDayKey)}` : "No workouts yet";

  return (
    <HistoryMetricsDisclosure
      title={<HistoryDisclosureTitle label="Session Streak" meta={formatStreakRange(summary)} />}
      compactSummaryItems={[`${streakLabel} \u{1F525}`, bestLabel, plannedLabel, lastWorkoutLabel]}
      items={buildMetrics(summary)}
      viewMode={viewMode}
    />
  );
}
