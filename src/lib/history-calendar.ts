import type { SessionSummary } from "@/app/history/session-summary";
import { getWeeklyProgressDayKey, shiftWeeklyProgressDay } from "@/lib/history-weekly-progress";

export type HistoryCalendarActivityTone = "none" | "low" | "medium" | "high";

export type HistoryCalendarDay = {
  dayKey: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  sessionCount: number;
  activityTone: HistoryCalendarActivityTone;
};

export type HistoryCalendarMonth = {
  monthKey: string;
  monthLabel: string;
  activeDayCount: number;
  sessionCount: number;
  weeks: HistoryCalendarDay[][];
};

export type HistoryCalendarSelectedDay = {
  dayKey: string;
  label: string;
  sessionCount: number;
};

export type HistoryCalendarView = {
  months: HistoryCalendarMonth[];
  selectedDay: HistoryCalendarSelectedDay | null;
};

type BuildHistoryCalendarViewOptions = {
  sessions: SessionSummary[];
  timezone: string;
  selectedDayKey?: string | null;
  now?: string;
  maxMonths?: number;
};

const DEFAULT_MAX_MONTHS = 4;

function startOfMonth(dayKey: string) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(1);
  return date.toISOString().slice(0, 10);
}

function endOfMonth(dayKey: string) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

function shiftMonth(dayKey: string, amount: number) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 10);
}

function startOfIsoWeek(dayKey: string) {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return shiftWeeklyProgressDay(dayKey, diff);
}

function endOfIsoWeek(dayKey: string) {
  return shiftWeeklyProgressDay(startOfIsoWeek(dayKey), 6);
}

function monthDiff(startMonth: string, endMonth: string) {
  const startDate = new Date(`${startMonth}T00:00:00.000Z`);
  const endDate = new Date(`${endMonth}T00:00:00.000Z`);
  return ((endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12)
    + (endDate.getUTCMonth() - startDate.getUTCMonth());
}

function formatMonthLabel(monthKey: string) {
  const date = new Date(`${monthKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatSelectedDayLabel(dayKey: string) {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function getActivityTone(sessionCount: number): HistoryCalendarActivityTone {
  if (sessionCount <= 0) {
    return "none";
  }
  if (sessionCount === 1) {
    return "low";
  }
  if (sessionCount === 2) {
    return "medium";
  }
  return "high";
}

function resolveDayCounts(sessions: SessionSummary[], timezone: string) {
  const dayCounts = new Map<string, number>();

  for (const session of sessions) {
    const dayKey = getWeeklyProgressDayKey(session.startedAt, timezone);
    if (!dayKey) {
      continue;
    }

    dayCounts.set(dayKey, (dayCounts.get(dayKey) ?? 0) + 1);
  }

  return dayCounts;
}

function resolveMonthKeys(args: {
  dayCounts: Map<string, number>;
  selectedDayKey: string | null;
  todayKey: string;
  maxMonths: number;
}) {
  const recordedDayKeys = [...args.dayCounts.keys()].sort((left, right) => left.localeCompare(right));
  const latestRelevantDay = [args.todayKey, recordedDayKeys.at(-1) ?? null, args.selectedDayKey]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right))
    .at(-1) ?? args.todayKey;
  const earliestRelevantDay = [recordedDayKeys[0] ?? null, args.selectedDayKey]
    .filter((value): value is string => Boolean(value))
    .sort((left, right) => left.localeCompare(right))
    .at(0) ?? latestRelevantDay;
  const latestMonth = startOfMonth(latestRelevantDay);
  const earliestMonth = startOfMonth(earliestRelevantDay);
  const boundedMonthCount = Math.max(
    1,
    Math.min(args.maxMonths, monthDiff(earliestMonth, latestMonth) + 1),
  );

  const monthKeys = Array.from({ length: boundedMonthCount }, (_, index) => shiftMonth(latestMonth, -index));
  if (args.selectedDayKey) {
    const selectedMonth = startOfMonth(args.selectedDayKey);
    if (!monthKeys.includes(selectedMonth)) {
      monthKeys[monthKeys.length - 1] = selectedMonth;
    }
  }

  return [...new Set(monthKeys)].sort((left, right) => right.localeCompare(left));
}

function buildMonth(args: {
  monthKey: string;
  dayCounts: Map<string, number>;
  selectedDayKey: string | null;
  todayKey: string;
}) {
  const monthStart = args.monthKey;
  const monthEnd = endOfMonth(args.monthKey);
  const calendarStart = startOfIsoWeek(monthStart);
  const calendarEnd = endOfIsoWeek(monthEnd);
  const days: HistoryCalendarDay[] = [];
  let cursor = calendarStart;

  while (cursor <= calendarEnd) {
    const sessionCount = args.dayCounts.get(cursor) ?? 0;
    const inMonth = cursor >= monthStart && cursor <= monthEnd;
    const dayNumber = Number.parseInt(cursor.slice(8, 10), 10);

    days.push({
      dayKey: cursor,
      dayNumber,
      inMonth,
      isToday: cursor === args.todayKey,
      isSelected: cursor === args.selectedDayKey,
      sessionCount,
      activityTone: getActivityTone(sessionCount),
    });

    cursor = shiftWeeklyProgressDay(cursor, 1);
  }

  const weeks: HistoryCalendarDay[][] = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }

  const inMonthDays = days.filter((day) => day.inMonth);

  return {
    monthKey: args.monthKey,
    monthLabel: formatMonthLabel(args.monthKey),
    activeDayCount: inMonthDays.filter((day) => day.sessionCount > 0).length,
    sessionCount: inMonthDays.reduce((sum, day) => sum + day.sessionCount, 0),
    weeks,
  } satisfies HistoryCalendarMonth;
}

export function buildHistoryCalendarView({
  sessions,
  timezone,
  selectedDayKey = null,
  now = new Date().toISOString(),
  maxMonths = DEFAULT_MAX_MONTHS,
}: BuildHistoryCalendarViewOptions): HistoryCalendarView {
  const todayKey = getWeeklyProgressDayKey(now, timezone)
    ?? getWeeklyProgressDayKey(new Date().toISOString(), timezone)
    ?? "1970-01-01";
  const dayCounts = resolveDayCounts(sessions, timezone);
  const monthKeys = resolveMonthKeys({
    dayCounts,
    selectedDayKey,
    todayKey,
    maxMonths: Math.max(1, maxMonths),
  });
  const months = monthKeys.map((monthKey) => buildMonth({
    monthKey,
    dayCounts,
    selectedDayKey,
    todayKey,
  }));
  const selectedCount = selectedDayKey ? (dayCounts.get(selectedDayKey) ?? 0) : 0;

  return {
    months,
    selectedDay: selectedDayKey && selectedCount > 0
      ? {
          dayKey: selectedDayKey,
          label: formatSelectedDayLabel(selectedDayKey),
          sessionCount: selectedCount,
        }
      : null,
  };
}
