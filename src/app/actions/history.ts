"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

type ActionResult = {
  ok: boolean;
  error?: string;
};

export async function updateLogMetaAction(payload: { logId: string; dayNameOverride: string; notes: string }): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const logId = payload.logId.trim();
  const dayNameOverride = payload.dayNameOverride.trim();
  const notes = payload.notes.trim();

  if (!logId) {
    return { ok: false, error: "Missing log id." };
  }

  const { error } = await supabase
    .from("sessions")
    .update({
      day_name_override: dayNameOverride || null,
      notes: notes || null,
    })
    .eq("id", logId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/history");
  revalidatePath(`/history/${logId}`);
  return { ok: true };
}

export async function updateLogExerciseNotesAction(payload: { logId: string; logExerciseId: string; notes: string }): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const logId = payload.logId.trim();
  const logExerciseId = payload.logExerciseId.trim();
  const notes = payload.notes.trim();

  if (!logId || !logExerciseId) {
    return { ok: false, error: "Missing log exercise details." };
  }

  const { error } = await supabase
    .from("session_exercises")
    .update({ notes: notes || null })
    .eq("id", logExerciseId)
    .eq("session_id", logId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/history");
  revalidatePath(`/history/${logId}`);
  return { ok: true };
}


async function ensureCompletedLogOwner(logId: string, userId: string) {
  const supabase = supabaseServer();
  const { data: session } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", logId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(session && session.status === "completed");
}

export async function addLogExerciseSetAction(payload: {
  logId: string;
  logExerciseId: string;
  weight: number;
  reps: number;
  durationSeconds: number | null;
  weightUnit: "lbs" | "kg";
}): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const logId = payload.logId.trim();
  const logExerciseId = payload.logExerciseId.trim();

  if (!logId || !logExerciseId) {
    return { ok: false, error: "Missing log set details." };
  }

  if (!Number.isFinite(payload.weight) || !Number.isFinite(payload.reps) || payload.weight < 0 || payload.reps < 0) {
    return { ok: false, error: "Weight and reps must be 0 or greater." };
  }

  if (payload.durationSeconds !== null && (!Number.isInteger(payload.durationSeconds) || payload.durationSeconds < 0)) {
    return { ok: false, error: "Time must be an integer in seconds." };
  }

  const canEdit = await ensureCompletedLogOwner(logId, user.id);
  if (!canEdit) {
    return { ok: false, error: "Log not found." };
  }

  const { data: latestSet } = await supabase
    .from("sets")
    .select("set_index")
    .eq("session_exercise_id", logExerciseId)
    .eq("user_id", user.id)
    .order("set_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSetIndex = latestSet ? latestSet.set_index + 1 : 0;

  const { error } = await supabase
    .from("sets")
    .insert({
      session_exercise_id: logExerciseId,
      user_id: user.id,
      set_index: nextSetIndex,
      weight: payload.weight,
      reps: payload.reps,
      duration_seconds: payload.durationSeconds,
      is_warmup: false,
      notes: null,
      rpe: null,
      weight_unit: payload.weightUnit,
    });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/history");
  revalidatePath(`/history/${logId}`);
  return { ok: true };
}

export async function updateLogExerciseSetAction(payload: {
  logId: string;
  logExerciseId: string;
  setId: string;
  weight: number;
  reps: number;
  durationSeconds: number | null;
  weightUnit: "lbs" | "kg";
}): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const logId = payload.logId.trim();
  const logExerciseId = payload.logExerciseId.trim();
  const setId = payload.setId.trim();

  if (!logId || !logExerciseId || !setId) {
    return { ok: false, error: "Missing set details." };
  }

  if (!Number.isFinite(payload.weight) || !Number.isFinite(payload.reps) || payload.weight < 0 || payload.reps < 0) {
    return { ok: false, error: "Weight and reps must be 0 or greater." };
  }

  if (payload.durationSeconds !== null && (!Number.isInteger(payload.durationSeconds) || payload.durationSeconds < 0)) {
    return { ok: false, error: "Time must be an integer in seconds." };
  }

  const canEdit = await ensureCompletedLogOwner(logId, user.id);
  if (!canEdit) {
    return { ok: false, error: "Log not found." };
  }

  const { error } = await supabase
    .from("sets")
    .update({
      weight: payload.weight,
      reps: payload.reps,
      duration_seconds: payload.durationSeconds,
      weight_unit: payload.weightUnit,
    })
    .eq("id", setId)
    .eq("session_exercise_id", logExerciseId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/history");
  revalidatePath(`/history/${logId}`);
  return { ok: true };
}

export async function deleteLogExerciseSetAction(payload: { logId: string; logExerciseId: string; setId: string }): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const logId = payload.logId.trim();
  const logExerciseId = payload.logExerciseId.trim();
  const setId = payload.setId.trim();

  if (!logId || !logExerciseId || !setId) {
    return { ok: false, error: "Missing set details." };
  }

  const canEdit = await ensureCompletedLogOwner(logId, user.id);
  if (!canEdit) {
    return { ok: false, error: "Log not found." };
  }

  const { error } = await supabase
    .from("sets")
    .delete()
    .eq("id", setId)
    .eq("session_exercise_id", logExerciseId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/history");
  revalidatePath(`/history/${logId}`);
  return { ok: true };
}
