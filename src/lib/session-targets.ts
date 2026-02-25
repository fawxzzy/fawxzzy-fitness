import "server-only";

import { supabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

export type DisplayTarget = {
  sets?: number;
  repsText?: string;
  weight?: number;
  weightUnit?: "lbs" | "kg";
  durationSeconds?: number;
  distance?: number;
  distanceUnit?: "mi" | "km" | "m";
  calories?: number;
  measurementType?: "reps" | "time" | "distance" | "time_distance";
  source: "engine" | "template";
};

function getRepsText(minReps: number | null, maxReps: number | null, fallbackReps: number | null) {
  const resolvedMin = minReps ?? fallbackReps ?? null;
  const resolvedMax = maxReps ?? fallbackReps ?? null;

  if (resolvedMin !== null && resolvedMax !== null) {
    if (resolvedMin === resolvedMax) {
      return `${resolvedMin} reps`;
    }

    return `${resolvedMin}–${resolvedMax} reps`;
  }

  if (resolvedMin !== null) {
    return `${resolvedMin} reps`;
  }

  if (resolvedMax !== null) {
    return `${resolvedMax} reps`;
  }

  return undefined;
}

function formatDurationText(durationSeconds: number) {
  if (durationSeconds < 60) {
    return `${durationSeconds}s`;
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatGoalText(target: DisplayTarget, fallbackWeightUnit: string | null): string {
  const resolvedWeightUnit = target.weightUnit ?? (fallbackWeightUnit === "lbs" || fallbackWeightUnit === "kg" ? fallbackWeightUnit : null);
  const resolvedDistanceUnit = target.distanceUnit ?? "mi";
  const hasAdditionalTarget = (
    target.repsText
    || target.weight !== undefined
    || target.durationSeconds !== undefined
    || target.distance !== undefined
    || target.calories !== undefined
  );

  if (!hasAdditionalTarget) {
    return "Goal: Open";
  }

  const parts: string[] = [];

  if (target.sets !== undefined) {
    parts.push(`${target.sets} sets`);
  }

  if (target.measurementType === "reps") {
    if (target.repsText) parts.push(target.repsText);
    if (target.weight !== undefined) parts.push(`@ ${target.weight}${resolvedWeightUnit ? ` ${resolvedWeightUnit}` : ""}`);
  } else if (target.measurementType === "time") {
    if (target.durationSeconds !== undefined) parts.push(`Time ${formatDurationText(target.durationSeconds)}`);
  } else if (target.measurementType === "distance") {
    if (target.distance !== undefined) parts.push(`Distance ${target.distance} ${resolvedDistanceUnit}`);
  } else if (target.measurementType === "time_distance") {
    if (target.durationSeconds !== undefined) parts.push(`Time ${formatDurationText(target.durationSeconds)}`);
    if (target.distance !== undefined) parts.push(`Distance ${target.distance} ${resolvedDistanceUnit}`);
  } else {
    if (target.repsText) parts.push(target.repsText);
    if (target.weight !== undefined) parts.push(`@ ${target.weight}${resolvedWeightUnit ? ` ${resolvedWeightUnit}` : ""}`);
    if (target.durationSeconds !== undefined) parts.push(`Time ${formatDurationText(target.durationSeconds)}`);
    if (target.distance !== undefined) parts.push(`Distance ${target.distance} ${resolvedDistanceUnit}`);
  }

  if (target.calories !== undefined) {
    parts.push(`Calories ${target.calories}`);
  }

  return `Goal: ${parts.join(" • ")}`;
}

export async function getSessionTargets(sessionId: string) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, routine_id, routine_day_index, user_id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!session?.routine_id || !session.routine_day_index) {
    return new Map<string, DisplayTarget>();
  }

  const { data: routineDay } = await supabase
    .from("routine_days")
    .select("id")
    .eq("routine_id", session.routine_id)
    .eq("day_index", session.routine_day_index)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!routineDay) {
    return new Map<string, DisplayTarget>();
  }

  const { data: routineDayExercises } = await supabase
    .from("routine_day_exercises")
    .select("exercise_id, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit")
    .eq("routine_day_id", routineDay.id)
    .eq("user_id", user.id);

  const exerciseIds = Array.from(new Set((routineDayExercises ?? []).map((exercise) => exercise.exercise_id)));
  const { data: exerciseMeasurements } = exerciseIds.length
    ? await supabase
        .from("exercises")
        .select("id, measurement_type")
        .in("id", exerciseIds)
    : { data: [] };

  const measurementTypeByExerciseId = new Map<string, "reps" | "time" | "distance" | "time_distance">();
  for (const row of exerciseMeasurements ?? []) {
    if (row.measurement_type === "reps" || row.measurement_type === "time" || row.measurement_type === "distance" || row.measurement_type === "time_distance") {
      measurementTypeByExerciseId.set(row.id, row.measurement_type);
    }
  }

  const targetMap = new Map<string, DisplayTarget>();

  for (const exercise of routineDayExercises ?? []) {
    const target: DisplayTarget = {
      source: "template",
      measurementType: exercise.measurement_type
        ?? measurementTypeByExerciseId.get(exercise.exercise_id)
        ?? "reps",
    };

    if (exercise.target_sets !== null) {
      target.sets = exercise.target_sets;
    }

    const repsText = getRepsText(exercise.target_reps_min, exercise.target_reps_max, exercise.target_reps);
    if (repsText) {
      target.repsText = repsText;
    }

    if (exercise.target_weight !== null) {
      target.weight = Number(exercise.target_weight);
      if (exercise.target_weight_unit === "lbs" || exercise.target_weight_unit === "kg") {
        target.weightUnit = exercise.target_weight_unit;
      }
    }

    if (exercise.target_duration_seconds !== null) {
      target.durationSeconds = exercise.target_duration_seconds;
    }

    if (exercise.target_distance !== null) {
      target.distance = Number(exercise.target_distance);
    }

    if (exercise.target_distance_unit === "mi" || exercise.target_distance_unit === "km" || exercise.target_distance_unit === "m") {
      target.distanceUnit = exercise.target_distance_unit;
    } else if (exercise.default_unit === "mi" || exercise.default_unit === "km" || exercise.default_unit === "m") {
      target.distanceUnit = exercise.default_unit;
    }

    if (exercise.target_calories !== null) {
      target.calories = Number(exercise.target_calories);
    }

    targetMap.set(exercise.exercise_id, target);
  }

  return targetMap;
}
