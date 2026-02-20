import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export type DisplayTarget = {
  sets?: number;
  repsText?: string;
  weight?: number;
  durationSeconds?: number;
  source: "engine" | "template";
};

function getRepsText(minReps: number | null, maxReps: number | null, fallbackReps: number | null) {
  const resolvedMin = minReps ?? fallbackReps ?? null;
  const resolvedMax = maxReps ?? fallbackReps ?? null;

  if (resolvedMin !== null && resolvedMax !== null) {
    if (resolvedMin === resolvedMax) {
      return `${resolvedMin} reps`;
    }

    return `${resolvedMin}–${resolvedMax} reps`;
  }

  if (resolvedMin !== null) {
    return `${resolvedMin} reps`;
  }

  if (resolvedMax !== null) {
    return `${resolvedMax} reps`;
  }

  return undefined;
}

export async function getSessionTargets(sessionId: string) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, routine_id, routine_day_index, user_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session?.routine_id || !session.routine_day_index) {
    return new Map<string, DisplayTarget>();
  }

  const { data: routineDay } = await supabase
    .from("routine_days")
    .select("id")
    .eq("routine_id", session.routine_id)
    .eq("day_index", session.routine_day_index)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!routineDay) {
    return new Map<string, DisplayTarget>();
  }

  const { data: routineDayExercises } = await supabase
    .from("routine_day_exercises")
    .select("exercise_id, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_duration_seconds")
    .eq("routine_day_id", routineDay.id)
    .eq("user_id", user.id);

  const targetMap = new Map<string, DisplayTarget>();

  for (const exercise of routineDayExercises ?? []) {
    const target: DisplayTarget = {
      source: "template",
    };

    if (exercise.target_sets !== null) {
      target.sets = exercise.target_sets;
    }

    const repsText = getRepsText(exercise.target_reps_min, exercise.target_reps_max, exercise.target_reps);
    if (repsText) {
      target.repsText = repsText;
    }

    if (exercise.target_weight !== null) {
      target.weight = Number(exercise.target_weight);
    }

    if (exercise.target_duration_seconds !== null) {
      target.durationSeconds = exercise.target_duration_seconds;
    }

    targetMap.set(exercise.exercise_id, target);
  }

  return targetMap;
}
