import { formatDistance, formatCalories } from "@/lib/exercise-stats-formatting";
import { formatWeight } from "@/lib/formatting";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import {
  applyTargetMutation,
  type ProgressionTargetMutationId,
} from "@/lib/progression-target-mutation";

export type ProgressionTargetPreview = {
  mutationId: ProgressionTargetMutationId;
  currentLabel: string;
  nextLabel: string | null;
  summary: string;
  changed: boolean;
};

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeOptionalPositiveNumber(value: unknown) {
  return isPositiveNumber(value) ? Number(value.toFixed(4)) : null;
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

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function formatDurationLabel(totalSeconds: number | null | undefined) {
  if (!isPositiveInteger(totalSeconds)) {
    return null;
  }

  const safeSeconds = Math.floor(totalSeconds);
  if (safeSeconds % 60 === 0) {
    const totalMinutes = safeSeconds / 60;
    if (totalMinutes < 60) {
      return `${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes} min` : `${hours}h`;
  }

  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatRepRange(plan: ProgressionTargetPlan, mode: "range" | "target") {
  const repsTarget = isPositiveInteger(plan.repsTarget) ? plan.repsTarget : null;
  const repsMin = isPositiveInteger(plan.repsMin) ? plan.repsMin : repsTarget;
  const repsMax = isPositiveInteger(plan.repsMax) ? plan.repsMax : repsTarget;

  if (!isPositiveInteger(repsTarget) && !isPositiveInteger(repsMin) && !isPositiveInteger(repsMax)) {
    return null;
  }

  if (mode === "target" && isPositiveInteger(repsTarget)) {
    return String(repsTarget);
  }

  if (isPositiveInteger(repsMin) && isPositiveInteger(repsMax)) {
    return repsMin === repsMax ? String(repsMin) : `${repsMin}\u2013${repsMax}`;
  }

  return isPositiveInteger(repsTarget) ? String(repsTarget) : null;
}

function formatStrengthTarget(args: {
  plan: ProgressionTargetPlan;
  mutationId: ProgressionTargetMutationId;
  phase: "current" | "next";
}) {
  const weightLabel = formatWeight(resolveSingleValue(args.plan.weightMin, args.plan.weightMax), args.plan.weightUnit ?? null);
  const repMode = args.phase === "next" && args.mutationId === "increase_load_reset_reps" ? "target" : "range";
  const repLabel = formatRepRange(args.plan, repMode);

  if (weightLabel && repLabel) {
    return `${weightLabel} x ${repLabel}`;
  }

  if (repLabel) {
    return `${repLabel} reps`;
  }

  return weightLabel;
}

function formatCardioTarget(plan: ProgressionTargetPlan) {
  const parts = [
    formatDurationLabel(plan.durationSeconds),
    formatDistance(plan.distance, plan.distanceUnit ?? null),
    formatCalories(plan.calories),
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function formatTargetLabel(args: {
  plan: ProgressionTargetPlan;
  mutationId: ProgressionTargetMutationId;
  phase: "current" | "next";
}) {
  if (
    args.plan.measurementType === "reps"
    || isPositiveNumber(args.plan.weightMin)
    || isPositiveNumber(args.plan.weightMax)
    || isPositiveInteger(args.plan.repsMin)
    || isPositiveInteger(args.plan.repsMax)
    || isPositiveInteger(args.plan.repsTarget)
  ) {
    return formatStrengthTarget(args);
  }

  return formatCardioTarget(args.plan);
}

export function parseProgressionPreviewDurationInput(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (!match) {
    return null;
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || seconds > 59) {
    return null;
  }

  const totalSeconds = (minutes * 60) + seconds;
  return totalSeconds > 0 ? totalSeconds : null;
}

export function buildProgressionTargetPreviewPlan(args: {
  measurementType: ProgressionTargetPlan["measurementType"];
  sets?: number | null;
  repsTarget?: number | null;
  repsMin?: number | null;
  repsMax?: number | null;
  weight?: number | null;
  weightUnit?: ProgressionTargetPlan["weightUnit"];
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: ProgressionTargetPlan["distanceUnit"];
  calories?: number | null;
}): ProgressionTargetPlan {
  const repsMin = normalizeOptionalPositiveNumber(args.repsMin);
  const repsMax = normalizeOptionalPositiveNumber(args.repsMax);
  const repsTarget = normalizeOptionalPositiveNumber(args.repsTarget);
  const normalizedWeight = normalizeOptionalPositiveNumber(args.weight);
  const normalizedDuration = normalizeOptionalPositiveNumber(args.durationSeconds);
  const normalizedDistance = normalizeOptionalPositiveNumber(args.distance);
  const normalizedCalories = normalizeOptionalPositiveNumber(args.calories);
  const normalizedSets = normalizeOptionalPositiveNumber(args.sets);

  return {
    measurementType: args.measurementType,
    setsMin: normalizedSets,
    setsMax: normalizedSets,
    repsTarget,
    repsMin,
    repsMax,
    weightMin: normalizedWeight,
    weightMax: normalizedWeight,
    weightUnit: args.weightUnit ?? null,
    durationSeconds: normalizedDuration,
    distance: normalizedDistance,
    distanceUnit: args.distanceUnit ?? null,
    calories: normalizedCalories,
  };
}

export function buildProgressionTargetPreview(args: {
  plan: ProgressionTargetPlan | null;
  promotionBasis?: unknown;
  targetMutation?: unknown;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  loadStep?: number | null;
  repStep?: number | null;
  durationSecondsStep?: number | null;
  distanceStep?: number | null;
}) : ProgressionTargetPreview | null {
  if (!args.plan) {
    return null;
  }

  const result = applyTargetMutation({
    plan: args.plan,
    promotionBasis: args.promotionBasis,
    targetMutation: args.targetMutation,
    progressionStepPolicy: args.progressionStepPolicy,
    loadStep: args.loadStep,
    repStep: args.repStep,
    durationSecondsStep: args.durationSecondsStep,
    distanceStep: args.distanceStep,
  });

  if (!result) {
    return null;
  }

  const currentLabel = formatTargetLabel({
    plan: args.plan,
    mutationId: result.mutationId,
    phase: "current",
  });
  if (!currentLabel) {
    return null;
  }

  if (result.mutationId === "none") {
    return {
      mutationId: result.mutationId,
      currentLabel,
      nextLabel: null,
      summary: `Manual review keeps ${currentLabel}.`,
      changed: false,
    };
  }

  const nextLabel = formatTargetLabel({
    plan: result.proposedTarget,
    mutationId: result.mutationId,
    phase: "next",
  });
  if (!nextLabel) {
    return null;
  }

  return {
    mutationId: result.mutationId,
    currentLabel,
    nextLabel,
    summary: `Next target: ${currentLabel} -> ${nextLabel}`,
    changed: result.changed,
  };
}
