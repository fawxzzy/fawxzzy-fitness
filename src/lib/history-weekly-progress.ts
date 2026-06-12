import type { SessionSummary } from "@/app/history/session-summary";
import {
  bucketProgressionEventsByTime,
  sortProgressionEventsNewestFirst,
  summarizeProgressionEventAnalytics,
  type ProgressionAnalyticsEvent,
} from "@/lib/progression-event-analytics";
import type { ProgressionHistoryChartSection } from "@/lib/progression-history-display";
import type { ProgressionSummaryActivityBucket } from "@/lib/progression-summary-activity";
import { buildProgressionSummaryActivityBuckets } from "@/lib/progression-summary-activity";
import { buildProgressionSummaryChartSections } from "@/lib/progression-summary-charts";

export type WeeklyProgressExerciseMeta = {
  name: string;
  measurementType: string | null;
  primaryMuscle: string | null;
};

export type WeeklyProgressSessionExercise = {
  id: string;
  sessionId: string;
  exerciseId: string;
};

export type WeeklyProgressSet = {
  weight: number;
  reps: number;
};

export type WeeklyProgressVolumeCategoryKey = "strength" | "cardio" | "bodyweight" | "other";

export type WeeklyProgressVolumeCategory = {
  key: WeeklyProgressVolumeCategoryKey;
  label: string;
  setCount: number;
  exerciseCount: number;
};

export type WeeklyProgressTrendDirection = "up" | "flat" | "down" | "new" | "none";

export type WeeklyProgressRecapItem = {
  id: string;
  primary: string;
  value?: string | null;
  meta?: string | null;
  signals?: Array<"pr" | "promotion" | "regression" | "watch">;
  tagLabels?: string[];
  layout?: "auto" | "single-column";
};

export type WeeklyProgressSummary = {
  timezone: string;
  weekStart: string;
  weekEnd: string;
  primaryRoutineTitle: string | null;
  primaryRoutineTargetCount: number;
  completedWorkoutCount: number;
  previousWeekWorkoutCount: number;
  activeDayCount: number;
  prMomentCount: number;
  prExerciseNames: string[];
  consistencyTrend: {
    direction: WeeklyProgressTrendDirection;
    label: string;
    detail: string;
    delta: number;
  };
  volumeCategories: WeeklyProgressVolumeCategory[];
  progressScore: {
    value: number;
    max: number;
    breakdown: Array<{
      label: string;
      value: number;
      max: number;
    }>;
    summary: string;
  };
  progressionSummary: {
    totalEventCount: number;
    promotionCount: number;
    deloadCount: number;
    manualChangeCount: number;
    watchCount?: number;
    revertCount?: number;
    chartSections: ProgressionHistoryChartSection[];
    activityBuckets: ProgressionSummaryActivityBucket[];
    topProgressedExerciseNames: string[];
    topDeloadExerciseNames: string[];
    topAdjustedExerciseNames: string[];
    reviewItems: string[];
    hotspotItems: string[];
    timelineItems: string[];
    attentionItems: string[];
  };
  hotspotItems: string[];
  attentionItems: string[];
  recapItems?: WeeklyProgressRecapItem[];
};

type BuildWeeklyProgressSummaryOptions = {
  sessions: SessionSummary[];
  progressionEvents?: ProgressionAnalyticsEvent[];
  sessionExercisesBySessionId: Map<string, WeeklyProgressSessionExercise[]>;
  setsBySessionExerciseId: Map<string, WeeklyProgressSet[]>;
  exerciseMetaById: Map<string, WeeklyProgressExerciseMeta>;
  routineDayCountByRoutineId?: Map<string, number>;
  timezone?: string | null;
  now?: string;
  weekStart?: string;
};

const DEFAULT_TIMEZONE = "America/New_York";
const SCORE_MAX = 10;

export function getWeeklyProgressDayKey(value: string, timeZone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

export function shiftWeeklyProgressDay(dayKey: string, amount: number) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function startOfWeeklyProgressIsoWeek(dayKey: string) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return shiftWeeklyProgressDay(dayKey, diff);
}

