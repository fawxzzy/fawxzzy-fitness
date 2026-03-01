"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { recomputeExerciseStatsForSession } from "@/lib/exercise-stats";
import { supabaseServer } from "@/lib/supabase/server";
import { revalidateHistoryViews, revalidateSessionViews } from "@/lib/revalidation";
import { mapExerciseGoalPayloadToSessionColumns, parseExerciseGoalPayload } from "@/lib/exercise-goal-payload";
import type { ActionResult } from "@/lib/action-result";
import type { SetRow } from "@/types/db";

async function ensurePerformedIndex(payload: {
  sessionId: string;
  sessionExerciseId: string;
  userId: string;
  supabase: ReturnType<typeof supabaseServer>;
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

export async function addSetAction(payload: {
  sessionId: string;
  sessionExerciseId: string;
  weight: number;
  reps: number;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: "mi" | "km" | "m" | null;
  calories: number | null;
  isWarmup: boolean;
  rpe: number | null;
  notes: string | null;
  weightUnit: "lbs" | "kg";
  clientLogId?: string;
}) : Promise<ActionResult<{ set: SetRow }>> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { sessionId, sessionExerciseId, weight, reps, durationSeconds, distance, distanceUnit, calories, isWarmup, rpe, notes, weightUnit, clientLogId } = payload;

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

  if (clientLogId) {
    const { data: existingByClientLogId, error: existingByClientLogIdError } = await supabase
      .from("sets")
      .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
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

    const insertPayload = {
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
      rpe,
      notes,
      weight_unit: weightUnit,
    } as Record<string, unknown>;

    if (clientLogId) {
      insertPayload.client_log_id = clientLogId;
    }

    const { data: insertedSet, error } = await supabase
      .from("sets")
      .insert(insertPayload)
      .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
      .single();

    if (!error && insertedSet) {
      await ensurePerformedIndex({
        sessionId,
        sessionExerciseId,
        userId: user.id,
        supabase,
      });
      return { ok: true, data: { set: insertedSet as SetRow } };
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
    payload: {
      weight: number;
      reps: number;
      durationSeconds: number | null;
      distance: number | null;
      distanceUnit: "mi" | "km" | "m" | null;
      calories: number | null;
      isWarmup: boolean;
      rpe: number | null;
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
        rpe: item.payload.rpe,
        notes: item.payload.notes,
        weightUnit: item.payload.weightUnit,
        clientLogId: item.clientLogId,
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
  const supabase = supabaseServer();

  const sessionId = payload.sessionId.trim();
  const sessionExerciseId = payload.sessionExerciseId.trim();
  const setId = payload.setId.trim();

  if (!sessionId || !sessionExerciseId || !setId) {
    return { ok: false, error: "Missing set details" };
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session || session.status !== "in_progress") {
    return { ok: false, error: "Can only remove sets from an active session" };
  }

  const { error } = await supabase
    .from("sets")
    .delete()
    .eq("id", setId)
    .eq("session_exercise_id", sessionExerciseId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function toggleSkipAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const sessionExerciseId = String(formData.get("sessionExerciseId") ?? "");
  const nextSkipped = formData.get("nextSkipped") === "true";

  if (!sessionId || !sessionExerciseId) {
    return { ok: false, error: "Missing skip info" };
  }

  const { error } = await supabase
    .from("session_exercises")
    .update({ is_skipped: nextSkipped })
    .eq("id", sessionExerciseId)
    .eq("user_id", user.id)
    .eq("session_id", sessionId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateSessionViews(sessionId);
  return { ok: true };
}

export async function addExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const exerciseId = String(formData.get("exerciseId") ?? "");

  if (!sessionId || !exerciseId) {
    return { ok: false, error: "Missing exercise info" };
  }

  const { count } = await supabase
    .from("session_exercises")
    .select("id", { head: true, count: "exact" })
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  const parsedGoals = parseExerciseGoalPayload(formData, { requireSets: false });
  if (!parsedGoals.ok) {
    return { ok: false, error: parsedGoals.error };
  }

  const { data: exerciseDefaults } = await supabase
    .from("exercises")
    .select("measurement_type, default_unit")
    .eq("id", exerciseId)
    .maybeSingle();

  const fallbackMeasurementType = exerciseDefaults?.measurement_type === "time"
    || exerciseDefaults?.measurement_type === "distance"
    || exerciseDefaults?.measurement_type === "time_distance"
    || exerciseDefaults?.measurement_type === "reps"
    ? exerciseDefaults.measurement_type
    : "reps";
  const fallbackDefaultUnit = exerciseDefaults?.default_unit === "mi"
    || exerciseDefaults?.default_unit === "km"
    || exerciseDefaults?.default_unit === "m"
    ? exerciseDefaults.default_unit
    : "mi";

  const mappedGoalColumns = mapExerciseGoalPayloadToSessionColumns(parsedGoals.payload);

  const { error } = await supabase.from("session_exercises").insert({
    session_id: sessionId,
    user_id: user.id,
    exercise_id: exerciseId,
    position: count ?? 0,
    is_skipped: false,
    ...mappedGoalColumns,
    measurement_type: mappedGoalColumns.measurement_type ?? fallbackMeasurementType,
    default_unit: mappedGoalColumns.default_unit ?? fallbackDefaultUnit,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateSessionViews(sessionId);
  return { ok: true };
}

export async function removeExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const sessionExerciseId = String(formData.get("sessionExerciseId") ?? "");

  if (!sessionId || !sessionExerciseId) {
    return { ok: false, error: "Missing remove info" };
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

  revalidateSessionViews(sessionId);
  return { ok: true };
}

export async function saveSessionAction(formData: FormData): Promise<ActionResult<{ sessionId: string }>> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const sessionId = String(formData.get("sessionId") ?? "");
  const durationValue = String(formData.get("durationSeconds") ?? "").trim();
  const durationSeconds = durationValue ? Number(durationValue) : null;

  if (!sessionId) {
    return { ok: false, error: "Missing session info" };
  }

  if (durationSeconds !== null && (!Number.isInteger(durationSeconds) || durationSeconds < 0)) {
    return { ok: false, error: "Session time must be an integer in seconds" };
  }

  const { error } = await supabase
    .from("sessions")
    .update({ duration_seconds: durationSeconds, status: "completed" })
    .eq("id", sessionId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  await recomputeExerciseStatsForSession(user.id, sessionId);

  revalidatePath("/today");
  revalidateHistoryViews();
  return { ok: true, data: { sessionId } };
}
