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
