import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

type ExerciseCatalogRow = {
  id: string;
  name: string;
  slug: string | null;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_howto_path: string | null;
  how_to_short: string | null;
};

type ExerciseStatsRow = {
  exercise_id: string;
  last_weight: number | null;
  last_reps: number | null;
  last_unit: string | null;
  last_performed_at: string | null;
  pr_weight: number | null;
  pr_reps: number | null;
  pr_est_1rm: number | null;
  actual_pr_weight: number | null;
  actual_pr_reps: number | null;
  actual_pr_at: string | null;
};

export type ExerciseBrowserRow = {
  id: string;
  canonicalExerciseId: string;
  name: string;
  slug: string | null;
  image_path: string | null;
  image_icon_path: string | null;
  image_howto_path: string | null;
  how_to_short: string | null;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  last_performed_at: string | null;
  last_weight: number | null;
  last_reps: number | null;
  last_unit: string | null;
  pr_weight: number | null;
  pr_reps: number | null;
  pr_est_1rm: number | null;
  actual_pr_weight: number | null;
  actual_pr_reps: number | null;
  actual_pr_at: string | null;
};

const SENTINEL_EXERCISE_ID = "66666666-6666-6666-6666-666666666666";
const UUID_V4ISH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function compareExerciseBrowserRows(a: ExerciseBrowserRow, b: ExerciseBrowserRow) {
  const aLast = a.last_performed_at;
  const bLast = b.last_performed_at;
  const aHasLast = Boolean(aLast);
  const bHasLast = Boolean(bLast);

  if (aHasLast !== bHasLast) {
    return aHasLast ? -1 : 1;
  }

  if (aLast && bLast && aLast !== bLast) {
    return bLast.localeCompare(aLast);
  }

  return a.name.localeCompare(b.name);
}

function isRelationOrColumnMissing(error: PostgrestError | null) {
  return error?.code === "42P01" || error?.code === "42703";
}

function isValidCanonicalExerciseId(exerciseId: string) {
  return exerciseId !== SENTINEL_EXERCISE_ID && UUID_V4ISH_PATTERN.test(exerciseId);
}

async function getExerciseCatalogForUser(userId: string): Promise<ExerciseCatalogRow[]> {
  const supabase = supabaseServer();

  const [globalResult, customResult] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, name, slug, primary_muscle, equipment, movement_pattern, image_howto_path, how_to_short")
      .is("user_id", null)
      .eq("is_global", true),
    supabase
      .from("exercises")
      .select("id, name, slug, primary_muscle, equipment, movement_pattern, image_howto_path, how_to_short")
      .eq("user_id", userId),
  ]);

  if (globalResult.error) {
    throw new Error(`failed to load global exercises: ${globalResult.error.message}`);
  }

  if (customResult.error) {
    throw new Error(`failed to load custom exercises: ${customResult.error.message}`);
  }

  return [...(customResult.data ?? []), ...(globalResult.data ?? [])] as ExerciseCatalogRow[];
}

export async function getExercisesWithStatsForUser(): Promise<ExerciseBrowserRow[]> {
  noStore();

  const user = await requireUser();
  const supabase = supabaseServer();

  const exerciseRows = await getExerciseCatalogForUser(user.id);
  const exercises = new Map<string, ExerciseCatalogRow>();

  for (const row of exerciseRows) {
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const name = typeof row.name === "string" ? row.name.trim() : "";

    if (!id || !name) {
      continue;
    }

    if (!isValidCanonicalExerciseId(id)) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[history/exercises] Dropped invalid exercise id", { id, name, slug: row.slug ?? null });
      }
      continue;
    }

    if (!exercises.has(id)) {
      exercises.set(id, {
        ...row,
        id,
        name,
      });
    }
  }

  const canonicalIds = Array.from(exercises.keys());

  if (!canonicalIds.length) {
    return [];
  }

  const { data: statsRows, error: statsError } = await supabase
    .from("exercise_stats")
    .select("exercise_id, last_weight, last_reps, last_unit, last_performed_at, pr_weight, pr_reps, pr_est_1rm, actual_pr_weight, actual_pr_reps, actual_pr_at")
    .eq("user_id", user.id)
    .in("exercise_id", canonicalIds);

  if (statsError) {
    if (isRelationOrColumnMissing(statsError)) {
      console.error("[history/exercises] exercise_stats schema mismatch", {
        code: statsError.code,
        message: statsError.message,
      });
    } else {
      throw new Error(`failed to load exercise stats: ${statsError.message}`);
    }
  }

  const statsByExerciseId = new Map(((statsRows ?? []) as ExerciseStatsRow[]).map((row) => [row.exercise_id, row]));

  return Array.from(exercises.values())
    .map((exercise) => {
      const canonicalExerciseId = exercise.id;
      const stats = statsByExerciseId.get(canonicalExerciseId);

      return {
        id: exercise.id,
        canonicalExerciseId,
        name: exercise.name,
        slug: exercise.slug,
        image_path: null,
        image_icon_path: null,
        image_howto_path: exercise.image_howto_path,
        how_to_short: exercise.how_to_short,
        primary_muscle: exercise.primary_muscle,
        equipment: exercise.equipment,
        movement_pattern: exercise.movement_pattern,
        last_performed_at: stats?.last_performed_at ?? null,
        last_weight: stats?.last_weight ?? null,
        last_reps: stats?.last_reps ?? null,
        last_unit: stats?.last_unit ?? null,
        pr_weight: stats?.pr_weight ?? null,
        pr_reps: stats?.pr_reps ?? null,
        pr_est_1rm: stats?.pr_est_1rm ?? null,
        actual_pr_weight: stats?.actual_pr_weight ?? null,
        actual_pr_reps: stats?.actual_pr_reps ?? null,
        actual_pr_at: stats?.actual_pr_at ?? null,
      };
    })
    .sort(compareExerciseBrowserRows);
}
