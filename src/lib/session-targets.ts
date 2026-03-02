import "server-only";

import { supabaseServer } from "@/lib/supabase/server";
import { formatDurationClock } from "@/lib/duration";
import { requireUser } from "@/lib/auth";

export type DisplayTarget = {
  setsMin?: number;
  setsMax?: number;
  repsMin?: number;
  repsMax?: number;
  weightMin?: number;
  weightMax?: number;
  weightUnit?: "lbs" | "kg";
  durationSeconds?: number;
  distance?: number;
  distanceUnit?: "mi" | "km" | "m";
  calories?: number;
  measurementType?: "reps" | "time" | "distance" | "time_distance";
  source: "engine" | "template";
};

function formatRangeWithLabel(minValue: number | undefined, maxValue: number | undefined, label: string) {
  if (minValue === undefined && maxValue === undefined) return null;
  if (minValue !== undefined && maxValue !== undefined) {
    if (minValue === maxValue) return `${minValue} ${label}`;
    return `${minValue}–${maxValue} ${label}`;
  }
  if (minValue !== undefined) return `${minValue} ${label}`;
  return `${maxValue} ${label}`;
}


function resolveRangeValue(minValue: number | null | undefined, maxValue: number | null | undefined, fallbackValue: number | null | undefined) {
  if (minValue !== null && minValue !== undefined && maxValue !== null && maxValue !== undefined && minValue === maxValue) {
    return minValue;
  }

  if (minValue !== null && minValue !== undefined) {
    return minValue;
  }

  if (maxValue !== null && maxValue !== undefined) {
    return maxValue;
  }

  if (fallbackValue !== null && fallbackValue !== undefined) {
    return fallbackValue;
  }

  return null;
}

function formatDurationText(durationSeconds: number) {
  return formatDurationClock(durationSeconds);
}

function toSingularUnit(unit: "lbs" | "kg" | "mi" | "km" | "m" | "cal") {
  if (unit === "lbs") {
    return "lb";
  }

  return unit;
}


function resolveMeasurementType(value: unknown): "reps" | "time" | "distance" | "time_distance" | null {
  return value === "reps" || value === "time" || value === "distance" || value === "time_distance" ? value : null;
}

function resolveWeightUnit(value: unknown): "lbs" | "kg" | null {
  return value === "lbs" || value === "kg" ? value : null;
}

function resolveDistanceUnit(value: unknown): "mi" | "km" | "m" | null {
  return value === "mi" || value === "km" || value === "m" ? value : null;
}

