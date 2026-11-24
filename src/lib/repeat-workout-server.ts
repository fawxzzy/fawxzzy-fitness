import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/auth";
import { runRepeatWorkout, type RepeatWorkoutResult } from "@/lib/repeat-workout-loaders";
import { startSessionForRoutineDay } from "@/lib/start-session";
import { supabaseServer } from "@/lib/supabase/server";

export type { RepeatWorkoutResult };

/** Wires `runRepeatWorkout` to the real auth, Supabase client and Today's start path. */
export async function repeatWorkoutFromSession(sessionId: string): Promise<ActionResult<RepeatWorkoutResult>> {
  return runRepeatWorkout(
    {
      requireUser,
      getSupabase: supabaseServer,
      startSessionForRoutineDay,
    },
    sessionId,
  );
}
