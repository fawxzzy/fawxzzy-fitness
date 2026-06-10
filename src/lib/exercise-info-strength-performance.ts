import type { MetricDatum } from "@/components/ui/MetricItem";
import type { ExerciseAnalyticsFamily } from "@/lib/exercise-analytics-family";
import { positive } from "@/lib/exercise-stats-formatting";
import { formatWeight } from "@/lib/formatting";
import { formatEstimatedOneRepMax } from "@/lib/workout-card-view-models";

export type StrengthPerformanceMetricRow = {
  performedAt: string;
  weight: number | null;
  reps: number | null;
  weightUnit: "lbs" | "lb" | "kg" | null;
};

export function buildStrengthPerformanceMetrics(args: {
  family: ExerciseAnalyticsFamily;
  rows: StrengthPerformanceMetricRow[];
  prEst1rm?: number | null;
  unit?: string | null;
  bestSetSummary?: string | null;
  bestWeight?: number | null;
  bestWeightedReps?: number | null;
  bestBodyweightReps: number;
}) {
  const metrics: MetricDatum[] = [];

  if (args.family === "strength-bodyweight") {
    if (args.bestBodyweightReps > 0) {
      metrics.push({
        label: "Best Reps",
        value: `${args.bestBodyweightReps} reps`,
      });
    }

    if (positive(args.bestWeight) > 0) {
      metrics.push({
        label: "Added Load",
        value: formatWeight(args.bestWeight, args.unit) ?? `${Math.round(positive(args.bestWeight))}`,
      });
    }

    return metrics.slice(0, 4);
  }

  if (positive(args.bestWeight) > 0) {
    metrics.push({
      label: "Best Weight",
      value: formatWeight(args.bestWeight, args.unit) ?? `${Math.round(positive(args.bestWeight))}`,
    });
  }

  if (positive(args.bestWeightedReps) > 0) {
    metrics.push({
      label: "Best Reps",
      value: `${positive(args.bestWeightedReps)} reps`,
    });
  }

  if (args.bestSetSummary) {
    metrics.push({
      label: "Top Set",
      value: args.bestSetSummary,
    });
  }

  const estimatedOneRepMax = formatEstimatedOneRepMax(args.prEst1rm, args.unit);
  if (estimatedOneRepMax) {
    metrics.push({
      label: "Max Estimate",
      value: estimatedOneRepMax,
    });
  }

  return metrics.slice(0, 4);
}
