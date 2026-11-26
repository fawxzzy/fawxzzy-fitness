import { getWeeklyProgressWeekStart, shiftWeeklyProgressDay } from "@/lib/history-weekly-progress";

// The one line on top of the Workouts list (wave 2, SIMPLIFY #11, 2026-11-26): "This week: 2 of 3 · streak 4 weeks".
// Pure. The streak counts whole weeks in a row with at least one workout, ending this week; a week still in progress
// with no workout yet does not break it (it counts back from last week instead).

export type HistoryWeekStrip = {
  completedThisWeek: number;
  weeklyTarget: number;
  streakWeeks: number;
  label: string;
};

export function buildHistoryWeekStrip(args: {
  sessionStartedAts: readonly string[];
  timezone: string;
  currentWeekStart: string;
  completedThisWeek: number;
  weeklyTarget: number;
}): HistoryWeekStrip {
  const weeksWithWorkouts = new Set<string>();
  for (const startedAt of args.sessionStartedAts) {
    const weekStart = getWeeklyProgressWeekStart(startedAt, args.timezone);
    if (weekStart) {
      weeksWithWorkouts.add(weekStart);
    }
  }

  let cursor = weeksWithWorkouts.has(args.currentWeekStart)
    ? args.currentWeekStart
    : shiftWeeklyProgressDay(args.currentWeekStart, -7);
  let streakWeeks = 0;
  while (weeksWithWorkouts.has(cursor)) {
    streakWeeks += 1;
    cursor = shiftWeeklyProgressDay(cursor, -7);
  }

  const completed = Math.max(0, args.completedThisWeek);
  const target = Math.max(0, args.weeklyTarget);
  const weekPart = target > 0
    ? `This week: ${completed} of ${target}`
    : `This week: ${completed} ${completed === 1 ? "workout" : "workouts"}`;
  const streakPart = streakWeeks > 0 ? `streak ${streakWeeks} ${streakWeeks === 1 ? "week" : "weeks"}` : null;

  return {
    completedThisWeek: completed,
    weeklyTarget: target,
    streakWeeks,
    label: streakPart ? `${weekPart} · ${streakPart}` : weekPart,
  };
}
