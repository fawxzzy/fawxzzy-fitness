import "server-only";

export type MeasurementSelection = "reps" | "weight" | "time" | "distance" | "calories";

type ParseOptions = {
  requireSets: boolean;
};

type ParsedGoalPayload = {
  target_sets: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight_min: number | null;
  target_weight_max: number | null;
  target_weight_unit: "lbs" | "kg" | null;
  target_time_seconds_min: number | null;
  target_time_seconds_max: number | null;
  target_distance_min: number | null;
  target_distance_max: number | null;
  target_distance_unit: "mi" | "km" | "m" | null;
  target_calories_min: number | null;
  target_calories_max: number | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance";
  default_unit: "mi" | "km" | "m" | null;
};

export type ParseExerciseGoalPayloadResult =
  | { ok: true; payload: ParsedGoalPayload }
  | { ok: false; error: string };

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

export function parseExerciseGoalPayload(formData: FormData, options: ParseOptions): ParseExerciseGoalPayloadResult {
  const targetSetsRaw = String(formData.get("targetSets") ?? "").trim();
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

  const targetSets = targetSetsRaw ? Number(targetSetsRaw) : null;
  const targetRepsMin = targetRepsMinRaw ? Number(targetRepsMinRaw) : null;
  const targetRepsMax = targetRepsMaxRaw ? Number(targetRepsMaxRaw) : null;
  const targetWeight = targetWeightRaw ? Number(targetWeightRaw) : null;
  const targetDurationSeconds = parseTargetDurationSeconds(targetDurationRaw);
  const targetDistance = parseOptionalNumeric(targetDistanceRaw);
  const targetCalories = parseOptionalNumeric(targetCaloriesRaw);

  if (options.requireSets && (targetSets === null || !Number.isInteger(targetSets) || targetSets < 1)) {
    return { ok: false, error: "Target sets must be a whole number greater than 0" };
  }

  if (targetSets !== null && (!Number.isInteger(targetSets) || targetSets < 1)) {
    return { ok: false, error: "Target sets must be a whole number greater than 0" };
  }

  if (targetRepsMin !== null && (!Number.isInteger(targetRepsMin) || targetRepsMin < 1)) {
    return { ok: false, error: "Min reps must be a whole number greater than 0" };
  }

  if (targetRepsMax !== null && (!Number.isInteger(targetRepsMax) || targetRepsMax < 1)) {
    return { ok: false, error: "Max reps must be a whole number greater than 0" };
  }

  if (targetRepsMin !== null && targetRepsMax !== null && targetRepsMin > targetRepsMax) {
    return { ok: false, error: "Rep range must use min <= max" };
  }

  if (targetWeight !== null && (!Number.isFinite(targetWeight) || targetWeight < 0)) {
    return { ok: false, error: "Weight must be 0 or greater" };
  }

  if (targetWeight !== null && targetWeightUnit && targetWeightUnit !== "lbs" && targetWeightUnit !== "kg") {
    return { ok: false, error: "Weight unit must be lbs or kg" };
  }

  if (targetDistance !== null && (!Number.isFinite(targetDistance) || targetDistance < 0)) {
    return { ok: false, error: "Distance must be 0 or greater" };
  }

  if (targetDistance !== null && targetDistanceUnit && targetDistanceUnit !== "mi" && targetDistanceUnit !== "km" && targetDistanceUnit !== "m") {
    return { ok: false, error: "Distance unit must be mi, km, or m" };
  }

  if (targetCalories !== null && (!Number.isFinite(targetCalories) || targetCalories < 0)) {
    return { ok: false, error: "Calories must be 0 or greater" };
  }

  if (Number.isNaN(targetDurationSeconds)) {
    return { ok: false, error: "Time must be seconds or mm:ss" };
  }

  const useRepsTargets = selections.has("reps");
  const useWeightTarget = selections.has("weight");
  const useTimeTarget = selections.has("time");
  const useDistanceTarget = selections.has("distance");
  const useCaloriesTarget = selections.has("calories");

  return {
    ok: true,
    payload: {
      target_sets: options.requireSets ? targetSets : null,
      target_reps_min: useRepsTargets ? targetRepsMin : null,
      target_reps_max: useRepsTargets ? targetRepsMax : null,
      target_weight_min: useWeightTarget ? targetWeight : null,
      target_weight_max: useWeightTarget ? targetWeight : null,
      target_weight_unit: useWeightTarget && targetWeight !== null ? (targetWeightUnit === "kg" ? "kg" : "lbs") : null,
      target_time_seconds_min: useTimeTarget ? targetDurationSeconds : null,
      target_time_seconds_max: useTimeTarget ? targetDurationSeconds : null,
      target_distance_min: useDistanceTarget ? targetDistance : null,
      target_distance_max: useDistanceTarget ? targetDistance : null,
      target_distance_unit: useDistanceTarget && targetDistance !== null ? (targetDistanceUnit === "km" || targetDistanceUnit === "m" ? targetDistanceUnit : "mi") : null,
      target_calories_min: useCaloriesTarget ? targetCalories : null,
      target_calories_max: useCaloriesTarget ? targetCalories : null,
      measurement_type: measurementType,
      default_unit: useDistanceTarget ? defaultUnit : null,
    },
  };
}
