import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { requireUser } from "@/lib/auth";
import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
import { supabaseServer } from "@/lib/supabase/server";

type ExerciseCatalogRow = {
  id: string;
  exercise_id: string | null;
  name: string;
  slug: string | null;
  image_path: string | null;
  image_icon_path: string | null;
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

function fallbackExercises(): ExerciseCatalogRow[] {
  return EXERCISE_OPTIONS.map((exercise) => ({
    id: exercise.id,
    exercise_id: null,
    name: exercise.name,
    slug: null,
    image_path: null,
    image_icon_path: null,
  }));
}

export async function getExercisesWithStatsForUser(): Promise<ExerciseBrowserRow[]> {
  noStore();

  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: exerciseRows, error: exerciseError } = await supabase
    .from("exercises")
    .select("id, exercise_id, name, slug, image_path, image_icon_path")
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order("name", { ascending: true });

  if (exerciseError && exerciseError.code !== "42P01") {
    throw new Error(exerciseError.message);
  }

  const exercises = ((exerciseRows ?? fallbackExercises()) as ExerciseCatalogRow[]).filter((row) => row.id && row.name);
  const canonicalIds = Array.from(new Set(exercises.map((row) => row.exercise_id ?? row.id)));

  if (!canonicalIds.length) {
    return [];
  }

  const { data: statsRows, error: statsError } = await supabase
    .from("exercise_stats")
    .select("exercise_id, last_weight, last_reps, last_unit, last_performed_at, pr_weight, pr_reps, pr_est_1rm")
    .eq("user_id", user.id)
    .in("exercise_id", canonicalIds);

  if (statsError) {
    throw new Error(statsError.message);
  }

  const statsByExerciseId = new Map(((statsRows ?? []) as ExerciseStatsRow[]).map((row) => [row.exercise_id, row]));

  return exercises
    .map((exercise) => {
      const canonicalExerciseId = exercise.exercise_id ?? exercise.id;
      const stats = statsByExerciseId.get(canonicalExerciseId);

      return {
        id: exercise.id,
        canonicalExerciseId,
        name: exercise.name,
        slug: exercise.slug,
        image_path: exercise.image_path,
        image_icon_path: exercise.image_icon_path,
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
