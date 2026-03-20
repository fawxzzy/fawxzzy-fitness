export type ExerciseCountKind = "strength" | "cardio" | "unknown";

export type ExerciseCountSummaryInput = {
  measurement_type?: string | null;
  equipment?: string | null;
  movement_pattern?: string | null;
  isCardio?: boolean | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
};

export type ExerciseCountSummary = {
  total: number;
  strength: number;
  cardio: number;
  unknown: number;
  label: string;
};

function hasCardioToken(value: string | null | undefined) {
  return typeof value === "string" && value.trim().toLowerCase() === "cardio";
}

function listHasCardioToken(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.some((item) => hasCardioToken(item));
  if (typeof value === "string") return value.split(",").some((item) => hasCardioToken(item));
  return false;
}

export function resolveExerciseCountKind(exercise: ExerciseCountSummaryInput | null | undefined): ExerciseCountKind {
  if (!exercise) return "unknown";
  if (exercise.isCardio === true) return "cardio";

  if (
    hasCardioToken(exercise.kind)
    || hasCardioToken(exercise.type)
    || hasCardioToken(exercise.equipment)
    || hasCardioToken(exercise.movement_pattern)
    || listHasCardioToken(exercise.tags)
    || listHasCardioToken(exercise.categories)
  ) {
    return "cardio";
  }

  if (
    exercise.measurement_type === "time"
    || exercise.measurement_type === "distance"
    || exercise.measurement_type === "time_distance"
  ) {
    return "cardio";
  }

  if (exercise.measurement_type === "reps") {
    return "strength";
  }

  return "unknown";
}

export function formatExerciseCountSummary(exercises: readonly ExerciseCountSummaryInput[]): ExerciseCountSummary {
  let strength = 0;
  let cardio = 0;
  let unknown = 0;

  for (const exercise of exercises) {
    const kind = resolveExerciseCountKind(exercise);
    if (kind === "strength") strength += 1;
    else if (kind === "cardio") cardio += 1;
    else unknown += 1;
  }

  const total = exercises.length;
  if (total === 0) return { total, strength, cardio, unknown, label: "0 exercises" };
  if (cardio === 0 && strength > 0 && unknown === 0) return { total, strength, cardio, unknown, label: `${strength} strength` };
  if (strength === 0 && cardio > 0 && unknown === 0) return { total, strength, cardio, unknown, label: `${cardio} cardio` };

  const parts = [`${total} total`];
  if (strength > 0) parts.push(`${strength} strength`);
  if (cardio > 0) parts.push(`${cardio} cardio`);
  if (strength === 0 && cardio === 0) parts.push("exercises");

  return { total, strength, cardio, unknown, label: parts.join(" • ") };
}

export function formatRestDayExerciseCountSummary(exercises: readonly ExerciseCountSummaryInput[], isRest: boolean): ExerciseCountSummary {
  if (isRest) {
    return { total: exercises.length, strength: 0, cardio: 0, unknown: 0, label: "Rest day" };
  }

  return formatExerciseCountSummary(exercises);
}
