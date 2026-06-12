import { getProgressionEventBucketKey, sortProgressionEventsNewestFirst, summarizeProgressionEventAnalytics, type ProgressionAnalyticsEvent } from "@/lib/progression-event-analytics";
import { buildStructuredProgressionActivityItem, formatProgressionActivityDayLabel } from "@/lib/progression-lifeline-summary";
import type { DetailSectionListItem, DetailSectionListItemInput } from "@/components/ui/DetailSectionList";

export type ProgressionSummaryActivityBucket = {
  id: string;
  label: string;
  detail: string | null;
  valueLabel: string;
  eventCount: number;
  promotionCount: number;
  deloadCount: number;
  manualChangeCount: number;
  watchCount?: number;
  revertCount: number;
  items: DetailSectionListItemInput[];
  hotspotItems: string[];
};

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function shiftDayKey(dayKey: string, amount: number) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function formatWeekBucketLabel(dayKey: string) {
  const endDayKey = shiftDayKey(dayKey, 6);
  return `${formatProgressionActivityDayLabel(dayKey)} - ${formatProgressionActivityDayLabel(endDayKey)}`;
}

function formatBucketLabel(bucket: string, granularity: "day" | "week") {
  return granularity === "week" ? formatWeekBucketLabel(bucket) : formatProgressionActivityDayLabel(bucket);
}

export function buildProgressionSummaryActivityBuckets(args: {
  events: ProgressionAnalyticsEvent[];
  exerciseNameById?: Map<string, string>;
  routineTitleById?: Map<string, string>;
  granularity: "day" | "week";
  limit: number;
}) {
  const eventsByBucket = new Map<string, ProgressionAnalyticsEvent[]>();

  for (const event of args.events) {
    const bucketKey = getProgressionEventBucketKey({
      createdAt: event.created_at,
      granularity: args.granularity,
    });
    if (!bucketKey) {
      continue;
    }

    const current = eventsByBucket.get(bucketKey) ?? [];
    current.push(event);
    eventsByBucket.set(bucketKey, current);
  }

  return [...eventsByBucket.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .slice(-args.limit)
    .map(([bucketKey, bucketEvents]) => {
      const orderedEvents = sortProgressionEventsNewestFirst(bucketEvents);
      const analytics = summarizeProgressionEventAnalytics(bucketEvents);
      const hotspotItems = [
        analytics.topProgressedExercises[0]
          ? `${args.exerciseNameById?.get(analytics.topProgressedExercises[0].exerciseId)?.trim() || "Exercise"} drove the most promotions.`
          : null,
        analytics.deloadFrequencyByExercise[0]
          ? `${args.exerciseNameById?.get(analytics.deloadFrequencyByExercise[0].exerciseId)?.trim() || "Exercise"} had the most regressions.`
          : null,
        analytics.manualChangeFrequencyByExercise[0]
          ? `${args.exerciseNameById?.get(analytics.manualChangeFrequencyByExercise[0].exerciseId)?.trim() || "Exercise"} had the most manual target changes.`
          : null,
      ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);

      return {
        id: bucketKey,
        label: formatBucketLabel(bucketKey, args.granularity),
        detail: `${countLabel(bucketEvents.length, "change")} landed.`,
        valueLabel: countLabel(bucketEvents.length, "event"),
        eventCount: bucketEvents.length,
        promotionCount: analytics.promotionsAppliedCount,
        deloadCount: analytics.deloadsAppliedCount,
        manualChangeCount: analytics.manualTargetChangesCount,
        watchCount: analytics.watchAppliedCount,
        revertCount: analytics.revertsCount,
        items: orderedEvents.map((event) => (
          buildStructuredProgressionActivityItem({
            event,
            exerciseName: args.exerciseNameById?.get(event.exercise_id) ?? null,
            routineTitle: args.routineTitleById?.get(event.routine_id) ?? null,
          })
        )),
        hotspotItems,
      } satisfies ProgressionSummaryActivityBucket;
    });
}
