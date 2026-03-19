"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { supabaseServer } from "@/lib/supabase/server";
import { getRoutineEditDayPath, getRoutineEditPath, getTodayPath } from "@/lib/revalidation";
import { resolveReturnHref } from "@/lib/navigation-return";
import { mapExerciseGoalPayloadToRoutineDayColumns, parseExerciseGoalPayload } from "@/lib/exercise-goal-payload";

function revalidateRoutineEditPaths(routineId: string, dayId: string) {
  revalidatePath(getRoutineEditPath(routineId));
  revalidatePath(getRoutineEditDayPath(routineId, dayId));
  revalidatePath(getTodayPath());
}


function resolveRoutineDayReturnTo(formData: FormData, fallbackHref: string) {
  const rawReturnTo = String(formData.get("returnTo") ?? "").trim();
  return resolveReturnHref(rawReturnTo, fallbackHref);
}

function parseRoutineExercisePayload(formData: FormData) {
  const parsed = parseExerciseGoalPayload(formData, { requireSets: true });

  if (!parsed.ok) {
    return parsed;
  }

  return { ok: true as const, payload: mapExerciseGoalPayloadToRoutineDayColumns(parsed.payload) };
}

export async function saveRoutineDayAction(formData: FormData) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const isRest = formData.get("isRest") === "on";
  const fallbackReturnTo = `/routines/${routineId}/edit`;
  const returnTo = resolveRoutineDayReturnTo(formData, fallbackReturnTo);

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
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}success=${encodeURIComponent("Day saved")}`);
}

export async function addRoutineDayExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const exerciseId = String(formData.get("exerciseId") ?? "").trim();

  if (!routineId || !routineDayId || !exerciseId) {
    return { ok: false, error: "Missing exercise info" };
  }

  const parsedPayload = parseRoutineExercisePayload(formData);
  if (!parsedPayload.ok) {
    return { ok: false, error: parsedPayload.error };
  }

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
    ...parsedPayload.payload,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateRoutineEditPaths(routineId, routineDayId);
  return { ok: true };
}

export async function updateRoutineDayExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const exerciseRowId = String(formData.get("exerciseRowId") ?? "");

  if (!routineId || !routineDayId || !exerciseRowId) {
    return { ok: false, error: "Missing exercise info" };
  }

  const parsedPayload = parseRoutineExercisePayload(formData);
  if (!parsedPayload.ok) {
    return { ok: false, error: parsedPayload.error };
  }

  const { error } = await supabase
    .from("routine_day_exercises")
    .update(parsedPayload.payload)
    .eq("id", exerciseRowId)
    .eq("routine_day_id", routineDayId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateRoutineEditPaths(routineId, routineDayId);
  return { ok: true };
}


export async function reorderRoutineDayExercisesAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const orderedExerciseRowIds = String(formData.get("orderedExerciseRowIds") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!routineId || !routineDayId || orderedExerciseRowIds.length === 0) {
    return { ok: false, error: "Missing reorder info" };
  }

  const { data: existingRows, error: existingRowsError } = await supabase
    .from("routine_day_exercises")
    .select("id")
    .eq("routine_day_id", routineDayId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (existingRowsError) {
    return { ok: false, error: existingRowsError.message };
  }

  const existingIds = (existingRows ?? []).map((row) => row.id);
  if (existingIds.length !== orderedExerciseRowIds.length || existingIds.some((id) => !orderedExerciseRowIds.includes(id))) {
    return { ok: false, error: "Invalid reorder payload" };
  }

  for (const [position, exerciseRowId] of orderedExerciseRowIds.entries()) {
    const { error } = await supabase
      .from("routine_day_exercises")
      .update({ position })
      .eq("id", exerciseRowId)
      .eq("routine_day_id", routineDayId)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  revalidateRoutineEditPaths(routineId, routineDayId);
  return { ok: true };
}

export async function deleteRoutineDayExerciseAction(formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const routineId = String(formData.get("routineId") ?? "");
  const routineDayId = String(formData.get("routineDayId") ?? "");
  const exerciseRowId = String(formData.get("exerciseRowId") ?? "");

  if (!routineId || !routineDayId || !exerciseRowId) {
    return { ok: false, error: "Missing delete info" };
  }

  const { error } = await supabase
    .from("routine_day_exercises")
    .delete()
    .eq("id", exerciseRowId)
    .eq("user_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidateRoutineEditPaths(routineId, routineDayId);
  return { ok: true };
}
