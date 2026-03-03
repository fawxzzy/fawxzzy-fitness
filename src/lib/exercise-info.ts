import "server-only";

import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
import { getExerciseHowToImageSrc } from "@/lib/exerciseImages";
import { getExerciseStatsForExercise, type ExerciseStatsLookupError, type ExerciseStatsRow } from "@/lib/exercise-stats";
import { evaluatePrSummaries, formatPrBreakdown, type PrEvaluationSet } from "@/lib/pr-evaluator";
import { supabaseServer } from "@/lib/supabase/server";

export type ExerciseInfoExercise = {
  id: string;
  exercise_id: string;
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_howto_path: string | null;
  how_to_short: string | null;
  image_icon_path: string | null;
  slug: string | null;
};

export type ExerciseInfoStatsViewModel = ExerciseStatsRow & {
  total_sessions: number | null;
  total_sets: number;
  total_reps: number | null;
  best_reps_at_best_weight: number | null;
  pr_counts: { reps: number; weight: number; total: number };
  pr_label: string;
  best_bodyweight_reps: number | null;
  best_weight: number | null;
  best_set_weight: number | null;
  best_set_reps: number | null;
  best_set_unit: string | null;
};

export type ExerciseInfoPayload = {
  exercise: ExerciseInfoExercise;
  stats: ExerciseInfoStatsViewModel | null;
};

type HistoricalSetRow = {
  set_index: number;
  weight: number | null;
  reps: number | null;
  weight_unit: "lbs" | "lb" | "kg" | null;
  session_exercise:
    | {
      session_id: string;
      exercise_id: string;
      session: { performed_at: string; status: "in_progress" | "completed" } | Array<{ performed_at: string; status: "in_progress" | "completed" }> | null;
    }
    | Array<{
      session_id: string;
      exercise_id: string;
      session: { performed_at: string; status: "in_progress" | "completed" } | Array<{ performed_at: string; status: "in_progress" | "completed" }> | null;
    }>
    | null;
};

async function loadHistoricalSetRows(userId: string, canonicalExerciseId: string) {
  return supabaseServer()
    .from("sets")
    .select("set_index, weight, reps, weight_unit, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(performed_at, status))")
    .eq("user_id", userId)
    .eq("session_exercise.user_id", userId)
    .eq("session_exercise.exercise_id", canonicalExerciseId)
    .eq("session_exercise.session.status", "completed");
}

async function repairMissingExerciseIdLinks(userId: string, canonicalExerciseId: string): Promise<void> {
  const supabase = supabaseServer();
  const { data: orphanRows, error: orphanError } = await supabase
    .from("session_exercises")
    .select("id, routine_day_exercise:routine_day_exercises!inner(exercise_id)")
    .eq("user_id", userId)
    .is("exercise_id", null)
    .eq("routine_day_exercise.exercise_id", canonicalExerciseId)
    .limit(250);

  if (orphanError || !orphanRows?.length) {
    return;
  }

  const repairIds = orphanRows
    .map((row) => row.id)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (!repairIds.length) {
    return;
  }

  await supabase
    .from("session_exercises")
    .update({ exercise_id: canonicalExerciseId })
    .eq("user_id", userId)
    .is("exercise_id", null)
    .in("id", repairIds);
}

function isNoRowsError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST116") return true;
  return typeof error.message === "string" && /no rows|0 rows/i.test(error.message);
}

