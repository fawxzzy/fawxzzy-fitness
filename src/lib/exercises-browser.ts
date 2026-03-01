import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import { requireUser } from "@/lib/auth";
import { listExercises } from "@/lib/exercises";
import { supabaseServer } from "@/lib/supabase/server";

type ExerciseCatalogRow = {
  id: string;
  name: string;
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
};

export type ExerciseBrowserRow = {
  id: string;
  canonicalExerciseId: string;
  name: string;
  slug: string | null;
  image_path: string | null;
  image_icon_path: string | null;
  last_performed_at: string | null;
  last_weight: number | null;
  last_reps: number | null;
  last_unit: string | null;
  pr_weight: number | null;
  pr_reps: number | null;
  pr_est_1rm: number | null;
};

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

export async function getExercisesWithStatsForUser(): Promise<ExerciseBrowserRow[]> {
  noStore();

  const user = await requireUser();
  const supabase = supabaseServer();

  const exerciseRows = await listExercises();

  const exercises: ExerciseCatalogRow[] = exerciseRows
    .filter((row) => row.id && row.name)
    .map((row) => ({
      id: row.id,
      name: row.name,
    }));

  const canonicalIds = Array.from(new Set(exercises.map((row) => row.id)));

  if (!canonicalIds.length) {
    return [];
  }

  const { data: statsRows, error: statsError } = await supabase
    .from("exercise_stats")
    .select("exercise_id, last_weight, last_reps, last_unit, last_performed_at, pr_weight, pr_reps, pr_est_1rm")
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

  return exercises
    .map((exercise) => {
      const canonicalExerciseId = exercise.id;
      const stats = statsByExerciseId.get(canonicalExerciseId);

      return {
        id: exercise.id,
        canonicalExerciseId,
        name: exercise.name,
        slug: null,
        image_path: null,
        image_icon_path: null,
        last_performed_at: stats?.last_performed_at ?? null,
        last_weight: stats?.last_weight ?? null,
        last_reps: stats?.last_reps ?? null,
        last_unit: stats?.last_unit ?? null,
        pr_weight: stats?.pr_weight ?? null,
        pr_reps: stats?.pr_reps ?? null,
        pr_est_1rm: stats?.pr_est_1rm ?? null,
      };
    })
    .sort(compareExerciseBrowserRows);
}
