import { supabaseServer } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";
import { aggregateExerciseStatsFromSets, type HistoricalSetRow } from "@/lib/exercise-history-aggregation";
import { logDebugSummary } from "@/lib/observability";

export type ExerciseStatsRow = {
  exercise_id: string;
  last_weight: number | null;
  last_reps: number | null;
  last_unit: string | null;
  last_performed_at: string | null;
  pr_weight: number | null;
  pr_reps: number | null;
  pr_est_1rm: number | null;
  pr_achieved_at: string | null;
  actual_pr_weight: number | null;
  actual_pr_reps: number | null;
  actual_pr_at: string | null;
};

function uniqueExerciseIds(exerciseIds: Array<string | null | undefined>): string[] {
  return Array.from(new Set(exerciseIds.filter((exerciseId): exerciseId is string => Boolean(exerciseId))));
}

export async function getExerciseIdsForSession(userId: string, sessionId: string): Promise<string[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("session_exercises")
    .select("exercise_id")
    .eq("user_id", userId)
    .eq("session_id", sessionId);

  if (error || !data) {
    return [];
  }

  return uniqueExerciseIds(data.map((row) => row.exercise_id));
}

export async function getExerciseIdsForSessionExercises(userId: string, sessionExerciseIds: string[]): Promise<string[]> {
  const uniqueSessionExerciseIds = Array.from(new Set(sessionExerciseIds.filter(Boolean)));
  if (!uniqueSessionExerciseIds.length) {
    return [];
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("session_exercises")
    .select("exercise_id")
    .eq("user_id", userId)
    .in("id", uniqueSessionExerciseIds);

  if (error || !data) {
    return [];
  }

  return uniqueExerciseIds(data.map((row) => row.exercise_id));
}

export async function recomputeExerciseStatsForSession(userId: string, sessionId: string): Promise<void> {
  const exerciseIds = await getExerciseIdsForSession(userId, sessionId);
  if (!exerciseIds.length) return;
  await recomputeExerciseStatsForExercises(userId, exerciseIds);
}

export async function recomputeExerciseStatsForSessionExercises(userId: string, sessionExerciseIds: string[]): Promise<void> {
  const exerciseIds = await getExerciseIdsForSessionExercises(userId, sessionExerciseIds);
  if (!exerciseIds.length) {
    return;
  }

  await recomputeExerciseStatsForExercises(userId, exerciseIds);
}

export async function recomputeExerciseStatsForExercises(userId: string, exerciseIds: string[]): Promise<void> {
  const uniqueIds = uniqueExerciseIds(exerciseIds);
  if (!uniqueIds.length) {
    return;
  }

  const supabase = supabaseServer();

  const { data: historySets, error } = await supabase
    .from("sets")
    .select("set_index, weight, reps, weight_unit, duration_seconds, distance, calories, distance_unit, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(performed_at, status))")
    .eq("user_id", userId)
    .eq("session_exercise.user_id", userId)
    .in("session_exercise.exercise_id", uniqueIds)
    .eq("session_exercise.session.status", "completed");

  if (error) {
    return;
  }

  const aggregatedStats = aggregateExerciseStatsFromSets((historySets ?? []) as HistoricalSetRow[]);

  const upserts = uniqueIds
    .map((exerciseId) => {
      const stats = aggregatedStats.get(exerciseId);
      if (!stats) return null;

      return {
        user_id: userId,
        exercise_id: exerciseId,
        last_weight: stats.last_weight,
        last_reps: stats.last_reps,
        last_unit: stats.last_unit,
        last_performed_at: stats.last_performed_at,
        pr_weight: stats.pr_weight,
        pr_reps: stats.pr_reps,
        pr_est_1rm: stats.pr_est_1rm,
        pr_achieved_at: stats.pr_achieved_at,
        actual_pr_weight: stats.actual_pr_weight,
        actual_pr_reps: stats.actual_pr_reps,
        actual_pr_at: stats.actual_pr_at,
        updated_at: new Date().toISOString(),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const exerciseIdsWithoutHistory = uniqueIds.filter((exerciseId) => !aggregatedStats.has(exerciseId));

  if (exerciseIdsWithoutHistory.length) {
    await supabase
      .from("exercise_stats")
      .delete()
      .eq("user_id", userId)
      .in("exercise_id", exerciseIdsWithoutHistory);
  }

  if (upserts.length) {
    await supabase
      .from("exercise_stats")
      .upsert(upserts, { onConflict: "user_id,exercise_id" });
  }
}

export async function getExerciseStatsForExercises(userId: string, exerciseIds: string[]): Promise<Map<string, ExerciseStatsRow>> {
  noStore();

  if (!exerciseIds.length) {
    return new Map();
  }

  const supabase = supabaseServer();
  const { data } = await supabase
    .from("exercise_stats")
    .select("exercise_id, last_weight, last_reps, last_unit, last_performed_at, pr_weight, pr_reps, pr_est_1rm, pr_achieved_at, actual_pr_weight, actual_pr_reps, actual_pr_at")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds);

  logDebugSummary("exercise-stats", "fetched stats rows", {
    requestedExerciseCount: exerciseIds.length,
    rowCount: (data ?? []).length,
  });

  return new Map(((data ?? []) as ExerciseStatsRow[]).map((row) => [row.exercise_id, row]));
}

export type ExerciseStatsLookupError = {
  code: "NON_CANONICAL_EXERCISE_ID";
  message: string;
  exerciseId: string;
  details?: {
    userId: string;
    canonicalHintExerciseId: string | null;
  };
};

export type ExerciseStatsLookupResult = {
  row: ExerciseStatsRow | null;
  error: ExerciseStatsLookupError | null;
};

export async function getExerciseStatsForExercise(userId: string, exerciseId: string): Promise<ExerciseStatsLookupResult> {
  noStore();

  const supabase = supabaseServer();

  const { data: canonicalExercise, error: canonicalExerciseError } = await supabase
    .from("exercises")
    .select("id")
    .eq("id", exerciseId)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .maybeSingle();

  if (canonicalExerciseError) {
    throw new Error(`failed to validate exercise id for stats lookup: ${canonicalExerciseError.message}`);
  }

  if (!canonicalExercise?.id) {
    console.warn("[exercise-stats] non-canonical exercise id", {
      exerciseId,
    });

    return {
      row: null,
      error: {
        code: "NON_CANONICAL_EXERCISE_ID",
        message: "non-canonical exerciseId passed",
        exerciseId,
      },
    };
  }

  const { data } = await supabase
    .from("exercise_stats")
    .select("exercise_id, last_weight, last_reps, last_unit, last_performed_at, pr_weight, pr_reps, pr_est_1rm, pr_achieved_at, actual_pr_weight, actual_pr_reps, actual_pr_at")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .maybeSingle();

  return {
    row: (data as ExerciseStatsRow | null) ?? null,
    error: null,
  };
}
