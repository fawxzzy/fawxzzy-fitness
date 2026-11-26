"use server";

// Next 16: single-argument revalidateTag is gone; updateTag is the Server Action form that expires the
// tag immediately (same read-your-own-write behaviour the one-argument call had on Next 15).
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { validateExerciseEquipment, validateExerciseName } from "@/lib/exercises";
import { isSafeAppPath } from "@/lib/navigation-return";
import { supabaseServer } from "@/lib/supabase/server";
import { appendQueryParams } from "@/lib/custom-exercise-return";
import { toPlainActionError } from "@/app/routines/routine-copy";

const CREATE_FAILED_MESSAGE = "Could not add the exercise. Try again.";
const RENAME_FAILED_MESSAGE = "Could not rename the exercise. Try again.";
const DELETE_FAILED_MESSAGE = "Could not delete the exercise. Try again.";
const DELETE_IN_USE_MESSAGE = "Can't delete: used in routines or session history.";

function readSafeReturnTo(formData: FormData) {
  const raw = String(formData.get("returnTo") ?? "").trim();
  return isSafeAppPath(raw) ? raw : "";
}

function redirectWithMessage(returnTo: string, key: "error" | "success", message: string, exerciseId?: string) {
  const params = new URLSearchParams();
  params.set(key, message);

  if (exerciseId) {
    params.set("exerciseId", exerciseId);
  }

  redirect(appendQueryParams(returnTo, params));
}

export async function createCustomExerciseAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const returnTo = readSafeReturnTo(formData);
  const rawName = String(formData.get("name") ?? "");
  const primaryMuscle = String(formData.get("primaryMuscle") ?? "").trim() || null;
  const secondaryMuscle = String(formData.get("secondaryMuscle") ?? "").trim() || null;
  const rawEquipment = String(formData.get("equipment") ?? "");

  let name: string;
  let equipment: string | null;

  try {
    name = validateExerciseName(rawName);
    equipment = validateExerciseEquipment(rawEquipment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create exercise";
    if (returnTo) {
      redirectWithMessage(returnTo, "error", message);
    }
    throw error;
  }

  const { data, error } = await supabase
    .from("exercises")
    .insert({
      name,
      user_id: user.id,
      is_global: false,
      primary_muscle: primaryMuscle,
      primary_muscles: primaryMuscle ? [primaryMuscle] : null,
      secondary_muscles: secondaryMuscle ? [secondaryMuscle] : null,
      equipment,
    })
    .select("id")
    .single();

  if (error || !data) {
    // Database messages are logged server-side and never shown (toPlainActionError).
    const message = toPlainActionError(error, CREATE_FAILED_MESSAGE);
    if (returnTo) {
      redirectWithMessage(returnTo, "error", message);
    }
    throw new Error(message);
  }

  updateTag(`exercises:${user.id}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirectWithMessage(returnTo, "success", "Custom exercise added.", data.id);
  }

}

export async function renameCustomExerciseAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const returnTo = readSafeReturnTo(formData);
  const exerciseId = String(formData.get("exerciseId") ?? "").trim();
  let name: string;
  try {
    name = validateExerciseName(String(formData.get("name") ?? ""));
  } catch (validationError) {
    const message = validationError instanceof Error ? validationError.message : RENAME_FAILED_MESSAGE;
    if (returnTo) redirectWithMessage(returnTo, "error", message);
    throw validationError;
  }

  const { error } = await supabase
    .from("exercises")
    .update({ name })
    .eq("id", exerciseId)
    .eq("user_id", user.id)
    .eq("is_global", false);

  if (error) {
    const message = toPlainActionError(error, RENAME_FAILED_MESSAGE);
    if (returnTo) redirectWithMessage(returnTo, "error", message);
    throw new Error(message);
  }

  updateTag(`exercises:${user.id}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirectWithMessage(returnTo, "success", "Custom exercise renamed.", exerciseId);
  }
}
export async function deleteCustomExerciseAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const returnTo = readSafeReturnTo(formData);
  const exerciseId = String(formData.get("exerciseId") ?? "").trim();

  const [{ count: routineCount, error: routineCountError }, { count: sessionCount, error: sessionCountError }] = await Promise.all([
    supabase.from("routine_day_exercises").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("exercise_id", exerciseId),
    supabase.from("session_exercises").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("exercise_id", exerciseId),
  ]);

  // Fail closed: when either "still used?" count cannot be read, the exercise is not deleted.
  if (routineCountError || sessionCountError) {
    const message = toPlainActionError(routineCountError ?? sessionCountError, DELETE_FAILED_MESSAGE);
    if (returnTo) redirectWithMessage(returnTo, "error", message);
    throw new Error(message);
  }

  if ((routineCount ?? 0) > 0 || (sessionCount ?? 0) > 0) {
    if (returnTo) redirectWithMessage(returnTo, "error", DELETE_IN_USE_MESSAGE);
    throw new Error(DELETE_IN_USE_MESSAGE);
  }

  const { error } = await supabase
    .from("exercises")
    .delete()
    .eq("id", exerciseId)
    .eq("user_id", user.id)
    .eq("is_global", false);

  if (error) {
    const message = toPlainActionError(error, DELETE_FAILED_MESSAGE);
    if (returnTo) redirectWithMessage(returnTo, "error", message);
    throw new Error(message);
  }

  updateTag(`exercises:${user.id}`);
  if (returnTo) {
    revalidatePath(returnTo);
    redirectWithMessage(returnTo, "success", "Custom exercise deleted.");
  }
}