function buildDisplayTargetFromGoalFields(fields: {
  source: "engine" | "template";
  measurementType?: unknown;
  setsMin?: number | null;
  setsMax?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
  repsFallback?: number | null;
  weightMin?: number | null;
  weightMax?: number | null;
  weightFallback?: number | null;
  weightUnit?: unknown;
  timeSecondsMin?: number | null;
  timeSecondsMax?: number | null;
  durationFallback?: number | null;
  distanceMin?: number | null;
  distanceMax?: number | null;
  distanceFallback?: number | null;
  distanceUnit?: unknown;
  defaultUnit?: unknown;
  caloriesMin?: number | null;
  caloriesMax?: number | null;
  caloriesFallback?: number | null;
}): DisplayTarget | null {
  const target: DisplayTarget = {
    source: fields.source,
    measurementType: resolveMeasurementType(fields.measurementType) ?? "reps",
  };

  const resolvedSetsMin = fields.setsMin ?? null;
  const resolvedSetsMax = fields.setsMax ?? null;
  const fallbackSets = fields.setsMin ?? fields.setsMax ?? null;
  const displaySets = resolveRangeValue(resolvedSetsMin, resolvedSetsMax, fallbackSets);
  if (displaySets !== null) {
    target.setsMin = resolvedSetsMin ?? displaySets;
    target.setsMax = resolvedSetsMax ?? displaySets;
  }

  const resolvedRepsMin = fields.repsMin ?? fields.repsFallback ?? null;
  const resolvedRepsMax = fields.repsMax ?? fields.repsFallback ?? null;
  if (resolvedRepsMin !== null || resolvedRepsMax !== null) {
    target.repsMin = resolvedRepsMin ?? undefined;
    target.repsMax = resolvedRepsMax ?? undefined;
  }

  const resolvedWeight = resolveRangeValue(fields.weightMin, fields.weightMax, fields.weightFallback);
  if (resolvedWeight !== null) {
    target.weightMin = (fields.weightMin ?? resolvedWeight);
    target.weightMax = (fields.weightMax ?? resolvedWeight);
    const weightUnit = resolveWeightUnit(fields.weightUnit);
    if (weightUnit) {
      target.weightUnit = weightUnit;
    }
  }

  const resolvedDurationSeconds = resolveRangeValue(fields.timeSecondsMin, fields.timeSecondsMax, fields.durationFallback);
  if (resolvedDurationSeconds !== null) {
    target.durationSeconds = resolvedDurationSeconds;
  }

  const resolvedDistance = resolveRangeValue(fields.distanceMin, fields.distanceMax, fields.distanceFallback);
  if (resolvedDistance !== null) {
    target.distance = Number(resolvedDistance);
  }

  const distanceUnit = resolveDistanceUnit(fields.distanceUnit) ?? resolveDistanceUnit(fields.defaultUnit);
  if (distanceUnit) {
    target.distanceUnit = distanceUnit;
  }

  const resolvedCalories = resolveRangeValue(fields.caloriesMin, fields.caloriesMax, fields.caloriesFallback);
  if (resolvedCalories !== null) {
    target.calories = Number(resolvedCalories);
  }

  const hasMeasurementTarget = target.setsMin !== undefined
    || target.setsMax !== undefined
    || target.repsMin !== undefined
    || target.repsMax !== undefined
    || target.weightMin !== undefined
    || target.weightMax !== undefined
    || target.durationSeconds !== undefined
    || target.distance !== undefined
    || target.calories !== undefined;

  if (!hasMeasurementTarget) {
    return null;
  }

  return target;
}

export function formatGoalStatLine(target: DisplayTarget, fallbackWeightUnit: string | null): { primary: string; secondary: string[] } | null {
  const resolvedWeightUnit = target.weightUnit ?? (fallbackWeightUnit === "lbs" || fallbackWeightUnit === "kg" ? fallbackWeightUnit : null);
  const resolvedDistanceUnit = target.distanceUnit ?? "mi";
  const hasMeasurementTarget = (
    target.setsMin !== undefined
    || target.setsMax !== undefined
    || target.repsMin !== undefined
    || target.repsMax !== undefined
    || target.weightMin !== undefined
    || target.weightMax !== undefined
    || target.durationSeconds !== undefined
    || target.distance !== undefined
    || target.calories !== undefined
  );

  if (!hasMeasurementTarget) {
    return null;
  }

  const firstSegmentParts: string[] = [];
  const setsPart = formatRangeWithLabel(target.setsMin, target.setsMax, "sets");
  if (setsPart) firstSegmentParts.push(setsPart);
  const repsPart = formatRangeWithLabel(target.repsMin, target.repsMax, "reps");
  if (repsPart) firstSegmentParts.push(repsPart);
  const weightPart = formatRangeWithLabel(target.weightMin, target.weightMax, resolvedWeightUnit ? toSingularUnit(resolvedWeightUnit) : "");
  if (weightPart) firstSegmentParts.push(`@ ${weightPart.trim()}`);

  const primary = firstSegmentParts.join(" · ").trim();
  const secondary: string[] = [];

  if (target.durationSeconds !== undefined) {
    secondary.push(formatDurationText(target.durationSeconds));
  }
  if (target.distance !== undefined) {
    secondary.push(`${target.distance} ${toSingularUnit(resolvedDistanceUnit)}`);
  }
  if (target.calories !== undefined) {
    secondary.push(`${target.calories} ${toSingularUnit("cal")}`);
  }

  return {
    primary,
    secondary,
  };
}

