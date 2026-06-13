import { formatDurationClock } from "@/lib/duration";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { PlannedSetTarget } from "@/lib/set-flow-targets";

function isPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function formatSeriesNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatTargetMetricSeries(values: string[], unitLabel?: string | null) {
  const cleanedValues = values.map((value) => value.trim()).filter(Boolean);
  if (cleanedValues.length === 0) {
    return null;
  }

  return `${cleanedValues.join(" / ")}${unitLabel ? ` ${unitLabel}` : ""}`;
}

function resolveTargetReps(target: PlannedSetTarget) {
  if (isPositiveNumber(target.targetRepsMax)) return target.targetRepsMax;
  if (isPositiveNumber(target.targetRepsMin)) return target.targetRepsMin;
  return null;
}

export function buildPlannedSetTargetSeriesSummary({
  targets,
  weightUnit,
  distanceUnit,
}: {
  targets: PlannedSetTarget[];
  weightUnit?: "lbs" | "kg" | null;
  distanceUnit?: FitnessDistanceUnit | null;
}) {
  const meaningfulTargets = targets.filter((target) => (
    isPositiveNumber(resolveTargetReps(target))
    || isPositiveNumber(target.targetWeight)
    || isPositiveNumber(target.durationSeconds)
    || isPositiveNumber(target.distance)
    || isPositiveNumber(target.calories)
  ));

  if (meaningfulTargets.length === 0) {
    return null;
  }

  const metricParts = [
    formatTargetMetricSeries(
      meaningfulTargets
        .map(resolveTargetReps)
        .filter(isPositiveNumber)
        .map(formatSeriesNumber),
      "reps",
    ),
    formatTargetMetricSeries(
      meaningfulTargets
        .map((target) => target.targetWeight)
        .filter(isPositiveNumber)
        .map(formatSeriesNumber),
      weightUnit ?? "lbs",
    ),
    formatTargetMetricSeries(
      meaningfulTargets
        .map((target) => target.durationSeconds)
        .filter(isPositiveNumber)
        .map(formatDurationClock),
      null,
    ),
    formatTargetMetricSeries(
      meaningfulTargets
        .map((target) => target.distance)
        .filter(isPositiveNumber)
        .map(formatSeriesNumber),
      distanceUnit ?? null,
    ),
    formatTargetMetricSeries(
      meaningfulTargets
        .map((target) => target.calories)
        .filter(isPositiveNumber)
        .map(formatSeriesNumber),
      "cal",
    ),
  ].filter((value): value is string => Boolean(value));

  return metricParts.length > 0 ? metricParts.join(" \u2022 ") : null;
}
