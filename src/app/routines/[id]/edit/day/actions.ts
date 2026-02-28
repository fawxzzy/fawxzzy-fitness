"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { getRoutineEditDayPath, getRoutineEditPath, getTodayPath } from "@/lib/revalidation";
import { parseExerciseGoalPayload } from "@/lib/exercise-goal-payload";

function revalidateRoutineEditPaths(routineId: string, dayId: string) {
  revalidatePath(getRoutineEditPath(routineId));
  revalidatePath(getRoutineEditDayPath(routineId, dayId));
  revalidatePath(getTodayPath());
}

function parseRoutineExercisePayload(formData: FormData, returnTo: string) {
  const parsed = parseExerciseGoalPayload(formData, { requireSets: true });

  if (!parsed.ok) {
    redirect(`${returnTo}?error=${encodeURIComponent(parsed.error)}`);
  }

  const payload = parsed.payload;

  return {
    target_sets: payload.target_sets_min,
    target_reps_min: payload.target_reps_min,
    target_reps_max: payload.target_reps_max,
    target_reps: payload.target_reps_min ?? payload.target_reps_max,
    target_weight: payload.target_weight_min ?? payload.target_weight_max,
    target_weight_unit: payload.target_weight_unit,
    target_duration_seconds: payload.target_time_seconds_min ?? payload.target_time_seconds_max,
    target_distance: payload.target_distance_min ?? payload.target_distance_max,
    target_distance_unit: payload.target_distance_unit,
    target_calories: payload.target_calories_min ?? payload.target_calories_max,
    measurement_type: payload.measurement_type,
    default_unit: payload.default_unit,
  };
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

  const { data: existingDay, error: existingDayError } = await supabase
    .from("routine_days")
    .select("name")
    .eq("id", routineDayId)
    .eq("user_id", user.id)
    .eq("routine_id", routineId)
    .single();

  if (existingDayError || !existingDay) {
    redirect(`/routines/${routineId}/edit/day/${routineDayId}?error=${encodeURIComponent(existingDayError?.message ?? "Routine day not found")}`);
  }

  const safeName = name || existingDay.name || null;

  const { error } = await supabase
    .from("routine_days")
    .update({ name: safeName, is_rest: isRest })
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
  const returnTo = `/routines/${routineId}/edit/day/${routineDayId}`;

  if (!routineId || !routineDayId || !exerciseId) {
    redirect(`${returnTo}?error=${encodeURIComponent("Missing exercise info")}`);
  }

  const payload = parseRoutineExercisePayload(formData, returnTo);

  const { count } = await supabase
    .from("routine_day_exercises")
    .select("id", { head: true, count: "exact" })
    .eq("routine_day_id", routineDayId)
    .eq("user_id", user.id);

  // Manual QA checklist:
  // - Create strength routine -> add reps + weight -> measurement_type = 'reps'
  // - Create cardio routine -> add time only -> measurement_type = 'time'
  // - Add time + distance -> measurement_type = 'time_distance'
  // - Create Open workout (Sets only) -> measurement_type defaults to 'reps'
  // - Ensure distance unit defaults to 'mi'
  const { error } = await supabase.from("routine_day_exercises").insert({
    user_id: user.id,
    routine_day_id: routineDayId,
    exercise_id: exerciseId,
    position: count ?? 0,
    ...payload,
  });

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateRoutineEditPaths(routineId, routineDayId);
}

export async function updateRoutineDayExerciseAction(formData: FormData) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const exerciseRowId = String(formData.get("exerciseRowId") ?? "");
  const returnTo = `/routines/${routineId}/edit/day/${routineDayId}`;

  if (!routineId || !routineDayId || !exerciseRowId) {
    redirect(`${returnTo}?error=${encodeURIComponent("Missing exercise info")}`);
  }

  const payload = parseRoutineExercisePayload(formData, returnTo);

  const { error } = await supabase
    .from("routine_day_exercises")
    .update(payload)
    .eq("id", exerciseRowId)
    .eq("routine_day_id", routineDayId)
    .eq("user_id", user.id);

  if (error) {
    redirect(`${returnTo}?error=${encodeURIComponent(error.message)}`);
  }

  revalidateRoutineEditPaths(routineId, routineDayId);
  redirect(`${returnTo}?success=${encodeURIComponent("Exercise updated")}`);
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
