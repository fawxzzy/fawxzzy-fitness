import { normalizeCardioVectorMode, type CardioVectorMode } from "@/lib/cardio-progression-vectors";
import type { ProgressionMeasurementType } from "@/lib/progression-playbooks";

export const PROGRESSION_MEASUREMENT_KEYS = [
  "reps",
  "weight",
  "time",
  "distance",
  "calories",
] as const;

export type ProgressionMeasurementKey = (typeof PROGRESSION_MEASUREMENT_KEYS)[number];
export type PromotionMeasurementKey =
  | ProgressionMeasurementKey
  | "reps_weight"
  | "time_distance"
  | "custom"
  | "none";

export type ProgressionActiveMeasurementTargetInput = {
  measurementType?: ProgressionMeasurementType | string | null;
  cardioVectorMode?: CardioVectorMode | string | null;
  repsTarget?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
  weightTarget?: number | null;
  weightMin?: number | null;
  weightMax?: number | null;
  durationSeconds?: number | null;
  timeSeconds?: number | null;
  timeSecondsMin?: number | null;
  timeSecondsMax?: number | null;
  distance?: number | null;
  distanceMin?: number | null;
  distanceMax?: number | null;
  calories?: number | null;
  caloriesMin?: number | null;
  caloriesMax?: number | null;
};

export const PROGRESSION_MEASUREMENT_LABELS: Record<ProgressionMeasurementKey, string> = {
  reps: "Reps",
  weight: "Weight",
  time: "Time",
  distance: "Distance",
  calories: "Calories",
};

const PROGRESSION_MEASUREMENT_KEY_SET = new Set<ProgressionMeasurementKey>(PROGRESSION_MEASUREMENT_KEYS);

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

function coerceMeasurementKey(value: unknown): ProgressionMeasurementKey | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return PROGRESSION_MEASUREMENT_KEY_SET.has(normalized as ProgressionMeasurementKey)
    ? normalized as ProgressionMeasurementKey
    : null;
}

function hasRepTarget(targets: ProgressionActiveMeasurementTargetInput) {
  return isPositiveNumber(targets.repsTarget)
    || isPositiveNumber(targets.repsMin)
    || isPositiveNumber(targets.repsMax);
}

function hasWeightTarget(targets: ProgressionActiveMeasurementTargetInput) {
  return isPositiveNumber(targets.weightTarget)
    || isPositiveNumber(targets.weightMin)
    || isPositiveNumber(targets.weightMax);
}

function hasTimeTarget(targets: ProgressionActiveMeasurementTargetInput) {
  return isPositiveNumber(targets.durationSeconds)
    || isPositiveNumber(targets.timeSeconds)
    || isPositiveNumber(targets.timeSecondsMin)
    || isPositiveNumber(targets.timeSecondsMax);
}

function hasDistanceTarget(targets: ProgressionActiveMeasurementTargetInput) {
  return isPositiveNumber(targets.distance)
    || isPositiveNumber(targets.distanceMin)
    || isPositiveNumber(targets.distanceMax);
}

function hasCaloriesTarget(targets: ProgressionActiveMeasurementTargetInput) {
  return isPositiveNumber(targets.calories)
    || isPositiveNumber(targets.caloriesMin)
    || isPositiveNumber(targets.caloriesMax);
}

function getHierarchyRank(
  key: ProgressionMeasurementKey,
  cardioVectorMode: CardioVectorMode | null,
) {
  switch (key) {
  case "reps":
    return 10;
  case "weight":
    return 20;
  case "time":
    if (cardioVectorMode === "hold_duration_increase_distance") {
      return 40;
    }
    return 30;
  case "distance":
    if (cardioVectorMode === "hold_duration_increase_distance") {
      return 30;
    }
    if (cardioVectorMode === "hold_distance_reduce_duration") {
      return 40;
    }
    return 40;
  case "calories":
    return 50;
  }
}

