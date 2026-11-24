import { supabaseServer } from "@/lib/supabase/server";
import { mapExerciseGoalPayloadToSessionColumns, parseExerciseGoalPayload } from "@/lib/exercise-goal-payload";
import { parseProgressionPlaybookPayload } from "@/lib/progression-playbooks";
import type { ActionResult } from "@/lib/action-result";
import { parseLiveSessionStatus } from "@/lib/session-live-mutation";
import { clampSessionDurationSeconds } from "@/lib/session-duration";
import { finalizeRunningExerciseTimer, parseExerciseTimerConfig as parseExerciseTimerConfigInput, type ExerciseTimerMode, type ExerciseTimerStatus } from "@/lib/exercise-timer";

export const SHOULD_DEBUG_CANONICAL_LINKING = process.env.NODE_ENV === "development";

export function createLiveSessionMutationRepository(supabase: Awaited<ReturnType<typeof supabaseServer>>) {
  return {
    async readSession(sessionId: string) {
      const { data } = await supabase
        .from("sessions")
        .select("id, user_id, status")
        .eq("id", sessionId)
        .maybeSingle();

      const status = parseLiveSessionStatus(data?.status);
      return data && status
        ? {
            id: data.id,
            userId: data.user_id,
            status,
          }
        : null;
    },
    async readSessionExercise(sessionExerciseId: string) {
      const { data } = await supabase
        .from("session_exercises")
        .select("id, session_id, user_id")
        .eq("id", sessionExerciseId)
        .maybeSingle();

      return data
        ? {
            id: data.id,
            sessionId: data.session_id,
            userId: data.user_id,
          }
        : null;
    },
  };
}

export async function ensurePerformedIndex(payload: {
  sessionId: string;
  sessionExerciseId: string;
  userId: string;
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
}): Promise<void> {
  const { sessionId, sessionExerciseId, userId, supabase } = payload;

  const { data: exerciseRow, error: sessionExerciseError } = await supabase
    .from("session_exercises")
    .select("id, performed_index")
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (sessionExerciseError || !exerciseRow || exerciseRow.performed_index !== null) {
    return;
  }

  const { data: latestPerformedExercise } = await supabase
    .from("session_exercises")
    .select("performed_index")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .not("performed_index", "is", null)
    .order("performed_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPerformedIndex = typeof latestPerformedExercise?.performed_index === "number"
    ? latestPerformedExercise.performed_index + 1
    : 0;

  await supabase
    .from("session_exercises")
    .update({ performed_index: nextPerformedIndex })
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .is("performed_index", null);
}

export function hasSelectedProgressionPlaybook(payload: Record<string, unknown>) {
  return typeof payload.progression_playbook_id === "string" && payload.progression_playbook_id.length > 0;
}

export function isMissingExerciseTimerColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("exercise_timer_") && (
    message.includes("does not exist")
    || message.includes("schema cache")
    || message.includes("could not find")
  );
}

export function isMissingSetLoggedAtColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return message.includes("logged_at") && (message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find"));
}

/**
 * Clamps the client-reported duration to (last logged set - session start) + idle cap so a session left open
 * for days cannot store a wall-clock gap. Best effort: any read problem keeps the reported value.
 */
export async function resolveClampedSessionDurationSeconds(args: {
  sessionId: string;
  userId: string;
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  reportedSeconds: number | null;
}): Promise<number | null> {
  if (args.reportedSeconds === null) {
    return null;
  }

  try {
    const [sessionResult, exercisesResult] = await Promise.all([
      args.supabase.from("sessions").select("performed_at").eq("id", args.sessionId).eq("user_id", args.userId).maybeSingle(),
      args.supabase.from("session_exercises").select("id").eq("session_id", args.sessionId).eq("user_id", args.userId),
    ]);
    const startedAtMs = sessionResult.data?.performed_at ? Date.parse(sessionResult.data.performed_at) : null;
    const exerciseIds = (exercisesResult.data ?? []).map((row) => row.id);
    if (sessionResult.error || exercisesResult.error || startedAtMs === null || exerciseIds.length === 0) {
      return args.reportedSeconds;
    }

    const lastSetResult = await args.supabase
      .from("sets")
      .select("logged_at")
      .in("session_exercise_id", exerciseIds)
      .eq("user_id", args.userId)
      .not("logged_at", "is", null)
      .order("logged_at", { ascending: false })
      .limit(1);
    const lastLoggedAt = lastSetResult.error ? null : (lastSetResult.data?.[0]?.logged_at ?? null);

    return clampSessionDurationSeconds({
      reportedSeconds: args.reportedSeconds,
      startedAtMs: Number.isFinite(startedAtMs) ? startedAtMs : null,
      lastLoggedAtMs: lastLoggedAt ? Date.parse(lastLoggedAt) : null,
    });
  } catch {
    return args.reportedSeconds;
  }
}

