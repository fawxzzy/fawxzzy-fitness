import type { ExerciseStatsRow } from "@/lib/exercise-stats";
import { formatCalories, formatDistance } from "@/lib/exercise-stats-formatting";
import { formatDurationPreview } from "@/lib/duration";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import { formatDateShort, formatWeight } from "@/lib/formatting";
import {
  deriveProgressionPlaybookTarget,
  getProgressionPlaybookDefinition,
  validateProgressionPlaybookSelection,
  type ProgressionHistorySession,
} from "@/lib/progression-playbooks";

export type SessionTargetHintMeasurementType = "reps" | "time" | "distance" | "time_distance" | "none";

export type SessionTargetHintPlan = {
  measurementType: SessionTargetHintMeasurementType;
  setsMin?: number | null;
  setsMax?: number | null;
  repsTarget?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
  weightMin?: number | null;
  weightMax?: number | null;
  weightUnit?: "lbs" | "kg" | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: FitnessDistanceUnit | null;
  calories?: number | null;
};

export type SessionTargetHintSuggestedValues = {
  measurementType: SessionTargetHintMeasurementType;
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: FitnessDistanceUnit | null;
  calories: number | null;
  weightUnit: "lbs" | "kg" | null;
};

export type SessionTargetHintSource =
  | "manual_target"
  | "playbook_seed_target"
  | "playbook_derived_target"
  | "fallback_last_successful_set"
  | "unsupported_playbook_fallback"
  | "invalid_playbook_fallback"
  | "recent_best"
  | "no_history";

