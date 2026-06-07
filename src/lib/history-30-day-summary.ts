import type { SessionSummary } from "@/app/history/session-summary";
import {
  summarizeProgressionEventAnalytics,
  type ProgressionAnalyticsEvent,
} from "@/lib/progression-event-analytics";
import { getWeeklyProgressDayKey, shiftWeeklyProgressDay, type WeeklyProgressTrendDirection } from "@/lib/history-weekly-progress";

export type ThirtyDayProgressionSummary = {
  totalEventCount: number;
  promotionCount: number;
  deloadCount: number;
  manualChangeCount: number;
  revertCount: number;
  topProgressedExerciseNames: string[];
  reviewItems: string[];
  attentionItems: string[];
};

export type ThirtyDayHistorySummary = {
  timezone: string;
  windowStart: string;
  windowEnd: string;
  scopeLabel: string;
  primaryRoutineTitle: string | null;
  completedWorkoutCount: number;
  activeDayCount: number;
  exerciseCount: number;
  routineCount: number;
  prMomentCount: number;
  prExerciseNames: string[];
  primaryRoutineCoverage: {
    completedDayCount: number;
    targetDayCount: number;
  };
  consistencyTrend: {
    direction: WeeklyProgressTrendDirection;
    label: string;
    detail: string;
    delta: number;
  };
  progressionSummary: ThirtyDayProgressionSummary;
  reviewItems: string[];
  attentionItems: string[];
};

type BuildThirtyDayHistorySummaryOptions = {
  sessions: SessionSummary[];
  progressionEvents?: ProgressionAnalyticsEvent[];
  exerciseNameById?: Map<string, string>;
  routineDayCountByRoutineId?: Map<string, number>;
  timezone?: string | null;
  now?: string;
  scopeLabel?: string;
};

const DEFAULT_TIMEZONE = "America/New_York";

function toPluralLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function resolvePrimaryRoutineTitle(sessions: SessionSummary[]) {
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
    if (count > primaryCount || (count === primaryCount && primaryTitle && title.localeCompare(primaryTitle) < 0)) {
      primaryTitle = title;
      primaryCount = count;
    }
  }

  return primaryTitle;
}

function buildHistoryProgressionSummary(args: {
  events: ProgressionAnalyticsEvent[];
  exerciseNameById?: Map<string, string>;
}) {
  const analytics = summarizeProgressionEventAnalytics(args.events);
  const topProgressedExerciseNames = analytics.topProgressedExercises
    .slice(0, 3)
    .map((entry) => args.exerciseNameById?.get(entry.exerciseId)?.trim() || "Exercise");

  const promotedExerciseCount = analytics.topProgressedExercises.length;
  const reviewItems = [
    `${toPluralLabel(analytics.totalEvents, "progression event")} recorded across your history.`,
    analytics.promotionsAppliedCount > 0
      ? `${toPluralLabel(analytics.promotionsAppliedCount, "promotion")} landed across ${toPluralLabel(promotedExerciseCount, "exercise")}.`
      : "No promotions landed across your history.",
    analytics.deloadsAppliedCount > 0 || analytics.manualTargetChangesCount > 0 || analytics.revertsCount > 0
      ? `${toPluralLabel(analytics.deloadsAppliedCount, "deload")}, ${toPluralLabel(analytics.manualTargetChangesCount, "manual change")}, and ${toPluralLabel(analytics.revertsCount, "revert")} were recorded.`
      : "No deloads, manual changes, or reverts were recorded.",
  ];

  if (topProgressedExerciseNames.length > 0) {
    reviewItems.push(`Most progressed: ${topProgressedExerciseNames.join(", ")}.`);
  }

  const attentionItems: string[] = [];
  if (analytics.totalEvents === 0) {
    attentionItems.push("No progression events were recorded yet.");
  } else {
    if (analytics.promotionsAppliedCount === 0) {
      attentionItems.push("No promotions landed yet.");
    }
    if (analytics.deloadsAppliedCount > analytics.promotionsAppliedCount && analytics.deloadsAppliedCount > 0 && analytics.promotionsAppliedCount > 0) {
      attentionItems.push("Deloads outpaced promotions.");
    }
    if (analytics.manualTargetChangesCount > analytics.promotionsAppliedCount && analytics.manualTargetChangesCount > 0 && analytics.promotionsAppliedCount > 0) {
      attentionItems.push("Manual target changes outpaced promotions.");
    }
  }

  return {
    totalEventCount: analytics.totalEvents,
    promotionCount: analytics.promotionsAppliedCount,
    deloadCount: analytics.deloadsAppliedCount,
    manualChangeCount: analytics.manualTargetChangesCount,
    revertCount: analytics.revertsCount,
    topProgressedExerciseNames,
    reviewItems,
    attentionItems,
  } satisfies ThirtyDayProgressionSummary;
}

