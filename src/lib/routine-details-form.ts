function sanitizeRoutineName(value: string) {
  return value.slice(0, 15);
}

export const ROUTINE_CYCLE_LENGTH_MIN = 1;
export const ROUTINE_CYCLE_LENGTH_MAX = 365;
export const ROUTINE_SCHEDULE_MODE_VALUES = [
  "weekday_anchored",
  "rolling_n_day",
] as const;
export type RoutineDetailsScheduleMode = (typeof ROUTINE_SCHEDULE_MODE_VALUES)[number];

export type RoutineDetailsDraft = {
  name: string;
  cycleLengthDays: number;
  scheduleMode: RoutineDetailsScheduleMode;
  startDate: string;
  startWeekday: string;
  timezone: string;
  weightUnit: string;
  distanceUnit: string;
};

function isValidRoutineDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function normalizeRoutineDetailsDraft(raw: Partial<RoutineDetailsDraft>, defaults: RoutineDetailsDraft): RoutineDetailsDraft {
  const cycleLengthCandidate = Number(raw.cycleLengthDays);
  const rawStartDate = typeof raw.startDate === "string" ? raw.startDate.trim() : "";
  return {
    name: typeof raw.name === "string" ? sanitizeRoutineName(raw.name) : sanitizeRoutineName(defaults.name),
    cycleLengthDays: Number.isInteger(cycleLengthCandidate) ? cycleLengthCandidate : defaults.cycleLengthDays,
    scheduleMode: ROUTINE_SCHEDULE_MODE_VALUES.includes(raw.scheduleMode as RoutineDetailsScheduleMode)
      ? raw.scheduleMode as RoutineDetailsScheduleMode
      : defaults.scheduleMode,
    startDate: isValidRoutineDateString(rawStartDate) ? rawStartDate : defaults.startDate,
    startWeekday: typeof raw.startWeekday === "string" ? raw.startWeekday : defaults.startWeekday,
    timezone: typeof raw.timezone === "string" ? raw.timezone : defaults.timezone,
    weightUnit: raw.weightUnit === "kg" ? "kg" : "lbs",
    distanceUnit: raw.distanceUnit === "km" ? "km" : "mi",
  };
}

export function commitRoutineCycleLengthInput(
  rawValue: string,
  previousCycleLength: number,
): { cycleLengthDays: number; inputValue: string; valid: boolean } {
  const trimmedValue = rawValue.trim();

  if (!/^\d+$/.test(trimmedValue)) {
    return {
      cycleLengthDays: previousCycleLength,
      inputValue: String(previousCycleLength),
      valid: false,
    };
  }

  const parsedCycleLength = Math.floor(Number(trimmedValue));
  if (!Number.isFinite(parsedCycleLength)) {
    return {
      cycleLengthDays: previousCycleLength,
      inputValue: String(previousCycleLength),
      valid: false,
    };
  }

  const cycleLengthDays = Math.max(
    ROUTINE_CYCLE_LENGTH_MIN,
    Math.min(ROUTINE_CYCLE_LENGTH_MAX, parsedCycleLength),
  );

  return {
    cycleLengthDays,
    inputValue: String(cycleLengthDays),
    valid: true,
  };
}

export function validateRoutineDetailsDraft(
  draft: RoutineDetailsDraft,
  options: { allowLegacyLongName?: boolean } = {},
): { valid: boolean; error: string | null } {
  const name = draft.name.trim();
  if (!name) return { valid: false, error: "Routine name is required." };
  if (!options.allowLegacyLongName && name.length > 15) return { valid: false, error: "Routine name must be 15 characters or fewer." };
  if (
    !Number.isInteger(draft.cycleLengthDays)
    || draft.cycleLengthDays < ROUTINE_CYCLE_LENGTH_MIN
    || draft.cycleLengthDays > ROUTINE_CYCLE_LENGTH_MAX
  ) {
    return { valid: false, error: "Cycle length must be between 1 and 365." };
  }
  if (!ROUTINE_SCHEDULE_MODE_VALUES.includes(draft.scheduleMode)) {
    return { valid: false, error: "Schedule mode must be week-based or day-based." };
  }
  if (!isValidRoutineDateString(draft.startDate.trim())) return { valid: false, error: "Cycle start date is required." };
  if (!draft.timezone.trim()) return { valid: false, error: "Timezone is required." };
  if (draft.weightUnit !== "lbs" && draft.weightUnit !== "kg") return { valid: false, error: "Weight unit must be lbs or kg." };
  if (draft.distanceUnit !== "mi" && draft.distanceUnit !== "km") return { valid: false, error: "Distance unit must be mi or km." };
  return { valid: true, error: null };
}

export function buildRoutineDetailsSnapshot(draft: RoutineDetailsDraft): string {
  return JSON.stringify({
    name: sanitizeRoutineName(draft.name.trim()),
    cycleLengthDays: String(draft.cycleLengthDays),
    scheduleMode: draft.scheduleMode,
    startDate: draft.startDate,
    startWeekday: draft.startWeekday,
    timezone: draft.timezone,
    weightUnit: draft.weightUnit,
    distanceUnit: draft.distanceUnit,
  });
}
