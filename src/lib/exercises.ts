import "server-only";

import { unstable_cache } from "next/cache";
import { requireUser } from "@/lib/auth";
import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
import { optionalEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import type { ExerciseRow } from "@/types/db";

const FALLBACK_CREATED_AT = "1970-01-01T00:00:00.000Z";
let hasLoggedMissingExerciseId = false;

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

export async function listExercises() {
  const user = await requireUser();
  const globalExercises = await listGlobalExercisesCached();
  const customExercises = await listUserExercises(user.id);

  const mergedExercises = [...customExercises, ...globalExercises];
  const validExercises = mergedExercises.filter((exercise) => {
    if (exercise.id) {
      return true;
    }

    if (!hasLoggedMissingExerciseId) {
      hasLoggedMissingExerciseId = true;
      console.error("[exercises] Dropped exercise rows with missing id.");
    }

    return false;
  });
  const dedupedExercises = new Map<string, ExerciseRow>();

  for (const exercise of validExercises) {
    if (!dedupedExercises.has(exercise.id)) {
      dedupedExercises.set(exercise.id, exercise);
    }
  }

  return Array.from(dedupedExercises.values());
}

async function listUserExercises(userId: string): Promise<ExerciseRow[]> {
  const supabase = supabaseServer();
  const { data: customData, error: customError } = await supabase
    .from("exercises")
    .select("id, name, user_id, is_global, primary_muscle, equipment, created_at")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (customError) {
    if (customError.code === "42P01") {
      return [];
    }

    throw new Error(customError.message);
  }

  return (customData ?? []) as ExerciseRow[];
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

export async function getExerciseNameMap() {
  const exercises = await listExercises();
  return new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
}
