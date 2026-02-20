import "server-only";

import { unstable_cache } from "next/cache";
import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
import { optionalEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import type { ExerciseRow } from "@/types/db";

const FALLBACK_CREATED_AT = "1970-01-01T00:00:00.000Z";

function fallbackGlobalExercises(): ExerciseRow[] {
  return EXERCISE_OPTIONS.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    user_id: null,
    is_global: true,
    primary_muscle: null,
    equipment: null,
    created_at: FALLBACK_CREATED_AT,
  }));
}

function normalizeExerciseName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export function validateExerciseName(name: string) {
  const normalized = normalizeExerciseName(name);

  if (normalized.length < 2 || normalized.length > 80) {
    throw new Error("Exercise name must be 2-80 characters.");
  }

  return normalized;
}

export async function listExercises(userId: string) {
  const globalExercises = await listGlobalExercisesCached();
  const supabase = supabaseServer();
  const { data: customData, error: customError } = await supabase
    .from("exercises")
    .select("id, name, user_id, is_global, primary_muscle, equipment, created_at")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (customError) {
    if (customError.code === "42P01") {
      return globalExercises;
    }

    throw new Error(customError.message);
  }

  return [...globalExercises, ...((customData ?? []) as ExerciseRow[])];
}

const listGlobalExercisesCached = unstable_cache(
  async (): Promise<ExerciseRow[]> => {
    if (!optionalEnv("SUPABASE_SERVICE_ROLE_KEY")) {
      return fallbackGlobalExercises();
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, user_id, is_global, primary_muscle, equipment, created_at")
      .is("user_id", null)
      .eq("is_global", true)
      .order("name", { ascending: true });

    if (error) {
      if (error.code === "42P01") {
        return fallbackGlobalExercises();
      }

      throw new Error(error.message);
    }

    return (data ?? []) as ExerciseRow[];
  },
  ["global-exercise-list"],
);

export async function getExerciseNameMap(userId: string) {
  const exercises = await listExercises(userId);
  return new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
}
