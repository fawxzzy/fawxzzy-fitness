import type { ExerciseRow } from "@/types/db";

export const SUPPRESSED_GLOBAL_EXERCISE_SLUGS = new Set([
  "hamstring-stretch",
  "hip-flexor-stretch",
]);

export function shouldSuppressGlobalExerciseFromPicker(exercise: Pick<ExerciseRow, "user_id" | "is_global" | "slug">) {
  if (exercise.user_id !== null || !exercise.is_global) {
    return false;
  }

  const slug = typeof exercise.slug === "string" ? exercise.slug.trim().toLowerCase() : "";
  return slug.length > 0 && SUPPRESSED_GLOBAL_EXERCISE_SLUGS.has(slug);
}

export function filterSuppressedGlobalExercises<T extends Pick<ExerciseRow, "user_id" | "is_global" | "slug">>(exercises: T[]) {
  return exercises.filter((exercise) => !shouldSuppressGlobalExerciseFromPicker(exercise));
}
