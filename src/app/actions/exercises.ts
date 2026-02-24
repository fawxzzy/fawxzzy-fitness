"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { validateExerciseEquipment, validateExerciseName } from "@/lib/exercises";
import type { ActionResult } from "@/lib/action-result";
import { supabaseServer } from "@/lib/supabase/server";

function redirectWithMessage(returnTo: string, key: "error" | "success", message: string, exerciseId?: string) {
  const params = new URLSearchParams();
  params.set(key, message);

  if (exerciseId) {
    params.set("exerciseId", exerciseId);
  }

  redirect(`${returnTo}?${params.toString()}`);
}

export async function createCustomExerciseAction(formData: FormData) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const name = validateExerciseName(String(formData.get("name") ?? ""));
  const primaryMuscle = String(formData.get("primaryMuscle") ?? "").trim() || null;
  const equipment = validateExerciseEquipment(String(formData.get("equipment") ?? ""));

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name,
      user_id: user.id,
      is_global: false,
      primary_muscle: primaryMuscle,
      equipment,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (returnTo) {
      redirectWithMessage(returnTo, "error", error?.message ?? "Could not create exercise");
    }
    throw new Error(error?.message ?? "Could not create exercise");
  }

  revalidateTag(`exercises:${user.id}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirectWithMessage(returnTo, "success", "Custom exercise added.", data.id);
  }

}

export async function renameCustomExerciseAction(formData: FormData) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const exerciseId = String(formData.get("exerciseId") ?? "").trim();
  const name = validateExerciseName(String(formData.get("name") ?? ""));

  const { error } = await supabase
    .from("exercises")
    .update({ name })
    .eq("id", exerciseId)
    .eq("user_id", user.id)
    .eq("is_global", false);

  if (error) {
    if (returnTo) redirectWithMessage(returnTo, "error", error.message);
    throw new Error(error.message);
  }

  revalidateTag(`exercises:${user.id}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirectWithMessage(returnTo, "success", "Custom exercise renamed.", exerciseId);
  }
}



export async function getExerciseDetailsAction(payload: { exerciseId: string }): Promise<ActionResult<{
  id: string;
  name: string;
  how_to_short: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  movement_pattern: string | null;
  equipment: string | null;
  image_howto_path: string | null;
  image_muscles_path: string | null;
}>> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const exerciseId = payload.exerciseId.trim();

  if (!exerciseId) {
    return { ok: false, error: "Missing exercise id." };
  }

  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, how_to_short, primary_muscles, secondary_muscles, movement_pattern, equipment, image_howto_path, image_muscles_path")
    .eq("id", exerciseId)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "Exercise not found." };
  }

  return {
    ok: true,
    data: {
      id: data.id,
      name: data.name,
      how_to_short: data.how_to_short,
      primary_muscles: data.primary_muscles ?? [],
      secondary_muscles: data.secondary_muscles ?? [],
      movement_pattern: data.movement_pattern,
      equipment: data.equipment,
      image_howto_path: data.image_howto_path,
      image_muscles_path: data.image_muscles_path,
    },
  };
}
export async function deleteCustomExerciseAction(formData: FormData) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const returnTo = String(formData.get("returnTo") ?? "").trim();
  const exerciseId = String(formData.get("exerciseId") ?? "").trim();

  const [{ count: routineCount }, { count: sessionCount }] = await Promise.all([
    supabase.from("routine_day_exercises").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("exercise_id", exerciseId),
    supabase.from("session_exercises").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("exercise_id", exerciseId),
  ]);

  if ((routineCount ?? 0) > 0 || (sessionCount ?? 0) > 0) {
    if (returnTo) redirectWithMessage(returnTo, "error", "Can't delete: used in routines or session history.");
    throw new Error("Can't delete: used in routines or session history.");
  }

  const { error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", exerciseId)
    .eq("user_id", user.id)
    .eq("is_global", false);

  if (error) {
    if (returnTo) redirectWithMessage(returnTo, "error", error.message);
    throw new Error(error.message);
  }

  revalidateTag(`exercises:${user.id}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirectWithMessage(returnTo, "success", "Custom exercise deleted.");
  }
}
