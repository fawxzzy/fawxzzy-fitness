import { normalizeCardioVectorMode, resolveCardioVectorMode } from "@/lib/cardio-progression-vectors";

export type HistoryGraphMetricKey = "reps" | "weight" | "time" | "distance" | "calories";

export function resolveHistoryGraphMetricKey(args: {
  kind: "strength" | "cardio";
  measurementType?: string | null;
  cardioVectorMode?: unknown;
  targetDurationSeconds?: number | null;
  targetDistance?: number | null;
  targetCalories?: number | null;
  latestWeight?: number | null;
  latestDurationSeconds?: number | null;
  latestDistance?: number | null;
  latestCalories?: number | null;
}): HistoryGraphMetricKey {
  if (args.kind === "strength") {
    return typeof args.latestWeight === "number" && Number.isFinite(args.latestWeight) && args.latestWeight > 0
      ? "weight"
      : "reps";
  }

  const normalizedMeasurementType = String(args.measurementType ?? "").trim().toLowerCase();
  const targetDuration = typeof args.targetDurationSeconds === "number" && Number.isFinite(args.targetDurationSeconds)
    ? args.targetDurationSeconds
    : 0;
  const targetDistance = typeof args.targetDistance === "number" && Number.isFinite(args.targetDistance)
    ? args.targetDistance
    : 0;
  const targetCalories = typeof args.targetCalories === "number" && Number.isFinite(args.targetCalories)
    ? args.targetCalories
    : 0;
  const latestDuration = typeof args.latestDurationSeconds === "number" && Number.isFinite(args.latestDurationSeconds)
    ? args.latestDurationSeconds
    : 0;
  const latestDistance = typeof args.latestDistance === "number" && Number.isFinite(args.latestDistance)
    ? args.latestDistance
    : 0;
  const latestCalories = typeof args.latestCalories === "number" && Number.isFinite(args.latestCalories)
    ? args.latestCalories
    : 0;

  if (latestDuration > 0) {
    return "time";
  }

  if (latestDistance > 0) {
    return "distance";
  }

  if (latestCalories > 0 && latestDuration <= 0 && latestDistance <= 0) {
    return "calories";
  }

  if (targetDuration > 0) {
    return "time";
  }

  if (targetDistance > 0) {
    return "distance";
  }

  if (targetCalories > 0 && targetDuration <= 0 && targetDistance <= 0) {
    return "calories";
  }

  const configuredCardioVectorMode = normalizeCardioVectorMode(args.cardioVectorMode);
  if (normalizedMeasurementType === "time_distance") {
    switch (configuredCardioVectorMode) {
      case "distance":
      case "hold_duration_increase_distance":
        return "distance";
      case "duration":
      case "hold_distance_reduce_duration":
      case "pace":
        return "time";
      case "calories":
        return "calories";
      default:
        return "time";
    }
  }

  const cardioVectorMode = resolveCardioVectorMode({
    measurementType: args.measurementType,
    cardioVectorMode: args.cardioVectorMode,
    durationSeconds: args.targetDurationSeconds ?? args.latestDurationSeconds ?? null,
    distance: args.targetDistance ?? args.latestDistance ?? null,
    calories: args.targetCalories ?? args.latestCalories ?? null,
  });

  switch (cardioVectorMode) {
    case "distance":
    case "hold_duration_increase_distance":
      return "distance";
    case "duration":
    case "hold_distance_reduce_duration":
    case "pace":
      return "time";
    case "calories":
      return "calories";
    default:
      break;
  }

  if (normalizedMeasurementType === "distance") {
    return "distance";
  }

  if (normalizedMeasurementType === "calories") {
    return "calories";
  }

  return "time";
}
