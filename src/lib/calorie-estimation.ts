import { isFitnessDistanceUnit, isStepDistanceUnit, normalizeFitnessDistanceUnit, type FitnessDistanceUnit } from "@/lib/fitness-distance-units";

export type CaloriesEstimationMethodId =
  | "walking_time_distance"
  | "incline_walk_time_distance"
  | "running_time_distance"
  | "cycling_time_distance"
  | "rowing_time_distance"
  | "elliptical_time"
  | "stair_stepper_time"
  | "steps_based_walk"
  | "manual_only";

export type CalorieEstimationUserProfile = {
  // Future slot for real profile-driven calorie estimates.
  bodyWeightKg?: number | null;
  bodyWeightLbs?: number | null;
};

export type CalorieEstimationContext = {
  userProfile?: CalorieEstimationUserProfile | null;
};

export type CalorieEstimationExerciseInput = {
  name?: string | null;
  slug?: string | null;
  equipment?: string | null;
  movementPattern?: string | null;
  measurementType?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  defaultUnit?: string | null;
  caloriesEstimationMethod?: string | null;
};

export type CalorieEstimateTargetShape = {
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: FitnessDistanceUnit | null;
  calories?: number | null;
};

const DEFAULT_BODY_WEIGHT_KG = 70;

const CALORIES_METHOD_ALIASES: Record<string, CaloriesEstimationMethodId> = {
  bike: "cycling_time_distance",
  biking: "cycling_time_distance",
  cardio_manual_only: "manual_only",
  cycle: "cycling_time_distance",
  cycling: "cycling_time_distance",
  elliptical: "elliptical_time",
  incline_walk: "incline_walk_time_distance",
  incline_walk_time: "incline_walk_time_distance",
  manual: "manual_only",
  manual_only: "manual_only",
  row: "rowing_time_distance",
  rowing: "rowing_time_distance",
  run: "running_time_distance",
  running: "running_time_distance",
  stair_stepper: "stair_stepper_time",
  stairstepper: "stair_stepper_time",
  steps: "steps_based_walk",
  steps_based_walk: "steps_based_walk",
  treadmill_bike: "cycling_time_distance",
  treadmill_run: "running_time_distance",
  treadmill_walk: "walking_time_distance",
  walk: "walking_time_distance",
  walking: "walking_time_distance",
};

function normalizeLookupValue(value: string | null | undefined) {
  return value?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") ?? "";
}

function isPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function getExerciseLookupText(exercise: CalorieEstimationExerciseInput) {
  return [
    normalizeLookupValue(exercise.name),
    normalizeLookupValue(exercise.slug),
    normalizeLookupValue(exercise.equipment),
    normalizeLookupValue(exercise.movementPattern),
  ]
    .filter(Boolean)
    .join(" ");
}

function includesAny(target: string, tokens: string[]) {
  return tokens.some((token) => target.includes(token));
}

function toMiles(distance: number, unit: FitnessDistanceUnit) {
  if (unit === "mi") return distance;
  if (unit === "km") return distance * 0.621371;
  if (unit === "m") return distance / 1609.344;
  return null;
}

function toKilometers(distance: number, unit: FitnessDistanceUnit) {
  if (unit === "km") return distance;
  if (unit === "mi") return distance * 1.609344;
  if (unit === "m") return distance / 1000;
  return null;
}

function resolveBodyWeightKg(context: CalorieEstimationContext | null | undefined) {
  const bodyWeightKg = context?.userProfile?.bodyWeightKg;
  if (isPositiveNumber(bodyWeightKg)) {
    return bodyWeightKg;
  }

  const bodyWeightLbs = context?.userProfile?.bodyWeightLbs;
  if (isPositiveNumber(bodyWeightLbs)) {
    return bodyWeightLbs * 0.45359237;
  }

  return DEFAULT_BODY_WEIGHT_KG;
}

function calculateCaloriesFromMet(args: {
  met: number;
  durationSeconds: number;
  context?: CalorieEstimationContext | null;
}) {
  const minutes = args.durationSeconds / 60;
  if (!isPositiveNumber(minutes) || !isPositiveNumber(args.met)) {
    return null;
  }

  const bodyWeightKg = resolveBodyWeightKg(args.context);
  const estimated = args.met * 3.5 * bodyWeightKg * minutes / 200;
  return estimated > 0 ? Math.max(1, Math.round(estimated)) : null;
}

