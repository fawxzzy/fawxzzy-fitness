import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";
import { aggregateExerciseStatsFromSets, type HistoricalSetRow } from "@/lib/exercise-history-aggregation";
import {
  mergeExerciseStatsWithLatestProgression,
  type LatestCompletedExerciseProgressionRow,
  type LatestConfiguredExerciseSetupRow,
} from "@/lib/exercise-stats-progression";
import { logDebugSummary } from "@/lib/observability";

export type ExerciseStatsRow = {
  exercise_id: string;
  last_weight: number | null;
  last_reps: number | null;
  last_unit: string | null;
  last_performed_at: string | null;
  last_progression_playbook_id?: string | null;
  last_progression_playbook_config?: Record<string, unknown> | null;
  last_configured_at?: string | null;
  last_configured_target_sets?: number | null;
  last_configured_target_reps_min?: number | null;
  last_configured_target_reps_max?: number | null;
  last_configured_target_weight?: number | null;
  last_configured_target_weight_unit?: "lbs" | "kg" | null;
  last_configured_target_duration_seconds?: number | null;
  last_configured_target_distance?: number | null;
  last_configured_target_distance_unit?: string | null;
  last_configured_target_calories?: number | null;
  last_configured_measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  last_configured_default_unit?: string | null;
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

export async function getExerciseIdsForCompletedSessions(userId: string): Promise<string[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("session_exercises")
    .select("exercise_id, session:sessions!inner(status)")
    .eq("user_id", userId)
    .eq("session.status", "completed");

  if (error || !data) {
    return [];
  }

  return uniqueExerciseIds(data.map((row) => row.exercise_id));
}

export async function getExerciseIdsForSession(
  userId: string,
  sessionId: string,
  client?: SupabaseClient,
): Promise<string[]> {
  const supabase = client ?? supabaseServer();
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

export async function recomputeExerciseStatsForExercises(
  userId: string,
  exerciseIds: string[],
  client?: SupabaseClient,
): Promise<void> {
  const uniqueIds = uniqueExerciseIds(exerciseIds);
  if (!uniqueIds.length) {
    return;
  }

  const supabase = client ?? supabaseServer();

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

export async function rebuildExerciseStatsFromLoggedSessions(userId: string): Promise<string[]> {
  const supabase = supabaseServer();
  const [completedSessionExerciseIds, existingStatsRows] = await Promise.all([
    getExerciseIdsForCompletedSessions(userId),
    supabase
      .from("exercise_stats")
      .select("exercise_id")
      .eq("user_id", userId),
  ]);

  const affectedExerciseIds = uniqueExerciseIds([
    ...completedSessionExerciseIds,
    ...((existingStatsRows.data ?? []).map((row) => row.exercise_id)),
  ]);

  if (!affectedExerciseIds.length) {
    return [];
  }

  await recomputeExerciseStatsForExercises(userId, affectedExerciseIds);
  return affectedExerciseIds;
}

export async function getExerciseStatsForExercises(
  userId: string,
  exerciseIds: string[],
  client?: SupabaseClient,
): Promise<Map<string, ExerciseStatsRow>> {
  noStore();

  if (!exerciseIds.length) {
    return new Map();
  }

  const supabase = client ?? supabaseServer();
  const [{ data: statsData }, { data: latestProgressionData }, { data: latestConfiguredSetupData }] = await Promise.all([
    supabase
      .from("exercise_stats")
      .select("exercise_id, last_weight, last_reps, last_unit, last_performed_at, pr_weight, pr_reps, pr_est_1rm, pr_achieved_at, actual_pr_weight, actual_pr_reps, actual_pr_at")
      .eq("user_id", userId)
      .in("exercise_id", exerciseIds),
    supabase
      .from("session_exercises")
      .select("exercise_id, progression_playbook_id, progression_playbook_config, session:sessions!inner(performed_at,status,user_id)")
      .eq("user_id", userId)
      .eq("session.user_id", userId)
      .in("exercise_id", exerciseIds)
      .eq("session.status", "completed"),
    supabase
      .from("routine_day_exercises")
      .select("exercise_id, created_at, target_sets, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, progression_playbook_id, progression_playbook_config")
      .eq("user_id", userId)
      .in("exercise_id", exerciseIds),
  ]);

  const latestProgressionRows = ((latestProgressionData ?? []) as Array<{
    exercise_id: string;
    progression_playbook_id: string | null;
    progression_playbook_config: Record<string, unknown> | null;
    session?: { performed_at?: string | null } | Array<{ performed_at?: string | null }>;
  }>).map((row) => {
    const sessionValue = Array.isArray(row.session) ? row.session[0] : row.session;
    return {
      exercise_id: row.exercise_id,
      performed_at: sessionValue?.performed_at ?? null,
      progression_playbook_id: row.progression_playbook_id ?? null,
      progression_playbook_config: row.progression_playbook_config ?? null,
    } satisfies LatestCompletedExerciseProgressionRow;
  });

  const latestConfiguredSetupRows = ((latestConfiguredSetupData ?? []) as Array<{
    exercise_id: string;
    created_at: string | null;
    target_sets: number | null;
    target_reps_min: number | null;
    target_reps_max: number | null;
    target_weight: number | null;
    target_weight_unit: "lbs" | "kg" | null;
    target_duration_seconds: number | null;
    target_distance: number | null;
    target_distance_unit: string | null;
    target_calories: number | null;
    measurement_type: "reps" | "time" | "distance" | "time_distance" | "none" | null;
    default_unit: string | null;
    progression_playbook_id: string | null;
    progression_playbook_config: Record<string, unknown> | null;
  }>).map((row) => ({
    exercise_id: row.exercise_id,
    created_at: row.created_at ?? null,
    target_sets: row.target_sets ?? null,
    target_reps_min: row.target_reps_min ?? null,
    target_reps_max: row.target_reps_max ?? null,
    target_weight: row.target_weight ?? null,
    target_weight_unit: row.target_weight_unit ?? null,
    target_duration_seconds: row.target_duration_seconds ?? null,
    target_distance: row.target_distance ?? null,
    target_distance_unit: row.target_distance_unit ?? null,
    target_calories: row.target_calories ?? null,
    measurement_type: row.measurement_type ?? null,
    default_unit: row.default_unit ?? null,
    progression_playbook_id: row.progression_playbook_id ?? null,
    progression_playbook_config: row.progression_playbook_config ?? null,
  } satisfies LatestConfiguredExerciseSetupRow));

  const mergedRows = mergeExerciseStatsWithLatestProgression(
    (statsData ?? []) as ExerciseStatsRow[],
    latestProgressionRows,
    latestConfiguredSetupRows,
  );

  logDebugSummary("exercise-stats", "fetched stats rows", {
    requestedExerciseCount: exerciseIds.length,
    rowCount: mergedRows.length,
  });

  return new Map(mergedRows.map((row) => [row.exercise_id, row]));
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

export async function getExerciseStatsForExercise(
  userId: string,
  exerciseId: string,
  client?: SupabaseClient,
): Promise<ExerciseStatsLookupResult> {
  noStore();

  const supabase = client ?? supabaseServer();

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
