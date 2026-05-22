import type { ProgressionEventRow } from "@/types/db";
import { getWeeklyProgressDayKey, getWeeklyProgressWeekStart } from "@/lib/history-weekly-progress";

export type ProgressionAnalyticsEvent = ProgressionEventRow;
export type ProgressionEventCountByKey = {
  key: string;
  count: number;
};

export type ProgressionEventExerciseCount = {
  exerciseId: string;
  count: number;
};

export type ProgressionEventLatestByExercise = {
  exerciseId: string;
  event: ProgressionAnalyticsEvent;
};

export type ProgressionEventTimeGranularity = "day" | "week" | "month";
export type ProgressionEventTimeBucket = {
  bucket: string;
  count: number;
  eventIds: string[];
};

export type ProgressionEventNumericDelta = {
  from: number;
  to: number;
  delta: number;
  unit: string | null;
};

export type ProgressionEventNumericDeltaSummary = {
  weight: ProgressionEventNumericDelta | null;
  reps: ProgressionEventNumericDelta | null;
  durationSeconds: ProgressionEventNumericDelta | null;
  distance: ProgressionEventNumericDelta | null;
  sets: ProgressionEventNumericDelta | null;
  calories: ProgressionEventNumericDelta | null;
};

export type ProgressionEventAnalyticsSummary = {
  totalEvents: number;
  promotionsAppliedCount: number;
  deloadsAppliedCount: number;
  manualTargetChangesCount: number;
  revertsCount: number;
  byType: ProgressionEventCountByKey[];
  byRoutine: ProgressionEventCountByKey[];
  byExercise: ProgressionEventExerciseCount[];
  byVector: ProgressionEventCountByKey[];
  byMethod: ProgressionEventCountByKey[];
  topProgressedExercises: Array<{
    exerciseId: string;
    promotionCount: number;
  }>;
  deloadFrequencyByExercise: Array<{
    exerciseId: string;
    deloadCount: number;
  }>;
  manualChangeFrequencyByExercise: Array<{
    exerciseId: string;
    manualTargetChangeCount: number;
  }>;
};

const DEFAULT_ANALYTICS_TIMEZONE = "UTC";

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeAnalyticsTimeZone(value?: string | null) {
  return typeof value === "string" && value.trim().length > 0 ? value : DEFAULT_ANALYTICS_TIMEZONE;
}

function sortCountEntries(entries: ProgressionEventCountByKey[]) {
  return [...entries].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return left.key.localeCompare(right.key);
  });
}

function sortExerciseCounts(entries: ProgressionEventExerciseCount[]) {
  return [...entries].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return left.exerciseId.localeCompare(right.exerciseId);
  });
}