export function getWeeklyProgressWeekStart(value: string, timeZone: string) {
  const dayKey = getWeeklyProgressDayKey(value, timeZone);
  return dayKey ? startOfWeeklyProgressIsoWeek(dayKey) : null;
}

function labelForVolumeCategory(key: WeeklyProgressVolumeCategoryKey) {
  switch (key) {
    case "strength":
      return "Strength";
    case "cardio":
      return "Cardio";
    case "bodyweight":
      return "Bodyweight";
    default:
      return "Other";
  }
}

function normalizePositive(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function resolveVolumeCategory(
  measurementType: string | null | undefined,
  sets: WeeklyProgressSet[],
): WeeklyProgressVolumeCategoryKey {
  const normalizedMeasurementType = String(measurementType ?? "").trim().toLowerCase();
  if (
    normalizedMeasurementType === "time"
    || normalizedMeasurementType === "distance"
    || normalizedMeasurementType === "time_distance"
  ) {
    return "cardio";
  }

  if (sets.some((set) => normalizePositive(set.weight) > 0)) {
    return "strength";
  }

  if (sets.some((set) => normalizePositive(set.reps) > 0)) {
    return "bodyweight";
  }

  return normalizedMeasurementType === "reps" ? "bodyweight" : "other";
}

function toPluralLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatWeeklyProgressDayKey(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function isPassiveRecoveryExerciseName(exerciseName: string) {
  const normalized = exerciseName.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return /\b(stretch|stretching|mobility|warm[-\s]?up|cool[-\s]?down|recovery|foam roll|breathing)\b/.test(normalized);
}

function resolveTopExerciseByCount(
  exerciseCounts: Map<string, number>,
  exerciseMetaById: Map<string, WeeklyProgressExerciseMeta>,
) {
  let topExerciseId: string | null = null;
  let topCount = -1;

  for (const [exerciseId, count] of exerciseCounts.entries()) {
    const exerciseName = exerciseMetaById.get(exerciseId)?.name?.trim() || "";
    if (isPassiveRecoveryExerciseName(exerciseName)) {
      continue;
    }

    if (count > topCount || (count === topCount && topExerciseId && exerciseId.localeCompare(topExerciseId) < 0)) {
      topExerciseId = exerciseId;
      topCount = count;
    }
  }

  if (!topExerciseId || topCount <= 1) {
    return null;
  }

  return {
    exerciseId: topExerciseId,
    exerciseName: exerciseMetaById.get(topExerciseId)?.name?.trim() || "Exercise",
    count: topCount,
  };
}

function addWeeklyProgressionSignalForEvent(
  signals: Set<"promotion" | "regression" | "watch">,
  eventType: ProgressionAnalyticsEvent["event_type"],
) {
  if (eventType === "promotion_applied") {
    signals.add("promotion");
  } else if (eventType === "deload_applied" || eventType === "promotion_reverted") {
    signals.add("regression");
  } else if (eventType === "manual_target_change" || eventType === "watch_applied") {
    signals.add("watch");
  }
}

function buildWeeklyProgressRecapItems({
  sessions,
  progressionEvents,
  sessionExercisesBySessionId,
  exerciseMetaById,
}: {
  sessions: SessionSummary[];
  progressionEvents: ProgressionAnalyticsEvent[];
  sessionExercisesBySessionId: Map<string, WeeklyProgressSessionExercise[]>;
  exerciseMetaById: Map<string, WeeklyProgressExerciseMeta>;
}): WeeklyProgressRecapItem[] {
  const exerciseStateByName = new Map<string, {
    sessionCount: number;
    signals: Set<"pr" | "promotion" | "regression" | "watch">;
    tagLabels: Set<string>;
  }>();

  function getExerciseState(exerciseName: string) {
    const normalizedName = exerciseName.trim();
    if (!normalizedName) {
      return null;
    }

    const current = exerciseStateByName.get(normalizedName) ?? {
      sessionCount: 0,
      signals: new Set<"pr" | "promotion" | "regression" | "watch">(),
      tagLabels: new Set<string>(),
    };
    exerciseStateByName.set(normalizedName, current);
    return current;
  }

  for (const session of sessions) {
    const namesForSession = new Set<string>();
    for (const sessionExercise of sessionExercisesBySessionId.get(session.id) ?? []) {
      const exerciseName = exerciseMetaById.get(sessionExercise.exerciseId)?.name?.trim();
      if (exerciseName) {
        namesForSession.add(exerciseName);
      }
    }
    for (const exerciseName of session.exerciseNames ?? []) {
      if (exerciseName.trim()) {
        namesForSession.add(exerciseName.trim());
      }
    }

    for (const exerciseName of namesForSession) {
      const state = getExerciseState(exerciseName);
      if (state) {
        state.sessionCount += 1;
      }
    }

    for (const exerciseName of session.prExerciseNames ?? []) {
      getExerciseState(exerciseName)?.signals.add("pr");
    }
  }

  for (const event of progressionEvents) {
    const exerciseName = exerciseMetaById.get(event.exercise_id)?.name?.trim();
    if (!exerciseName) {
      continue;
    }

    const state = getExerciseState(exerciseName);
    if (!state) {
      continue;
    }

    addWeeklyProgressionSignalForEvent(state.signals, event.event_type);
    if (event.event_type === "manual_target_change") {
      state.tagLabels.add("MANUAL");
    }
  }

  return [...exerciseStateByName.entries()].map(([exerciseName, state], index) => ({
    id: `weekly-progress-recap-${index}-${exerciseName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    primary: exerciseName,
    value: state.sessionCount > 0 ? toPluralLabel(state.sessionCount, "session") : "progression",
    signals: [...state.signals],
    tagLabels: [...state.tagLabels],
    layout: state.signals.size + state.tagLabels.size > 1 ? "single-column" : "auto",
  }));
}

type WeeklySignalReason = "cycleLead" | "pr" | "promotion" | "regression" | "manual";

type WeeklySignalEntry = {
  exerciseName: string;
  reason: WeeklySignalReason;
  count?: number;
};

function formatWeeklyReasonList(parts: string[]) {
  if (parts.length === 2 && parts[0] === "had the most regressions" && parts[1] === "had the most manual target changes") {
    return "had the most regressions and manual target changes";
  }

  if (parts.length <= 1) {
    return parts[0] ?? "";
  }

  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }

  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function buildConsolidatedWeeklySignalItems(entries: WeeklySignalEntry[]) {
  const orderedNames: string[] = [];
  const reasonsByName = new Map<string, Map<WeeklySignalReason, number | null>>();

  for (const entry of entries) {
    const exerciseName = entry.exerciseName.trim();
    if (!exerciseName) {
      continue;
    }

    if (!reasonsByName.has(exerciseName)) {
      reasonsByName.set(exerciseName, new Map());
      orderedNames.push(exerciseName);
    }

    reasonsByName.get(exerciseName)?.set(entry.reason, entry.count ?? null);
  }

  return orderedNames
    .map((exerciseName) => {
      const reasons = reasonsByName.get(exerciseName);
      if (!reasons) {
        return null;
      }

      const parts = [
        reasons.has("cycleLead") ? `led the cycle with ${toPluralLabel(reasons.get("cycleLead") ?? 0, "session")}` : null,
        reasons.has("pr") ? "had the strongest PR signal" : null,
        reasons.has("promotion") ? "drove the most promotions" : null,
        reasons.has("regression") ? "had the most regressions" : null,
        reasons.has("manual") ? "had the most manual target changes" : null,
      ].filter((value): value is string => Boolean(value));

      return parts.length > 0 ? `${exerciseName} ${formatWeeklyReasonList(parts)}.` : null;
    })
    .filter((value): value is string => Boolean(value));
}

function resolvePrimaryRoutineTargetCount(
  sessions: Array<SessionSummary & { dayKey: string }>,
  routineDayCountByRoutineId: Map<string, number>,
) {
  const currentWeekRoutineCounts = new Map<string, number>();

  for (const session of sessions) {
    const routineId = session.routineId?.trim();
    if (!routineId) {
      continue;
    }

    currentWeekRoutineCounts.set(routineId, (currentWeekRoutineCounts.get(routineId) ?? 0) + 1);
  }

  let primaryRoutineId: string | null = null;
  let primaryRoutineSessionCount = -1;

  for (const [routineId, sessionCount] of currentWeekRoutineCounts.entries()) {
    if (sessionCount > primaryRoutineSessionCount) {
      primaryRoutineId = routineId;
      primaryRoutineSessionCount = sessionCount;
    }
  }

  return primaryRoutineId ? (routineDayCountByRoutineId.get(primaryRoutineId) ?? 0) : 0;
}

function resolvePrimaryRoutineTitle(sessions: Array<SessionSummary & { dayKey: string }>) {
  const titleCounts = new Map<string, number>();

  for (const session of sessions) {
    const routineTitle = session.routineTitle?.trim();
    if (!routineTitle) {
      continue;
    }

    titleCounts.set(routineTitle, (titleCounts.get(routineTitle) ?? 0) + 1);
  }

  let primaryTitle: string | null = null;
  let primaryCount = -1;

  for (const [title, count] of titleCounts.entries()) {
    if (count > primaryCount) {
      primaryTitle = title;
      primaryCount = count;
      continue;
    }

    if (count === primaryCount && primaryTitle && title.localeCompare(primaryTitle) < 0) {
      primaryTitle = title;
    }
  }

  return primaryTitle;
}

export function buildWeeklyProgressSummary({
  sessions,
  progressionEvents = [],
  sessionExercisesBySessionId,
  setsBySessionExerciseId,
  exerciseMetaById,
  routineDayCountByRoutineId = new Map<string, number>(),
  timezone = DEFAULT_TIMEZONE,
  now = new Date().toISOString(),
  weekStart: requestedWeekStart,
}: BuildWeeklyProgressSummaryOptions): WeeklyProgressSummary {
  const safeTimezone = typeof timezone === "string" && timezone.trim().length > 0 ? timezone : DEFAULT_TIMEZONE;
  const fallbackCurrentDayKey = getWeeklyProgressDayKey(now, safeTimezone)
    ?? getWeeklyProgressDayKey(new Date().toISOString(), safeTimezone)
    ?? "1970-01-05";
  const weekStart = requestedWeekStart && requestedWeekStart.trim().length > 0
    ? requestedWeekStart
    : startOfWeeklyProgressIsoWeek(fallbackCurrentDayKey);
  const weekEnd = shiftWeeklyProgressDay(weekStart, 6);
  const previousWeekStart = shiftWeeklyProgressDay(weekStart, -7);
  const previousWeekEnd = shiftWeeklyProgressDay(previousWeekStart, 6);

  const currentWeekSessions: Array<SessionSummary & { dayKey: string }> = [];
  const currentWeekProgressionEvents: ProgressionAnalyticsEvent[] = [];
  let previousWeekWorkoutCount = 0;

  for (const session of sessions) {
    const dayKey = getWeeklyProgressDayKey(session.startedAt, safeTimezone);
    if (!dayKey) {
      continue;
    }

    if (dayKey >= weekStart && dayKey <= weekEnd) {
      currentWeekSessions.push({ ...session, dayKey });
      continue;
    }

    if (dayKey >= previousWeekStart && dayKey <= previousWeekEnd) {
      previousWeekWorkoutCount += 1;
    }
  }

  for (const event of progressionEvents) {
    const dayKey = getWeeklyProgressDayKey(event.created_at, safeTimezone);
    if (!dayKey || dayKey < weekStart || dayKey > weekEnd) {
      continue;
    }
    currentWeekProgressionEvents.push(event);
  }

  const activeDayCount = new Set(currentWeekSessions.map((session) => session.dayKey)).size;
  const completedWorkoutCount = currentWeekSessions.length;
  const primaryRoutineTitle = resolvePrimaryRoutineTitle(currentWeekSessions);
  const prMomentCount = currentWeekSessions.reduce((sum, session) => sum + session.prCounts.total, 0);
  const primaryRoutineTargetCount = resolvePrimaryRoutineTargetCount(currentWeekSessions, routineDayCountByRoutineId);
  const prExerciseNames: string[] = [];
  for (const session of currentWeekSessions) {
    for (const exerciseName of session.prExerciseNames ?? []) {
      const normalizedName = exerciseName.trim();
      if (!normalizedName || prExerciseNames.includes(normalizedName)) {
        continue;
      }
      prExerciseNames.push(normalizedName);
    }
  }

  const volumeCategoryState = new Map<
    WeeklyProgressVolumeCategoryKey,
    { setCount: number; exerciseIds: Set<string> }
  >();
  const exerciseCounts = new Map<string, number>();

  for (const session of currentWeekSessions) {
    const sessionExercises = sessionExercisesBySessionId.get(session.id) ?? [];
    for (const sessionExercise of sessionExercises) {
      const sets = setsBySessionExerciseId.get(sessionExercise.id) ?? [];
      if (sets.length === 0) {
        continue;
      }

      const exerciseMeta = exerciseMetaById.get(sessionExercise.exerciseId);
      const categoryKey = resolveVolumeCategory(exerciseMeta?.measurementType, sets);
      const bucket = volumeCategoryState.get(categoryKey) ?? {
        setCount: 0,
        exerciseIds: new Set<string>(),
      };

      bucket.setCount += sets.length;
      bucket.exerciseIds.add(sessionExercise.exerciseId);
      volumeCategoryState.set(categoryKey, bucket);
      exerciseCounts.set(sessionExercise.exerciseId, (exerciseCounts.get(sessionExercise.exerciseId) ?? 0) + 1);
    }
  }

  const volumeCategories = [...volumeCategoryState.entries()]
    .map(([key, value]) => ({
      key,
      label: labelForVolumeCategory(key),
      setCount: value.setCount,
      exerciseCount: value.exerciseIds.size,
    }))
    .sort((left, right) => {
      if (right.setCount !== left.setCount) {
        return right.setCount - left.setCount;
      }
      return left.label.localeCompare(right.label);
    });

  const workoutPoints = Math.min(completedWorkoutCount, 4);
  const coveragePoints = Math.min(completedWorkoutCount, 3);
  const consistencyPoints = primaryRoutineTargetCount <= 0 || completedWorkoutCount <= 0
    ? 0
    : completedWorkoutCount >= primaryRoutineTargetCount
      ? 3
      : completedWorkoutCount / primaryRoutineTargetCount >= (2 / 3)
        ? 2
        : 1;
  const progressScoreValue = workoutPoints + consistencyPoints + coveragePoints;

  let consistencyDirection: WeeklyProgressTrendDirection = "none";
  let consistencyLabel = "No sessions yet";
  let consistencyDetail = "Log a completed session to start the weekly trend.";
  const consistencyDelta = completedWorkoutCount - previousWeekWorkoutCount;

  if (completedWorkoutCount > 0 && previousWeekWorkoutCount === 0) {
    consistencyDirection = "new";
    consistencyLabel = "Opened the week";
    consistencyDetail = `${toPluralLabel(completedWorkoutCount, "workout")} across ${toPluralLabel(activeDayCount, "day")}.`;
  } else if (consistencyDelta > 0) {
    consistencyDirection = "up";
    consistencyLabel = `+${consistencyDelta} vs last week`;
    consistencyDetail = `${toPluralLabel(completedWorkoutCount, "workout")} this week, ${toPluralLabel(previousWeekWorkoutCount, "workout")} last week.`;
  } else if (consistencyDelta === 0 && completedWorkoutCount > 0) {
    consistencyDirection = "flat";
    consistencyLabel = "Matched last week";
    consistencyDetail = `${toPluralLabel(completedWorkoutCount, "workout")} across ${toPluralLabel(activeDayCount, "active day", "active days")}.`;
  } else if (consistencyDelta < 0) {
    consistencyDirection = "down";
    consistencyLabel = `${consistencyDelta} vs last week`;
    consistencyDetail = `${toPluralLabel(completedWorkoutCount, "workout")} this week after ${toPluralLabel(previousWeekWorkoutCount, "workout")} last week.`;
  }

  const topExercise = resolveTopExerciseByCount(exerciseCounts, exerciseMetaById);
  const progressionAnalytics = summarizeProgressionEventAnalytics(currentWeekProgressionEvents);
  const progressionTopProgressedExerciseNames = progressionAnalytics.topProgressedExercises
    .slice(0, 3)
    .map((entry) => exerciseMetaById.get(entry.exerciseId)?.name?.trim() || "Exercise");
  const progressionTopDeloadExerciseNames = progressionAnalytics.deloadFrequencyByExercise
    .slice(0, 3)
    .map((entry) => exerciseMetaById.get(entry.exerciseId)?.name?.trim() || "Exercise");
  const progressionTopAdjustedExerciseNames = progressionAnalytics.manualChangeFrequencyByExercise
    .slice(0, 3)
    .map((entry) => exerciseMetaById.get(entry.exerciseId)?.name?.trim() || "Exercise");
  const progressionDayBuckets = bucketProgressionEventsByTime({
    events: currentWeekProgressionEvents,
    granularity: "day",
    timeZone: safeTimezone,
  });
  const busiestProgressionDay = [...progressionDayBuckets].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return right.bucket.localeCompare(left.bucket);
  })[0] ?? null;
  const latestProgressionEvent = sortProgressionEventsNewestFirst(currentWeekProgressionEvents)[0] ?? null;
  const latestProgressionExerciseName = latestProgressionEvent
    ? (exerciseMetaById.get(latestProgressionEvent.exercise_id)?.name?.trim() || "Exercise")
    : null;
  const progressionSummary = {
    totalEventCount: progressionAnalytics.totalEvents,
    promotionCount: progressionAnalytics.promotionsAppliedCount,
    deloadCount: progressionAnalytics.deloadsAppliedCount,
    manualChangeCount: progressionAnalytics.manualTargetChangesCount,
    watchCount: progressionAnalytics.watchAppliedCount,
    revertCount: progressionAnalytics.revertsCount,
    chartSections: buildProgressionSummaryChartSections({
      events: currentWeekProgressionEvents,
      exerciseNameById: new Map(
        [...exerciseMetaById.entries()].map(([exerciseId, meta]) => [exerciseId, meta.name]),
      ),
      timeZone: safeTimezone,
      activityGranularity: "day",
    }),
    activityBuckets: buildProgressionSummaryActivityBuckets({
      events: currentWeekProgressionEvents,
      exerciseNameById: new Map(
        [...exerciseMetaById.entries()].map(([exerciseId, meta]) => [exerciseId, meta.name]),
      ),
      routineTitleById: new Map(
        currentWeekSessions
          .map((session) => [session.routineId ?? "", session.routineTitle] as const)
          .filter(([routineId]) => Boolean(routineId)),
      ),
      granularity: "day",
      limit: 7,
    }),
    topProgressedExerciseNames: progressionTopProgressedExerciseNames,
    topDeloadExerciseNames: progressionTopDeloadExerciseNames,
    topAdjustedExerciseNames: progressionTopAdjustedExerciseNames,
    reviewItems: [],
    hotspotItems: buildConsolidatedWeeklySignalItems([
      ...(progressionTopProgressedExerciseNames[0] ? [{ exerciseName: progressionTopProgressedExerciseNames[0], reason: "promotion" as const }] : []),
      ...(progressionTopDeloadExerciseNames[0] ? [{ exerciseName: progressionTopDeloadExerciseNames[0], reason: "regression" as const }] : []),
      ...(progressionTopAdjustedExerciseNames[0] ? [{ exerciseName: progressionTopAdjustedExerciseNames[0], reason: "manual" as const }] : []),
    ]),
    timelineItems: [
      progressionDayBuckets.length > 0 ? `Active progression days: ${toPluralLabel(progressionDayBuckets.length, "day")}.` : null,
      busiestProgressionDay ? `Busiest day: ${formatWeeklyProgressDayKey(busiestProgressionDay.bucket)} (${toPluralLabel(busiestProgressionDay.count, "event")}).` : null,
      latestProgressionEvent && latestProgressionExerciseName
        ? `Latest progression: ${latestProgressionExerciseName} on ${formatWeeklyProgressDayKey(getWeeklyProgressDayKey(latestProgressionEvent.created_at, safeTimezone) ?? latestProgressionEvent.created_at.slice(0, 10))}.`
        : null,
    ].filter((value): value is string => Boolean(value)),
    attentionItems: [
      progressionAnalytics.totalEvents === 0 ? "No progression events were recorded this week." : null,
      progressionAnalytics.totalEvents > 0 && progressionAnalytics.promotionsAppliedCount === 0 ? "Progression changes landed without a promotion this week." : null,
      progressionAnalytics.deloadsAppliedCount + progressionAnalytics.revertsCount > progressionAnalytics.promotionsAppliedCount && progressionAnalytics.promotionsAppliedCount > 0
        ? "Regressions outpaced promotions this week."
        : null,
      progressionAnalytics.manualTargetChangesCount > progressionAnalytics.promotionsAppliedCount && progressionAnalytics.promotionsAppliedCount > 0
        ? "Manual target changes outpaced promotions this week."
        : null,
    ].filter((value): value is string => Boolean(value)),
  };
  const hotspotItems = buildConsolidatedWeeklySignalItems([
    ...(topExercise ? [{ exerciseName: topExercise.exerciseName, reason: "cycleLead" as const, count: topExercise.count }] : []),
    ...(prExerciseNames[0] ? [{ exerciseName: prExerciseNames[0], reason: "pr" as const }] : []),
    ...(progressionTopProgressedExerciseNames[0] ? [{ exerciseName: progressionTopProgressedExerciseNames[0], reason: "promotion" as const }] : []),
    ...(progressionTopDeloadExerciseNames[0] ? [{ exerciseName: progressionTopDeloadExerciseNames[0], reason: "regression" as const }] : []),
    ...(progressionTopAdjustedExerciseNames[0] ? [{ exerciseName: progressionTopAdjustedExerciseNames[0], reason: "manual" as const }] : []),
  ]);
  const recapItems = buildWeeklyProgressRecapItems({
    sessions: currentWeekSessions,
    progressionEvents: currentWeekProgressionEvents,
    sessionExercisesBySessionId,
    exerciseMetaById,
  });
  const attentionItems = [
    primaryRoutineTargetCount > 0 && completedWorkoutCount < primaryRoutineTargetCount
      ? `${primaryRoutineTargetCount - completedWorkoutCount} planned ${primaryRoutineTargetCount - completedWorkoutCount === 1 ? "day is" : "days are"} still open this cycle.`
      : null,
  ].filter((value): value is string => Boolean(value));

  const scoreBreakdown = [
    { label: "Sessions", value: workoutPoints, max: 4 },
    { label: "Consistency", value: consistencyPoints, max: 3 },
    { label: "Coverage", value: coveragePoints, max: 3 },
  ];

  const scoreSummary = scoreBreakdown
    .filter((entry) => entry.value > 0)
    .map((entry) => `${entry.value}/${entry.max} ${entry.label.toLowerCase()}`)
    .join(" • ");

  return {
    timezone: safeTimezone,
    weekStart,
    weekEnd,
    primaryRoutineTitle,
    primaryRoutineTargetCount,
    completedWorkoutCount,
    previousWeekWorkoutCount,
    activeDayCount,
    prMomentCount,
    prExerciseNames,
    consistencyTrend: {
      direction: consistencyDirection,
      label: consistencyLabel,
      detail: consistencyDetail,
      delta: consistencyDelta,
    },
    volumeCategories,
    progressScore: {
      value: progressScoreValue,
      max: SCORE_MAX,
      breakdown: scoreBreakdown,
      summary: scoreSummary || "No score inputs yet",
    },
    progressionSummary,
    hotspotItems,
    attentionItems,
    recapItems,
  };
}
