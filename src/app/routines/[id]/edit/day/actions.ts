"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

function parseTargetDurationSeconds(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.includes(":")) {
    const [minutesRaw, secondsRaw] = trimmed.split(":");
    if (secondsRaw === undefined) return Number.NaN;

    const minutes = Number(minutesRaw);
    const seconds = Number(secondsRaw);

    if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || seconds < 0 || seconds > 59) {
      return Number.NaN;
    }

    return (minutes * 60) + seconds;
  }

  const asSeconds = Number(trimmed);
  if (!Number.isInteger(asSeconds) || asSeconds < 0) {
    return Number.NaN;
  }

  return asSeconds;
}

function revalidateRoutineEditPaths(routineId: string, dayId: string) {
  revalidatePath(`/routines/${routineId}/edit`);
  revalidatePath(`/routines/${routineId}/edit/day/${dayId}`);
  revalidatePath("/today");
}

export async function saveRoutineDayAction(formData: FormData) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const isRest = formData.get("isRest") === "on";

  if (!routineId || !routineDayId) {
    redirect(`/routines/${routineId}/edit/day/${routineDayId}?error=${encodeURIComponent("Missing day info")}`);
  }

  const { error } = await supabase
    .from("routine_days")
    .update({ name: name || null, is_rest: isRest })
    .eq("id", routineDayId)
    .eq("user_id", user.id)
    .eq("routine_id", routineId);

  if (error) {
    redirect(`/routines/${routineId}/edit/day/${routineDayId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateRoutineEditPaths(routineId, routineDayId);
  redirect(`/routines/${routineId}/edit?success=${encodeURIComponent("Day saved")}`);
}

export async function addRoutineDayExerciseAction(formData: FormData) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const exerciseId = String(formData.get("exerciseId") ?? "").trim();
  const targetSets = Number(formData.get("targetSets"));
  const targetRepsMinRaw = String(formData.get("targetRepsMin") ?? "").trim();
  const targetRepsMaxRaw = String(formData.get("targetRepsMax") ?? "").trim();
  const targetWeightRaw = String(formData.get("targetWeight") ?? "").trim();
  const targetWeightUnit = String(formData.get("targetWeightUnit") ?? "").trim();
  const targetDurationRaw = String(formData.get("targetDuration") ?? "").trim();
  const targetRepsMin = targetRepsMinRaw ? Number(targetRepsMinRaw) : null;
  const targetRepsMax = targetRepsMaxRaw ? Number(targetRepsMaxRaw) : null;
  const targetWeight = targetWeightRaw ? Number(targetWeightRaw) : null;
  const targetDurationSeconds = parseTargetDurationSeconds(targetDurationRaw);
  const returnTo = `/routines/${routineId}/edit/day/${routineDayId}`;

  if (!routineId || !routineDayId || !exerciseId) {
    redirect(`${returnTo}?error=${encodeURIComponent("Missing exercise info")}`);
  }

  if (!Number.isInteger(targetSets) || targetSets < 1) {
    redirect(`${returnTo}?error=${encodeURIComponent("Target sets must be a whole number greater than 0")}`);
  }

  if (targetRepsMin !== null && (!Number.isInteger(targetRepsMin) || targetRepsMin < 1)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Min reps must be a whole number greater than 0")}`);
  }

  if (targetRepsMax !== null && (!Number.isInteger(targetRepsMax) || targetRepsMax < 1)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Max reps must be a whole number greater than 0")}`);
  }

  if (targetRepsMin !== null && targetRepsMax !== null && targetRepsMin > targetRepsMax) {
    redirect(`${returnTo}?error=${encodeURIComponent("Rep range must use min <= max")}`);
  }

  if (targetWeight !== null && (!Number.isFinite(targetWeight) || targetWeight < 0)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Weight must be 0 or greater")}`);
  }

  if (targetWeight !== null && targetWeightUnit && targetWeightUnit !== "lbs" && targetWeightUnit !== "kg") {
    redirect(`${returnTo}?error=${encodeURIComponent("Weight unit must be lbs or kg")}`);
  }

  if (Number.isNaN(targetDurationSeconds)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Time must be seconds or mm:ss")}`);
  }

  const { count } = await supabase
    .from("routine_day_exercises")
    .select("id", { head: true, count: "exact" })
    .eq("routine_day_id", routineDayId)
    .eq("user_id", user.id);

  const { error } = await supabase.from("routine_day_exercises").insert({
    user_id: user.id,
    routine_day_id: routineDayId,
    exercise_id: exerciseId,
    position: count ?? 0,
    target_sets: targetSets,
    target_reps_min: targetRepsMin,
    target_reps_max: targetRepsMax,
    target_reps: targetRepsMin ?? targetRepsMax,
    target_weight: targetWeight,
    target_weight_unit: targetWeight === null ? null : (targetWeightUnit === "kg" ? "kg" : "lbs"),
    target_duration_seconds: targetDurationSeconds,
  });

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateRoutineEditPaths(routineId, routineDayId);
}

export async function deleteRoutineDayExerciseAction(formData: FormData) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const exerciseRowId = String(formData.get("exerciseRowId") ?? "");
  const returnTo = `/routines/${routineId}/edit/day/${routineDayId}`;

  if (!routineId || !routineDayId || !exerciseRowId) {
    redirect(`${returnTo}?error=${encodeURIComponent("Missing delete info")}`);
  }

  const { error } = await supabase
    .from("routine_day_exercises")
    .delete()
    .eq("id", exerciseRowId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateRoutineEditPaths(routineId, routineDayId);
}