function buildCountIndex(events: ProgressionAnalyticsEvent[], selector: (event: ProgressionAnalyticsEvent) => string | null | undefined) {
  const counts = new Map<string, number>();

  for (const event of events) {
    const key = selector(event);
    if (!key) {
      continue;
    }
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function toSortedCountEntries(counts: Map<string, number>) {
  return sortCountEntries([...counts.entries()].map(([key, count]) => ({ key, count })));
}

function toSortedExerciseCountEntries(counts: Map<string, number>) {
  return sortExerciseCounts([...counts.entries()].map(([exerciseId, count]) => ({ exerciseId, count })));
}

function getPrimaryWeight(target: Record<string, unknown>) {
  return safeNumber(target.weightMax ?? target.weightMin ?? null);
}

function getPrimaryReps(target: Record<string, unknown>) {
  return safeNumber(target.repsTarget ?? target.repsMax ?? target.repsMin ?? null);
}

function getPrimaryDurationSeconds(target: Record<string, unknown>) {
  return safeNumber(target.durationSeconds ?? null);
}

function getPrimaryDistance(target: Record<string, unknown>) {
  return safeNumber(target.distance ?? null);
}

function getPrimarySets(target: Record<string, unknown>) {
  return safeNumber(target.setsMax ?? target.setsMin ?? null);
}

function getPrimaryCalories(target: Record<string, unknown>) {
  return safeNumber(target.calories ?? null);
}

function buildNumericDelta(args: {
  from: number | null;
  to: number | null;
  unit?: string | null;
}) {
  if (args.from === null || args.to === null) {
    return null;
  }

  return {
    from: args.from,
    to: args.to,
    delta: Number((args.to - args.from).toFixed(3)),
    unit: args.unit ?? null,
  } satisfies ProgressionEventNumericDelta;
}

function sortEventsAscending(events: ProgressionAnalyticsEvent[]) {
  return [...events].sort((left, right) => {
    if (left.created_at === right.created_at) {
      return left.id.localeCompare(right.id);
    }
    return left.created_at.localeCompare(right.created_at);
  });
}

function sortEventsDescending(events: ProgressionAnalyticsEvent[]) {
  return [...events].sort((left, right) => {
    if (left.created_at === right.created_at) {
      return right.id.localeCompare(left.id);
    }
    return right.created_at.localeCompare(left.created_at);
  });
}

export function countProgressionEvents(events: ProgressionAnalyticsEvent[]) {
  return events.length;
}

export function countProgressionEventsByType(events: ProgressionAnalyticsEvent[]) {
  return toSortedCountEntries(buildCountIndex(events, (event) => event.event_type));
}

export function countProgressionEventsByRoutine(events: ProgressionAnalyticsEvent[]) {
  return toSortedCountEntries(buildCountIndex(events, (event) => event.routine_id));
}

export function countProgressionEventsByExercise(events: ProgressionAnalyticsEvent[]) {
  return toSortedExerciseCountEntries(buildCountIndex(events, (event) => event.exercise_id));
}

export function countProgressionEventsByVector(events: ProgressionAnalyticsEvent[]) {
  return toSortedCountEntries(buildCountIndex(events, (event) => event.vector));
}

export function countProgressionEventsByMethod(events: ProgressionAnalyticsEvent[]) {
  return toSortedCountEntries(buildCountIndex(events, (event) => event.method));
}

export function countPromotionAppliedEvents(events: ProgressionAnalyticsEvent[]) {
  return events.filter((event) => event.event_type === "promotion_applied").length;
}

export function countDeloadAppliedEvents(events: ProgressionAnalyticsEvent[]) {
  return events.filter((event) => event.event_type === "deload_applied").length;
}

export function countManualTargetChangeEvents(events: ProgressionAnalyticsEvent[]) {
  return events.filter((event) => event.event_type === "manual_target_change").length;
}

export function countPromotionRevertedEvents(events: ProgressionAnalyticsEvent[]) {
  return events.filter((event) => event.event_type === "promotion_reverted").length;
}

export function getLatestProgressionEventByExercise(events: ProgressionAnalyticsEvent[]) {
  const latestByExercise = new Map<string, ProgressionAnalyticsEvent>();

  for (const event of sortEventsAscending(events)) {
    latestByExercise.set(event.exercise_id, event);
  }

  return latestByExercise;
}

export function listLatestProgressionEventsByExercise(events: ProgressionAnalyticsEvent[]) {
  return [...getLatestProgressionEventByExercise(events).entries()]
    .map(([exerciseId, event]) => ({ exerciseId, event }))
    .sort((left, right) => {
      if (left.event.created_at === right.event.created_at) {
        if (left.event.id === right.event.id) {
          return left.exerciseId.localeCompare(right.exerciseId);
        }
        return right.event.id.localeCompare(left.event.id);
      }
      return right.event.created_at.localeCompare(left.event.created_at);
    });
}

export function getTopProgressedExercisesByPromotionCount(events: ProgressionAnalyticsEvent[], limit = 10) {
  return toSortedExerciseCountEntries(
    buildCountIndex(
      events.filter((event) => event.event_type === "promotion_applied"),
      (event) => event.exercise_id,
    ),
  )
    .slice(0, Math.max(0, limit))
    .map((entry) => ({
      exerciseId: entry.exerciseId,
      promotionCount: entry.count,
    }));
}

export function getDeloadFrequencyByExercise(events: ProgressionAnalyticsEvent[]) {
  return toSortedExerciseCountEntries(
    buildCountIndex(
      events.filter((event) => event.event_type === "deload_applied"),
      (event) => event.exercise_id,
    ),
  ).map((entry) => ({
    exerciseId: entry.exerciseId,
    deloadCount: entry.count,
  }));
}

export function getManualChangeFrequencyByExercise(events: ProgressionAnalyticsEvent[]) {
  return toSortedExerciseCountEntries(
    buildCountIndex(
      events.filter((event) => event.event_type === "manual_target_change"),
      (event) => event.exercise_id,
    ),
  ).map((entry) => ({
    exerciseId: entry.exerciseId,
    manualTargetChangeCount: entry.count,
  }));
}

export function getProgressionEventBucketKey(args: {
  createdAt: string;
  granularity: ProgressionEventTimeGranularity;
  timeZone?: string | null;
}) {
  const timeZone = normalizeAnalyticsTimeZone(args.timeZone);
  const dayKey = getWeeklyProgressDayKey(args.createdAt, timeZone);
  if (!dayKey) {
    return null;
  }

  if (args.granularity === "day") {
    return dayKey;
  }

  if (args.granularity === "week") {
    return getWeeklyProgressWeekStart(args.createdAt, timeZone);
  }

  return dayKey.slice(0, 7);
}

export function bucketProgressionEventsByTime(args: {
  events: ProgressionAnalyticsEvent[];
  granularity: ProgressionEventTimeGranularity;
  timeZone?: string | null;
}) {
  const bucketMap = new Map<string, ProgressionEventTimeBucket>();

  for (const event of sortEventsAscending(args.events)) {
    const bucketKey = getProgressionEventBucketKey({
      createdAt: event.created_at,
      granularity: args.granularity,
      timeZone: args.timeZone,
    });

    if (!bucketKey) {
      continue;
    }

    const current = bucketMap.get(bucketKey) ?? {
      bucket: bucketKey,
      count: 0,
      eventIds: [],
    };
    current.count += 1;
    current.eventIds.push(event.id);
    bucketMap.set(bucketKey, current);
  }

  return [...bucketMap.values()].sort((left, right) => left.bucket.localeCompare(right.bucket));
}

export function summarizeProgressionEventNumericDeltas(event: ProgressionAnalyticsEvent): ProgressionEventNumericDeltaSummary {
  const fromTarget = event.from_target ?? {};
  const toTarget = event.to_target ?? {};

  return {
    weight: buildNumericDelta({
      from: getPrimaryWeight(fromTarget),
      to: getPrimaryWeight(toTarget),
      unit: safeString(fromTarget.weightUnit ?? toTarget.weightUnit ?? null),
    }),
    reps: buildNumericDelta({
      from: getPrimaryReps(fromTarget),
      to: getPrimaryReps(toTarget),
      unit: "reps",
    }),
    durationSeconds: buildNumericDelta({
      from: getPrimaryDurationSeconds(fromTarget),
      to: getPrimaryDurationSeconds(toTarget),
      unit: "seconds",
    }),
    distance: buildNumericDelta({
      from: getPrimaryDistance(fromTarget),
      to: getPrimaryDistance(toTarget),
      unit: safeString(fromTarget.distanceUnit ?? toTarget.distanceUnit ?? null),
    }),
    sets: buildNumericDelta({
      from: getPrimarySets(fromTarget),
      to: getPrimarySets(toTarget),
      unit: "sets",
    }),
    calories: buildNumericDelta({
      from: getPrimaryCalories(fromTarget),
      to: getPrimaryCalories(toTarget),
      unit: "calories",
    }),
  };
}

export function summarizeProgressionEventAnalytics(events: ProgressionAnalyticsEvent[]): ProgressionEventAnalyticsSummary {
  return {
    totalEvents: countProgressionEvents(events),
    promotionsAppliedCount: countPromotionAppliedEvents(events),
    deloadsAppliedCount: countDeloadAppliedEvents(events),
    manualTargetChangesCount: countManualTargetChangeEvents(events),
    revertsCount: countPromotionRevertedEvents(events),
    byType: countProgressionEventsByType(events),
    byRoutine: countProgressionEventsByRoutine(events),
    byExercise: countProgressionEventsByExercise(events),
    byVector: countProgressionEventsByVector(events),
    byMethod: countProgressionEventsByMethod(events),
    topProgressedExercises: getTopProgressedExercisesByPromotionCount(events),
    deloadFrequencyByExercise: getDeloadFrequencyByExercise(events),
    manualChangeFrequencyByExercise: getManualChangeFrequencyByExercise(events),
  };
}

export function sortProgressionEventsNewestFirst(events: ProgressionAnalyticsEvent[]) {
  return sortEventsDescending(events);
}