function estimateWalkingMet(speedMph: number) {
  if (speedMph < 2) return 2.3;
  if (speedMph < 2.5) return 2.8;
  if (speedMph < 3.5) return 3.5;
  if (speedMph < 4.5) return 4.8;
  return 5.5;
}

function estimateRunningMet(speedMph: number) {
  if (speedMph < 5) return 6;
  if (speedMph < 6) return 8.3;
  if (speedMph < 7) return 9.8;
  if (speedMph < 8) return 11;
  if (speedMph < 10) return 11.8;
  return 12.8;
}

function estimateCyclingMet(speedMph: number) {
  if (speedMph < 10) return 4;
  if (speedMph < 12) return 6;
  if (speedMph < 14) return 8;
  if (speedMph < 16) return 10;
  if (speedMph < 19) return 12;
  return 15.8;
}

function estimateRowingMet(distanceKm: number, durationSeconds: number) {
  const pacePer500Seconds = durationSeconds / (distanceKm * 2);
  if (pacePer500Seconds <= 120) return 12;
  if (pacePer500Seconds <= 135) return 10;
  if (pacePer500Seconds <= 150) return 8.5;
  if (pacePer500Seconds <= 180) return 7;
  return 5.5;
}

function estimateStepWalkMet(stepsPerMinute: number) {
  if (stepsPerMinute < 80) return 2.5;
  if (stepsPerMinute < 100) return 3.3;
  if (stepsPerMinute < 120) return 4.3;
  return 5;
}

export function normalizeCaloriesEstimationMethod(rawValue: string | null | undefined): CaloriesEstimationMethodId | null {
  const normalizedValue = normalizeLookupValue(rawValue);
  if (!normalizedValue) {
    return null;
  }

  return CALORIES_METHOD_ALIASES[normalizedValue] ?? null;
}

export function inferCaloriesEstimationMethodFromExercise(
  exercise: CalorieEstimationExerciseInput,
): CaloriesEstimationMethodId | null {
  const explicitMethod = normalizeCaloriesEstimationMethod(exercise.caloriesEstimationMethod);
  if (explicitMethod) {
    return explicitMethod;
  }

  const normalizedDefaultUnit = normalizeFitnessDistanceUnit(exercise.defaultUnit, "mi");
  if (normalizeLookupValue(exercise.defaultUnit) === "steps" || normalizedDefaultUnit === "steps") {
    return "steps_based_walk";
  }

  const lookupText = getExerciseLookupText(exercise);
  if (!lookupText) {
    return null;
  }

  if (includesAny(lookupText, ["stair_stepper", "stairmaster", "stepmill"])) {
    return "stair_stepper_time";
  }

  if (lookupText.includes("elliptical")) {
    return "elliptical_time";
  }

  if (includesAny(lookupText, ["row", "rowing", "erg", "ergometer"])) {
    return "rowing_time_distance";
  }

  if (includesAny(lookupText, ["bike", "cycle", "cycling", "spin"])) {
    return "cycling_time_distance";
  }

  if (includesAny(lookupText, ["incline_walk", "incline_treadmill", "treadmill_incline"])) {
    return "incline_walk_time_distance";
  }

  if (includesAny(lookupText, ["run", "running", "jog", "jogging", "sprint", "treadmill_run"])) {
    return "running_time_distance";
  }

  if (includesAny(lookupText, ["walk", "walking", "treadmill_walk", "hike", "hiking"])) {
    return "walking_time_distance";
  }

  return null;
}

export function resolveCaloriesEstimationMethod(
  exercise: CalorieEstimationExerciseInput,
): CaloriesEstimationMethodId | null {
  return normalizeCaloriesEstimationMethod(exercise.caloriesEstimationMethod)
    ?? inferCaloriesEstimationMethodFromExercise(exercise);
}