export function formatGoalText(target: DisplayTarget, fallbackWeightUnit: string | null): string {
  const resolvedWeightUnit = target.weightUnit ?? (fallbackWeightUnit === "lbs" || fallbackWeightUnit === "kg" ? fallbackWeightUnit : null);
  const resolvedDistanceUnit = target.distanceUnit ?? "mi";
  const hasMeasurementTarget = (
    target.setsMin !== undefined
    || target.setsMax !== undefined
    || target.repsMin !== undefined
    || target.repsMax !== undefined
    || target.weightMin !== undefined
    || target.weightMax !== undefined
    || target.durationSeconds !== undefined
    || target.distance !== undefined
    || target.calories !== undefined
  );

  if (!hasMeasurementTarget) {
    return "Goal: Open";
  }

  const parts: string[] = [];

  const setsPart = formatRangeWithLabel(target.setsMin, target.setsMax, "sets");
  if (setsPart) {
    parts.push(setsPart);
  }

  const repsWeightParts: string[] = [];
  const repsPart = formatRangeWithLabel(target.repsMin, target.repsMax, "reps");
  if (repsPart) repsWeightParts.push(repsPart);
  const weightPart = formatRangeWithLabel(target.weightMin, target.weightMax, resolvedWeightUnit ?? "");
  if (weightPart) repsWeightParts.push(`@ ${weightPart.trim()}`);

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

  if (!session) {
    return new Map<string, DisplayTarget>();
  }

  const { data: sessionExercises } = await supabase
    .from("session_exercises")
    .select("id, exercise_id, position, routine_day_exercise_id, target_sets_min, target_sets_max, target_reps_min, target_reps_max, target_weight_min, target_weight_max, target_weight_unit, target_time_seconds_min, target_time_seconds_max, target_distance_min, target_distance_max, target_distance_unit, target_calories_min, target_calories_max, measurement_type, default_unit")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const targetMap = new Map<string, DisplayTarget>();

  for (const sessionExercise of sessionExercises ?? []) {
    const sessionTarget = buildDisplayTargetFromGoalFields({
      source: "engine",
      measurementType: sessionExercise.measurement_type,
      setsMin: sessionExercise.target_sets_min,
      setsMax: sessionExercise.target_sets_max,
      repsMin: sessionExercise.target_reps_min,
      repsMax: sessionExercise.target_reps_max,
      weightMin: sessionExercise.target_weight_min,
      weightMax: sessionExercise.target_weight_max,
      weightUnit: sessionExercise.target_weight_unit,
      timeSecondsMin: sessionExercise.target_time_seconds_min,
      timeSecondsMax: sessionExercise.target_time_seconds_max,
      distanceMin: sessionExercise.target_distance_min,
      distanceMax: sessionExercise.target_distance_max,
      distanceUnit: sessionExercise.target_distance_unit,
      defaultUnit: sessionExercise.default_unit,
      caloriesMin: sessionExercise.target_calories_min,
      caloriesMax: sessionExercise.target_calories_max,
    });

    if (sessionTarget) {
      targetMap.set(sessionExercise.id, sessionTarget);
    }
  }

  if (!session.routine_id || !session.routine_day_index) {
    return targetMap;
  }

  const { data: routineDay } = await supabase
    .from("routine_days")
    .select("id")
    .eq("routine_id", session.routine_id)
    .eq("day_index", session.routine_day_index)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!routineDay) {
    return targetMap;
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

  for (const sessionExercise of sessionExercises ?? []) {
    if (targetMap.has(sessionExercise.id)) {
      continue;
    }

    const matchedRoutine = sessionExercise.routine_day_exercise_id
      ? (routineRowsById.get(sessionExercise.routine_day_exercise_id) ?? null)
      : null;

    if (!matchedRoutine) {
      continue;
    }

    const templateTarget = buildDisplayTargetFromGoalFields({
      source: "template",
      measurementType: matchedRoutine.measurement_type ?? measurementTypeByExerciseId.get(matchedRoutine.exercise_id),
      setsMin: matchedRoutine.target_sets,
      setsMax: matchedRoutine.target_sets,
      repsMin: matchedRoutine.target_reps_min,
      repsMax: matchedRoutine.target_reps_max,
      repsFallback: matchedRoutine.target_reps,
      weightFallback: matchedRoutine.target_weight,
      weightUnit: matchedRoutine.target_weight_unit,
      durationFallback: matchedRoutine.target_duration_seconds,
      distanceFallback: matchedRoutine.target_distance,
      distanceUnit: matchedRoutine.target_distance_unit,
      defaultUnit: matchedRoutine.default_unit,
      caloriesFallback: matchedRoutine.target_calories,
    });

    if (templateTarget) {
      targetMap.set(sessionExercise.id, templateTarget);
    }
  }

  return targetMap;
}
