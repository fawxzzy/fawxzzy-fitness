import { ROUTINE_START_WEEKDAYS, getRoutineStartWeekdayFromDate, type RoutineStartWeekday } from "@/lib/routines";

/**
 * "Which days do you train?" (SIMPLIFY #7): a new routine is a weekly plan made from the weekday chips. It is stored in
 * the existing columns as a `weekday_anchored` routine with a 7-day cycle, where day 1 falls on the start date and the
 * cycle repeats from it (lib/routine-schedule-resolution.ts). So the chips are rotated onto day slots starting at the
 * start date's weekday: slot i (1-based) is the weekday of `startDate + (i - 1)` days.
 */

export const TRAINING_WEEKDAY_CHIPS: ReadonlyArray<{ weekday: RoutineStartWeekday; short: string; long: string }> = [
  { weekday: "monday", short: "Mon", long: "Monday" },
  { weekday: "tuesday", short: "Tue", long: "Tuesday" },
  { weekday: "wednesday", short: "Wed", long: "Wednesday" },
  { weekday: "thursday", short: "Thu", long: "Thursday" },
  { weekday: "friday", short: "Fri", long: "Friday" },
  { weekday: "saturday", short: "Sat", long: "Saturday" },
  { weekday: "sunday", short: "Sun", long: "Sunday" },
];

export const WEEKLY_CYCLE_LENGTH_DAYS = 7;

/** A sensible first guess: three spread-out days. */
export const DEFAULT_TRAINING_WEEKDAYS: readonly RoutineStartWeekday[] = ["monday", "wednesday", "friday"];

function isRoutineStartWeekday(value: unknown): value is RoutineStartWeekday {
  return typeof value === "string" && (ROUTINE_START_WEEKDAYS as readonly string[]).includes(value);
}

/** Unique, known weekdays in Mon..Sun order; anything else is dropped. */
export function normalizeTrainingWeekdays(values: readonly unknown[]): RoutineStartWeekday[] {
  const chosen = new Set(values.filter(isRoutineStartWeekday));
  return ROUTINE_START_WEEKDAYS.filter((weekday) => chosen.has(weekday));
}

export function parseTrainingWeekdays(raw: string | null | undefined): RoutineStartWeekday[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? normalizeTrainingWeekdays(parsed) : [];
  } catch {
    return [];
  }
}

function addDaysToDateOnly(dateOnly: string, days: number) {
  const timestamp = Date.parse(`${dateOnly}T00:00:00Z`);
  if (!Number.isFinite(timestamp)) return null;
  return new Date(timestamp + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** The weekday of each of the 7 day slots, slot 1 first (slot 1 = the start date's weekday). */
export function getWeeklySlotWeekdays(startDate: string): RoutineStartWeekday[] | null {
  const slots: RoutineStartWeekday[] = [];
  for (let offset = 0; offset < WEEKLY_CYCLE_LENGTH_DAYS; offset += 1) {
    const weekday = getRoutineStartWeekdayFromDate(addDaysToDateOnly(startDate, offset));
    if (!weekday) return null;
    slots.push(weekday);
  }
  return slots;
}

/**
 * The `previewDays` list createRoutineAction expects (index + 1 = day slot): a slot is a rest day when its weekday was not
 * picked. Returns null for an invalid start date.
 */
export function buildWeeklyPreviewDays(startDate: string, trainingWeekdays: readonly RoutineStartWeekday[]) {
  const slots = getWeeklySlotWeekdays(startDate);
  if (!slots) return null;
  const chosen = new Set(trainingWeekdays);
  return slots.map((weekday) => ({ isRest: !chosen.has(weekday) }));
}

/** "Mon, Wed, Fri" / "Every day" / "No days picked": the plain summary shown on the form and in settings. */
export function describeTrainingWeekdays(trainingWeekdays: readonly RoutineStartWeekday[]) {
  const ordered = normalizeTrainingWeekdays(trainingWeekdays);
  if (ordered.length === 0) return "No days picked";
  if (ordered.length === WEEKLY_CYCLE_LENGTH_DAYS) return "Every day";
  return ordered
    .map((weekday) => TRAINING_WEEKDAY_CHIPS.find((chip) => chip.weekday === weekday)?.short ?? weekday)
    .join(", ");
}
