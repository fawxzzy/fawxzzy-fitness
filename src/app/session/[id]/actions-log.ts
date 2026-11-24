"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { getExerciseIdsForSession } from "@/lib/exercise-stats";
import { supabaseServer } from "@/lib/supabase/server";
import { getRoutineEditPath, revalidateHistoryViews, revalidateRoutinesViews, revalidateSessionViews } from "@/lib/revalidation";
import { parseProgressionPlaybookPayload } from "@/lib/progression-playbooks";
import {
  getSchemaMismatchMessage,
  isMissingProgressionPlaybookColumnError,
  isMissingSessionCopilotFeedbackEffortColumnError,
  omitProgressionPlaybookColumns,
} from "@/lib/progression-schema-compat";
import {
  buildSessionCopilotFeedbackUpdate,
  type SessionCopilotFeedbackSignal,
} from "@/lib/session-copilot-feedback";
import type { ActionResult } from "@/lib/action-result";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { TablesInsert } from "@/lib/supabase/database.types";
import type { SetRow } from "@/types/db";
import { decideSessionExerciseRemoval, guardLiveSessionMutation } from "@/lib/session-live-mutation";
import { processSessionFollowUpJobs } from "@/lib/session-follow-up-jobs";
import { SKIP_TOGGLE_PERSISTENCE_ERROR } from "@/lib/offline/skip-toggle-reconciliation";
import { resolveSetLoggedAt } from "@/lib/set-logged-at";
import { SHOULD_DEBUG_CANONICAL_LINKING, createLiveSessionMutationRepository, ensurePerformedIndex, hasSelectedProgressionPlaybook, isMissingSetLoggedAtColumnError, resolveClampedSessionDurationSeconds, finalizeRunningExerciseTimersForSession } from "./actions-shared";

