export type ExerciseMetadataInput = {
  measurement_type?: string | null;
  equipment?: string | null;
  movement_pattern?: string | null;
  isCardio?: boolean | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
};

function hasCardioToken(value: string | null | undefined) {
  return typeof value === "string" && value.trim().toLowerCase() === "cardio";
}

function listHasCardioToken(value: string[] | string | null | undefined) {
  if (Array.isArray(value)) return value.some((item) => hasCardioToken(item));
  if (typeof value === "string") return value.split(",").some((item) => hasCardioToken(item));
  return false;
}

export function isCardioExercise(exercise: ExerciseMetadataInput | null | undefined) {
  if (!exercise) return false;
  if (exercise.isCardio === true) return true;

  if (
    hasCardioToken(exercise.kind)
    || hasCardioToken(exercise.type)
    || hasCardioToken(exercise.equipment)
    || hasCardioToken(exercise.movement_pattern)
    || listHasCardioToken(exercise.tags)
    || listHasCardioToken(exercise.categories)
  ) {
    return true;
  }

  return exercise.measurement_type === "time"
    || exercise.measurement_type === "distance"
    || exercise.measurement_type === "time_distance"
    || exercise.measurement_type === "duration";
}
