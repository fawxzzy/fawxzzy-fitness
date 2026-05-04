import type { ExerciseStatsRow } from "@/lib/exercise-stats";
import { formatCalories, formatDistance } from "@/lib/exercise-stats-formatting";
import { formatDurationPreview } from "@/lib/duration";
import { formatDateShort, formatWeight } from "@/lib/formatting";

export type SessionTargetHintMeasurementType = "reps" | "time" | "distance" | "time_distance" | "none";

export type SessionTargetHintPlan = {
  measurementType: SessionTargetHintMeasurementType;
  repsMin?: number | null;
  repsMax?: number | null;
  weightMin?: number | null;
  weightMax?: number | null;
  weightUnit?: "lbs" | "kg" | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: "mi" | "km" | "m" | null;
  calories?: number | null;
};

export type SessionTargetHintSuggestedValues = {
  measurementType: SessionTargetHintMeasurementType;
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: "mi" | "km" | "m" | null;
  calories: number | null;
  weightUnit: "lbs" | "kg" | null;
};

export type SessionTargetHint = {
  shortLabel: string;
  reason: string;
  source: "planned_target" | "last_performance" | "recent_best" | "no_history";
  confidence: "high" | "medium" | "low";
  suggestedValues: SessionTargetHintSuggestedValues;
  lastSummary: string | null;
  lastSuggestedValues: SessionTargetHintSuggestedValues | null;
  lastPerformedAt: string | null;
  lastPerformedAtLabel: string | null;
  recentBestSummary: string | null;
  recentBestSuggestedValues: SessionTargetHintSuggestedValues | null;
  recentBestPerformedAt: string | null;
  recentBestPerformedAtLabel: string | null;
};

function isPositiveNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function resolveSingleValue(min?: number | null, max?: number | null) {
  if (isPositiveNumber(max)) {
    return max;
  }

  if (isPositiveNumber(min)) {
    return min;
  }

  return null;
}

function formatReps(value: number | null | undefined) {
  if (!isPositiveNumber(value)) {
    return null;
  }

  return Number.isInteger(value) ? `${value} reps` : `${value.toFixed(1).replace(/\.0$/, "")} reps`;
}

function formatWeightReps(weight: number | null | undefined, reps: number | null | undefined, unit: string | null | undefined) {
  const weightLabel = formatWeight(weight, unit ?? null);
  const repsLabel = formatReps(reps);

  if (weightLabel && repsLabel) {
    return `${weightLabel} x ${repsLabel.replace(" reps", "")}`;
  }

  return weightLabel ?? repsLabel;
}

