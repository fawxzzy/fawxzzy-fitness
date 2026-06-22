type CustomExerciseMeasurementType = "reps" | "time" | "distance" | "time_distance" | "none";

export type CustomExerciseInsertPayloadInput = {
  userId: string;
  name: string;
  primaryMuscle: string | null;
  secondaryMuscle: string | null;
  equipment: string | null;
  movementPattern: string | null;
  measurementType: CustomExerciseMeasurementType;
  defaultUnit: string | null;
};

function normalizeOptionalValue(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

export function buildCustomExerciseInsertPayload(input: CustomExerciseInsertPayloadInput) {
  const primaryMuscle = normalizeOptionalValue(input.primaryMuscle);
  const secondaryMuscle = normalizeOptionalValue(input.secondaryMuscle);

  return {
    name: input.name.trim(),
    user_id: input.userId,
    is_global: false,
    primary_muscle: primaryMuscle,
    primary_muscles: primaryMuscle ? [primaryMuscle] : null,
    secondary_muscles: secondaryMuscle ? [secondaryMuscle] : null,
    equipment: normalizeOptionalValue(input.equipment),
    movement_pattern: normalizeOptionalValue(input.movementPattern),
    measurement_type: input.measurementType === "none" ? "reps" : input.measurementType,
    default_unit: normalizeOptionalValue(input.defaultUnit),
  };
}
