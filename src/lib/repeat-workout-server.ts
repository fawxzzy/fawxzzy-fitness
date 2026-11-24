import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { planRepeatWorkout, REPEAT_WORKOUT_FAILED_MESSAGE, REPEAT_WORKOUT_NOT_FOUND_MESSAGE, type RepeatWorkoutDay, type RepeatWorkoutDeps } from "@/lib/repeat-workout";
import { getRoutineDayEditableName } from "@/lib/routines";
import { startSessionForRoutineDay } from "@/lib/start-session";
import { supabaseServer } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof supabaseServer>>;

export type RepeatWorkoutResult = { sessionId: string; resumed: boolean };

/** Read-only loaders for `planRepeatWorkout`, every query scoped to the signed-in user. */
function createRepeatWorkoutDeps(supabase: ServerSupabase, userId: string): RepeatWorkoutDeps {
  let routineStartDate: string | null = null;

  return {
    async loadSourceSession(sessionId) {
      const { data } = await supabase
        .from("sessions")
        .select("id, status, routine_id, routine_day_index, routine_day_name")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!data) return null;
      return { ...data, status: data.status === "completed" ? "completed" : "in_progress" };
    },

    async loadInProgressSessionId() {
      const { data } = await supabase
        .from("sessions")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "in_progress")
        .order("performed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.id ?? null;
    },

    async routineExists(routineId) {
      const { data } = await supabase
        .from("routines")
        .select("id, start_date")
        .eq("id", routineId)
        .eq("user_id", userId)
        .maybeSingle();
      routineStartDate = data?.start_date ?? null;
      return Boolean(data?.id);
    },

    async loadLinkedDayIds(sessionId, routineId) {
      const { data: sessionExercises } = await supabase
        .from("session_exercises")
        .select("routine_day_exercise_id")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .not("routine_day_exercise_id", "is", null);
      const plannedIds = (sessionExercises ?? [])
        .map((row) => row.routine_day_exercise_id as string | null)
        .filter((id): id is string => Boolean(id));
      if (plannedIds.length === 0) return [];

      const { data: planned } = await supabase
        .from("routine_day_exercises")
        .select("id, routine_day_id")
        .in("id", plannedIds)
        .eq("user_id", userId);
      const dayIdByPlannedId = new Map((planned ?? []).map((row) => [row.id as string, row.routine_day_id as string]));
      const dayIds = plannedIds.map((id) => dayIdByPlannedId.get(id)).filter((id): id is string => Boolean(id));
      if (dayIds.length === 0) return [];

      // Keep only days that still belong to this routine.
      const { data: days } = await supabase
        .from("routine_days")
        .select("id")
        .in("id", Array.from(new Set(dayIds)))
        .eq("routine_id", routineId)
        .eq("user_id", userId);
      const liveDayIds = new Set((days ?? []).map((row) => row.id as string));
      return dayIds.filter((id) => liveDayIds.has(id));
    },

    async loadDayById(routineId, dayId) {
      const { data } = await supabase
        .from("routine_days")
        .select("id, name, day_index")
        .eq("id", dayId)
        .eq("routine_id", routineId)
        .eq("user_id", userId)
        .maybeSingle();
      return data ? ({ id: data.id, name: data.name, day_index: data.day_index, start_date: routineStartDate } satisfies RepeatWorkoutDay) : null;
    },

    async loadDayAtIndex(routineId, dayIndex) {
      const { data } = await supabase
        .from("routine_days")
        .select("id, name, day_index")
        .eq("routine_id", routineId)
        .eq("day_index", dayIndex)
        .eq("user_id", userId)
        .maybeSingle();
      return data ? ({ id: data.id, name: data.name, day_index: data.day_index, start_date: routineStartDate } satisfies RepeatWorkoutDay) : null;
    },

    readCustomDayName(day) {
      return getRoutineDayEditableName({ name: day.name, dayIndex: day.day_index, startDate: day.start_date });
    },
  };
}

/**
 * Starts a NEW workout for the routine day a finished session came from, through the same start path Today uses
 * (`startSessionForRoutineDay`: the day's current exercises and goals, one atomic RPC, rest/invalid-day checks).
 * The finished session is only read. A workout already in progress is returned instead of starting a second one.
 */
export async function repeatWorkoutFromSession(sessionId: string): Promise<ActionResult<RepeatWorkoutResult>> {
  const id = sessionId.trim();
  if (!id) {
    return { ok: false, error: REPEAT_WORKOUT_NOT_FOUND_MESSAGE };
  }

  const user = await requireUser();
  const supabase = await supabaseServer();
  const plan = await planRepeatWorkout(createRepeatWorkoutDeps(supabase, user.id), id);

  if (plan.kind === "refuse") {
    return { ok: false, error: plan.message };
  }
  if (plan.kind === "open_existing") {
    return { ok: true, data: { sessionId: plan.sessionId, resumed: true } };
  }

  const started = await startSessionForRoutineDay({ routineId: plan.routineId, dayId: plan.dayId });
  if (!started.ok || !started.data?.sessionId) {
    return { ok: false, error: started.ok ? REPEAT_WORKOUT_FAILED_MESSAGE : started.error };
  }
  return { ok: true, data: { sessionId: started.data.sessionId, resumed: false } };
}
