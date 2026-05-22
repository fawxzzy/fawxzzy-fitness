import { formatDurationPreview } from "./duration";
import { formatWeight } from "./formatting";
import { formatMeasurementSummaryText } from "./measurement-display";
import type { FitnessDistanceUnit } from "./fitness-distance-units";
import type { SetRow } from "@/types/db";

export type SessionSetEntrySource = Pick<
  SetRow,
  "weight" | "reps" | "duration_seconds" | "distance" | "distance_unit" | "calories" | "is_warmup" | "weight_unit" | "set_index"
>;

export type SessionRepeatLastSetDraft = {
  weight: string;
  reps: string;
  duration: string;
  distance: string;
  distanceUnit: FitnessDistanceUnit;
  calories: string;
  weightUnit: "lbs" | "kg";
  isWarmup: boolean;
  summaryText: string;
};

type PrSummaryInput = {
  previousSets: SessionSetEntrySource[];
  candidate: SessionSetEntrySource;
  fallbackWeightUnit: "lbs" | "kg";
};

function normalizePositive(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function formatReps(value: number) {
  return Number.isInteger(value) ? `${value} reps` : `${value.toFixed(1).replace(/\.0$/, "")} reps`;
}

function formatWeightReps(weight: number, reps: number | null | undefined, unit: "lbs" | "kg") {
  const weightLabel = formatWeight(weight, unit);
  const repsValue = normalizePositive(reps);

  if (repsValue > 0) {
    return `${weightLabel} x ${formatReps(repsValue).replace(" reps", "")}`;
  }

  return weightLabel;
}

export function formatSessionSetSummary(set: SessionSetEntrySource, fallbackWeightUnit: "lbs" | "kg"): string {
  const weight = normalizePositive(set.weight);
  const reps = normalizePositive(set.reps);

  if (weight > 0 || reps > 0) {
    if (weight > 0 && reps > 0) {
      return formatWeightReps(weight, reps, set.weight_unit ?? fallbackWeightUnit) ?? "";
    }

    if (weight > 0) {
      return formatWeight(weight, set.weight_unit ?? fallbackWeightUnit) ?? "";
    }

    return formatReps(reps);
  }

  const cardioSummary = formatMeasurementSummaryText({
    durationSeconds: normalizePositive(set.duration_seconds) || null,
    distance: normalizePositive(set.distance) || null,
    distanceUnit: set.distance_unit ?? undefined,
    calories: normalizePositive(set.calories) || null,
    emptyLabel: "No measurements",
  });

  return cardioSummary ?? "No measurements";
}

export function deriveRepeatLastSetDraft(set: SessionSetEntrySource, fallbackWeightUnit: "lbs" | "kg"): SessionRepeatLastSetDraft {
  return {
    weight: normalizePositive(set.weight) > 0 ? String(Math.floor(set.weight)) : "",
    reps: normalizePositive(set.reps) > 0 ? String(Math.floor(set.reps)) : "",
    duration: normalizePositive(set.duration_seconds) > 0 ? formatDurationPreview(set.duration_seconds as number) : "",
    distance: normalizePositive(set.distance) > 0 ? String(set.distance) : "",
    distanceUnit: set.distance_unit ?? "mi",
    calories: normalizePositive(set.calories) > 0 ? String(Math.floor(set.calories as number)) : "",
    weightUnit: set.weight_unit ?? fallbackWeightUnit,
    isWarmup: set.is_warmup,
    summaryText: formatSessionSetSummary(set, fallbackWeightUnit),
  };
}

export function deriveSimpleSessionPrToast(input: PrSummaryInput): string | null {
  const candidateWeight = normalizePositive(input.candidate.weight);
  const candidateReps = normalizePositive(input.candidate.reps);
  let bestWeight = 0;
  let bestBodyweightReps = 0;

  for (const set of input.previousSets) {
    const weight = normalizePositive(set.weight);
    const reps = normalizePositive(set.reps);

    if (weight > 0 && weight > bestWeight) {
      bestWeight = weight;
    }

    if (weight === 0 && reps > bestBodyweightReps) {
      bestBodyweightReps = reps;
    }
  }

  if (candidateWeight > 0 && candidateWeight > bestWeight) {
    return `Weight PR: ${formatWeightReps(candidateWeight, candidateReps > 0 ? candidateReps : null, input.candidate.weight_unit ?? input.fallbackWeightUnit)}`;
  }

  if (candidateWeight === 0 && candidateReps > 0 && candidateReps > bestBodyweightReps) {
    return `Rep PR: ${formatReps(candidateReps)}`;
  }

  return null;
}