export async function finalizeRunningExerciseTimersForSession(args: {
  sessionId: string;
  userId: string;
  supabase: Awaited<ReturnType<typeof supabaseServer>>;
  nowIso: string;
}): Promise<ActionResult> {
  const result = await args.supabase
    .from("session_exercises")
    .select("id, exercise_timer_enabled, exercise_timer_mode, exercise_timer_target_seconds, exercise_timer_elapsed_seconds, exercise_timer_status, exercise_timer_started_at, exercise_timer_completed_at")
    .eq("session_id", args.sessionId)
    .eq("user_id", args.userId)
    .eq("exercise_timer_status", "running");

  if (result.error) {
    return isMissingExerciseTimerColumnError(result.error)
      ? { ok: true }
      : { ok: false, error: result.error.message };
  }

  for (const row of result.data ?? []) {
    const timer = finalizeRunningExerciseTimer({
      enabled: row.exercise_timer_enabled === true,
      mode: row.exercise_timer_mode as ExerciseTimerMode | null,
      targetSeconds: row.exercise_timer_target_seconds ?? null,
      elapsedSeconds: row.exercise_timer_elapsed_seconds ?? 0,
      status: row.exercise_timer_status as ExerciseTimerStatus,
      startedAt: row.exercise_timer_started_at ?? null,
      completedAt: row.exercise_timer_completed_at ?? null,
    }, args.nowIso);
    const update = await args.supabase
      .from("session_exercises")
      .update({
        exercise_timer_elapsed_seconds: timer.elapsedSeconds,
        exercise_timer_status: timer.status,
        exercise_timer_started_at: timer.startedAt,
        exercise_timer_completed_at: timer.completedAt,
      })
      .eq("id", row.id)
      .eq("session_id", args.sessionId)
      .eq("user_id", args.userId)
      .eq("exercise_timer_status", "running");
    if (update.error) {
      return { ok: false, error: update.error.message };
    }
  }

  return { ok: true };
}

export function parseExerciseTimerConfig(formData: FormData) {
  const enabled = String(formData.get("exerciseTimerEnabled") ?? "false") === "true";
  const parsed = parseExerciseTimerConfigInput({
    enabled,
    mode: formData.get("exerciseTimerMode"),
    targetSeconds: formData.get("exerciseTimerTargetSeconds"),
  });
  if (!parsed.ok) {
    return parsed;
  }
  if (!parsed.config) {
    return { ok: true as const, values: {} };
  }

  return {
    ok: true as const,
    values: {
      exercise_timer_enabled: true,
      exercise_timer_mode: parsed.config.mode,
      exercise_timer_target_seconds: parsed.config.targetSeconds,
      exercise_timer_elapsed_seconds: 0,
      exercise_timer_status: "idle" as const,
      exercise_timer_started_at: null,
      exercise_timer_completed_at: null,
    },
  };
}

export function parseSessionExercisePayload(formData: FormData) {
  const parsed = parseExerciseGoalPayload(formData, { requireSets: true });
  if (!parsed.ok) {
    return parsed;
  }

  const progression = parseProgressionPlaybookPayload(formData);
  if (!progression.ok) {
    return progression;
  }

  return {
    ok: true as const,
    payload: {
      ...mapExerciseGoalPayloadToSessionColumns(parsed.payload),
      progression_playbook_id: progression.playbookId,
      progression_playbook_config: progression.config,
    },
  };
}
