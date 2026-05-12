import type { ExerciseRow } from "@/types/db";

export const SUPPRESSED_GLOBAL_EXERCISE_SLUGS = new Set([
  "hamstring-stretch",
  "hip-flexor-stretch",
]);

export const REMOVED_GLOBAL_EXERCISE_SLUGS = new Set([
  "zone-2-cardio",
]);

export function shouldSuppressGlobalExerciseFromPicker(exercise: Pick<ExerciseRow, "user_id" | "is_global" | "slug" | "name">) {
  const slug = typeof exercise.slug === "string" ? exercise.slug.trim().toLowerCase() : "";
  const name = typeof exercise.name === "string" ? exercise.name.trim().toLowerCase() : "";
  if (
    (slug.length > 0 && REMOVED_GLOBAL_EXERCISE_SLUGS.has(slug))
    || name === "zone 2 cardio"
  ) {
    return true;
  }

  if (exercise.user_id !== null || !exercise.is_global) {
    return false;
  }

  return slug.length > 0 && SUPPRESSED_GLOBAL_EXERCISE_SLUGS.has(slug);
}

export function filterSuppressedGlobalExercises<T extends Pick<ExerciseRow, "user_id" | "is_global" | "slug" | "name">>(exercises: T[]) {
  return exercises.filter((exercise) => !shouldSuppressGlobalExerciseFromPicker(exercise));
}