export function estimateCaloriesFromExerciseMetrics(args: {
  exercise?: CalorieEstimationExerciseInput | null;
  method?: CaloriesEstimationMethodId | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: FitnessDistanceUnit | null;
  context?: CalorieEstimationContext | null;
}) {
  const method = args.method ?? (args.exercise ? resolveCaloriesEstimationMethod(args.exercise) : null);
  const durationSeconds = isPositiveNumber(args.durationSeconds) ? args.durationSeconds : null;
  if (!method || !durationSeconds || method === "manual_only") {
    return null;
  }

  const distance = isPositiveNumber(args.distance) ? args.distance : null;
  const distanceUnit = args.distanceUnit && isFitnessDistanceUnit(args.distanceUnit)
    ? args.distanceUnit
    : null;
  const hours = durationSeconds / 3600;

  switch (method) {
    case "elliptical_time":
      return calculateCaloriesFromMet({ met: 5.5, durationSeconds, context: args.context });
    case "stair_stepper_time":
      return calculateCaloriesFromMet({ met: 8.8, durationSeconds, context: args.context });
    case "steps_based_walk": {
      if (!distance || !distanceUnit || !isStepDistanceUnit(distanceUnit)) {
        return null;
      }
      const stepsPerMinute = distance / (durationSeconds / 60);
      return calculateCaloriesFromMet({
        met: estimateStepWalkMet(stepsPerMinute),
        durationSeconds,
        context: args.context,
      });
    }
    case "walking_time_distance":
    case "incline_walk_time_distance":
    case "running_time_distance":
    case "cycling_time_distance": {
      if (!distance || !distanceUnit || isStepDistanceUnit(distanceUnit) || hours <= 0) {
        return null;
      }
      const miles = toMiles(distance, distanceUnit);
      if (!isPositiveNumber(miles)) {
        return null;
      }
      const speedMph = miles / hours;
      if (!isPositiveNumber(speedMph)) {
        return null;
      }
      if (method === "walking_time_distance") {
        return calculateCaloriesFromMet({
          met: estimateWalkingMet(speedMph),
          durationSeconds,
          context: args.context,
        });
      }
      if (method === "incline_walk_time_distance") {
        return calculateCaloriesFromMet({
          met: estimateWalkingMet(speedMph) + 1.5,
          durationSeconds,
          context: args.context,
        });
      }
      if (method === "running_time_distance") {
        return calculateCaloriesFromMet({
          met: estimateRunningMet(speedMph),
          durationSeconds,
          context: args.context,
        });
      }
      return calculateCaloriesFromMet({
        met: estimateCyclingMet(speedMph),
        durationSeconds,
        context: args.context,
      });
    }
    case "rowing_time_distance": {
      if (!distance || !distanceUnit || isStepDistanceUnit(distanceUnit)) {
        return null;
      }
      const distanceKm = toKilometers(distance, distanceUnit);
      if (!isPositiveNumber(distanceKm)) {
        return null;
      }
      return calculateCaloriesFromMet({
        met: estimateRowingMet(distanceKm, durationSeconds),
        durationSeconds,
        context: args.context,
      });
    }
    default:
      return null;
  }
}

export function resolveExplicitOrEstimatedCalories(args: {
  exercise?: CalorieEstimationExerciseInput | null;
  method?: CaloriesEstimationMethodId | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: FitnessDistanceUnit | null;
  calories?: number | null;
  context?: CalorieEstimationContext | null;
}) {
  if (isPositiveNumber(args.calories)) {
    return Math.round(args.calories);
  }

  return estimateCaloriesFromExerciseMetrics({
    exercise: args.exercise,
    method: args.method,
    durationSeconds: args.durationSeconds,
    distance: args.distance,
    distanceUnit: args.distanceUnit,
    context: args.context,
  });
}

export function withEstimatedCaloriesForTarget<T extends CalorieEstimateTargetShape>(args: {
  target: T;
  exercise?: CalorieEstimationExerciseInput | null;
  method?: CaloriesEstimationMethodId | null;
  context?: CalorieEstimationContext | null;
}): T {
  const nextCalories = resolveExplicitOrEstimatedCalories({
    exercise: args.exercise,
    method: args.method,
    durationSeconds: args.target.durationSeconds ?? null,
    distance: args.target.distance ?? null,
    distanceUnit: args.target.distanceUnit ?? null,
    calories: args.target.calories ?? null,
    context: args.context,
  });

  if (nextCalories === (args.target.calories ?? null)) {
    return args.target;
  }

  return {
    ...args.target,
    calories: nextCalories,
  };
}
