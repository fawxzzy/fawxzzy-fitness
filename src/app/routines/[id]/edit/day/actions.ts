"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { getRoutineEditDayPath, getRoutineEditPath, getTodayPath } from "@/lib/revalidation";

type MeasurementSelection = "reps" | "weight" | "time" | "distance" | "calories";

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

function parseOptionalNumeric(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseDistanceUnit(value: FormDataEntryValue | null): "mi" | "km" | "m" {
  const unit = String(value ?? "").trim();
  if (unit === "km" || unit === "m") return unit;
  return "mi";
}

function parseMeasurementSelections(formData: FormData) {
  const rawSelections = formData.getAll("measurementSelections");
  const selections = new Set<MeasurementSelection>();

  for (const entry of rawSelections) {
    const value = String(entry).trim();
    if (value === "reps" || value === "weight" || value === "time" || value === "distance" || value === "calories") {
      selections.add(value);
    }
  }

  return selections;
}

function deriveMeasurementType(selections: Set<MeasurementSelection>) {
  if (selections.has("time") && selections.has("distance")) return "time_distance" as const;
  if (selections.has("time")) return "time" as const;
  if (selections.has("distance")) return "distance" as const;
  return "reps" as const;
}

function revalidateRoutineEditPaths(routineId: string, dayId: string) {
  revalidatePath(getRoutineEditPath(routineId));
  revalidatePath(getRoutineEditDayPath(routineId, dayId));
  revalidatePath(getTodayPath());
}

function parseRoutineExercisePayload(formData: FormData, returnTo: string) {
  const targetSets = Number(formData.get("targetSets"));
  const targetRepsMinRaw = String(formData.get("targetRepsMin") ?? "").trim();
  const targetRepsMaxRaw = String(formData.get("targetRepsMax") ?? "").trim();
  const targetWeightRaw = String(formData.get("targetWeight") ?? "").trim();
  const targetWeightUnit = String(formData.get("targetWeightUnit") ?? "").trim();
  const targetDurationRaw = String(formData.get("targetDuration") ?? "").trim();
  const targetDistanceRaw = String(formData.get("targetDistance") ?? "").trim();
  const targetDistanceUnit = String(formData.get("targetDistanceUnit") ?? "").trim();
  const targetCaloriesRaw = String(formData.get("targetCalories") ?? "").trim();
  const defaultUnit = parseDistanceUnit(formData.get("defaultUnit"));
  const selections = parseMeasurementSelections(formData);
  const measurementType = deriveMeasurementType(selections);

  const targetRepsMin = targetRepsMinRaw ? Number(targetRepsMinRaw) : null;
  const targetRepsMax = targetRepsMaxRaw ? Number(targetRepsMaxRaw) : null;
  const targetWeight = targetWeightRaw ? Number(targetWeightRaw) : null;
  const targetDurationSeconds = parseTargetDurationSeconds(targetDurationRaw);
  const targetDistance = parseOptionalNumeric(targetDistanceRaw);
  const targetCalories = parseOptionalNumeric(targetCaloriesRaw);

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

  if (targetDistance !== null && (!Number.isFinite(targetDistance) || targetDistance < 0)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Distance must be 0 or greater")}`);
  }

  if (targetDistance !== null && targetDistanceUnit && targetDistanceUnit !== "mi" && targetDistanceUnit !== "km" && targetDistanceUnit !== "m") {
    redirect(`${returnTo}?error=${encodeURIComponent("Distance unit must be mi, km, or m")}`);
  }

  if (targetCalories !== null && (!Number.isFinite(targetCalories) || targetCalories < 0)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Calories must be 0 or greater")}`);
  }

  if (Number.isNaN(targetDurationSeconds)) {
    redirect(`${returnTo}?error=${encodeURIComponent("Time must be seconds or mm:ss")}`);
  }

  const useRepsTargets = selections.has("reps");
  const useWeightTarget = selections.has("weight");
  const useTimeTarget = selections.has("time");
  const useDistanceTarget = selections.has("distance");
  const useCaloriesTarget = selections.has("calories");

  return {
    target_sets: targetSets,
    target_reps_min: useRepsTargets ? targetRepsMin : null,
    target_reps_max: useRepsTargets ? targetRepsMax : null,
    target_reps: useRepsTargets ? (targetRepsMin ?? targetRepsMax) : null,
    target_weight: useWeightTarget ? targetWeight : null,
    target_weight_unit: useWeightTarget && targetWeight !== null ? (targetWeightUnit === "kg" ? "kg" : "lbs") : null,
    target_duration_seconds: useTimeTarget ? targetDurationSeconds : null,
    target_distance: useDistanceTarget ? targetDistance : null,
    target_distance_unit: useDistanceTarget && targetDistance !== null ? (targetDistanceUnit === "km" || targetDistanceUnit === "m" ? targetDistanceUnit : "mi") : null,
    target_calories: useCaloriesTarget ? targetCalories : null,
    measurement_type: measurementType,
    default_unit: useDistanceTarget ? defaultUnit : null,
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
