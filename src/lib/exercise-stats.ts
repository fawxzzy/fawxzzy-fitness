import { supabaseServer } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

type HistoricalSetRow = {
  set_index: number;
  weight: number | null;
  reps: number | null;
  weight_unit: "lbs" | "kg" | null;
  session_exercise:
    | {
        session_id: string;
        session:
          | {
              performed_at: string;
              status: "in_progress" | "completed";
            }
          | Array<{
              performed_at: string;
              status: "in_progress" | "completed";
            }>
          | null;
      }
    | Array<{
        session_id: string;
        session:
          | {
              performed_at: string;
              status: "in_progress" | "completed";
            }
          | Array<{
              performed_at: string;
              status: "in_progress" | "completed";
            }>
          | null;
      }>
    | null;
};

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

function computeEstimated1rm(weight: number, reps: number) {
  return weight * (1 + reps / 30);
}

function normalizeSessionExercise(set: HistoricalSetRow) {
  const sessionExercise = Array.isArray(set.session_exercise)
    ? (set.session_exercise[0] ?? null)
    : (set.session_exercise ?? null);
  const session = sessionExercise?.session;
  const normalizedSession = Array.isArray(session) ? (session[0] ?? null) : (session ?? null);

  return {
    sessionId: sessionExercise?.session_id ?? "",
    performedAt: normalizedSession?.performed_at ?? "",
    status: normalizedSession?.status ?? null,
  };
}

function performedAtValue(set: HistoricalSetRow) {
  return normalizeSessionExercise(set).performedAt;
}

async function getExerciseIdsForSession(userId: string, sessionId: string): Promise<string[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("session_exercises")
    .select("exercise_id")
    .eq("user_id", userId)
    .eq("session_id", sessionId);

  if (error || !data) {
    return [];
  }

  return Array.from(new Set(data.map((row) => row.exercise_id)));
}

export async function recomputeExerciseStatsForSession(userId: string, sessionId: string): Promise<void> {
  const exerciseIds = await getExerciseIdsForSession(userId, sessionId);
  if (!exerciseIds.length) return;
  await recomputeExerciseStatsForExercises(userId, exerciseIds);
}

