import type { SessionSummary } from "@/app/history/session-summary";
import {
  getWeeklyProgressDayKey,
  shiftWeeklyProgressDay,
  startOfWeeklyProgressIsoWeek,
} from "@/lib/history-weekly-progress";

export type HistoryWorkoutStreakSummary = {
  currentWeekCount: number;
  bestWeekCount: number;
  activeWeekCount: number;
  lastCompletedDayKey: string | null;
  statusLabel: string;
  ruleDescription: string;
};

const DEFAULT_TIMEZONE = "America/New_York";

function countConsecutiveWeeks(weekStarts: string[]) {
  let best = 0;
  let current = 0;
  let previous: string | null = null;

  for (const weekStart of weekStarts) {
    current = previous && shiftWeeklyProgressDay(previous, 7) === weekStart ? current + 1 : 1;
    best = Math.max(best, current);
    previous = weekStart;
  }

  return best;
}

export function buildHistoryWorkoutStreak({
  sessions,
  timezone = DEFAULT_TIMEZONE,
  now = new Date().toISOString(),
}: {
  sessions: SessionSummary[];
  timezone?: string | null;
  now?: string;
}): HistoryWorkoutStreakSummary {
  const safeTimezone = typeof timezone === "string" && timezone.trim() ? timezone : DEFAULT_TIMEZONE;
  const currentDayKey = getWeeklyProgressDayKey(now, safeTimezone)
    ?? getWeeklyProgressDayKey(new Date().toISOString(), safeTimezone)
    ?? "1970-01-05";
  const currentWeekStart = startOfWeeklyProgressIsoWeek(currentDayKey);
  const previousWeekStart = shiftWeeklyProgressDay(currentWeekStart, -7);
  const dayKeys = sessions
    .map((session) => getWeeklyProgressDayKey(session.startedAt, safeTimezone))
    .filter((dayKey): dayKey is string => Boolean(dayKey))
    .sort((left, right) => left.localeCompare(right));
  const weekStarts = [...new Set(dayKeys.map(startOfWeeklyProgressIsoWeek))].sort((left, right) => left.localeCompare(right));
  const latestWeekStart = weekStarts[weekStarts.length - 1] ?? null;
  let currentWeekCount = 0;

  if (latestWeekStart === currentWeekStart || latestWeekStart === previousWeekStart) {
    currentWeekCount = 1;
    for (let index = weekStarts.length - 2; index >= 0; index -= 1) {
      const expectedWeekStart = shiftWeeklyProgressDay(weekStarts[index + 1], -7);
      if (weekStarts[index] !== expectedWeekStart) {
        break;
      }
      currentWeekCount += 1;
    }
  }

  let statusLabel = "No active streak yet";
  if (currentWeekCount === 1) {
    statusLabel = "1 active training week";
  } else if (currentWeekCount > 1) {
    statusLabel = `${currentWeekCount} active training weeks`;
  } else if (weekStarts.length > 0) {
    statusLabel = "Ready to restart this week";
  }

  return {
    currentWeekCount,
    bestWeekCount: countConsecutiveWeeks(weekStarts),
    activeWeekCount: weekStarts.length,
    lastCompletedDayKey: dayKeys[dayKeys.length - 1] ?? null,
    statusLabel,
    ruleDescription: "A streak is consecutive training weeks with at least one completed workout. Rest days do not break it, and the current partial week keeps last week's streak open.",
  };
}