export function buildThirtyDayHistorySummary({
  sessions,
  progressionEvents = [],
  exerciseNameById = new Map<string, string>(),
  routineDayCountByRoutineId = new Map<string, number>(),
  timezone = DEFAULT_TIMEZONE,
  now = new Date().toISOString(),
  scopeLabel = "All Time",
}: BuildThirtyDayHistorySummaryOptions): ThirtyDayHistorySummary {
  const safeTimezone = typeof timezone === "string" && timezone.trim().length > 0 ? timezone : DEFAULT_TIMEZONE;
  const currentDayKey = getWeeklyProgressDayKey(now, safeTimezone)
    ?? getWeeklyProgressDayKey(new Date().toISOString(), safeTimezone)
    ?? "1970-01-30";
  const currentSevenDayStart = shiftWeeklyProgressDay(currentDayKey, -6);
  const previousSevenDayStart = shiftWeeklyProgressDay(currentDayKey, -13);
  const previousSevenDayEnd = shiftWeeklyProgressDay(currentDayKey, -7);

  const activeDays = new Set<string>();
  const exerciseNames = new Set<string>();
  const routineTitles = new Set<string>();
  const prExerciseNames: string[] = [];
  let prMomentCount = 0;
  let currentSevenDayWorkoutCount = 0;
  let previousSevenDayWorkoutCount = 0;

  for (const session of sessions) {
    const dayKey = getWeeklyProgressDayKey(session.startedAt, safeTimezone);
    if (dayKey) {
      activeDays.add(dayKey);
      if (dayKey >= currentSevenDayStart) {
        currentSevenDayWorkoutCount += 1;
      } else if (dayKey >= previousSevenDayStart && dayKey <= previousSevenDayEnd) {
        previousSevenDayWorkoutCount += 1;
      }
    }

    if (session.routineTitle?.trim()) {
      routineTitles.add(session.routineTitle.trim());
    }

    for (const exerciseName of session.exerciseNames ?? []) {
      if (exerciseName.trim()) {
        exerciseNames.add(exerciseName.trim());
      }
    }

    prMomentCount += session.prCounts.total;
    for (const exerciseName of session.prExerciseNames ?? []) {
      const normalizedName = exerciseName.trim();
      if (!normalizedName || prExerciseNames.includes(normalizedName)) {
        continue;
      }
      prExerciseNames.push(normalizedName);
    }
  }

  const allDayKeys = sessions
    .map((session) => getWeeklyProgressDayKey(session.startedAt, safeTimezone))
    .filter((dayKey): dayKey is string => Boolean(dayKey))
    .sort((left, right) => left.localeCompare(right));
  const windowStart = allDayKeys[0] ?? currentDayKey;
  const windowEnd = currentDayKey;

  const primaryRoutineTitle = resolvePrimaryRoutineTitle(sessions);
  const primaryRoutineId = sessions.find((session) => session.routineTitle?.trim() === primaryRoutineTitle)?.routineId ?? null;
  const primaryRoutineWorkoutCount = primaryRoutineId
    ? sessions.filter((session) => session.routineId === primaryRoutineId).length
    : 0;
  const completedPrimaryRoutineDays = new Set(
    sessions
      .filter((session) => session.routineId === primaryRoutineId)
      .map((session) => session.dayTitle?.trim())
      .filter((value): value is string => Boolean(value)),
  ).size;
  const primaryRoutineTargetCount = primaryRoutineId ? (routineDayCountByRoutineId.get(primaryRoutineId) ?? 0) : 0;

  let consistencyDirection: WeeklyProgressTrendDirection = "none";
  let consistencyLabel = "No sessions yet";
  let consistencyDetail = "Log a completed session to start your history review.";
  const consistencyDelta = currentSevenDayWorkoutCount - previousSevenDayWorkoutCount;

  if (currentSevenDayWorkoutCount > 0 && previousSevenDayWorkoutCount === 0) {
    consistencyDirection = "new";
    consistencyLabel = "Started moving again";
    consistencyDetail = `${toPluralLabel(currentSevenDayWorkoutCount, "workout")} in the last 7 days after an empty week before that.`;
  } else if (consistencyDelta > 0) {
    consistencyDirection = "up";
    consistencyLabel = `+${consistencyDelta} this week`;
    consistencyDetail = `${toPluralLabel(currentSevenDayWorkoutCount, "workout")} in the last 7 days, up from ${previousSevenDayWorkoutCount} the week before.`;
  } else if (consistencyDelta === 0 && currentSevenDayWorkoutCount > 0) {
    consistencyDirection = "flat";
    consistencyLabel = "Matched last week";
    consistencyDetail = `${toPluralLabel(currentSevenDayWorkoutCount, "workout")} in each of the last two weeks.`;
  } else if (consistencyDelta < 0) {
    consistencyDirection = "down";
    consistencyLabel = `${consistencyDelta} this week`;
    consistencyDetail = `${toPluralLabel(currentSevenDayWorkoutCount, "workout")} in the last 7 days after ${previousSevenDayWorkoutCount} the week before.`;
  }

  const reviewItems = [
    `${toPluralLabel(sessions.length, "workout")} across ${toPluralLabel(activeDays.size, "workout day", "workout days")}.`,
    ...(primaryRoutineTitle && primaryRoutineWorkoutCount > 0
      ? [`${primaryRoutineTitle} led with ${toPluralLabel(primaryRoutineWorkoutCount, "workout")}.`]
      : []),
    `${toPluralLabel(exerciseNames.size, "exercise")} trained across ${toPluralLabel(routineTitles.size, "routine")}.`,
    consistencyDetail,
  ];

  const attentionItems: string[] = [];
  if (sessions.length === 0) {
    attentionItems.push("No workouts are stored yet.");
  } else {
    if (currentSevenDayWorkoutCount === 0) {
      attentionItems.push("No workouts were logged in the last 7 days.");
    }
    if (prMomentCount === 0) {
      attentionItems.push("No PR moments were recorded yet.");
    }
  }

  const progressionSummary = buildHistoryProgressionSummary({
    events: progressionEvents,
    exerciseNameById,
  });

  return {
    timezone: safeTimezone,
    windowStart,
    windowEnd,
    scopeLabel,
    primaryRoutineTitle,
    completedWorkoutCount: sessions.length,
    activeDayCount: activeDays.size,
    exerciseCount: exerciseNames.size,
    routineCount: routineTitles.size,
    prMomentCount,
    prExerciseNames,
    primaryRoutineCoverage: {
      completedDayCount: completedPrimaryRoutineDays,
      targetDayCount: primaryRoutineTargetCount,
    },
    consistencyTrend: {
      direction: consistencyDirection,
      label: consistencyLabel,
      detail: consistencyDetail,
      delta: consistencyDelta,
    },
    progressionSummary,
    reviewItems,
    attentionItems,
  };
}