export async function getExerciseInfoBase(exerciseId: string, userId: string): Promise<ExerciseInfoExercise | null> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, how_to_short, primary_muscle, movement_pattern, equipment, image_howto_path")
    .eq("id", exerciseId)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    if (isNoRowsError(error)) {
      return null;
    }

    throw new Error(`failed to load exercise info base: ${error.message}`);
  }

  if (!data || !data.id) {
    const fallbackExercise = EXERCISE_OPTIONS.find((exercise) => exercise.id === exerciseId);
    if (!fallbackExercise) {
      return null;
    }

    return {
      id: fallbackExercise.id,
      exercise_id: fallbackExercise.id,
      name: fallbackExercise.name,
      primary_muscle: fallbackExercise.primary_muscle,
      equipment: fallbackExercise.equipment,
      movement_pattern: fallbackExercise.movement_pattern,
      image_howto_path: null,
      how_to_short: fallbackExercise.how_to_short,
      image_icon_path: null,
      slug: null,
    };
  }

  return {
    id: data.id,
    exercise_id: data.id,
    name: data.name,
    primary_muscle: data.primary_muscle,
    equipment: data.equipment,
    movement_pattern: data.movement_pattern,
    image_howto_path: data.image_howto_path,
    how_to_short: data.how_to_short,
    image_icon_path: null,
    slug: null,
  };
}

