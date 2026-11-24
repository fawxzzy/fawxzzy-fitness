// Read-only Supabase loaders and the run flow for "Repeat workout". Kept free of request-scoped runtime imports (auth,
// cookies) so tests can drive it with a fake client and fake ports; `repeat-workout-server.ts` wires the real ones.
import type { ActionResult } from "@/lib/action-result";
import {
  planRepeatWorkout,
  REPEAT_WORKOUT_FAILED_MESSAGE,
  REPEAT_WORKOUT_NOT_FOUND_MESSAGE,
  RepeatWorkoutLoadError,
  type RepeatWorkoutDeps,
} from "@/lib/repeat-workout";
import type { StartedSession } from "@/lib/session-start-activation";
import type { supabaseServer } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof supabaseServer>>;

export type RepeatWorkoutResult = { sessionId: string; resumed: boolean };

export type RepeatWorkoutPorts = {
  /** Resolves the signed-in user; a missing session throws Next's redirect error (answered as 401 JSON by the route). */
  requireUser(): Promise<{ id: string }>;
  getSupabase(): Promise<ServerSupabase>;
  startSessionForRoutineDay(payload: { routineId: string; dayId: string }): Promise<ActionResult<StartedSession>>;
};

/** A query that reports an error is a failure, never "nothing found". */
function orFail<T>(result: { data: T; error: unknown }): T {
  if (result.error) {
    throw new RepeatWorkoutLoadError();
  }
  return result.data;
}

/** Read-only loaders for `planRepeatWorkout`, every query scoped to the signed-in user. */
export function createRepeatWorkoutDeps(supabase: ServerSupabase, userId: string): RepeatWorkoutDeps {
  return {
    async loadSourceSession(sessionId) {
      const data = orFail(
        await supabase
          .from("sessions")
          .select("id, status, routine_id, routine_day_index")
          .eq("id", sessionId)
          .eq("user_id", userId)
          .maybeSingle(),
      );
      if (!data) return null;
      return {
        id: data.id,
        routine_id: data.routine_id,
        routine_day_index: data.routine_day_index,
        status: data.status === "completed" ? "completed" : "in_progress",
      };
    },

    async loadActiveRoutineId() {
      const data = orFail(await supabase.from("profiles").select("active_routine_id").eq("id", userId).maybeSingle());
      const id = typeof data?.active_routine_id === "string" ? data.active_routine_id.trim() : "";
      return id.length > 0 ? id : null;
    },

    async loadInProgressSessionId() {
      const data = orFail(
        await supabase
          .from("sessions")
          .select("id")
          .eq("user_id", userId)
          .eq("status", "in_progress")
          .order("performed_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      );
      return data?.id ?? null;
    },

    async routineExists(routineId) {
      const data = orFail(await supabase.from("routines").select("id").eq("id", routineId).eq("user_id", userId).maybeSingle());
      return Boolean(data?.id);
    },

    async loadLinkedDayIds(sessionId, routineId) {
      const sessionExercises = orFail(
        await supabase
          .from("session_exercises")
          .select("routine_day_exercise_id")
          .eq("session_id", sessionId)
          .eq("user_id", userId)
          .not("routine_day_exercise_id", "is", null),
      );
      const plannedIds = (sessionExercises ?? [])
        .map((row) => row.routine_day_exercise_id as string | null)
        .filter((id): id is string => Boolean(id));
      if (plannedIds.length === 0) return [];

      const planned = orFail(
        await supabase.from("routine_day_exercises").select("id, routine_day_id").in("id", plannedIds).eq("user_id", userId),
      );
      const dayIdByPlannedId = new Map((planned ?? []).map((row) => [row.id as string, row.routine_day_id as string]));
      const dayIds = plannedIds.map((id) => dayIdByPlannedId.get(id)).filter((id): id is string => Boolean(id));
      if (dayIds.length === 0) return [];

      // Keep only days that still belong to this routine.
      const days = orFail(
        await supabase
          .from("routine_days")
          .select("id")
          .in("id", Array.from(new Set(dayIds)))
          .eq("routine_id", routineId)
          .eq("user_id", userId),
      );
      const liveDayIds = new Set((days ?? []).map((row) => row.id as string));
      return dayIds.filter((id) => liveDayIds.has(id));
    },

    async loadDayById(routineId, dayId) {
      const data = orFail(
        await supabase
          .from("routine_days")
          .select("id, day_index")
          .eq("id", dayId)
          .eq("routine_id", routineId)
          .eq("user_id", userId)
          .maybeSingle(),
      );
      return data ? { id: data.id, day_index: data.day_index } : null;
    },

    async loadDayAtIndex(routineId, dayIndex) {
      const data = orFail(
        await supabase
          .from("routine_days")
          .select("id, day_index")
          .eq("routine_id", routineId)
          .eq("day_index", dayIndex)
          .eq("user_id", userId)
          .maybeSingle(),
      );
      return data ? { id: data.id, day_index: data.day_index } : null;
    },
  };
}

/**
 * Starts a NEW workout for the routine day a finished session came from, through the same start path Today uses
 * (`startSessionForRoutineDay`: the day's current exercises and goals, one atomic RPC, rest/invalid-day checks).
 * The finished session is only read. A workout already in progress is returned instead of starting a second one, and
 * so is a live session the start RPC itself reports as already existing (`resumed: true` either way, for the notice).
 */
export async function runRepeatWorkout(ports: RepeatWorkoutPorts, sessionId: string): Promise<ActionResult<RepeatWorkoutResult>> {
  const id = sessionId.trim();
  if (!id) {
    return { ok: false, error: REPEAT_WORKOUT_NOT_FOUND_MESSAGE };
  }

  const user = await ports.requireUser();
  const supabase = await ports.getSupabase();
  const plan = await planRepeatWorkout(createRepeatWorkoutDeps(supabase, user.id), id);

  if (plan.kind === "refuse") {
    return { ok: false, error: plan.message };
  }
  if (plan.kind === "open_existing") {
    return { ok: true, data: { sessionId: plan.sessionId, resumed: true } };
  }

  const started = await ports.startSessionForRoutineDay({ routineId: plan.routineId, dayId: plan.dayId });
  if (!started.ok || !started.data?.sessionId) {
    return { ok: false, error: started.ok ? REPEAT_WORKOUT_FAILED_MESSAGE : started.error };
  }
  return { ok: true, data: { sessionId: started.data.sessionId, resumed: started.data.existing === true } };
}
