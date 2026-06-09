import type { ProgressionHistoryChartSection } from "@/lib/progression-history-display";
import {
  bucketProgressionEventsByTime,
  summarizeProgressionEventAnalytics,
  type ProgressionAnalyticsEvent,
  type ProgressionEventTimeGranularity,
} from "@/lib/progression-event-analytics";
import { getProgressionHistoryEventTypeLabel } from "@/lib/progression-history-filters";

type BuildProgressionSummaryChartSectionsArgs = {
  events: ProgressionAnalyticsEvent[];
  exerciseNameById?: Map<string, string>;
  timeZone?: string | null;
  activityGranularity: Extract<ProgressionEventTimeGranularity, "day" | "week">;
};

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatDayKey(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function shiftDayKey(dayKey: string, amount: number) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function formatWeekBucketLabel(dayKey: string) {
  const endDayKey = shiftDayKey(dayKey, 6);
  return `${formatDayKey(dayKey)} - ${formatDayKey(endDayKey)}`;
}

function formatActivityBucketLabel(bucket: string, granularity: BuildProgressionSummaryChartSectionsArgs["activityGranularity"]) {
  return granularity === "week" ? formatWeekBucketLabel(bucket) : formatDayKey(bucket);
}

export function buildProgressionSummaryChartSections({
  events,
  exerciseNameById,
  timeZone,
  activityGranularity,
}: BuildProgressionSummaryChartSectionsArgs): ProgressionHistoryChartSection[] {
  const analytics = summarizeProgressionEventAnalytics(events);
  const activityBuckets = bucketProgressionEventsByTime({
    events,
    granularity: activityGranularity,
    timeZone,
  });

  const activityBars = activityBuckets
    .slice(activityGranularity === "week" ? -6 : -7)
    .map((bucket) => ({
      id: bucket.bucket,
      label: formatActivityBucketLabel(bucket.bucket, activityGranularity),
      value: bucket.count,
      valueLabel: countLabel(bucket.count, "event"),
      detail: bucket.count > 0 ? `${countLabel(bucket.count, "change")} landed.` : null,
    }));

  const eventMixBars = analytics.byType
    .slice(0, 4)
    .map((entry) => ({
      id: entry.key,
      label: getProgressionHistoryEventTypeLabel(entry.key as Parameters<typeof getProgressionHistoryEventTypeLabel>[0]),
      value: entry.count,
      valueLabel: countLabel(entry.count, "event"),
      detail: null,
    }));

  const promotionBars = analytics.topProgressedExercises
    .slice(0, 4)
    .map((entry) => ({
      id: entry.exerciseId,
      label: exerciseNameById?.get(entry.exerciseId)?.trim() || "Exercise",
      value: entry.promotionCount,
      valueLabel: countLabel(entry.promotionCount, "promotion"),
      detail: null,
    }));

  return [
    {
      id: "progression-activity",
      title: activityGranularity === "week" ? "Progression Timeline" : "Progression Activity",
      description: activityGranularity === "week"
        ? "How progression changes stacked across recent weekly buckets."
        : "How progression changes stacked across the current week.",
      emptyTitle: "No progression activity yet.",
      emptyCaption: "Applied changes will start the timeline once the first progression event lands.",
      bars: activityBars,
    },
    {
      id: "progression-event-mix",
      title: "Change Mix",
      description: "Which change types are driving the visible progression slice.",
      emptyTitle: "No change mix yet.",
      emptyCaption: "The mix appears after the first progression event is recorded.",
      bars: eventMixBars,
    },
    {
      id: "progression-hotspots",
      title: "Promotion Hotspots",
      description: "Exercises with the most promotions in the visible progression slice.",
      emptyTitle: "No promotion hotspots yet.",
      emptyCaption: "Promotion hotspots appear after the first applied promotion lands.",
      bars: promotionBars,
    },
  ];
}
