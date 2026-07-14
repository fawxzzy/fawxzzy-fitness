import type { SessionSummary } from "@/app/history/session-summary";
import { getWeeklyProgressDayKey } from "@/lib/history-weekly-progress";

export type HistoryMonthlyProgressSummary = {
  timezone: string;
  monthKey: string;
  monthLabel: string;
  previousMonthLabel: string;
  completedWorkoutCount: number;
  previousMonthWorkoutCount: number;
  activeDayCount: number;
  setCount: number;
  repCount: number;
  prMomentCount: number;
  volumeByUnit: Array<{
    unit: "lbs" | "kg";
    value: number;
  }>;
  topExerciseName: string | null;
  trend: {
    direction: "up" | "flat" | "down" | "new" | "none";
    delta: number;
    label: string;
    detail: string;
  };
};

const DEFAULT_TIMEZONE = "America/New_York";

function normalizeMonthKey(value: string | null | undefined) {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value) ? value : null;
}

function shiftMonth(monthKey: string, amount: number) {
  const date = new Date(`${monthKey}-01T12:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}

function formatMonth(monthKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${monthKey}-01T12:00:00.000Z`));
}

function normalizeVolumeUnit(unit: SessionSummary["volumeUnit"]) {
  if (unit === "kg") {
    return "kg" as const;
  }
  if (unit === "lb" || unit === "lbs") {
    return "lbs" as const;
  }
  return null;
}

export function buildHistoryMonthlyProgress({
  sessions,
  timezone = DEFAULT_TIMEZONE,
  now = new Date().toISOString(),
  monthKey: requestedMonthKey,
}: {
  sessions: SessionSummary[];
  timezone?: string | null;
  now?: string;
  monthKey?: string | null;
}): HistoryMonthlyProgressSummary {
  const safeTimezone = typeof timezone === "string" && timezone.trim() ? timezone : DEFAULT_TIMEZONE;
  const currentDayKey = getWeeklyProgressDayKey(now, safeTimezone)
    ?? getWeeklyProgressDayKey(new Date().toISOString(), safeTimezone)
    ?? "1970-01-01";
  const monthKey = normalizeMonthKey(requestedMonthKey) ?? currentDayKey.slice(0, 7);
  const previousMonthKey = shiftMonth(monthKey, -1);
  const currentSessions: Array<SessionSummary & { dayKey: string }> = [];
  let previousMonthWorkoutCount = 0;

  for (const session of sessions) {
    const dayKey = getWeeklyProgressDayKey(session.startedAt, safeTimezone);
    if (!dayKey) {
      continue;
    }
    if (dayKey.startsWith(monthKey)) {
      currentSessions.push({ ...session, dayKey });
    } else if (dayKey.startsWith(previousMonthKey)) {
      previousMonthWorkoutCount += 1;
    }
  }

  const exerciseCounts = new Map<string, number>();
  const volumeByUnit = new Map<"lbs" | "kg", number>();
  let setCount = 0;
  let repCount = 0;
  let prMomentCount = 0;

  for (const session of currentSessions) {
    setCount += session.setCount;
    repCount += session.repCount;
    prMomentCount += session.prCounts.total;
    for (const exerciseName of new Set(session.exerciseNames ?? [])) {
      const normalizedName = exerciseName.trim();
      if (normalizedName) {
        exerciseCounts.set(normalizedName, (exerciseCounts.get(normalizedName) ?? 0) + 1);
      }
    }
    const unit = normalizeVolumeUnit(session.volumeUnit);
    if (unit && Number.isFinite(session.totalVolume) && session.totalVolume > 0) {
      volumeByUnit.set(unit, (volumeByUnit.get(unit) ?? 0) + session.totalVolume);
    }
  }

  const topExerciseName = [...exerciseCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? null;
  const completedWorkoutCount = currentSessions.length;
  const delta = completedWorkoutCount - previousMonthWorkoutCount;
  let direction: HistoryMonthlyProgressSummary["trend"]["direction"] = "none";
  let label = "No sessions this month";
  let detail = `No completed workouts are stored for ${formatMonth(monthKey)}.`;

  if (completedWorkoutCount > 0 && previousMonthWorkoutCount === 0) {
    direction = "new";
    label = "Opened a new month";
    detail = `${completedWorkoutCount} completed ${completedWorkoutCount === 1 ? "workout" : "workouts"} after an empty ${formatMonth(previousMonthKey)}.`;
  } else if (delta > 0) {
    direction = "up";
    label = `+${delta} vs last month`;
    detail = `${completedWorkoutCount} completed this month, up from ${previousMonthWorkoutCount}.`;
  } else if (delta === 0 && completedWorkoutCount > 0) {
    direction = "flat";
    label = "Matched last month";
    detail = `${completedWorkoutCount} completed in both ${formatMonth(monthKey)} and ${formatMonth(previousMonthKey)}.`;
  } else if (delta < 0) {
    direction = "down";
    label = `${delta} vs last month`;
    detail = `${completedWorkoutCount} completed this month after ${previousMonthWorkoutCount} last month.`;
  }

  return {
    timezone: safeTimezone,
    monthKey,
    monthLabel: formatMonth(monthKey),
    previousMonthLabel: formatMonth(previousMonthKey),
    completedWorkoutCount,
    previousMonthWorkoutCount,
    activeDayCount: new Set(currentSessions.map((session) => session.dayKey)).size,
    setCount,
    repCount,
    prMomentCount,
    volumeByUnit: [...volumeByUnit.entries()]
      .map(([unit, value]) => ({ unit, value }))
      .sort((left, right) => left.unit.localeCompare(right.unit)),
    topExerciseName,
    trend: {
      direction,
      delta,
      label,
      detail,
    },
  };
}
