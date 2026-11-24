"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import { guardLiveSessionMutation } from "@/lib/session-live-mutation";
import { applyExerciseTimerCommand, type ExerciseTimerCommand, type ExerciseTimerMode, type ExerciseTimerSnapshot, type ExerciseTimerStatus } from "@/lib/exercise-timer";
import { createLiveSessionMutationRepository, isMissingExerciseTimerColumnError } from "./actions-shared";

export async function updateSessionExerciseTimerAction(payload: {
  sessionId: string;
  sessionExerciseId: string;
  command: ExerciseTimerCommand;
}): Promise<ActionResult<{ timer: ExerciseTimerSnapshot }>> {
  const user = await requireUser();
  const supabase = await supabaseServer();
  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId: payload.sessionId,
    sessionExerciseId: payload.sessionExerciseId,
  });
  if (!liveSession.ok) {
    return liveSession;
  }

  const { data, error } = await supabase
    .from("session_exercises")
    .select("exercise_timer_enabled, exercise_timer_mode, exercise_timer_target_seconds, exercise_timer_elapsed_seconds, exercise_timer_status, exercise_timer_started_at, exercise_timer_completed_at")
    .eq("id", payload.sessionExerciseId)
    .eq("session_id", payload.sessionId)
    .eq("user_id", user.id)
    .single();
  if (error || !data) {
    return { ok: false, error: isMissingExerciseTimerColumnError(error) ? "Exercise timer schema is pending migration review." : (error?.message ?? "Exercise timer not found.") };
  }

  const shouldEnableTimer = payload.command === "enable";
  const shouldDisableTimer = payload.command === "disable";
  const timer = applyExerciseTimerCommand({
    enabled: shouldEnableTimer || shouldDisableTimer || data.exercise_timer_enabled === true,
    mode: (data.exercise_timer_mode as ExerciseTimerMode | null) ?? "count_up",
    targetSeconds: data.exercise_timer_target_seconds ?? null,
    elapsedSeconds: data.exercise_timer_elapsed_seconds ?? 0,
    status: data.exercise_timer_status as ExerciseTimerStatus,
    startedAt: data.exercise_timer_started_at ?? null,
    completedAt: data.exercise_timer_completed_at ?? null,
  }, shouldEnableTimer ? "start" : (shouldDisableTimer ? "pause" : payload.command), new Date().toISOString());
  const persistedTimer = shouldDisableTimer ? { ...timer, enabled: false } : timer;

  const { error: updateError } = await supabase
    .from("session_exercises")
    .update({
      exercise_timer_enabled: persistedTimer.enabled,
      exercise_timer_mode: persistedTimer.mode,
      exercise_timer_target_seconds: persistedTimer.targetSeconds,
      exercise_timer_elapsed_seconds: persistedTimer.elapsedSeconds,
      exercise_timer_status: persistedTimer.status,
      exercise_timer_started_at: persistedTimer.startedAt,
      exercise_timer_completed_at: persistedTimer.completedAt,
    })
    .eq("id", payload.sessionExerciseId)
    .eq("session_id", payload.sessionId)
    .eq("user_id", user.id);
  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  revalidatePath(`/session/${payload.sessionId}`);
  return { ok: true, data: { timer: persistedTimer } };
}
