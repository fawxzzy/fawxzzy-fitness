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
  isToday: boolean;
};

export type HistoryConsistencyHeatmapMonthMarker = {
  /** Index into `weeks` of the column the month label sits above. */
  weekIndex: number;
  /** `YYYY-MM`, taken from the local day keys (never from a UTC date). */
  monthKey: string;
};

export type HistoryConsistencyHeatmap = {
  startDayKey: string;
  endDayKey: string;
  /** Local day (in the History timezone) the grid treats as today. */
  currentDayKey: string;
  activeDayCount: number;
  sessionCount: number;
  /** Every dated session handed in, inside or outside the window. Separates "never trained" from "quiet stretch". */
  totalSessionCount: number;
  monthMarkers: HistoryConsistencyHeatmapMonthMarker[];
  weeks: HistoryConsistencyHeatmapCell[][];
};

const DEFAULT_TIMEZONE = "America/New_York";
const DEFAULT_WEEK_COUNT = 16;
// A month label (3 letters) spans about two week columns at 320px: keep labels at least 3 columns apart and off the
// last column so they never collide with each other or spill past the card edge.
const MONTH_MARKER_MIN_GAP_WEEKS = 3;
const MONTH_MARKER_TRAILING_WEEKS_WITHOUT_LABEL = 1;

function resolveTone(sessionCount: number): HistoryConsistencyHeatmapCell["tone"] {
  if (sessionCount >= 3) return "high";
  if (sessionCount === 2) return "medium";
  if (sessionCount === 1) return "low";
  return "none";
}

function buildMonthMarkers(weeks: HistoryConsistencyHeatmapCell[][]): HistoryConsistencyHeatmapMonthMarker[] {
  const candidates: HistoryConsistencyHeatmapMonthMarker[] = [];

  weeks.forEach((week, weekIndex) => {
    const monthStart = week.find((cell) => cell.dayKey.endsWith("-01"));
    if (monthStart) {
      candidates.push({ weekIndex, monthKey: monthStart.dayKey.slice(0, 7) });
    }
  });

  const firstWeekFirstDay = weeks[0]?.[0]?.dayKey;
  const firstCandidateWeekIndex = candidates[0]?.weekIndex ?? Number.POSITIVE_INFINITY;
  if (firstWeekFirstDay && firstCandidateWeekIndex >= MONTH_MARKER_MIN_GAP_WEEKS) {
    // The first column carries the month it starts in, unless a real month start sits right beside it.
    candidates.unshift({ weekIndex: 0, monthKey: firstWeekFirstDay.slice(0, 7) });
  }

  const lastLabelableWeekIndex = weeks.length - 1 - MONTH_MARKER_TRAILING_WEEKS_WITHOUT_LABEL;
  return candidates.filter((marker) => marker.weekIndex <= lastLabelableWeekIndex);
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
  let totalSessionCount = 0;

  for (const session of sessions) {
    const dayKey = getWeeklyProgressDayKey(session.startedAt, safeTimezone);
    if (!dayKey) {
      continue;
    }

    totalSessionCount += 1;
    if (dayKey >= startDayKey && dayKey <= endDayKey) {
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
        isToday: dayKey === currentDayKey,
      });
    }
    weeks.push(week);
  }

  return {
    startDayKey,
    endDayKey,
    currentDayKey,
    activeDayCount: countsByDay.size,
    sessionCount: [...countsByDay.values()].reduce((sum, count) => sum + count, 0),
    totalSessionCount,
    monthMarkers: buildMonthMarkers(weeks),
    weeks,
  };
}

/**
 * The heatmap is a whole-history view, so it is shown only when nothing narrows the History list. Any search text,
 * tag, non-all-time scope (current routine / current cycle) or selected day or month hides it: a narrowed row set
 * would otherwise be described as "your" consistency ("A quiet stretch", "Finish your first workout") when it is not.
 */
export function shouldShowHistoryConsistencyHeatmap({
  query,
  selectedTagCount,
  analyticsScope,
  selectedDayKey,
  selectedMonthKey,
}: {
  query: string;
  selectedTagCount: number;
  analyticsScope: string;
  selectedDayKey: string | null;
  selectedMonthKey: string | null;
}) {
  return query.trim().length === 0
    && selectedTagCount === 0
    && analyticsScope === "all_time"
    && !selectedDayKey
    && !selectedMonthKey;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export type HistoryConsistencyHeatmapCopy = {
  /** One sentence about the window; doubles as the grid's accessible label. */
  description: string;
  /** Rotating one-liners for the collapsed History disclosure. */
  compactSummaryItems: string[];
  /** Encouraging line shown under the grid while the window is empty; null once there is activity. */
  emptyMessage: string | null;
};

export function describeHistoryConsistencyHeatmap(heatmap: HistoryConsistencyHeatmap): HistoryConsistencyHeatmapCopy {
  const weekLabel = pluralize(heatmap.weeks.length, "week");

  if (heatmap.sessionCount > 0) {
    return {
      description: `${pluralize(heatmap.sessionCount, "session")} on ${pluralize(heatmap.activeDayCount, "active day")} in the last ${weekLabel}.`,
      compactSummaryItems: [
        pluralize(heatmap.sessionCount, "session"),
        pluralize(heatmap.activeDayCount, "active day"),
      ],
      emptyMessage: null,
    };
  }

  if (heatmap.totalSessionCount > 0) {
    return {
      description: `No sessions in the last ${weekLabel}.`,
      compactSummaryItems: ["Ready when you are"],
      emptyMessage: "A quiet stretch. Your next workout puts a square back on the map.",
    };
  }

  return {
    description: "No sessions yet.",
    compactSummaryItems: ["Start your map"],
    emptyMessage: "Finish your first workout and it lights up the first square.",
  };
}
