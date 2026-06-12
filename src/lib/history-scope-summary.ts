import type { SessionSummary } from "@/app/history/session-summary";
import {
  bucketProgressionEventsByTime,
  sortProgressionEventsNewestFirst,
  summarizeProgressionEventAnalytics,
  type ProgressionAnalyticsEvent,
} from "@/lib/progression-event-analytics";
import { getWeeklyProgressDayKey, shiftWeeklyProgressDay, type WeeklyProgressTrendDirection } from "@/lib/history-weekly-progress";
import type { ProgressionHistoryChartSection } from "@/lib/progression-history-display";
import type { ProgressionSummaryActivityBucket } from "@/lib/progression-summary-activity";
import { buildProgressionSummaryActivityBuckets } from "@/lib/progression-summary-activity";
import { buildProgressionSummaryChartSections } from "@/lib/progression-summary-charts";

export type HistoryScopeProgressionSummary = {
  totalEventCount: number;
  promotionCount: number;
  deloadCount: number;
  manualChangeCount: number;
  watchCount?: number;
  revertCount: number;
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

export type HistoryScopeRecapItem = {
  id: string;
  primary: string;
  value?: string | null;
  meta?: string | null;
  signals?: Array<"pr" | "promotion" | "regression" | "watch">;
  tagLabels?: string[];
  layout?: "auto" | "single-column";
};

export type HistoryScopeSummary = {
  timezone: string;
  windowStart: string;
  windowEnd: string;
  scopeLabel: string;
  primaryRoutineTitle: string | null;
  completedWorkoutCount: number;
  activeDayCount: number;
  plannedWorkoutDayCount: number;
  completedWorkoutDayCount: number;
  skippedWorkoutDayCount: number;
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
  progressionSummary: HistoryScopeProgressionSummary;
  hotspotItems: string[];
  reviewItems: string[];
  attentionItems: string[];
  recapItems?: HistoryScopeRecapItem[];
};

type BuildHistoryScopeSummaryOptions = {
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

function formatDayKey(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
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

function isPassiveRecoveryExerciseName(exerciseName: string) {
  const normalized = exerciseName.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return /\b(stretch|stretching|mobility|warm[-\s]?up|cool[-\s]?down|recovery|foam roll|breathing)\b/.test(normalized);
}

function resolveMostFrequentExerciseName(sessions: SessionSummary[], excludedNames = new Set<string>()) {
  const counts = new Map<string, { count: number; lastStartedAt: string }>();

  for (const session of sessions) {
    for (const exerciseName of session.exerciseNames ?? []) {
      const normalizedName = exerciseName.trim();
      if (!normalizedName || excludedNames.has(normalizedName) || isPassiveRecoveryExerciseName(normalizedName)) {
        continue;
      }
      const current = counts.get(normalizedName);
      counts.set(normalizedName, {
        count: (current?.count ?? 0) + 1,
        lastStartedAt: current && current.lastStartedAt > session.startedAt ? current.lastStartedAt : session.startedAt,
      });
    }
  }

  let topExerciseName: string | null = null;
  let topCount = -1;
  let topLastStartedAt = "";

  for (const [exerciseName, entry] of counts.entries()) {
    if (
      entry.count > topCount
      || (entry.count === topCount && entry.lastStartedAt > topLastStartedAt)
      || (
        entry.count === topCount
        && entry.lastStartedAt === topLastStartedAt
        && topExerciseName
        && exerciseName.localeCompare(topExerciseName) < 0
      )
    ) {
      topExerciseName = exerciseName;
      topCount = entry.count;
      topLastStartedAt = entry.lastStartedAt;
    }
  }

  if (!topExerciseName || topCount <= 0) {
    return null;
  }

  return {
    exerciseName: topExerciseName,
    count: topCount,
  };
}

function addProgressionSignalForEvent(
  signals: Set<"pr" | "promotion" | "regression" | "watch">,
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

function buildHistoryScopeRecapItems({
  sessions,
  progressionEvents,
  exerciseNameById,
}: {
  sessions: SessionSummary[];
  progressionEvents: ProgressionAnalyticsEvent[];
  exerciseNameById: Map<string, string>;
}): HistoryScopeRecapItem[] {
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
    for (const exerciseName of session.exerciseNames ?? []) {
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
    const exerciseName = exerciseNameById.get(event.exercise_id)?.trim();
    if (!exerciseName) {
      continue;
    }

    const state = getExerciseState(exerciseName);
    if (!state) {
      continue;
    }

    addProgressionSignalForEvent(state.signals, event.event_type);
    if (event.event_type === "manual_target_change") {
      state.tagLabels.add("MANUAL");
    }
  }

  return [...exerciseStateByName.entries()].map(([exerciseName, state], index) => ({
    id: `history-scope-recap-${index}-${exerciseName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    primary: exerciseName,
    value: state.sessionCount > 0 ? toPluralLabel(state.sessionCount, "session") : "progression",
    signals: [...state.signals],
    tagLabels: [...state.tagLabels],
    layout: state.signals.size + state.tagLabels.size > 1 ? "single-column" : "auto",
  }));
}

type HistorySignalReason = "leadProgress" | "promotion" | "regression" | "manual" | "stalled";

type HistorySignalEntry = {
  exerciseName: string;
  reason: HistorySignalReason;
  count?: number;
};

function formatReasonList(parts: string[]) {
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

function buildConsolidatedHistorySignalItems(entries: HistorySignalEntry[]) {
  const orderedNames: string[] = [];
  const reasonsByName = new Map<string, Map<HistorySignalReason, number | null>>();

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

      if (reasons.has("stalled")) {
        const count = reasons.get("stalled") ?? 0;
        return `${exerciseName} appeared in ${toPluralLabel(count, "session")} without a PR or progression signal.`;
      }

      const parts = [
        reasons.has("leadProgress") ? "led progress across this scope" : null,
        reasons.has("promotion") ? "drove the most promotions" : null,
        reasons.has("regression") ? "had the most regressions" : null,
        reasons.has("manual") ? "had the most manual target changes" : null,
      ].filter((value): value is string => Boolean(value));

      return parts.length > 0 ? `${exerciseName} ${formatReasonList(parts)}.` : null;
    })
    .filter((value): value is string => Boolean(value));
}

function buildHistoryProgressionSummary(args: {
  events: ProgressionAnalyticsEvent[];
  exerciseNameById?: Map<string, string>;
  routineTitleById?: Map<string, string>;
  timezone?: string | null;
}) {
  const analytics = summarizeProgressionEventAnalytics(args.events);
  const topProgressedExerciseNames = analytics.topProgressedExercises
    .slice(0, 3)
    .map((entry) => args.exerciseNameById?.get(entry.exerciseId)?.trim() || "Exercise");
  const topDeloadExerciseNames = analytics.deloadFrequencyByExercise
    .slice(0, 3)
    .map((entry) => args.exerciseNameById?.get(entry.exerciseId)?.trim() || "Exercise");
  const topAdjustedExerciseNames = analytics.manualChangeFrequencyByExercise
    .slice(0, 3)
    .map((entry) => args.exerciseNameById?.get(entry.exerciseId)?.trim() || "Exercise");
  const weeklyBuckets = bucketProgressionEventsByTime({
    events: args.events,
    granularity: "week",
    timeZone: args.timezone,
  });
  const busiestBucket = [...weeklyBuckets].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }
    return right.bucket.localeCompare(left.bucket);
  })[0] ?? null;
  const latestEvent = sortProgressionEventsNewestFirst(args.events)[0] ?? null;
  const latestExerciseName = latestEvent
    ? (args.exerciseNameById?.get(latestEvent.exercise_id)?.trim() || "Exercise")
    : null;

  const regressionCount = analytics.deloadsAppliedCount + analytics.revertsCount;
  const reviewItems: string[] = [];

  const hotspotItems = buildConsolidatedHistorySignalItems([
    ...(topProgressedExerciseNames[0] ? [{ exerciseName: topProgressedExerciseNames[0], reason: "promotion" as const }] : []),
    ...(topDeloadExerciseNames[0] ? [{ exerciseName: topDeloadExerciseNames[0], reason: "regression" as const }] : []),
    ...(topAdjustedExerciseNames[0] ? [{ exerciseName: topAdjustedExerciseNames[0], reason: "manual" as const }] : []),
  ]);

  const timelineItems = [
    weeklyBuckets.length > 0 ? `Active weeks: ${toPluralLabel(weeklyBuckets.length, "week")}.` : null,
    busiestBucket ? `Busiest week: ${formatDayKey(busiestBucket.bucket)} (${toPluralLabel(busiestBucket.count, "event")}).` : null,
    latestEvent && latestExerciseName ? `Latest progression: ${latestExerciseName} on ${formatDayKey(getWeeklyProgressDayKey(latestEvent.created_at, args.timezone ?? DEFAULT_TIMEZONE) ?? latestEvent.created_at.slice(0, 10))}.` : null,
  ].filter((value): value is string => Boolean(value));

  const attentionItems: string[] = [];
  if (analytics.totalEvents === 0) {
    attentionItems.push("No progression events were recorded yet.");
  } else {
    if (analytics.promotionsAppliedCount === 0) {
      attentionItems.push("No promotions landed yet.");
    }
    if (regressionCount > analytics.promotionsAppliedCount && regressionCount > 0 && analytics.promotionsAppliedCount > 0) {
      attentionItems.push("Regressions outpaced promotions.");
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
    watchCount: analytics.watchAppliedCount,
    revertCount: analytics.revertsCount,
    chartSections: buildProgressionSummaryChartSections({
      events: args.events,
      exerciseNameById: args.exerciseNameById,
      timeZone: args.timezone,
      activityGranularity: "week",
    }),
    activityBuckets: buildProgressionSummaryActivityBuckets({
      events: args.events,
      exerciseNameById: args.exerciseNameById,
      routineTitleById: args.routineTitleById,
      granularity: "week",
      limit: 6,
    }),
    topProgressedExerciseNames,
    topDeloadExerciseNames,
    topAdjustedExerciseNames,
    reviewItems,
    hotspotItems,
    timelineItems,
    attentionItems,
  } satisfies HistoryScopeProgressionSummary;
}

export function buildHistoryScopeSummary({
  sessions,
  progressionEvents = [],
  exerciseNameById = new Map<string, string>(),
  routineDayCountByRoutineId = new Map<string, number>(),
  timezone = DEFAULT_TIMEZONE,
  now = new Date().toISOString(),
  scopeLabel = "All Time",
}: BuildHistoryScopeSummaryOptions): HistoryScopeSummary {
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

  if (sessions.length > 0 && currentSevenDayWorkoutCount === 0 && previousSevenDayWorkoutCount === 0) {
    consistencyLabel = "No recent workouts";
    consistencyDetail = "No workouts were logged in either of the last two weeks.";
  } else if (currentSevenDayWorkoutCount > 0 && previousSevenDayWorkoutCount === 0) {
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

  const completedWorkoutDayCount = activeDays.size;
  const plannedWorkoutDayCount = Math.max(primaryRoutineTargetCount, completedWorkoutDayCount);
  const skippedWorkoutDayCount = Math.max(0, plannedWorkoutDayCount - completedWorkoutDayCount);

  const reviewItems = [
    `${toPluralLabel(completedWorkoutDayCount, "completed workout day", "completed workout days")} across ${toPluralLabel(routineTitles.size, "routine")}.`,
    ...(primaryRoutineTitle && primaryRoutineWorkoutCount > 0
      ? [`${primaryRoutineTitle} led with ${toPluralLabel(primaryRoutineWorkoutCount, "workout")}.`]
      : []),
    `${toPluralLabel(exerciseNames.size, "exercise")} trained.`,
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
    routineTitleById: new Map(
      sessions
        .map((session) => [session.routineId ?? "", session.routineTitle] as const)
        .filter(([routineId]) => Boolean(routineId)),
    ),
    timezone: safeTimezone,
  });
  const excludedStalledNames = new Set<string>([
    ...prExerciseNames,
    ...progressionSummary.topProgressedExerciseNames,
  ]);
  const stalledExercise = resolveMostFrequentExerciseName(sessions, excludedStalledNames);
  const signalEntries: HistorySignalEntry[] = [
    ...(progressionSummary.topProgressedExerciseNames[0]
      ? [
          { exerciseName: progressionSummary.topProgressedExerciseNames[0], reason: "leadProgress" as const },
          { exerciseName: progressionSummary.topProgressedExerciseNames[0], reason: "promotion" as const },
        ]
      : []),
    ...(progressionSummary.topDeloadExerciseNames[0] ? [{ exerciseName: progressionSummary.topDeloadExerciseNames[0], reason: "regression" as const }] : []),
    ...(progressionSummary.topAdjustedExerciseNames[0] ? [{ exerciseName: progressionSummary.topAdjustedExerciseNames[0], reason: "manual" as const }] : []),
    ...(stalledExercise ? [{ exerciseName: stalledExercise.exerciseName, reason: "stalled" as const, count: stalledExercise.count }] : []),
  ];
  const hotspotItems = [
    progressionSummary.deloadCount > progressionSummary.promotionCount && progressionSummary.deloadCount > 0
      ? "Regressions outpaced promotions."
      : null,
    ...buildConsolidatedHistorySignalItems(signalEntries),
  ].filter((value): value is string => Boolean(value));
  const recapItems = buildHistoryScopeRecapItems({
    sessions,
    progressionEvents,
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
    plannedWorkoutDayCount,
    completedWorkoutDayCount,
    skippedWorkoutDayCount,
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
    hotspotItems,
    reviewItems,
    attentionItems,
    recapItems,
  };
}
