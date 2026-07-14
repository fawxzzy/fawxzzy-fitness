import type { SessionSummary } from "@/app/history/session-summary";
import {
  getWeeklyProgressDayKey,
  shiftWeeklyProgressDay,
  startOfWeeklyProgressIsoWeek,
} from "@/lib/history-weekly-progress";

export type HistoryConsistencyHeatmapCell = {
  dayKey: string;
  sessionCount: number;
  tone: "none" | "low" | "medium" | "high";
  isFuture: boolean;
};

export type HistoryConsistencyHeatmap = {
  startDayKey: string;
  endDayKey: string;
  activeDayCount: number;
  sessionCount: number;
  weeks: HistoryConsistencyHeatmapCell[][];
};

const DEFAULT_TIMEZONE = "America/New_York";
const DEFAULT_WEEK_COUNT = 16;

function resolveTone(sessionCount: number): HistoryConsistencyHeatmapCell["tone"] {
  if (sessionCount >= 3) return "high";
  if (sessionCount === 2) return "medium";
  if (sessionCount === 1) return "low";
  return "none";
}

export function buildHistoryConsistencyHeatmap({
  sessions,
  timezone = DEFAULT_TIMEZONE,
  now = new Date().toISOString(),
  weekCount = DEFAULT_WEEK_COUNT,
}: {
  sessions: SessionSummary[];
  timezone?: string | null;
  now?: string;
  weekCount?: number;
}): HistoryConsistencyHeatmap {
  const safeTimezone = typeof timezone === "string" && timezone.trim() ? timezone : DEFAULT_TIMEZONE;
  const currentDayKey = getWeeklyProgressDayKey(now, safeTimezone)
    ?? getWeeklyProgressDayKey(new Date().toISOString(), safeTimezone)
    ?? "1970-01-05";
  const safeWeekCount = Math.max(4, Math.min(52, Math.floor(weekCount)));
  const currentWeekStart = startOfWeeklyProgressIsoWeek(currentDayKey);
  const startDayKey = shiftWeeklyProgressDay(currentWeekStart, -(safeWeekCount - 1) * 7);
  const endDayKey = shiftWeeklyProgressDay(currentWeekStart, 6);
  const countsByDay = new Map<string, number>();

  for (const session of sessions) {
    const dayKey = getWeeklyProgressDayKey(session.startedAt, safeTimezone);
    if (dayKey && dayKey >= startDayKey && dayKey <= endDayKey) {
      countsByDay.set(dayKey, (countsByDay.get(dayKey) ?? 0) + 1);
    }
  }

  const weeks: HistoryConsistencyHeatmapCell[][] = [];
  for (let weekIndex = 0; weekIndex < safeWeekCount; weekIndex += 1) {
    const weekStart = shiftWeeklyProgressDay(startDayKey, weekIndex * 7);
    const week: HistoryConsistencyHeatmapCell[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex += 1) {
      const dayKey = shiftWeeklyProgressDay(weekStart, dayIndex);
      const sessionCount = countsByDay.get(dayKey) ?? 0;
      week.push({
        dayKey,
        sessionCount,
        tone: resolveTone(sessionCount),
        isFuture: dayKey > currentDayKey,
      });
    }
    weeks.push(week);
  }

  return {
    startDayKey,
    endDayKey,
    activeDayCount: countsByDay.size,
    sessionCount: [...countsByDay.values()].reduce((sum, count) => sum + count, 0),
    weeks,
  };
}
