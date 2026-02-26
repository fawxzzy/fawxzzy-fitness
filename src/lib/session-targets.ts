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
  const hasMeasurementTarget = (
    target.repsText
    || target.weight !== undefined
    || target.durationSeconds !== undefined
    || target.distance !== undefined
    || target.calories !== undefined
  );

  if (!hasMeasurementTarget) {
    return "Goal: Open";
  }

  const parts: string[] = [];

  if (target.sets !== undefined) {
    parts.push(`${target.sets} sets`);
  }

  const repsWeightParts: string[] = [];
  if (target.repsText) repsWeightParts.push(target.repsText);
  if (target.weight !== undefined) repsWeightParts.push(`@ ${target.weight}${resolvedWeightUnit ? ` ${resolvedWeightUnit}` : ""}`);

  const timePart = target.durationSeconds !== undefined ? `Time ${formatDurationText(target.durationSeconds)}` : null;
  const distancePart = target.distance !== undefined ? `Distance ${target.distance} ${resolvedDistanceUnit}` : null;
  const caloriesPart = target.calories !== undefined ? `Calories ${target.calories}` : null;

  if (target.measurementType === "time_distance") {
    parts.push(...repsWeightParts);
    if (timePart) parts.push(timePart);
    if (distancePart) parts.push(distancePart);
  } else if (target.measurementType === "time") {
    parts.push(...repsWeightParts);
    if (timePart) parts.push(timePart);
    if (distancePart) parts.push(distancePart);
  } else if (target.measurementType === "distance") {
    parts.push(...repsWeightParts);
    if (timePart) parts.push(timePart);
    if (distancePart) parts.push(distancePart);
  } else {
    parts.push(...repsWeightParts);
    if (timePart) parts.push(timePart);
    if (distancePart) parts.push(distancePart);
  }

  if (caloriesPart) {
    parts.push(caloriesPart);
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

  const { data: sessionExercises } = await supabase
    .from("session_exercises")
    .select("id, exercise_id, position, routine_day_exercise_id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

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
    .select("id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit")
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

  const routineRows = routineDayExercises ?? [];
  const routineRowsById = new Map(routineRows.map((row) => [row.id, row]));
  const routineRowsByPosition = new Map<number, typeof routineRows[number]>();
  const routineRowsByExerciseId = new Map<string, Array<typeof routineRows[number]>>();

  for (const row of routineRows) {
    routineRowsByPosition.set(row.position, row);
    const list = routineRowsByExerciseId.get(row.exercise_id) ?? [];
    list.push(row);
    routineRowsByExerciseId.set(row.exercise_id, list);
  }

  const consumedRoutineIds = new Set<string>();
  const targetMap = new Map<string, DisplayTarget>();

  for (const sessionExercise of sessionExercises ?? []) {
    let matchedRoutine = sessionExercise.routine_day_exercise_id
      ? (routineRowsById.get(sessionExercise.routine_day_exercise_id) ?? null)
      : null;

    if (!matchedRoutine) {
      matchedRoutine = routineRowsByPosition.get(sessionExercise.position) ?? null;
      if (matchedRoutine && (matchedRoutine.exercise_id !== sessionExercise.exercise_id || consumedRoutineIds.has(matchedRoutine.id))) {
        matchedRoutine = null;
        const candidates = routineRowsByExerciseId.get(sessionExercise.exercise_id) ?? [];
        matchedRoutine = candidates.find((candidate) => !consumedRoutineIds.has(candidate.id)) ?? null;
      }
    }

    if (!matchedRoutine) {
      continue;
    }

    consumedRoutineIds.add(matchedRoutine.id);

    const target: DisplayTarget = {
      source: "template",
      measurementType: matchedRoutine.measurement_type
        ?? measurementTypeByExerciseId.get(matchedRoutine.exercise_id)
        ?? "reps",
    };

    if (matchedRoutine.target_sets !== null) {
      target.sets = matchedRoutine.target_sets;
    }

    const repsText = getRepsText(matchedRoutine.target_reps_min, matchedRoutine.target_reps_max, matchedRoutine.target_reps);
    if (repsText) {
      target.repsText = repsText;
    }

    if (matchedRoutine.target_weight !== null) {
      target.weight = Number(matchedRoutine.target_weight);
      if (matchedRoutine.target_weight_unit === "lbs" || matchedRoutine.target_weight_unit === "kg") {
        target.weightUnit = matchedRoutine.target_weight_unit;
      }
    }

    if (matchedRoutine.target_duration_seconds !== null) {
      target.durationSeconds = matchedRoutine.target_duration_seconds;
    }

    if (matchedRoutine.target_distance !== null) {
      target.distance = Number(matchedRoutine.target_distance);
    }

    if (matchedRoutine.target_distance_unit === "mi" || matchedRoutine.target_distance_unit === "km" || matchedRoutine.target_distance_unit === "m") {
      target.distanceUnit = matchedRoutine.target_distance_unit;
    } else if (matchedRoutine.default_unit === "mi" || matchedRoutine.default_unit === "km" || matchedRoutine.default_unit === "m") {
      target.distanceUnit = matchedRoutine.default_unit;
    }

    if (matchedRoutine.target_calories !== null) {
      target.calories = Number(matchedRoutine.target_calories);
    }

    targetMap.set(sessionExercise.id, target);
  }

  return targetMap;
}
