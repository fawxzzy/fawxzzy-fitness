import "server-only";

import { unstable_cache } from "next/cache";
import { requireUser } from "@/lib/auth";
import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
import { supabaseServerAnon } from "@/lib/supabase/server-anon";
import { supabaseServer } from "@/lib/supabase/server";
import type { ExerciseRow } from "@/types/db";

const FALLBACK_CREATED_AT = "1970-01-01T00:00:00.000Z";
let hasLoggedMissingExerciseId = false;

const VALID_MOVEMENT_PATTERNS = ["push", "pull", "hinge", "squat", "carry", "rotation"] as const;
const VALID_EQUIPMENT = ["barbell", "dumbbell", "cable", "machine", "bodyweight"] as const;

function logExerciseLoaderEvent(event: string, details?: Record<string, unknown>) {
  console.info("[exercises]", event, details ?? {});
}

function fallbackGlobalExercises(): ExerciseRow[] {
  return EXERCISE_OPTIONS.map((exercise) => ({
    id: exercise.id,
    name: exercise.name,
    user_id: null,
    is_global: true,
    primary_muscle: exercise.primary_muscle,
    equipment: exercise.equipment,
    movement_pattern: exercise.movement_pattern,
    measurement_type: "reps",
    default_unit: "reps",
    calories_estimation_method: null,
    image_howto_path: null,
    image_muscles_path: null,
    how_to_short: exercise.how_to_short,
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

export function validateExerciseEquipment(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if ((VALID_EQUIPMENT as readonly string[]).includes(normalized)) {
    return normalized;
  }

  throw new Error(`Equipment must be one of: ${VALID_EQUIPMENT.join(", ")}.`);
}

export function validateMovementPattern(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if ((VALID_MOVEMENT_PATTERNS as readonly string[]).includes(normalized)) {
    return normalized;
  }

  throw new Error(`Movement pattern must be one of: ${VALID_MOVEMENT_PATTERNS.join(", ")}.`);
}

export async function listExercises() {
  const user = await requireUser();
  const globalExercises = await listGlobalExercisesCached();
  const customExercises = await listUserExercises(user.id);

  const mergedExercises = [...customExercises, ...globalExercises];
  const validExercises = mergedExercises.flatMap((exercise) => {
    const id = typeof exercise.id === "string" ? exercise.id.trim() : "";

    if (id.length > 0) {
      return [{ ...exercise, id }];
    }

    if (!hasLoggedMissingExerciseId) {
      hasLoggedMissingExerciseId = true;
      console.error("[exercises] Dropped exercise rows with missing/invalid id.");
    }

    return [];
  });
  const dedupedExercises = new Map<string, ExerciseRow>();

  for (const exercise of validExercises) {
    if (!dedupedExercises.has(exercise.id)) {
      dedupedExercises.set(exercise.id, exercise);
    }
  }

  return Array.from(dedupedExercises.values()).sort((left, right) => left.name.localeCompare(right.name));
}

async function listUserExercises(userId: string): Promise<ExerciseRow[]> {
  const supabase = supabaseServer();
  const { data: customData, error: customError } = await supabase
    .from("exercises")
    .select("id, name, user_id, is_global, primary_muscle, equipment, movement_pattern, measurement_type, default_unit, calories_estimation_method, image_howto_path, image_muscles_path, how_to_short, created_at")
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
    const supabase = supabaseServerAnon();
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name, user_id, is_global, primary_muscle, equipment, movement_pattern, measurement_type, default_unit, calories_estimation_method, image_howto_path, image_muscles_path, how_to_short, created_at")
      .is("user_id", null)
      .eq("is_global", true)
      .order("name", { ascending: true });

    if (error) {
      logExerciseLoaderEvent("global-db-query-failed", {
        code: error.code,
        message: error.message,
      });

      if (error.code === "42P01") {
        const fallbackRows = fallbackGlobalExercises();
        logExerciseLoaderEvent("global-fallback-baseline", {
          reason: "undefined_table",
          rows: fallbackRows.length,
        });

        return fallbackRows;
      }

      console.error("[exercises] Failed to load global exercises from database.", {
        code: error.code,
        message: error.message,
      });

      return [];
    }

    const rows = (data ?? []) as ExerciseRow[];
    logExerciseLoaderEvent("global-db-query-success", {
      rows: rows.length,
      fallbackUsed: false,
    });

    return rows;
  },
  ["global-exercise-list-v3"],
);

export async function getExerciseNameMap() {
  const exercises = await listExercises();
  return new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
}
