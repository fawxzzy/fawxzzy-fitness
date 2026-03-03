import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import { formatPrBreakdown } from "@/lib/pr-evaluator";
import { requireUser } from "@/lib/auth";
import { listExercises } from "@/lib/exercises";
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
  measurement_type: string | null;
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

type HistoricalSetRow = {
  set_index: number;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance: number | null;
  calories: number | null;
  session_exercise:
    | { exercise_id: string; session: { status: "completed" | "in_progress"; performed_at: string } | Array<{ status: "completed" | "in_progress"; performed_at: string }> | null }
    | Array<{ exercise_id: string; session: { status: "completed" | "in_progress"; performed_at: string } | Array<{ status: "completed" | "in_progress"; performed_at: string }> | null }>
    | null;
};

export type ExerciseBrowserRow = {
  exerciseId: string;
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
  kind: "strength" | "cardio";
  lastSummary: string | null;
  bestSummary: string | null;
  prLabel: string;
};

function resolveStatsKind(measurementType: string | null | undefined): "strength" | "cardio" {
  const normalized = String(measurementType ?? "").trim().toLowerCase();
  if (normalized === "duration" || normalized === "distance" || normalized === "calories" || normalized === "time" || normalized === "time_distance") {
    return "cardio";
  }
  return "strength";
}

function positive(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function formatCompact(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatStrengthSummary(weight: number | null, reps: number | null, unit: string | null) {
  const safeWeight = positive(weight);
  const safeReps = positive(reps);
  const normalizedUnit = unit === "lb" || unit === "lbs" ? "lb" : unit === "kg" ? "kg" : "";

  if (safeWeight > 0 && safeReps > 0) {
    return `${formatCompact(safeWeight)}${normalizedUnit}×${formatCompact(safeReps)}`;
  }
  if (safeReps > 0) return `${formatCompact(safeReps)} reps`;
  if (safeWeight > 0) return `${formatCompact(safeWeight)}${normalizedUnit}`;
  return null;
}

function formatCardioSummary(durationSeconds: number | null, distance: number | null) {
  const parts: string[] = [];
  if (positive(durationSeconds) > 0) parts.push(`${formatCompact(positive(durationSeconds))}s`);
  if (positive(distance) > 0) parts.push(`${formatCompact(positive(distance))} dist`);
  return parts.length ? parts.join(" • ") : null;
}

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
      slug: "slug" in row && typeof row.slug === "string" ? row.slug : null,
      primary_muscle: row.primary_muscle ?? null,
      equipment: row.equipment ?? null,
      movement_pattern: row.movement_pattern ?? null,
      image_howto_path: row.image_howto_path ?? null,
      how_to_short: row.how_to_short ?? null,
      measurement_type: row.measurement_type ?? null,
    }));

  const canonicalIds = Array.from(new Set(exercises.map((row) => row.id)));

  if (!canonicalIds.length) {
    return [];
  }

  const [{ data: statsRows, error: statsError }, { data: historySetRows, error: historySetError }] = await Promise.all([
    supabase
      .from("exercise_stats")
      .select("exercise_id, last_weight, last_reps, last_unit, last_performed_at, pr_weight, pr_reps, pr_est_1rm, actual_pr_weight, actual_pr_reps, actual_pr_at")
      .eq("user_id", user.id)
      .in("exercise_id", canonicalIds),
    supabase
      .from("sets")
      .select("set_index, weight, reps, duration_seconds, distance, calories, session_exercise:session_exercises!inner(exercise_id, session:sessions!inner(status, performed_at))")
      .eq("user_id", user.id)
      .eq("session_exercise.user_id", user.id)
      .in("session_exercise.exercise_id", canonicalIds)
      .eq("session_exercise.session.status", "completed"),
  ]);

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

  if (historySetError && !isRelationOrColumnMissing(historySetError)) {
    throw new Error(`failed to load exercise history sets: ${historySetError.message}`);
  }

  const statsByExerciseId = new Map(((statsRows ?? []) as ExerciseStatsRow[]).map((row) => [row.exercise_id, row]));

  const setAggByExerciseId = new Map<string, { bestDurationSeconds: number; bestDistance: number; lastDurationSeconds: number | null; lastDistance: number | null; lastPerformedAt: string | null; lastSetIndex: number | null }>();
  for (const rawRow of (historySetRows ?? []) as HistoricalSetRow[]) {
    const sessionExercise = Array.isArray(rawRow.session_exercise)
      ? (rawRow.session_exercise[0] ?? null)
      : (rawRow.session_exercise ?? null);
    const session = Array.isArray(sessionExercise?.session)
      ? (sessionExercise?.session[0] ?? null)
      : (sessionExercise?.session ?? null);
    if (!sessionExercise?.exercise_id || session?.status !== "completed") continue;

    const current = setAggByExerciseId.get(sessionExercise.exercise_id) ?? { bestDurationSeconds: 0, bestDistance: 0, lastDurationSeconds: null, lastDistance: null, lastPerformedAt: null, lastSetIndex: null };
    current.bestDurationSeconds = Math.max(current.bestDurationSeconds, positive(rawRow.duration_seconds));
    current.bestDistance = Math.max(current.bestDistance, positive(rawRow.distance));

    const performedAt = session.performed_at;
    const isNewer = !current.lastPerformedAt
      || performedAt > current.lastPerformedAt
      || (performedAt === current.lastPerformedAt && (current.lastSetIndex == null || rawRow.set_index > current.lastSetIndex));

    if (isNewer) {
      current.lastDurationSeconds = positive(rawRow.duration_seconds) || null;
      current.lastDistance = positive(rawRow.distance) || null;
      current.lastPerformedAt = performedAt;
      current.lastSetIndex = rawRow.set_index;
    }

    setAggByExerciseId.set(sessionExercise.exercise_id, current);
  }

  return exercises
    .map((exercise) => {
      const exerciseId = exercise.id;
      const stats = statsByExerciseId.get(exerciseId);
      const kind = resolveStatsKind(exercise.measurement_type);
      const setAgg = setAggByExerciseId.get(exerciseId);

      const lastSummary = kind === "strength"
        ? formatStrengthSummary(stats?.last_weight ?? null, stats?.last_reps ?? null, stats?.last_unit ?? null)
        : formatCardioSummary(setAgg?.lastDurationSeconds ?? null, setAgg?.lastDistance ?? null);

      const bestSummary = kind === "strength"
        ? formatStrengthSummary(stats?.actual_pr_weight ?? null, stats?.actual_pr_reps ?? null, stats?.last_unit ?? null)
        : formatCardioSummary(setAgg?.bestDurationSeconds ?? null, setAgg?.bestDistance ?? null);

      const strengthPrLabel = stats?.pr_est_1rm && stats.pr_est_1rm > 0
        ? `${formatCompact(stats.pr_est_1rm)}${stats.last_unit === "kg" ? "kg" : stats.last_unit === "lb" || stats.last_unit === "lbs" ? "lb" : ""}`
        : null;

      return {
        exerciseId,
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
        kind,
        lastSummary,
        bestSummary,
        prLabel: kind === "strength"
          ? (formatPrBreakdown({ reps: 0, weight: stats?.actual_pr_weight ? 1 : 0, total: stats?.actual_pr_weight ? 1 : 0 }) || strengthPrLabel || "")
          : [setAgg?.bestDurationSeconds ? "Duration PR" : "", setAgg?.bestDistance ? "Distance PR" : ""].filter(Boolean).join(" • "),
      };
    })
    .sort(compareExerciseBrowserRows);
}
