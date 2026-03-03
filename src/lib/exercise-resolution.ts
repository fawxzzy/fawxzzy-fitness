import "server-only";

import { listExercises } from "@/lib/exercises";
import type { ExerciseRow } from "@/types/db";

type ResolvedExercise = {
  id: string;
  name: string;
  slug: string | null;
  measurementType: "reps" | "time" | "distance" | "time_distance";
  defaultUnit: "mi" | "km" | "m";
};

function normalizeExerciseText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function pickCanonicalExerciseMatch(exercises: ExerciseRow[], identifier: string): ExerciseRow | null {
  const raw = identifier.trim();
  if (!raw) {
    return null;
  }

  const normalizedRaw = normalizeExerciseText(raw);
  const exactIdMatch = exercises.find((exercise) => exercise.id === raw);
  const slugMatch = exercises.find((exercise) => {
    const slug = "slug" in exercise && typeof exercise.slug === "string" ? exercise.slug.trim() : "";
    return slug.length > 0 && slug.toLowerCase() === normalizedRaw;
  });
  const nameMatch = exercises.find((exercise) => normalizeExerciseText(exercise.name) === normalizedRaw);

  return exactIdMatch ?? slugMatch ?? nameMatch ?? null;
}

export async function resolveCanonicalExercise(input: {
  exerciseIdOrSlugOrName: string;
}): Promise<ResolvedExercise | null> {
  const raw = input.exerciseIdOrSlugOrName.trim();
  if (!raw) {
    return null;
  }

  const exercises = await listExercises();
  const matched = pickCanonicalExerciseMatch(exercises, raw);
  if (!matched) {
    return null;
  }

  const measurementType = matched.measurement_type === "time"
    || matched.measurement_type === "distance"
    || matched.measurement_type === "time_distance"
    || matched.measurement_type === "reps"
    ? matched.measurement_type
    : "reps";

  const defaultUnit = matched.default_unit === "mi"
    || matched.default_unit === "km"
    || matched.default_unit === "m"
    ? matched.default_unit
    : "mi";

  return {
    id: matched.id,
    name: matched.name,
    slug: "slug" in matched && typeof matched.slug === "string" ? matched.slug : null,
    measurementType,
    defaultUnit,
  };
}

export async function requireCanonicalExercise(input: {
  exerciseIdOrSlugOrName: string;
}): Promise<ResolvedExercise> {
  const resolved = await resolveCanonicalExercise(input);
  if (!resolved?.id) {
    throw new Error("Exercise must map to a canonical exercise before logging.");
  }

  return resolved;
}
