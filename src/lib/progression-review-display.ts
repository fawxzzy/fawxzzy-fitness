import { formatCalories, formatDistance } from "@/lib/exercise-stats-formatting";
import { formatDurationClock } from "@/lib/duration";
import { formatWeight } from "@/lib/formatting";
import type { ProgressionAuditHistorySource } from "@/lib/progression-candidate-audit";
import type { ProgressionReviewCandidate, ProgressionTargetPlan } from "@/lib/progression-playbooks";
import type { ProgressionCalculationEvidence } from "@/lib/progression-status-display";
import type { ProgressionProgressFill } from "@/lib/progression-progress-percent";

export type ProgressionReviewDisplayItem = {
  id: string;
  exerciseName: string;
  dayName?: string | null;
  dayGroupId?: string | null;
  linkedUpdate?: {
    count: number;
    dayNames: string[];
    routineDayExerciseIds: string[];
    targets: Array<{
      routineDayExerciseId: string;
      dayName: string;
      dayGroupId?: string | null;
    }>;
    displayOnly: true;
  };
  type: Exclude<ProgressionReviewCandidate["type"], "none">;
  badgeLabel: string;
  summary: string;
  summaryParts: {
    exerciseName: string;
    currentTarget: string | null;
    proposedTarget: string | null;
    fallback: string | null;
  };
  reason: string;
  actionLabel: string;
  currentTarget: ProgressionTargetPlan | null;
  proposedTarget: ProgressionTargetPlan | null;
  sourceSession?: ProgressionReviewCandidate["sourceSession"];
  evidence?: ProgressionCalculationEvidence;
  progress?: ProgressionProgressFill;
  debug?: {
    historySource: ProgressionAuditHistorySource;
    historySetCount: number;
    historySessionCount: number;
    candidateType: Exclude<ProgressionReviewCandidate["type"], "none">;
    reason: string;
  };
};

export type ProgressionReviewLinkedTargetSnapshot = {
  routineDayExerciseId: string;
  previousTarget: ProgressionTargetPlan;
  appliedTarget: ProgressionTargetPlan;
};

export type ProgressionReviewApplyResult = {
  previousTarget: ProgressionTargetPlan;
  appliedTarget: ProgressionTargetPlan;
  linkedTargets?: ProgressionReviewLinkedTargetSnapshot[];
};

export type ProgressionReviewRevertTargetSnapshot = {
  routineDayExerciseId: string;
  previousTarget: ProgressionTargetPlan;
};

function resolveSingleValue(min?: number | null, max?: number | null) {
  if (typeof max === "number" && Number.isFinite(max) && max > 0) {
    return max;
  }

  if (typeof min === "number" && Number.isFinite(min) && min > 0) {
    return min;
  }

  return null;
}

function formatReps(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Number.isInteger(value) ? `${value} reps` : `${value.toFixed(1).replace(/\.0$/, "")} reps`;
}

function formatRepTarget(plan: ProgressionTargetPlan) {
  const weight = resolveSingleValue(plan.weightMin, plan.weightMax);
  const reps = typeof plan.repsTarget === "number" && Number.isFinite(plan.repsTarget) && plan.repsTarget > 0
    ? plan.repsTarget
    : resolveSingleValue(plan.repsMin, plan.repsMax);
  const weightLabel = formatWeight(weight, plan.weightUnit ?? null);
  const repsLabel = formatReps(reps);

  if (weightLabel && repsLabel) {
    return `${repsLabel} • ${weightLabel}`;
  }

  return weightLabel ?? repsLabel;
}

export function formatProgressionReviewTargetLabel(plan: ProgressionTargetPlan | null) {
  if (!plan) {
    return null;
  }

  if (plan.measurementType === "reps") {
    return formatRepTarget(plan);
  }

  const parts = [
    typeof plan.durationSeconds === "number" && plan.durationSeconds > 0 ? formatDurationClock(plan.durationSeconds) : null,
    typeof plan.distance === "number" && plan.distance > 0 ? formatDistance(plan.distance, plan.distanceUnit ?? null) : null,
    typeof plan.calories === "number" && plan.calories > 0 ? formatCalories(plan.calories) : null,
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function getBadgeLabel(type: ProgressionReviewDisplayItem["type"]) {
  switch (type) {
  case "promote":
    return "Promote";
  case "review":
    return "Review";
  case "deload":
    return "Regression";
  }
}

function getActionLabel(type: ProgressionReviewDisplayItem["type"]) {
  switch (type) {
  case "promote":
    return "Promote";
  case "review":
    return "Review manually";
  case "deload":
    return "Apply regression";
  }
}

export function formatProgressionReviewDisplayItem(args: {
  id: string;
  exerciseName: string;
  dayName?: string | null;
  dayGroupId?: string | null;
  candidate: ProgressionReviewCandidate;
  currentTargetOverride?: ProgressionTargetPlan | null;
  proposedTargetOverride?: ProgressionTargetPlan | null;
  debug?: Omit<NonNullable<ProgressionReviewDisplayItem["debug"]>, "candidateType" | "reason">;
}): ProgressionReviewDisplayItem | null {
  if (args.candidate.type === "none") {
    return null;
  }

  const displayCurrentTarget = args.currentTargetOverride ?? args.candidate.currentTarget;
  const displayProposedTarget = args.proposedTargetOverride ?? args.candidate.proposedTarget;
  const currentTarget = formatProgressionReviewTargetLabel(displayCurrentTarget);
  const proposedTarget = formatProgressionReviewTargetLabel(displayProposedTarget);
  const hasTargetChange = Boolean(currentTarget && proposedTarget && currentTarget !== proposedTarget);
  const targetSummary = hasTargetChange
    ? `${currentTarget} -> ${proposedTarget}`
    : proposedTarget ?? currentTarget;
  const fallbackSummary = args.candidate.type === "review"
    ? "Range complete - review before increasing."
    : args.candidate.reason;

  return {
    id: args.id,
    exerciseName: args.exerciseName,
    dayName: args.dayName ?? null,
    dayGroupId: args.dayGroupId ?? null,
    type: args.candidate.type,
    badgeLabel: getBadgeLabel(args.candidate.type),
    summary: targetSummary ? `${args.exerciseName}: ${targetSummary}` : `${args.exerciseName}: ${fallbackSummary}`,
    summaryParts: {
      exerciseName: args.exerciseName,
      currentTarget: hasTargetChange ? currentTarget : null,
      proposedTarget: hasTargetChange ? proposedTarget : null,
      fallback: hasTargetChange ? null : (targetSummary ?? fallbackSummary),
    },
    reason: args.candidate.reason,
    actionLabel: getActionLabel(args.candidate.type),
    currentTarget: displayCurrentTarget,
    proposedTarget: displayProposedTarget,
    sourceSession: args.candidate.sourceSession ?? null,
    debug: args.debug ? {
      ...args.debug,
      candidateType: args.candidate.type,
      reason: args.candidate.reason,
    } : undefined,
  };
}