function formatPlannedSummary(plan: SessionTargetHintPlan, fallbackWeightUnit: "lbs" | "kg") {
  if (plan.measurementType === "none") {
    return null;
  }

  if (plan.measurementType === "reps") {
    return formatWeightReps(
      resolveSingleValue(plan.weightMin, plan.weightMax),
      resolveSingleValue(plan.repsMin, plan.repsMax),
      plan.weightUnit ?? fallbackWeightUnit,
    );
  }

  const parts = [
    isPositiveNumber(plan.durationSeconds) ? formatDurationPreview(plan.durationSeconds) : null,
    isPositiveNumber(plan.distance) ? formatDistance(plan.distance, plan.distanceUnit) : null,
    isPositiveNumber(plan.calories) ? formatCalories(plan.calories) : null,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function formatLastSummary(
  measurementType: SessionTargetHintMeasurementType,
  stats: ExerciseStatsRow | null | undefined,
  fallbackWeightUnit: "lbs" | "kg",
) {
  if (!stats) {
    return null;
  }

  if (measurementType === "reps" || measurementType === "none") {
    return formatWeightReps(stats.last_weight, stats.last_reps, stats.last_unit ?? fallbackWeightUnit);
  }

  return null;
}

function formatRecentBestSummary(
  measurementType: SessionTargetHintMeasurementType,
  stats: ExerciseStatsRow | null | undefined,
  fallbackWeightUnit: "lbs" | "kg",
) {
  if (!stats) {
    return null;
  }

  if (measurementType === "reps" || measurementType === "none") {
    return formatWeightReps(stats.actual_pr_weight, stats.actual_pr_reps, stats.last_unit ?? fallbackWeightUnit);
  }

  return null;
}

function buildSuggestedValuesFromPlan(
  plan: SessionTargetHintPlan,
  fallbackWeightUnit: "lbs" | "kg",
): SessionTargetHintSuggestedValues {
  return {
    measurementType: plan.measurementType,
    weight: resolveSingleValue(plan.weightMin, plan.weightMax),
    reps: resolveSingleValue(plan.repsMin, plan.repsMax),
    durationSeconds: isPositiveNumber(plan.durationSeconds) ? plan.durationSeconds : null,
    distance: isPositiveNumber(plan.distance) ? plan.distance : null,
    distanceUnit: isPositiveNumber(plan.distance) ? (plan.distanceUnit ?? null) : null,
    calories: isPositiveNumber(plan.calories) ? plan.calories : null,
    weightUnit: plan.weightUnit ?? fallbackWeightUnit,
  };
}

function buildSuggestedValuesFromLastPerformance(
  measurementType: SessionTargetHintMeasurementType,
  stats: ExerciseStatsRow,
  fallbackWeightUnit: "lbs" | "kg",
): SessionTargetHintSuggestedValues {
  return {
    measurementType,
    weight: isPositiveNumber(stats.last_weight) ? stats.last_weight : null,
    reps: isPositiveNumber(stats.last_reps) ? stats.last_reps : null,
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
    weightUnit: (stats.last_unit === "kg" || stats.last_unit === "lb" || stats.last_unit === "lbs")
      ? (stats.last_unit === "kg" ? "kg" : "lbs")
      : fallbackWeightUnit,
  };
}

function buildSuggestedValuesFromRecentBest(
  measurementType: SessionTargetHintMeasurementType,
  stats: ExerciseStatsRow,
  fallbackWeightUnit: "lbs" | "kg",
): SessionTargetHintSuggestedValues | null {
  const hasWeight = isPositiveNumber(stats.actual_pr_weight);
  const hasReps = isPositiveNumber(stats.actual_pr_reps);

  if (!hasWeight && !hasReps) {
    return null;
  }

  return {
    measurementType,
    weight: hasWeight ? stats.actual_pr_weight : null,
    reps: hasReps ? stats.actual_pr_reps : null,
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
    weightUnit: (stats.last_unit === "kg" || stats.last_unit === "lb" || stats.last_unit === "lbs")
      ? (stats.last_unit === "kg" ? "kg" : "lbs")
      : fallbackWeightUnit,
  };
}

function buildFallbackValues(
  measurementType: SessionTargetHintMeasurementType,
  fallbackWeightUnit: "lbs" | "kg",
): SessionTargetHintSuggestedValues {
  return {
    measurementType,
    weight: null,
    reps: null,
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
    weightUnit: fallbackWeightUnit,
  };
}

export function deriveSessionTargetHint(args: {
  measurementType: SessionTargetHintMeasurementType;
  plan: SessionTargetHintPlan | null;
  stats: ExerciseStatsRow | null | undefined;
  fallbackWeightUnit: "lbs" | "kg";
}): SessionTargetHint {
  const { measurementType, plan, stats, fallbackWeightUnit } = args;
  const plannedSummary = plan ? formatPlannedSummary(plan, fallbackWeightUnit) : null;
  const lastSummary = formatLastSummary(measurementType, stats, fallbackWeightUnit);
  const recentBestSummary = formatRecentBestSummary(measurementType, stats, fallbackWeightUnit);
  const lastSuggestedValues = stats ? buildSuggestedValuesFromLastPerformance(measurementType, stats, fallbackWeightUnit) : null;
  const recentBestSuggestedValues = stats ? buildSuggestedValuesFromRecentBest(measurementType, stats, fallbackWeightUnit) : null;
  const lastPerformedAt = stats?.last_performed_at ?? null;
  const recentBestPerformedAt = stats?.actual_pr_at ?? null;

  if (plannedSummary && plan) {
    return {
      shortLabel: plannedSummary,
      reason: lastSummary
        ? "Using the planned target and keeping your last logged performance visible inline."
        : "Using the planned target because no completed history is available yet.",
      source: "planned_target",
      confidence: "high",
      suggestedValues: buildSuggestedValuesFromPlan(plan, fallbackWeightUnit),
      lastSummary,
      lastSuggestedValues,
      lastPerformedAt,
      lastPerformedAtLabel: lastPerformedAt ? formatDateShort(lastPerformedAt) : null,
      recentBestSummary,
      recentBestSuggestedValues,
      recentBestPerformedAt,
      recentBestPerformedAtLabel: recentBestPerformedAt ? formatDateShort(recentBestPerformedAt) : null,
    };
  }

  if (lastSummary && stats) {
    return {
      shortLabel: `Repeat ${lastSummary}`,
      reason: "No explicit plan target was set, so the next hint repeats the last completed performance.",
      source: "last_performance",
      confidence: "medium",
      suggestedValues: buildSuggestedValuesFromLastPerformance(measurementType, stats, fallbackWeightUnit),
      lastSummary,
      lastSuggestedValues,
      lastPerformedAt,
      lastPerformedAtLabel: lastPerformedAt ? formatDateShort(lastPerformedAt) : null,
      recentBestSummary,
      recentBestSuggestedValues,
      recentBestPerformedAt,
      recentBestPerformedAtLabel: recentBestPerformedAt ? formatDateShort(recentBestPerformedAt) : null,
    };
  }

  if (recentBestSummary) {
    return {
      shortLabel: recentBestSummary,
      reason: "Completed history exists, but the strongest reusable signal is the recent best rather than a stored plan target.",
      source: "recent_best",
      confidence: "low",
      suggestedValues: recentBestSuggestedValues ?? buildFallbackValues(measurementType, fallbackWeightUnit),
      lastSummary,
      lastSuggestedValues,
      lastPerformedAt,
      lastPerformedAtLabel: lastPerformedAt ? formatDateShort(lastPerformedAt) : null,
      recentBestSummary,
      recentBestSuggestedValues,
      recentBestPerformedAt,
      recentBestPerformedAtLabel: recentBestPerformedAt ? formatDateShort(recentBestPerformedAt) : null,
    };
  }

  return {
    shortLabel: "No history yet",
    reason: "No completed history or explicit target is available for this exercise yet.",
    source: "no_history",
    confidence: "low",
    suggestedValues: buildFallbackValues(measurementType, fallbackWeightUnit),
    lastSummary,
    lastSuggestedValues,
    lastPerformedAt,
    lastPerformedAtLabel: lastPerformedAt ? formatDateShort(lastPerformedAt) : null,
    recentBestSummary,
    recentBestSuggestedValues,
    recentBestPerformedAt,
    recentBestPerformedAtLabel: recentBestPerformedAt ? formatDateShort(recentBestPerformedAt) : null,
  };
}
