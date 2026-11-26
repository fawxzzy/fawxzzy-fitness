// What one more day means for a week-based routine (pure, no React). Adding a day always grows the
// cycle by one (appendRoutineDayAction), so on a week-based routine that already fills its week the
// new day pushes every later day onto a different weekday. The Add Day sheet says so before the add
// (FUNCTIONAL.md F-007) instead of silently making an 8-day "week".
export const DAYS_PER_WEEK = 7;

export function getWeekBasedExtraDayNotice(args: {
  scheduleMode: "weekday_anchored" | "rolling_n_day" | null | undefined;
  dayCount: number;
}): { title: string; body: string } | null {
  // A missing schedule mode is week-based (lib/routines treats only "rolling_n_day" as day-based).
  if (args.scheduleMode === "rolling_n_day") return null;
  if (!Number.isInteger(args.dayCount) || args.dayCount < DAYS_PER_WEEK) return null;

  const nextCount = args.dayCount + 1;
  // Growing to a whole number of weeks (for example 13 -> 14) lines the days up with the weekdays again.
  if (nextCount % DAYS_PER_WEEK === 0) return null;

  const wholeWeeks = Math.ceil(nextCount / DAYS_PER_WEEK) * DAYS_PER_WEEK;
  return {
    title: `Day ${nextCount} makes the cycle ${nextCount} days long`,
    body: `This routine is week-based. ${nextCount} days do not fit whole weeks, so each day lands on a different weekday from week to week and Today can move. To keep the same weekdays, edit an existing day instead, or keep adding days until the cycle is ${wholeWeeks} days.`,
  };
}
