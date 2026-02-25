import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { listExercises } from "@/lib/exercises";
import { getSessionTargets } from "@/lib/session-targets";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionExerciseRow, SessionRow, SetRow } from "@/types/db";

export async function getSessionPageData(sessionId: string) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, duration_seconds, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    notFound();
  }

  const { data: routine } = session.routine_id
    ? await supabase.from("routines").select("weight_unit").eq("id", session.routine_id).eq("user_id", user.id).maybeSingle()
    : { data: null };

  const { data: sessionExercisesData } = await supabase
    .from("session_exercises")
    .select("id, session_id, user_id, exercise_id, position, notes, is_skipped")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const sessionExercises = (sessionExercisesData ?? []) as SessionExerciseRow[];
  const exerciseIds = sessionExercises.map((exercise) => exercise.id);

  const { data: setsData } = exerciseIds.length
    ? await supabase
        .from("sets")
        .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, rpe, weight_unit")
        .in("session_exercise_id", exerciseIds)
        .eq("user_id", user.id)
        .order("set_index", { ascending: true })
    : { data: [] };

  const sets = (setsData ?? []) as SetRow[];
  const setsByExercise = new Map<string, SetRow[]>();

  for (const set of sets) {
    const current = setsByExercise.get(set.session_exercise_id) ?? [];
    current.push(set);
    setsByExercise.set(set.session_exercise_id, current);
  }

  const sessionTargets = await getSessionTargets(sessionId);
  const exerciseOptions = await listExercises();
  const exerciseNameMap = new Map(exerciseOptions.map((exercise) => [exercise.id, exercise.name]));
  const customExercises = exerciseOptions.filter((exercise) => !exercise.is_global && exercise.user_id === user.id);

  return {
    sessionRow: session as SessionRow,
    routine,
    sessionExercises,
    setsByExercise,
    sessionTargets,
    exerciseOptions,
    exerciseNameMap,
    customExercises,
  };
}
