import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import { formatPrBreakdown } from "@/lib/pr-evaluator";
import { requireUser } from "@/lib/auth";
import { listExercises } from "@/lib/exercises";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDistance, formatDurationShort, formatPace, positive } from "@/lib/exercise-stats-formatting";

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
  default_unit: string | null;
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
  distance_unit: "mi" | "km" | "m" | null;
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

function formatCardioSummary(args: { durationSeconds?: number | null; distance?: number | null; paceSecondsPerUnit?: number | null; distanceUnit?: string | null }) {
  const parts = [
    formatDurationShort(args.durationSeconds),
    formatDistance(args.distance, args.distanceUnit),
    formatPace(args.paceSecondsPerUnit, args.distanceUnit),
  ].filter((value): value is string => Boolean(value));
  return parts.length ? parts.join(" • ") : null;
}


function fallbackDistanceUnit(defaultUnit: string | null | undefined): "mi" | "km" | "m" | null {
  if (defaultUnit === "miles") return "mi";
  if (defaultUnit === "km") return "km";
  if (defaultUnit === "meters") return "m";
  if (defaultUnit === "mi" || defaultUnit === "km" || defaultUnit === "m") return defaultUnit;
  return null;
}

function resolveCardioPrimaryMetric(measurementType: string | null | undefined): "distance" | "duration" | "calories" | "effort" {
  const normalized = String(measurementType ?? "").trim().toLowerCase();
  if (normalized === "distance") return "distance";
  if (normalized === "duration" || normalized === "time" || normalized === "time_distance") return "duration";
  if (normalized === "calories") return "calories";
  return "effort";
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
      default_unit: row.default_unit ?? null,
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
      .select("set_index, weight, reps, duration_seconds, distance, distance_unit, calories, session_exercise:session_exercises!inner(exercise_id, session:sessions!inner(status, performed_at))")
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

  const setRowsByExerciseId = new Map<string, HistoricalSetRow[]>();
  for (const rawRow of (historySetRows ?? []) as HistoricalSetRow[]) {
    const sessionExercise = Array.isArray(rawRow.session_exercise)
      ? (rawRow.session_exercise[0] ?? null)
      : (rawRow.session_exercise ?? null);
    const session = Array.isArray(sessionExercise?.session)
      ? (sessionExercise?.session[0] ?? null)
      : (sessionExercise?.session ?? null);
    if (!sessionExercise?.exercise_id || session?.status !== "completed") continue;

    const rows = setRowsByExerciseId.get(sessionExercise.exercise_id) ?? [];
    rows.push(rawRow);
    setRowsByExerciseId.set(sessionExercise.exercise_id, rows);
  }

  return exercises
    .map((exercise) => {
      const exerciseId = exercise.id;
      const stats = statsByExerciseId.get(exerciseId);
      const kind = resolveStatsKind(exercise.measurement_type);
      const setRows = setRowsByExerciseId.get(exerciseId) ?? [];

      const latestSetBySession = new Map<string, { performedAt: string; sets: HistoricalSetRow[] }>();
      for (const row of setRows) {
        const sessionExercise = Array.isArray(row.session_exercise) ? (row.session_exercise[0] ?? null) : (row.session_exercise ?? null);
        const session = Array.isArray(sessionExercise?.session) ? (sessionExercise?.session[0] ?? null) : (sessionExercise?.session ?? null);
        if (!sessionExercise?.exercise_id || !session?.performed_at) continue;
        const current = latestSetBySession.get(`${session.performed_at}-${sessionExercise.exercise_id}`) ?? { performedAt: session.performed_at, sets: [] };
        current.sets.push(row);
        latestSetBySession.set(`${session.performed_at}-${sessionExercise.exercise_id}`, current);
      }
      const latestSession = [...latestSetBySession.values()].sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0] ?? null;
      const toSessionAggregate = (performedAt: string, sessionRows: HistoricalSetRow[]) => {
        const durationSeconds = sessionRows.reduce((sum, row) => sum + positive(row.duration_seconds), 0);
        const calories = sessionRows.reduce((sum, row) => sum + positive(row.calories), 0);
        const distanceByUnit = new Map<"mi" | "km" | "m", number>();
        for (const row of sessionRows) {
          if (!row.distance_unit) continue;
          const distance = positive(row.distance);
          if (distance <= 0) continue;
          distanceByUnit.set(row.distance_unit, (distanceByUnit.get(row.distance_unit) ?? 0) + distance);
        }
        const distanceUnit = (["mi", "km", "m"].find((candidate) => distanceByUnit.has(candidate as "mi" | "km" | "m")) as "mi" | "km" | "m" | undefined)
          ?? fallbackDistanceUnit(exercise.default_unit);
        return {
          performedAt,
          setIndex: Math.max(...sessionRows.map((row) => row.set_index), 0),
          durationSeconds,
          distance: distanceUnit ? (distanceByUnit.get(distanceUnit) ?? 0) : 0,
          distanceUnit,
          calories,
        };
      };
      const sessionAggregates = [...latestSetBySession.values()].map((entry) => toSessionAggregate(entry.performedAt, entry.sets));
      const latestCardioSession = sessionAggregates.sort((a, b) => (b.performedAt ?? "").localeCompare(a.performedAt ?? ""))[0] ?? null;
      const pace = (row: { durationSeconds: number; distance: number }) => {
        const d = positive(row.durationSeconds);
        const dist = positive(row.distance);
        if (d <= 0 || dist <= 0) return null;
        return d / dist;
      };
      const cardioPriority = resolveCardioPrimaryMetric(exercise.measurement_type);
      const cardioScore = (row: (typeof sessionAggregates)[number]) => {
        const duration = row.durationSeconds;
        const distance = row.distance;
        const calories = row.calories;
        if (cardioPriority === "distance") return [distance, duration, calories];
        if (cardioPriority === "duration") return [duration, distance, calories];
        if (cardioPriority === "calories") return [calories, distance, duration];
        return [distance, duration, calories];
      };
      const bestCardioSession = sessionAggregates.length ? [...sessionAggregates].sort((a, b) => {
        const sa = cardioScore(a); const sb = cardioScore(b);
        if (sb[0] !== sa[0]) return sb[0] - sa[0];
        if (sb[1] !== sa[1]) return sb[1] - sa[1];
        if (sb[2] !== sa[2]) return sb[2] - sa[2];
        return b.setIndex - a.setIndex;
      })[0] : null;

      const hasWeightedBest = positive(stats?.actual_pr_weight) > 0;
      const bodyweightPr = setRows.reduce((max, row) => Math.max(max, positive(row.weight) === 0 ? positive(row.reps) : 0), 0);
      const lastBodyweightReps = latestSession ? latestSession.sets.reduce((max, row) => Math.max(max, positive(row.weight) === 0 ? positive(row.reps) : 0), 0) : 0;

      const lastSummary = kind === "strength"
        ? (!hasWeightedBest && bodyweightPr > 0
          ? (lastBodyweightReps > 0 ? `${formatCompact(lastBodyweightReps)} reps` : null)
          : formatStrengthSummary(stats?.last_weight ?? null, stats?.last_reps ?? null, stats?.last_unit ?? null))
        : formatCardioSummary({
          durationSeconds: latestCardioSession?.durationSeconds ?? null,
          distance: latestCardioSession?.distance ?? null,
          paceSecondsPerUnit: latestCardioSession ? pace(latestCardioSession) : null,
          distanceUnit: latestCardioSession?.distanceUnit,
        });

      const bestSummary = kind === "strength"
        ? (!hasWeightedBest && bodyweightPr > 0
          ? `${formatCompact(bodyweightPr)} reps`
          : formatStrengthSummary(stats?.actual_pr_weight ?? null, stats?.actual_pr_reps ?? null, stats?.last_unit ?? null))
        : (() => {
          if (exercise.measurement_type === "time_distance" && bestCardioSession) {
            const bestPace = formatPace(pace(bestCardioSession), bestCardioSession.distanceUnit);
            if (bestPace) return `Best Pace: ${bestPace}`;
          }
          if (resolveCardioPrimaryMetric(exercise.measurement_type) === "distance") {
            const bestDistance = formatDistance(bestCardioSession?.distance, bestCardioSession?.distanceUnit);
            return bestDistance ? `Best: ${bestDistance}` : null;
          }
          const bestDuration = formatDurationShort(bestCardioSession?.durationSeconds);
          return bestDuration ? `Best: ${bestDuration}` : null;
        })();

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
        last_performed_at: stats?.last_performed_at ?? latestSession?.performedAt ?? null,
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
          ? (!hasWeightedBest && bodyweightPr > 0 ? "" : (formatPrBreakdown({ reps: 0, weight: stats?.actual_pr_weight ? 1 : 0, total: stats?.actual_pr_weight ? 1 : 0 }) || strengthPrLabel || ""))
          : "",
      };
    })
    .sort(compareExerciseBrowserRows);
}
