import type { MetricDatum } from "@/components/ui/MetricItem";
import { positive } from "@/lib/exercise-stats-formatting";
import { formatWeight } from "@/lib/formatting";

export type StrengthProgressSession = {
  weight: number;
  reps: number;
  unit: string | null;
  bodyweightReps: number;
};

function buildStrengthRepProgressMetric(args: {
  latest: StrengthProgressSession | null;
  previous: StrengthProgressSession | null;
}): MetricDatum | null {
  const latestWeightedReps = positive(args.latest?.weight) > 0 ? positive(args.latest?.reps) : 0;
  const previousWeightedReps = positive(args.previous?.weight) > 0 ? positive(args.previous?.reps) : 0;
  const latestBodyweightReps = positive(args.latest?.weight) === 0 ? positive(args.latest?.bodyweightReps) : 0;
  const previousBodyweightReps = positive(args.previous?.weight) === 0 ? positive(args.previous?.bodyweightReps) : 0;

  const latestReps = latestWeightedReps > 0 ? latestWeightedReps : latestBodyweightReps;
  const previousReps = previousWeightedReps > 0 ? previousWeightedReps : previousBodyweightReps;
  if (latestReps <= 0) {
    return null;
  }

  if (previousReps <= 0) {
    return {
      label: "Reps",
      value: `${latestReps}`,
    };
  }

  const delta = latestReps - previousReps;
  return {
    label: "Reps",
    value: `${Math.abs(delta)}`,
    valuePrefix: delta > 0 ? "\u2191" : delta < 0 ? "\u2193" : "\u2192",
    valueTone: delta > 0 ? "success" : delta < 0 ? "danger" : "muted",
  };
}

function buildStrengthWeightProgressMetric(args: {
  latest: StrengthProgressSession | null;
  previous: StrengthProgressSession | null;
}): MetricDatum | null {
  const latestWeight = positive(args.latest?.weight);
  const previousWeight = positive(args.previous?.weight);
  const normalizedUnit = args.latest?.unit ?? args.previous?.unit ?? null;

  if (latestWeight <= 0) {
    return null;
  }

  if (previousWeight <= 0) {
    return {
      label: "Weight",
      value: formatWeight(latestWeight, normalizedUnit) ?? `${Math.round(latestWeight)}`,
    };
  }

  const zeroWeightLabel = normalizedUnit === "kg"
    ? "0 kg"
    : normalizedUnit === "lb" || normalizedUnit === "lbs"
      ? "0 lbs"
      : "0";

  if (latestWeight === previousWeight) {
    return {
      label: "Weight",
      value: zeroWeightLabel,
      valuePrefix: "\u2192",
      valueTone: "muted",
    };
  }

  const delta = latestWeight - previousWeight;
  return {
    label: "Weight",
    value: formatWeight(Math.abs(delta), normalizedUnit) ?? `${Math.round(Math.abs(delta))}`,
    valuePrefix: delta > 0 ? "\u2191" : "\u2193",
    valueTone: delta > 0 ? "success" : "danger",
  };
}

export function buildStrengthProgressMetrics(args: {
  latest: StrengthProgressSession | null;
  previous: StrengthProgressSession | null;
}) {
  return [
    buildStrengthRepProgressMetric(args),
    buildStrengthWeightProgressMetric(args),
  ].filter((item): item is MetricDatum => Boolean(item));
}