export type SessionTargetHint = {
  shortLabel: string;
  reason: string;
  source: SessionTargetHintSource;
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
      isPositiveNumber(plan.repsTarget) ? plan.repsTarget : resolveSingleValue(plan.repsMin, plan.repsMax),
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
    reps: isPositiveNumber(plan.repsTarget) ? plan.repsTarget : resolveSingleValue(plan.repsMin, plan.repsMax),
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

function isWeightedRepPlaybookSeed(plan: SessionTargetHintPlan | null | undefined) {
  if (!plan || plan.measurementType !== "reps") {
    return false;
  }

  return isPositiveNumber(resolveSingleValue(plan.setsMin, plan.setsMax))
    && isPositiveNumber(resolveSingleValue(plan.repsMin, plan.repsMax))
    && isPositiveNumber(resolveSingleValue(plan.weightMin, plan.weightMax));
}

function getPlaybookFallbackReason(args: {
  mode: "seed" | "invalid" | "unsupported";
  label?: string | null;
}) {
  if (args.mode === "seed") {
    return args.label
      ? `${args.label}: no completed history yet; using routine target as the playbook seed.`
      : "No completed history yet; using routine target as the playbook seed.";
  }

  if (args.mode === "invalid") {
    return "Progression playbook config is invalid; using the routine target instead.";
  }

  return args.label
    ? `${args.label} does not support this exercise yet; use current goal.`
    : "Selected progression playbook does not support this exercise yet; use current goal.";
}

export function deriveSessionTargetHint(args: {
  measurementType: SessionTargetHintMeasurementType;
  plan: SessionTargetHintPlan | null;
  stats: ExerciseStatsRow | null | undefined;
  fallbackWeightUnit: "lbs" | "kg";
  playbook?: {
    playbookId: unknown;
    config: unknown;
    history: ProgressionHistorySession[] | null | undefined;
  } | null;
}): SessionTargetHint {
  const { measurementType, plan, stats, fallbackWeightUnit } = args;
  const plannedSummary = plan ? formatPlannedSummary(plan, fallbackWeightUnit) : null;
  const lastSummary = formatLastSummary(measurementType, stats, fallbackWeightUnit);
  const recentBestSummary = formatRecentBestSummary(measurementType, stats, fallbackWeightUnit);
  const lastSuggestedValues = stats ? buildSuggestedValuesFromLastPerformance(measurementType, stats, fallbackWeightUnit) : null;
  const recentBestSuggestedValues = stats ? buildSuggestedValuesFromRecentBest(measurementType, stats, fallbackWeightUnit) : null;
  const lastPerformedAt = stats?.last_performed_at ?? null;
  const recentBestPerformedAt = stats?.actual_pr_at ?? null;
  const playbookSelection = args.playbook
    ? validateProgressionPlaybookSelection({
      playbookId: args.playbook.playbookId,
      config: args.playbook.config,
    })
    : null;
  const playbookDefinition = playbookSelection ? getProgressionPlaybookDefinition(playbookSelection.id) : null;
  const playbookTarget = playbookSelection && args.playbook
    ? deriveProgressionPlaybookTarget({
      playbookId: playbookSelection.id,
      config: playbookSelection.config,
      plan: plan ? {
        measurementType: plan.measurementType,
        setsMin: plan.setsMin ?? null,
        setsMax: plan.setsMax ?? null,
        repsTarget: plan.repsTarget ?? null,
        repsMin: plan.repsMin ?? null,
        repsMax: plan.repsMax ?? null,
        weightMin: plan.weightMin ?? null,
        weightMax: plan.weightMax ?? null,
        weightUnit: plan.weightUnit ?? fallbackWeightUnit,
        durationSeconds: plan.durationSeconds ?? null,
        distance: plan.distance ?? null,
        distanceUnit: plan.distanceUnit ?? null,
        calories: plan.calories ?? null,
      } : null,
      history: args.playbook.history,
      fallbackWeightUnit,
    })
    : null;

  if (playbookTarget) {
    const playbookSummary = formatPlannedSummary({
      measurementType: playbookTarget.plan.measurementType,
      repsMin: playbookTarget.plan.repsMin ?? null,
      repsMax: playbookTarget.plan.repsMax ?? null,
      repsTarget: playbookTarget.plan.repsTarget ?? null,
      weightMin: playbookTarget.plan.weightMin ?? null,
      weightMax: playbookTarget.plan.weightMax ?? null,
      weightUnit: playbookTarget.plan.weightUnit ?? fallbackWeightUnit,
      durationSeconds: playbookTarget.plan.durationSeconds ?? null,
      distance: playbookTarget.plan.distance ?? null,
      distanceUnit: playbookTarget.plan.distanceUnit ?? null,
      calories: playbookTarget.plan.calories ?? null,
    }, fallbackWeightUnit) ?? plannedSummary ?? playbookTarget.label;

    return {
      shortLabel: playbookSummary,
      reason: playbookTarget.reason,
      source: "playbook_derived_target",
      confidence: playbookTarget.changed ? "high" : "medium",
      suggestedValues: buildSuggestedValuesFromPlan({
        measurementType: playbookTarget.plan.measurementType,
        repsTarget: playbookTarget.plan.repsTarget ?? null,
        repsMin: playbookTarget.plan.repsMin ?? null,
        repsMax: playbookTarget.plan.repsMax ?? null,
        weightMin: playbookTarget.plan.weightMin ?? null,
        weightMax: playbookTarget.plan.weightMax ?? null,
        weightUnit: playbookTarget.plan.weightUnit ?? fallbackWeightUnit,
        durationSeconds: playbookTarget.plan.durationSeconds ?? null,
        distance: playbookTarget.plan.distance ?? null,
        distanceUnit: playbookTarget.plan.distanceUnit ?? null,
        calories: playbookTarget.plan.calories ?? null,
      }, fallbackWeightUnit),
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

  if (args.playbook && plan && plannedSummary) {
    const source = !playbookSelection
      ? "invalid_playbook_fallback"
      : isWeightedRepPlaybookSeed(plan) && (args.playbook.history?.length ?? 0) === 0
        ? "playbook_seed_target"
        : "unsupported_playbook_fallback";

    return {
      shortLabel: plannedSummary,
      reason: getPlaybookFallbackReason({
        mode: source === "invalid_playbook_fallback"
          ? "invalid"
          : source === "playbook_seed_target"
            ? "seed"
            : "unsupported",
        label: playbookDefinition?.label ?? null,
      }),
      source,
      confidence: source === "playbook_seed_target" ? "medium" : "low",
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

  if (plannedSummary && plan) {
    return {
      shortLabel: plannedSummary,
      reason: lastSummary
        ? "Using the planned target and keeping your last logged performance visible inline."
        : "Using the planned target because no completed history is available yet.",
      source: "manual_target",
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
      source: "fallback_last_successful_set",
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
