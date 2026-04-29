export type ExerciseMetadataInput = {
  name?: string | null;
  measurement_type?: string | null;
  equipment?: string | null;
  movement_pattern?: string | null;
  primary_muscle?: string | null;
  isCardio?: boolean | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
};

const STRENGTH_MEASUREMENT_TYPE_OVERRIDES = new Set([
  "seated cable row",
  "walking lunge",
]);

function normalizeMetadataName(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hasCardioToken(value: string | null | undefined) {
  return typeof value === "string" && value.trim().toLowerCase() === "cardio";
}

function hasBodyweightToken(value: string | null | undefined) {
  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();
  return normalized === "bodyweight"
    || normalized === "body weight"
    || normalized === "calisthenics"
    || normalized === "gymnastics";
}

function listHasCardioToken(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.some((item) => hasCardioToken(item));
  if (typeof value === "string") return value.split(",").some((item) => hasCardioToken(item));
  return false;
}

function listHasBodyweightToken(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.some((item) => hasBodyweightToken(item));
  if (typeof value === "string") return value.split(",").some((item) => hasBodyweightToken(item));
  return false;
}

export function normalizeExerciseMeasurementType(exercise: Pick<ExerciseMetadataInput, "name" | "measurement_type"> | null | undefined) {
  const normalizedName = normalizeMetadataName(exercise?.name);
  if (normalizedName && STRENGTH_MEASUREMENT_TYPE_OVERRIDES.has(normalizedName)) {
    return "reps";
  }

  return exercise?.measurement_type ?? null;
}

export function isMeasurementOptionalExercise(exercise: Pick<ExerciseMetadataInput, "name" | "primary_muscle" | "movement_pattern"> | null | undefined) {
  if (!exercise) return false;

  const normalizedName = normalizeMetadataName(exercise.name);
  const normalizedPrimaryMuscle = normalizeMetadataName(exercise.primary_muscle);
  const normalizedMovementPattern = normalizeMetadataName(exercise.movement_pattern);

  return normalizedName.includes("stretch")
    || normalizedName.includes("mobility")
    || normalizedPrimaryMuscle === "recovery"
    || normalizedMovementPattern === "mobility";
}

export function getRecoveryExerciseFallbackDescription(
  exercise: Pick<ExerciseMetadataInput, "name" | "primary_muscle" | "movement_pattern"> | null | undefined,
) {
  if (!exercise) {
    return null;
  }

  const normalizedName = normalizeMetadataName(exercise.name);
  const normalizedPrimaryMuscle = normalizeMetadataName(exercise.primary_muscle);
  const normalizedMovementPattern = normalizeMetadataName(exercise.movement_pattern);

  if (normalizedName.includes("mobility") || normalizedMovementPattern === "mobility") {
    return "Use this slot for joint prep, controlled mobility drills, and simple movement flows before training or during recovery work.";
  }

  if (normalizedName.includes("stretch") || normalizedPrimaryMuscle === "recovery") {
    return "Use this slot for gentle recovery work, easy range-of-motion drills, or cooldown movement that helps you reset without chasing fatigue.";
  }

  return null;
}

export function isBodyweightExercise(exercise: ExerciseMetadataInput | null | undefined) {
  if (!exercise) return false;

  return hasBodyweightToken(exercise.kind)
    || hasBodyweightToken(exercise.type)
    || hasBodyweightToken(exercise.equipment)
    || hasBodyweightToken(exercise.movement_pattern)
    || listHasBodyweightToken(exercise.tags)
    || listHasBodyweightToken(exercise.categories);
}

export function isCardioExercise(exercise: ExerciseMetadataInput | null | undefined) {
  if (!exercise) return false;
  if (exercise.isCardio === true) return true;
  const normalizedMeasurementType = normalizeExerciseMeasurementType(exercise);

  if (
    hasCardioToken(exercise.kind)
    || hasCardioToken(exercise.type)
    || hasCardioToken(exercise.equipment)
    || hasCardioToken(exercise.movement_pattern)
    || hasCardioToken(exercise.primary_muscle)
    || listHasCardioToken(exercise.tags)
    || listHasCardioToken(exercise.categories)
  ) {
    return true;
  }

  return normalizedMeasurementType === "time"
    || normalizedMeasurementType === "distance"
    || normalizedMeasurementType === "time_distance"
    || normalizedMeasurementType === "duration";
}
