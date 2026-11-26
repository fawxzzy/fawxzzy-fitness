/**
 * "Next" for Today's quiet days (DESIGN Today today-rest / today-empty, 2026-11-26; wave 2 "Start fast"): on a rest
 * day, a day with nothing planned, or a day already done, name the next day in the cycle that has something to do,
 * so the screen is never a dead end. Pure (no React), so the wrap-around and skip rules are unit tested. Starting
 * an empty or ad-hoc workout is NOT offered here: that waits on the owner (DESIGN section 6).
 */
export type TodayNextUpDayInput = {
  dayIndex: number;
  name: string;
  isRest: boolean;
  exerciseCount: number;
  occurrenceWeekday?: string | null;
};

export type TodayNextUp = {
  dayIndex: number;
  /** "Next: Pull A on Thu, Nov 27" (calendar today known), else "Next: Pull A · Thu" */
  label: string;
  /** Button name: "Show Pull A" */
  actionLabel: string;
  /** How many routine days ahead of the selected day it is (1 = the next day). */
  stepsAhead: number;
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;

/** "Thu, Nov 27" for `fromDate` (YYYY-MM-DD) plus `days`. Calendar maths in UTC so no zone can shift the day. */
export function formatTodayNextUpDate(fromDate: string, days: number): string | null {
  const match = ISO_DATE_PATTERN.exec(fromDate);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days));
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }).format(date);
}

export function resolveTodayNextUp(
  days: TodayNextUpDayInput[],
  selectedDayIndex: number,
  options: {
    /**
     * Calendar today (YYYY-MM-DD in the routine's zone), passed only when the selected day IS today's routine day:
     * every routine day is one calendar day, so the next day's date is today plus `stepsAhead`.
     */
    todayDate?: string | null;
  } = {},
): TodayNextUp | null {
  if (days.length < 2) {
    return null;
  }
  const ordered = [...days].sort((left, right) => left.dayIndex - right.dayIndex);
  const start = ordered.findIndex((day) => day.dayIndex === selectedDayIndex);
  if (start < 0) {
    return null;
  }
  for (let step = 1; step < ordered.length; step += 1) {
    const day = ordered[(start + step) % ordered.length];
    if (!day.isRest && day.exerciseCount > 0) {
      const name = day.name.trim() || `Day ${day.dayIndex}`;
      const date = options.todayDate ? formatTodayNextUpDate(options.todayDate, step) : null;
      const weekday = day.occurrenceWeekday?.trim();
      const showWeekday = Boolean(weekday) && weekday!.toLowerCase() !== name.toLowerCase();
      return {
        dayIndex: day.dayIndex,
        label: date ? `Next: ${name} on ${date}` : `Next: ${name}${showWeekday ? ` · ${weekday}` : ""}`,
        actionLabel: `Show ${name}`,
        stepsAhead: step,
      };
    }
  }
  return null;
}