export async function recomputeExerciseStatsForExercises(userId: string, exerciseIds: string[]): Promise<void> {
  if (!exerciseIds.length) {
    return;
  }

  const uniqueExerciseIds = Array.from(new Set(exerciseIds));
  const supabase = supabaseServer();

  for (const exerciseId of uniqueExerciseIds) {
    const { data: historySets, error } = await supabase
      .from("sets")
      .select("set_index, weight, reps, weight_unit, session_exercise:session_exercises!inner(session_id, session:sessions!inner(performed_at, status))")
      .eq("user_id", userId)
      .eq("session_exercise.user_id", userId)
      .eq("session_exercise.exercise_id", exerciseId)
      .eq("session_exercise.session.status", "completed");

    if (error) {
      continue;
    }

    const sets = ((historySets ?? []) as unknown as HistoricalSetRow[])
      .filter((set) => normalizeSessionExercise(set).status === "completed")
      .sort((a, b) => {
        if (performedAtValue(b) !== performedAtValue(a)) {
          return performedAtValue(b).localeCompare(performedAtValue(a));
        }
        return b.set_index - a.set_index;
      });

    const lastSet = sets[0] ?? null;

    const prSet = sets
      .filter((set) => {
        const weight = typeof set.weight === "number" ? set.weight : 0;
        const reps = typeof set.reps === "number" ? set.reps : 0;
        return weight > 0 && reps > 0;
      })
      .map((set) => ({
        set,
        est1rm: computeEstimated1rm(set.weight ?? 0, set.reps ?? 0),
        performedAt: performedAtValue(set),
      }))
      .sort((a, b) => {
        if (b.est1rm !== a.est1rm) return b.est1rm - a.est1rm;
        if (b.performedAt !== a.performedAt) {
          return b.performedAt.localeCompare(a.performedAt);
        }
        return b.set.set_index - a.set.set_index;
      })[0] ?? null;

    const actualPrSet = sets
      .filter((set) => {
        const weight = typeof set.weight === "number" ? set.weight : 0;
        return weight > 0;
      })
      .sort((a, b) => {
        const aWeight = typeof a.weight === "number" ? a.weight : 0;
        const bWeight = typeof b.weight === "number" ? b.weight : 0;
        if (bWeight !== aWeight) return bWeight - aWeight;

        const aReps = typeof a.reps === "number" ? a.reps : 0;
        const bReps = typeof b.reps === "number" ? b.reps : 0;
        if (bReps !== aReps) return bReps - aReps;

        const aPerformedAt = performedAtValue(a);
        const bPerformedAt = performedAtValue(b);
        if (bPerformedAt !== aPerformedAt) {
          return bPerformedAt.localeCompare(aPerformedAt);
        }

        return b.set_index - a.set_index;
      })[0] ?? null;

    const hasAnySet = Boolean(lastSet || prSet);

    if (!hasAnySet) {
      await supabase
        .from("exercise_stats")
        .delete()
        .eq("user_id", userId)
        .eq("exercise_id", exerciseId);
      continue;
    }

    await supabase
      .from("exercise_stats")
      .upsert({
        user_id: userId,
        exercise_id: exerciseId,
        last_weight: lastSet && typeof lastSet.weight === "number" && lastSet.weight > 0 ? lastSet.weight : null,
        last_reps: lastSet && typeof lastSet.reps === "number" && lastSet.reps > 0 ? lastSet.reps : null,
        last_unit: lastSet?.weight_unit ?? null,
        last_performed_at: lastSet ? performedAtValue(lastSet) : null,
        pr_weight: prSet?.set.weight ?? null,
        pr_reps: prSet?.set.reps ?? null,
        pr_est_1rm: prSet?.est1rm ?? null,
        pr_achieved_at: prSet?.performedAt ?? null,
        actual_pr_weight: actualPrSet?.weight ?? null,
        actual_pr_reps: actualPrSet?.reps ?? null,
        actual_pr_at: actualPrSet ? performedAtValue(actualPrSet) : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,exercise_id" });
  }
}

export async function getExerciseStatsForExercises(userId: string, exerciseIds: string[]): Promise<Map<string, ExerciseStatsRow>> {
  noStore();

  if (!exerciseIds.length) {
    return new Map();
  }

  const supabase = supabaseServer();
  if (process.env.NODE_ENV === "development") {
    console.log("[exercise-stats:getExerciseStatsForExercises] querying", {
      userId,
      exerciseCount: exerciseIds.length,
      sampleExerciseId: exerciseIds[0] ?? null,
    });
  }
  const { data } = await supabase
    .from("exercise_stats")
    .select("exercise_id, last_weight, last_reps, last_unit, last_performed_at, pr_weight, pr_reps, pr_est_1rm, pr_achieved_at, actual_pr_weight, actual_pr_reps, actual_pr_at")
    .eq("user_id", userId)
    .in("exercise_id", exerciseIds);

  if (process.env.NODE_ENV === "development") {
    console.log("[exercise-stats:getExerciseStatsForExercises] fetched", {
      rowCount: (data ?? []).length,
      sampleExerciseId: (data ?? [])[0]?.exercise_id ?? null,
    });
  }

  return new Map(((data ?? []) as ExerciseStatsRow[]).map((row) => [row.exercise_id, row]));
}

export async function getExerciseStatsForExercise(userId: string, exerciseId: string): Promise<ExerciseStatsRow | null> {
  noStore();

  const supabase = supabaseServer();
  if (process.env.NODE_ENV === "development") {
    console.log("[exercise-stats:getExerciseStatsForExercise] querying", { userId, exerciseId });
  }
  const { data } = await supabase
    .from("exercise_stats")
    .select("exercise_id, last_weight, last_reps, last_unit, last_performed_at, pr_weight, pr_reps, pr_est_1rm, pr_achieved_at, actual_pr_weight, actual_pr_reps, actual_pr_at")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .maybeSingle();

  if (process.env.NODE_ENV === "development") {
    console.log("[exercise-stats:getExerciseStatsForExercise] fetched", {
      exerciseId,
      found: Boolean(data),
      statsExerciseId: (data as ExerciseStatsRow | null)?.exercise_id ?? null,
    });
  }

  return (data as ExerciseStatsRow | null) ?? null;
}
