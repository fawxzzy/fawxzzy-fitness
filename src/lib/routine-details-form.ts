function sanitizeRoutineName(value: string) {
  return value.slice(0, 15);
}

export type RoutineDetailsDraft = {
  name: string;
  cycleLengthDays: number;
  startWeekday: string;
  timezone: string;
  weightUnit: string;
  distanceUnit: string;
};

export function normalizeRoutineDetailsDraft(raw: Partial<RoutineDetailsDraft>, defaults: RoutineDetailsDraft): RoutineDetailsDraft {
  const cycleLengthCandidate = Number(raw.cycleLengthDays);
  return {
    name: typeof raw.name === "string" ? sanitizeRoutineName(raw.name) : sanitizeRoutineName(defaults.name),
    cycleLengthDays: Number.isInteger(cycleLengthCandidate) ? cycleLengthCandidate : defaults.cycleLengthDays,
    startWeekday: typeof raw.startWeekday === "string" ? raw.startWeekday : defaults.startWeekday,
    timezone: typeof raw.timezone === "string" ? raw.timezone : defaults.timezone,
    weightUnit: raw.weightUnit === "kg" ? "kg" : "lbs",
    distanceUnit: raw.distanceUnit === "km" ? "km" : "mi",
  };
}

export function validateRoutineDetailsDraft(draft: RoutineDetailsDraft): { valid: boolean; error: string | null } {
  const name = draft.name.trim();
  if (!name) return { valid: false, error: "Routine name is required." };
  if (name.length > 15) return { valid: false, error: "Routine name must be 15 characters or fewer." };
  if (!Number.isInteger(draft.cycleLengthDays) || draft.cycleLengthDays < 1 || draft.cycleLengthDays > 365) {
    return { valid: false, error: "Cycle length must be between 1 and 365." };
  }
  if (!draft.startWeekday.trim()) return { valid: false, error: "Start weekday is required." };
  if (!draft.timezone.trim()) return { valid: false, error: "Timezone is required." };
  if (draft.weightUnit !== "lbs" && draft.weightUnit !== "kg") return { valid: false, error: "Weight unit must be lbs or kg." };
  if (draft.distanceUnit !== "mi" && draft.distanceUnit !== "km") return { valid: false, error: "Distance unit must be mi or km." };
  return { valid: true, error: null };
}

export function buildRoutineDetailsSnapshot(draft: RoutineDetailsDraft): string {
  return JSON.stringify({
    name: sanitizeRoutineName(draft.name.trim()),
    cycleLengthDays: String(draft.cycleLengthDays),
    startWeekday: draft.startWeekday,
    timezone: draft.timezone,
    weightUnit: draft.weightUnit,
    distanceUnit: draft.distanceUnit,
  });
}
