import type { MetricDatum } from "@/components/ui/MetricItem";
import { formatCalories, formatDistance, formatDurationShort, positive } from "@/lib/exercise-stats-formatting";
import { formatWeight } from "@/lib/formatting";

export type ExerciseInfoMeasurementRow = {
  reps?: number | null;
  weight?: number | null;
  weightUnit?: string | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: "mi" | "km" | "m" | "steps" | null;
  calories?: number | null;
};

type MeasurementDimension = "reps" | "weight" | "time" | "distance" | "calories";

function resolveObservedDimensions(metrics: MetricDatum[]) {
  const dimensions = new Set<MeasurementDimension>();

  for (const metric of metrics) {
    const label = metric.label.trim().toLowerCase();
    if (!label) {
      continue;
    }

    if (label.includes("rep")) {
      dimensions.add("reps");
    }
    if (label.includes("weight") || label.includes("load")) {
      dimensions.add("weight");
    }
    if (label.includes("time") || label.includes("hold")) {
      dimensions.add("time");
    }
    if (label.includes("distance")) {
      dimensions.add("distance");
    }
    if (label.includes("calor")) {
      dimensions.add("calories");
    }
  }

  return dimensions;
}

export function buildObservedMeasurementMetrics(args: {
  rows: ExerciseInfoMeasurementRow[];
  existingMetrics: MetricDatum[];
}) {
  const observedDimensions = resolveObservedDimensions(args.existingMetrics);
  const metrics: MetricDatum[] = [];

  const bestWeightRow = args.rows.reduce<ExerciseInfoMeasurementRow | null>((best, row) => {
    const currentWeight = positive(row.weight);
    const bestWeight = positive(best?.weight);
    return currentWeight > bestWeight ? row : best;
  }, null);
  const bestWeight = positive(bestWeightRow?.weight);
  if (!observedDimensions.has("weight") && bestWeight > 0) {
    metrics.push({
      label: "Best Weight",
      value: formatWeight(bestWeight, bestWeightRow?.weightUnit ?? null) ?? `${Math.round(bestWeight)}`,
    });
  }

  const bestReps = args.rows.reduce((max, row) => Math.max(max, positive(row.reps)), 0);
  if (!observedDimensions.has("reps") && bestReps > 0) {
    metrics.push({
      label: "Best Reps",
      value: `${bestReps} reps`,
    });
  }

  const bestDurationSeconds = args.rows.reduce((max, row) => Math.max(max, positive(row.durationSeconds)), 0);
  if (!observedDimensions.has("time") && bestDurationSeconds > 0) {
    const bestTimeLabel = formatDurationShort(bestDurationSeconds);
    if (bestTimeLabel) {
      metrics.push({
        label: "Best Time",
        value: bestTimeLabel,
      });
    }
  }

  const bestDistanceRow = args.rows.reduce<ExerciseInfoMeasurementRow | null>((best, row) => {
    const currentDistance = positive(row.distance);
    const bestDistance = positive(best?.distance);
    return currentDistance > bestDistance ? row : best;
  }, null);
  const bestDistance = positive(bestDistanceRow?.distance);
  if (!observedDimensions.has("distance") && bestDistance > 0) {
    const bestDistanceLabel = formatDistance(bestDistance, bestDistanceRow?.distanceUnit ?? null);
    if (bestDistanceLabel) {
      metrics.push({
        label: "Best Distance",
        value: bestDistanceLabel,
      });
    }
  }

  const bestCalories = args.rows.reduce((max, row) => Math.max(max, positive(row.calories)), 0);
  if (!observedDimensions.has("calories") && bestCalories > 0) {
    metrics.push({
      label: "Best Calories",
      value: formatCalories(bestCalories) ?? `${Math.round(bestCalories)}`,
    });
  }

  return metrics;
}