export async function addSetAction(payload: {
  sessionId: string;
  sessionExerciseId: string;
  weight: number;
  reps: number;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: FitnessDistanceUnit | null;
  calories: number | null;
  isWarmup: boolean;
  notes: string | null;
  weightUnit: "lbs" | "kg";
  clientLogId?: string;
  /** When the member logged the set, for a set replayed from the offline queue. Validated; see resolveSetLoggedAt. */
  loggedAt?: string;
}) : Promise<ActionResult<{ set: SetRow }>> {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const { sessionId, sessionExerciseId, weight, reps, durationSeconds, distance, distanceUnit, calories, isWarmup, notes, weightUnit, clientLogId } = payload;

  if (!sessionId || !sessionExerciseId) {
    return { ok: false, error: "Missing session info" };
  }

  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight < 0 || reps < 0) {
    return { ok: false, error: "Weight and reps must be 0 or greater" };
  }

  if (weightUnit !== "lbs" && weightUnit !== "kg") {
    return { ok: false, error: "Weight unit must be lbs or kg" };
  }

  if (durationSeconds !== null && (!Number.isInteger(durationSeconds) || durationSeconds < 0)) {
    return { ok: false, error: "Time must be an integer in seconds" };
  }

  if (distance !== null && (!Number.isFinite(distance) || distance < 0)) {
    return { ok: false, error: "Distance must be 0 or greater" };
  }

  if (distanceUnit !== null && distanceUnit !== "mi" && distanceUnit !== "km" && distanceUnit !== "m") {
    return { ok: false, error: "Distance unit must be mi, km, or m" };
  }

  if (calories !== null && (!Number.isFinite(calories) || calories < 0)) {
    return { ok: false, error: "Calories must be 0 or greater" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
    sessionExerciseId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  if (clientLogId) {
    const { data: existingByClientLogId, error: existingByClientLogIdError } = await supabase
      .from("sets")
      .select("id, client_log_id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
      .eq("session_exercise_id", sessionExerciseId)
      .eq("user_id", user.id)
      .eq("client_log_id", clientLogId)
      .limit(1)
      .maybeSingle();

    if (!existingByClientLogIdError && existingByClientLogId) {
      await ensurePerformedIndex({
        sessionId,
        sessionExerciseId,
        userId: user.id,
        supabase,
      });
      return { ok: true, data: { set: existingByClientLogId as SetRow } };
    }
  }

  // Append semantics are based on MAX(set_index) + 1 instead of count-based indexing.
  // A unique DB constraint plus retry-on-conflict prevents duplicate indexes when offline
  // actions reconnect and flush concurrently for the same session exercise.
  const MAX_SET_INDEX_RETRIES = 5;
  // Stamp with the member's tap time when an offline replay supplies a plausible one, so observed rest
  // (src/lib/recovery-timing.ts) is not erased by a whole queue landing within milliseconds.
  const loggedAt = resolveSetLoggedAt(payload.loggedAt, new Date().toISOString());

  for (let attempt = 0; attempt < MAX_SET_INDEX_RETRIES; attempt += 1) {
    const { data: latestSet, error: latestSetError } = await supabase
      .from("sets")
      .select("set_index")
      .eq("session_exercise_id", sessionExerciseId)
      .eq("user_id", user.id)
      .order("set_index", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestSetError) {
      return { ok: false, error: latestSetError.message };
    }

    const nextSetIndex = latestSet ? latestSet.set_index + 1 : 0;

    const insertPayload: TablesInsert<{ schema: "fitness" }, "sets"> = {
      session_exercise_id: sessionExerciseId,
      user_id: user.id,
      set_index: nextSetIndex,
      weight,
      reps,
      duration_seconds: durationSeconds,
      distance,
      distance_unit: distanceUnit,
      calories,
      is_warmup: isWarmup,
      rpe: null,
      notes,
      weight_unit: weightUnit,
      logged_at: loggedAt,
    };

    if (clientLogId) {
      insertPayload.client_log_id = clientLogId;
    }

    let insertResult = await supabase
      .from("sets")
      .insert(insertPayload)
      .select("id, client_log_id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
      .single();
    if (insertResult.error && isMissingSetLoggedAtColumnError(insertResult.error)) {
      delete insertPayload.logged_at;
      insertResult = await supabase
        .from("sets")
        .insert(insertPayload)
        .select("id, client_log_id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
        .single();
    }
    const insertedSet = insertResult.data;
    const error = insertResult.error;

    if (!error && insertedSet) {
      if (SHOULD_DEBUG_CANONICAL_LINKING) {
        console.log("[session-linking] inserted-set", {
          setId: insertedSet.id,
          sessionExerciseId,
          reps: insertedSet.reps,
          weight: insertedSet.weight,
        });
      }
      await ensurePerformedIndex({
        sessionId,
        sessionExerciseId,
        userId: user.id,
        supabase,
      });
      return { ok: true, data: { set: { ...insertedSet, logged_at: loggedAt } as SetRow } };
    }

    if (error?.code !== "23505") {
      return { ok: false, error: error?.message ?? "Could not log set" };
    }
  }

  return { ok: false, error: "Could not log set after retrying index allocation" };
}

export async function syncQueuedSetLogsAction(payload: {
  items: Array<{
    id: string;
    clientLogId: string;
    sessionId: string;
    sessionExerciseId: string;
    /** Queue item creation time (the member's tap), an ISO string. */
    createdAt?: string;
    payload: {
      weight: number;
      reps: number;
      durationSeconds: number | null;
      distance: number | null;
      distanceUnit: FitnessDistanceUnit | null;
      calories: number | null;
      isWarmup: boolean;
      notes: string | null;
      weightUnit: "lbs" | "kg";
    };
  }>;
}) : Promise<ActionResult<{ results: Array<{ queueItemId: string; ok: boolean; serverSetId?: string; error?: string }> }>> {
  const results = await Promise.all(
    payload.items.map(async (item) => {
      const insertResult = await addSetAction({
        sessionId: item.sessionId,
        sessionExerciseId: item.sessionExerciseId,
        weight: item.payload.weight,
        reps: item.payload.reps,
        durationSeconds: item.payload.durationSeconds,
        distance: item.payload.distance,
        distanceUnit: item.payload.distanceUnit,
        calories: item.payload.calories,
        isWarmup: item.payload.isWarmup,
        notes: item.payload.notes,
        weightUnit: item.payload.weightUnit,
        clientLogId: item.clientLogId,
        loggedAt: item.createdAt,
      });

      return {
        queueItemId: item.id,
        ok: insertResult.ok,
        serverSetId: insertResult.ok ? insertResult.data?.set.id : undefined,
        error: insertResult.ok ? undefined : insertResult.error,
      };
    }),
  );

  return { ok: true, data: { results } };
}

export async function deleteSetAction(payload: {
  sessionId: string;
  sessionExerciseId: string;
  setId: string;
}): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const sessionId = payload.sessionId.trim();
  const sessionExerciseId = payload.sessionExerciseId.trim();
  const setId = payload.setId.trim();

  if (!sessionId || !sessionExerciseId || !setId) {
    return { ok: false, error: "Missing set details" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
    sessionExerciseId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const { data: deletedSet, error } = await supabase
    .from("sets")
    .delete()
    .select("id")
    .eq("id", setId)
    .eq("session_exercise_id", sessionExerciseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!deletedSet) {
    return { ok: false, error: "Set not found." };
  }

  return { ok: true };
}

export async function toggleSkipAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const sessionExerciseId = String(formData.get("sessionExerciseId") ?? "");
  const nextSkipped = formData.get("nextSkipped") === "true";

  if (!sessionId || !sessionExerciseId) {
    return { ok: false, error: "Missing skip info" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
    sessionExerciseId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const { error } = await supabase
    .from("session_exercises")
    .update({ is_skipped: nextSkipped })
    .eq("id", sessionExerciseId)
    .eq("user_id", user.id)
    .eq("session_id", sessionId);

  if (error) {
    return { ok: false, error: SKIP_TOGGLE_PERSISTENCE_ERROR };
  }

  return { ok: true };
}

export async function updateSessionExerciseCopilotFeedbackAction(payload: {
  sessionId: string;
  sessionExerciseId: string;
  signal: SessionCopilotFeedbackSignal | null;
  note: string | null;
  effort: number | null;
}): Promise<ActionResult<{ signal: SessionCopilotFeedbackSignal | null; note: string | null; effort: number | null; updatedAt: string | null }>> {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const sessionId = String(payload.sessionId ?? "").trim();
  const sessionExerciseId = String(payload.sessionExerciseId ?? "").trim();
  const { signal, note, effort, updatedAt } = buildSessionCopilotFeedbackUpdate(payload);

  if (!sessionId || !sessionExerciseId) {
    return { ok: false, error: "Missing copilot feedback info" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
    sessionExerciseId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const payloadWithEffort = {
    copilot_feedback_signal: signal,
    copilot_feedback_note: note,
    copilot_feedback_effort: effort,
    copilot_feedback_updated_at: updatedAt,
  };
  const payloadLegacy = {
    copilot_feedback_signal: signal,
    copilot_feedback_note: note,
    copilot_feedback_updated_at: updatedAt,
  };

  let { error } = await supabase
    .from("session_exercises")
    .update(payloadWithEffort)
    .eq("id", sessionExerciseId)
    .eq("user_id", user.id)
    .eq("session_id", sessionId);

  const effortPersisted = !error;
  if (error && isMissingSessionCopilotFeedbackEffortColumnError(error)) {
    ({ error } = await supabase
      .from("session_exercises")
      .update(payloadLegacy)
      .eq("id", sessionExerciseId)
      .eq("user_id", user.id)
      .eq("session_id", sessionId));
  }

  if (error) {
    return { ok: false, error: error.message };
  }

  // Avoid refreshing the active session while its inline feedback controls are saving.
  revalidateHistoryViews();

  return {
    ok: true,
    data: {
      signal,
      note,
      effort: effortPersisted ? effort : null,
      updatedAt,
    },
  };
}

export async function removeExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const sessionExerciseId = String(formData.get("sessionExerciseId") ?? "");

  if (!sessionId || !sessionExerciseId) {
    return { ok: false, error: "Missing remove info" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
    sessionExerciseId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  // Sets cascade with the row: never remove an exercise that has a logged set, whatever the client believed.
  const { count: loggedSetCount, error: setCountError } = await supabase
    .from("sets")
    .select("id", { count: "exact", head: true })
    .eq("session_exercise_id", sessionExerciseId);
  const removal = decideSessionExerciseRemoval(setCountError ? null : (loggedSetCount ?? 0));
  if (!removal.ok) {
    return removal;
  }

  const { error } = await supabase
    .from("session_exercises")
    .delete()
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function discardSessionAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "").trim();

  if (!sessionId) {
    return { ok: false, error: "Missing session info" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const { data: sessionExerciseRows, error: sessionExerciseReadError } = await supabase
    .from("session_exercises")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (sessionExerciseReadError) {
    return { ok: false, error: sessionExerciseReadError.message };
  }

  const sessionExerciseIds = (sessionExerciseRows ?? []).map((row) => row.id);

  if (sessionExerciseIds.length > 0) {
    const { error: setDeleteError } = await supabase
      .from("sets")
      .delete()
      .eq("user_id", user.id)
      .in("session_exercise_id", sessionExerciseIds);

    if (setDeleteError) {
      return { ok: false, error: setDeleteError.message };
    }

    const { error: sessionExerciseDeleteError } = await supabase
      .from("session_exercises")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", user.id);

    if (sessionExerciseDeleteError) {
      return { ok: false, error: sessionExerciseDeleteError.message };
    }
  }

  const { error: sessionDeleteError } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (sessionDeleteError) {
    return { ok: false, error: sessionDeleteError.message };
  }

  revalidatePath("/today");
  revalidateSessionViews(sessionId);
  return { ok: true };
}

export async function updateSessionExerciseProgressionAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "").trim();
  const sessionExerciseId = String(formData.get("sessionExerciseId") ?? "").trim();
  const exerciseRowId = String(formData.get("exerciseRowId") ?? "").trim();

  if (!sessionId || !sessionExerciseId || !exerciseRowId) {
    return { ok: false, error: "Missing progression info" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
    sessionExerciseId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const progression = parseProgressionPlaybookPayload(formData);
  if (!progression.ok) {
    return { ok: false, error: progression.error };
  }

  const payload = {
    progression_playbook_id: progression.playbookId,
    progression_playbook_config: progression.config,
  };
  const { data: sessionExerciseRow, error: sessionExerciseReadError } = await supabase
    .from("session_exercises")
    .select("routine_day_exercise_id")
    .eq("id", sessionExerciseId)
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sessionExerciseReadError || !sessionExerciseRow || sessionExerciseRow.routine_day_exercise_id !== exerciseRowId) {
    return { ok: false, error: sessionExerciseReadError?.message ?? "Routine progression row not found" };
  }

  let { error } = await supabase
    .from("routine_day_exercises")
    .update(payload)
    .eq("id", exerciseRowId)
    .eq("user_id", user.id);

  if (error && isMissingProgressionPlaybookColumnError(error) && !hasSelectedProgressionPlaybook(payload)) {
    const fallback = await supabase
      .from("routine_day_exercises")
      .update(omitProgressionPlaybookColumns(payload))
      .eq("id", exerciseRowId)
      .eq("user_id", user.id);
    error = fallback.error;
  }

  if (error && isMissingProgressionPlaybookColumnError(error) && hasSelectedProgressionPlaybook(payload)) {
    return {
      ok: false,
      error: getSchemaMismatchMessage(error, {
        operation: "update session exercise progression",
        progressionMigration: "045",
      }) ?? "Progression schema is missing. Apply migration 045.",
    };
  }

  if (error) {
    return { ok: false, error: error.message };
  }

  const { data: routineDayExerciseRow } = await supabase
    .from("routine_day_exercises")
    .select("routine_day_id")
    .eq("id", exerciseRowId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: routineDayRow } = routineDayExerciseRow?.routine_day_id
    ? await supabase
        .from("routine_days")
        .select("routine_id")
        .eq("id", routineDayExerciseRow.routine_day_id)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  revalidateRoutinesViews();
  if (routineDayRow?.routine_id) {
    revalidatePath(getRoutineEditPath(routineDayRow.routine_id));
  }

  return { ok: true };
}

export async function saveSessionAction(formData: FormData): Promise<ActionResult<{ sessionId: string }>> {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const durationValue = String(formData.get("durationSeconds") ?? "").trim();
  const reportedDurationSeconds = durationValue ? Number(durationValue) : null;

  if (!sessionId) {
    return { ok: false, error: "Missing session info" };
  }

  if (reportedDurationSeconds !== null && (!Number.isInteger(reportedDurationSeconds) || reportedDurationSeconds < 0)) {
    return { ok: false, error: "Session time must be an integer in seconds" };
  }

  const liveSession = await guardLiveSessionMutation(createLiveSessionMutationRepository(supabase), {
    userId: user.id,
    sessionId,
  });

  if (!liveSession.ok) {
    return liveSession;
  }

  const timerFinalization = await finalizeRunningExerciseTimersForSession({
    sessionId,
    userId: user.id,
    supabase,
    nowIso: new Date().toISOString(),
  });
  if (!timerFinalization.ok) {
    return timerFinalization;
  }

  const durationSeconds = await resolveClampedSessionDurationSeconds({
    sessionId,
    userId: user.id,
    supabase,
    reportedSeconds: reportedDurationSeconds,
  });

  const { error } = await supabase
    .from("sessions")
    .update({ duration_seconds: durationSeconds, status: "completed" })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  const affectedExerciseIds = await getExerciseIdsForSession(user.id, sessionId);

  try {
    const followUp = await processSessionFollowUpJobs({
      sessionId,
      userId: user.id,
      durationSeconds,
      affectedExerciseIds,
    });

    if (followUp.hadFailures) {
      console.error("[session-follow-up] derived work failed after raw session save", {
        sessionId,
        userId: user.id,
        results: followUp.results,
      });
    }
  } catch (error) {
    console.error("[session-follow-up] unable to process derived work", {
      sessionId,
      userId: user.id,
      error: error instanceof Error ? error.message : "Unknown follow-up error",
    });
  }

  revalidatePath("/today");
  revalidateHistoryViews();
  revalidateRoutinesViews();
  return { ok: true, data: { sessionId } };
}