export function detectActiveMeasurementsFromTargets(
  targets: ProgressionActiveMeasurementTargetInput | null | undefined,
): ProgressionMeasurementKey[] {
  if (!targets) {
    return [];
  }

  const measurementType = normalizeMeasurementType(targets.measurementType);
  if (measurementType === "none") {
    return [];
  }

  const detected: ProgressionMeasurementKey[] = [];
  if (hasRepTarget(targets)) {
    detected.push("reps");
  }
  if (hasWeightTarget(targets)) {
    detected.push("weight");
  }
  if (hasTimeTarget(targets)) {
    detected.push("time");
  }
  if (hasDistanceTarget(targets)) {
    detected.push("distance");
  }
  if (hasCaloriesTarget(targets)) {
    detected.push("calories");
  }

  if (detected.length === 0) {
    return [];
  }

  return [...detected];
}

export function hasActiveMeasurement(
  targets: ProgressionActiveMeasurementTargetInput | null | undefined,
  measurement: ProgressionMeasurementKey,
) {
  return detectActiveMeasurementsFromTargets(targets).includes(measurement);
}

export function sortPromotionMeasurementsByHierarchy(args: {
  measurements: Iterable<ProgressionMeasurementKey>;
  cardioVectorMode?: CardioVectorMode | string | null;
}) {
  const cardioVectorMode = normalizeCardioVectorMode(args.cardioVectorMode);
  return [...args.measurements].sort((left, right) => {
    const leftRank = getHierarchyRank(left, cardioVectorMode);
    const rightRank = getHierarchyRank(right, cardioVectorMode);
    return leftRank !== rightRank ? leftRank - rightRank : left.localeCompare(right);
  });
}

export function normalizePromotionMeasurements(args: {
  measurements: Iterable<unknown> | null | undefined;
  activeMeasurements?: Iterable<ProgressionMeasurementKey> | null;
}) {
  const activeMeasurements = args.activeMeasurements ? new Set(args.activeMeasurements) : null;
  const normalized = new Set<ProgressionMeasurementKey>();

  for (const rawMeasurement of args.measurements ?? []) {
    const measurement = coerceMeasurementKey(rawMeasurement);
    if (!measurement) {
      continue;
    }
    if (activeMeasurements && !activeMeasurements.has(measurement)) {
      continue;
    }
    normalized.add(measurement);
  }

  return sortPromotionMeasurementsByHierarchy({ measurements: normalized });
}

export function usesMeasurementForPromotion(args: {
  measurements: Iterable<unknown> | null | undefined;
  measurement: ProgressionMeasurementKey;
  activeMeasurements?: Iterable<ProgressionMeasurementKey> | null;
}) {
  return normalizePromotionMeasurements({
    measurements: args.measurements,
    activeMeasurements: args.activeMeasurements,
  }).includes(args.measurement);
}

export function getPromotionMeasurementKey(args: {
  measurements: Iterable<unknown> | null | undefined;
  activeMeasurements?: Iterable<ProgressionMeasurementKey> | null;
  cardioVectorMode?: CardioVectorMode | string | null;
}): PromotionMeasurementKey {
  const measurements = sortPromotionMeasurementsByHierarchy({
    measurements: normalizePromotionMeasurements({
      measurements: args.measurements,
      activeMeasurements: args.activeMeasurements,
    }),
    cardioVectorMode: args.cardioVectorMode,
  });

  if (measurements.length === 0) {
    return "none";
  }

  if (measurements.length === 1) {
    return measurements[0];
  }

  if (measurements.length === 2 && measurements[0] === "reps" && measurements[1] === "weight") {
    return "reps_weight";
  }

  if (
    measurements.length === 2
    && ((measurements[0] === "time" && measurements[1] === "distance") || (measurements[0] === "distance" && measurements[1] === "time"))
  ) {
    return "time_distance";
  }

  return "custom";
}

export function getActiveMeasurementLabels(
  targets: ProgressionActiveMeasurementTargetInput | null | undefined,
) {
  return detectActiveMeasurementsFromTargets(targets).map((measurement) => PROGRESSION_MEASUREMENT_LABELS[measurement]);
}
