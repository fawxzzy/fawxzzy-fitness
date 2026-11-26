/**
 * "Next up" for Today's quiet days (DESIGN Today today-rest / today-empty, 2026-11-26): on a rest day or a day with
 * nothing planned, name the next day in the cycle that has something to do, so the screen is never a dead end.
 * Pure (no React), so the wrap-around and skip rules are unit tested. Starting an empty or ad-hoc workout is NOT
 * offered here: that waits on the owner (DESIGN section 6).
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
  /** "Next up: Push A · Tue" */
  label: string;
  /** Button name: "Show Push A" */
  actionLabel: string;
};

export function resolveTodayNextUp(days: TodayNextUpDayInput[], selectedDayIndex: number): TodayNextUp | null {
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
      const weekday = day.occurrenceWeekday?.trim();
      const showWeekday = Boolean(weekday) && weekday!.toLowerCase() !== name.toLowerCase();
      return {
        dayIndex: day.dayIndex,
        label: `Next up: ${name}${showWeekday ? ` · ${weekday}` : ""}`,
        actionLabel: `Show ${name}`,
      };
    }
  }
  return null;
}