export async function getExerciseInfoStats(userId: string, canonicalExerciseId: string, requestId?: string): Promise<ExerciseInfoStatsViewModel | null> {
  try {
    if (process.env.NODE_ENV === "development") {
      console.debug("[exercise-info:getExerciseInfoStats] lookup boundary", {
        requestId,
        userId,
        exerciseId: canonicalExerciseId,
      });
    }

    const [statsLookup, historicalSetRows] = await Promise.all([
      getExerciseStatsForExercise(userId, canonicalExerciseId),
      loadHistoricalSetRows(userId, canonicalExerciseId),
    ]);

    const statsLookupError: ExerciseStatsLookupError | null = statsLookup.error;
    if (statsLookupError) {
      console.warn("[exercise-info:getExerciseInfoStats] stats lookup warning", {
        requestId,
        exerciseId: canonicalExerciseId,
        code: statsLookupError.code,
        message: statsLookupError.message,
        details: statsLookupError.details,
      });
    }

    const stats = statsLookup.row;

    let historicalRows = historicalSetRows.data ?? [];
    if (!historicalRows.length) {
      await repairMissingExerciseIdLinks(userId, canonicalExerciseId);
      const repairedRows = await loadHistoricalSetRows(userId, canonicalExerciseId);
      historicalRows = repairedRows.data ?? historicalRows;
    }

    const normalizedRows = (historicalRows as HistoricalSetRow[]).flatMap((row) => {
      const sessionExercise = Array.isArray(row.session_exercise)
        ? (row.session_exercise[0] ?? null)
        : (row.session_exercise ?? null);
      const session = Array.isArray(sessionExercise?.session)
        ? (sessionExercise?.session[0] ?? null)
        : (sessionExercise?.session ?? null);
      if (!sessionExercise?.session_id || !session?.performed_at || session.status !== "completed") {
        return [];
      }

      return [{
        sessionId: sessionExercise.session_id,
        performedAt: session.performed_at,
        setIndex: row.set_index,
        weight: row.weight,
        reps: row.reps,
        weightUnit: row.weight_unit,
      }];
    });

    const rows: PrEvaluationSet[] = normalizedRows.map((row) => ({
      exerciseId: canonicalExerciseId,
      sessionId: row.sessionId,
      performedAt: row.performedAt,
      setIndex: row.setIndex,
      weight: row.weight,
      reps: row.reps,
    }));

    const { exerciseSummaryById } = evaluatePrSummaries(rows);
    const exerciseSummary = exerciseSummaryById.get(canonicalExerciseId);

    if (!stats && normalizedRows.length === 0 && !exerciseSummary) return null;

    const fallbackStats: ExerciseStatsRow = {
      exercise_id: canonicalExerciseId,
      last_weight: null,
      last_reps: null,
      last_unit: null,
      last_performed_at: null,
      pr_weight: null,
      pr_reps: null,
      pr_est_1rm: null,
      pr_achieved_at: null,
      actual_pr_weight: null,
      actual_pr_reps: null,
      actual_pr_at: null,
    };

    const resolvedStats = stats ?? fallbackStats;
    const prCounts = exerciseSummary?.counts ?? { reps: 0, weight: 0, total: 0 };
    const totalSessions = new Set(normalizedRows.map((row) => row.sessionId)).size;
    const totalSets = normalizedRows.length;
    const totalReps = normalizedRows.reduce((sum, row) => {
      const reps = typeof row.reps === "number" && Number.isFinite(row.reps) && row.reps > 0 ? row.reps : 0;
      return sum + reps;
    }, 0);

    const sortedRows = [...normalizedRows].sort((a, b) => {
      if (b.performedAt !== a.performedAt) return b.performedAt.localeCompare(a.performedAt);
      return b.setIndex - a.setIndex;
    });

    const bestWeightedSet = [...normalizedRows]
      .filter((row) => typeof row.weight === "number" && Number.isFinite(row.weight) && row.weight > 0)
      .sort((a, b) => {
        const aWeight = a.weight ?? 0;
        const bWeight = b.weight ?? 0;
        if (bWeight !== aWeight) return bWeight - aWeight;

        const aReps = a.reps ?? 0;
        const bReps = b.reps ?? 0;
        if (bReps !== aReps) return bReps - aReps;

        if (b.performedAt !== a.performedAt) return b.performedAt.localeCompare(a.performedAt);
        return b.setIndex - a.setIndex;
      })[0] ?? null;

    const fallbackLastSet = sortedRows[0] ?? null;
    const resolvedLastPerformedAt = resolvedStats.last_performed_at ?? fallbackLastSet?.performedAt ?? null;

    // Tiny regression check: if any sets exist, last-performed + total-sets must be populated.
    if (totalSets > 0 && (!resolvedLastPerformedAt || totalSets < 1)) {
      console.warn("[exercise-info] stats invariant fallback", {
        requestId,
        canonicalExerciseId,
        totalSets,
        resolvedLastPerformedAt,
      });
    }

    return {
      ...resolvedStats,
      last_weight: resolvedStats.last_weight ?? fallbackLastSet?.weight ?? null,
      last_reps: resolvedStats.last_reps ?? fallbackLastSet?.reps ?? null,
      last_unit: resolvedStats.last_unit ?? fallbackLastSet?.weightUnit ?? null,
      last_performed_at: resolvedLastPerformedAt,
      total_sessions: totalSessions > 0 ? totalSessions : null,
      total_sets: totalSets,
      total_reps: totalReps > 0 ? totalReps : null,
      best_reps_at_best_weight: typeof bestWeightedSet?.reps === "number" && bestWeightedSet.reps > 0 ? bestWeightedSet.reps : null,
      pr_counts: prCounts,
      pr_label: formatPrBreakdown(prCounts),
      best_bodyweight_reps: exerciseSummary && exerciseSummary.bestBodyweightReps > 0 ? exerciseSummary.bestBodyweightReps : null,
      best_weight: exerciseSummary && exerciseSummary.bestWeight > 0 ? exerciseSummary.bestWeight : null,
      best_set_weight: bestWeightedSet?.weight ?? null,
      best_set_reps: bestWeightedSet?.reps ?? null,
      best_set_unit: bestWeightedSet?.weightUnit ?? null,
    };
  } catch (error) {
    console.warn("[exercise-info] non-fatal stats failure", {
      requestId,
      step: "payload:stats",
      userId,
      canonicalExerciseId,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

export function resolveExerciseInfoImages(exercise: ExerciseInfoExercise): ExerciseInfoExercise {
  const resolvedHowToPath = getExerciseHowToImageSrc(exercise);
  return {
    ...exercise,
    image_howto_path: resolvedHowToPath,
  };
}

export async function getExerciseInfoPayload(exerciseId: string, userId: string): Promise<ExerciseInfoPayload | null> {
  const exercise = await getExerciseInfoBase(exerciseId, userId);
  if (!exercise) {
    return null;
  }

  const stats = await getExerciseInfoStats(userId, exercise.exercise_id);
  const exerciseWithImages = resolveExerciseInfoImages(exercise);

  return {
    exercise: exerciseWithImages,
    stats: stats ?? null,
  };
}
