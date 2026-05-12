import type { ProgressionMeasurementType } from "@/lib/progression-playbooks";

export const CARDIO_VECTOR_MODES = [
  "duration",
  "distance",
  "hold_duration_increase_distance",
  "hold_distance_reduce_duration",
  "calories",
  "incline",
  "resistance",
  "pace",
  "zone",
] as const;

export type CardioVectorMode = (typeof CARDIO_VECTOR_MODES)[number];

type CardioMeasurementType = Extract<ProgressionMeasurementType, "time" | "distance" | "time_distance">;

export type CardioVectorConfig = {
  measurementType?: ProgressionMeasurementType | string | null;
  cardioVectorMode?: unknown;
  durationSeconds?: number | null;
  distance?: number | null;
  calories?: number | null;
  targetWeight?: number | null;
};

const CARDIO_VECTOR_MODE_SET = new Set<CardioVectorMode>(CARDIO_VECTOR_MODES);

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeMeasurementType(
  value: ProgressionMeasurementType | string | null | undefined,
): ProgressionMeasurementType | null {
  if (value === "reps" || value === "time" || value === "distance" || value === "time_distance" || value === "none") {
    return value;
  }

  return null;
}

export function isCardioMeasurementType(
  measurementType: ProgressionMeasurementType | string | null | undefined,
): measurementType is CardioMeasurementType {
  const normalized = normalizeMeasurementType(measurementType);
  return normalized === "time" || normalized === "distance" || normalized === "time_distance";
}

export function normalizeCardioVectorMode(value: unknown): CardioVectorMode | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return CARDIO_VECTOR_MODE_SET.has(normalized as CardioVectorMode)
    ? normalized as CardioVectorMode
    : null;
}

function inferCardioVectorModeFromMeasurementType(measurementType: CardioMeasurementType | null): CardioVectorMode | null {
  switch (measurementType) {
  case "time":
    return "duration";
  case "distance":
    return "distance";
  case "time_distance":
    return "hold_duration_increase_distance";
  default:
    return null;
  }
}

export function inferCardioVectorMode(args: CardioVectorConfig): CardioVectorMode | null {
  const measurementType = normalizeMeasurementType(args.measurementType);
  if (isCardioMeasurementType(measurementType)) {
    return inferCardioVectorModeFromMeasurementType(measurementType);
  }

  if (isPositiveNumber(args.durationSeconds) && isPositiveNumber(args.distance)) {
    return "hold_duration_increase_distance";
  }

  if (isPositiveNumber(args.distance)) {
    return "distance";
  }

  if (isPositiveNumber(args.durationSeconds)) {
    return "duration";
  }

  if (isPositiveNumber(args.calories)) {
    return "calories";
  }

  return null;
}

export function resolveCardioVectorMode(args: CardioVectorConfig): CardioVectorMode | null {
  const measurementType = normalizeMeasurementType(args.measurementType);
  if (!isCardioMeasurementType(measurementType)) {
    return null;
  }

  const configuredMode = normalizeCardioVectorMode(args.cardioVectorMode);
  if (configuredMode) {
    return configuredMode;
  }

  return inferCardioVectorMode({
    measurementType,
    durationSeconds: args.durationSeconds,
    distance: args.distance,
    calories: args.calories,
  });
}

export function doesCardioVectorModeUseDuration(mode: CardioVectorMode | null | undefined) {
  return mode === "duration"
    || mode === "hold_duration_increase_distance"
    || mode === "hold_distance_reduce_duration"
    || mode === "pace";
}

export function doesCardioVectorModeUseDistance(mode: CardioVectorMode | null | undefined) {
  return mode === "distance"
    || mode === "hold_duration_increase_distance"
    || mode === "hold_distance_reduce_duration"
    || mode === "pace";
}

export function doesCardioVectorModeUseCalories(mode: CardioVectorMode | null | undefined) {
  return mode === "calories";
}

export function doesCardioVectorModeIgnoreLoad(mode: CardioVectorMode | null | undefined) {
  return mode != null;
}

export function shouldIgnoreCardioLoad(args: CardioVectorConfig) {
  return doesCardioVectorModeIgnoreLoad(resolveCardioVectorMode(args));
}
