import { isBodyweightExercise, isCardioExercise, normalizeExerciseMeasurementType, type ExerciseMetadataInput } from "@/lib/exercise-metadata";

export type ExerciseAnalyticsFamily =
  | "strength-loaded"
  | "strength-bodyweight"
  | "timed-hold"
  | "cardio-endurance"
  | "cardio-distance"
  | "cardio-steps"
  | "cardio-calories";

type PresentationKind = "strength" | "bodyweight" | "cardio" | "timed";

const EXPLICIT_CARDIO_TOKENS = new Set([
  "cardio",
  "treadmill",
  "bike",
  "bicycle",
  "cycling",
  "row",
  "rowing",
  "elliptical",
  "stepper",
  "stair",
  "stairs",
  "run",
  "running",
  "walk",
  "walking",
  "gait",
  "cardio machine",
]);

export type ExerciseAnalyticsFamilyInput = ExerciseMetadataInput & {
  presentationKind?: PresentationKind | null;
  defaultUnit?: string | null;
  distanceUnit?: string | null;
};

function normalizeUnit(value: string | null | undefined) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function hasExplicitCardioIdentity(input: ExerciseAnalyticsFamilyInput | null | undefined) {
  const values = [
    input?.kind,
    input?.type,
    input?.equipment,
    input?.movement_pattern,
    input?.primary_muscle,
  ]
    .map((value) => normalizeUnit(value))
    .filter(Boolean);

  const tagValues = [
    ...(Array.isArray(input?.tags) ? input.tags : String(input?.tags ?? "").split(",")),
    ...(Array.isArray(input?.categories) ? input.categories : String(input?.categories ?? "").split(",")),
  ]
    .map((value) => normalizeUnit(value))
    .filter(Boolean);

  return [...values, ...tagValues].some((value) => EXPLICIT_CARDIO_TOKENS.has(value));
}

export function resolveExerciseAnalyticsFamily(input: ExerciseAnalyticsFamilyInput | null | undefined): ExerciseAnalyticsFamily {
  const measurementType = normalizeExerciseMeasurementType(input);
  const normalizedMeasurementType = typeof measurementType === "string" ? measurementType.trim().toLowerCase() : "";
  const presentationKind = input?.presentationKind ?? null;
  const normalizedDefaultUnit = normalizeUnit(input?.defaultUnit);
  const normalizedDistanceUnit = normalizeUnit(input?.distanceUnit);
  const cardio = presentationKind === "cardio" || isCardioExercise(input);
  const explicitCardioIdentity = hasExplicitCardioIdentity(input) || input?.isCardio === true;

  if (presentationKind === "bodyweight" || (!cardio && isBodyweightExercise(input))) {
    return "strength-bodyweight";
  }

  if (presentationKind === "timed") {
    return "timed-hold";
  }

  if ((normalizedMeasurementType === "time" || normalizedMeasurementType === "duration") && !explicitCardioIdentity) {
    return "timed-hold";
  }

  if (cardio) {
    if (normalizedDistanceUnit === "steps" || normalizedDefaultUnit === "steps") {
      return "cardio-steps";
    }

    if (normalizedMeasurementType === "calories") {
      return "cardio-calories";
    }

    if (normalizedMeasurementType === "distance") {
      return "cardio-distance";
    }

    return "cardio-endurance";
  }

  if (normalizedMeasurementType === "time" || normalizedMeasurementType === "duration") {
    return "timed-hold";
  }

  return "strength-loaded";
}

export function mapExerciseAnalyticsFamilyToPresentationKind(family: ExerciseAnalyticsFamily): PresentationKind {
  switch (family) {
    case "strength-bodyweight":
      return "bodyweight";
    case "timed-hold":
      return "timed";
    case "cardio-endurance":
    case "cardio-distance":
    case "cardio-steps":
    case "cardio-calories":
      return "cardio";
    default:
      return "strength";
  }
}
