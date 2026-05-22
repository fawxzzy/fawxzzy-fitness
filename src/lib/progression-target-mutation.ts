import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import { type ProgressionPromotionBasis, normalizePromotionBasis } from "@/lib/progression-promotion";
import { applyProgressionVector, type ProgressionVectorApplication, type ProgressionVectorId } from "@/lib/progression-vector";

export const PROGRESSION_TARGET_MUTATION_IDS = [
  "increase_load",
  "increase_reps",
  "increase_load_reset_reps",
  "increase_load_and_reps",
  "increase_duration",
  "increase_distance",
  "increase_duration_and_distance",
  "none",
] as const;

export type ProgressionTargetMutationId = (typeof PROGRESSION_TARGET_MUTATION_IDS)[number];

type MutationConfigLike = {
  targetMutation?: unknown;
  promotionBasis?: unknown;
};

function isPositiveNumber(value: unknown): value is number {
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

function resolveRepFloor(plan: ProgressionTargetPlan) {
  return isPositiveNumber(plan.repsMin) ? plan.repsMin : resolveSingleValue(plan.repsMin, plan.repsMax);
}

function resolveRepCeiling(plan: ProgressionTargetPlan) {
  return isPositiveNumber(plan.repsMax) ? plan.repsMax : resolveRepFloor(plan);
}

function resolveRangeWidth(plan: ProgressionTargetPlan) {
  const floor = resolveRepFloor(plan);
  const ceiling = resolveRepCeiling(plan);
  if (!isPositiveNumber(floor) || !isPositiveNumber(ceiling) || ceiling < floor) {
    return null;
  }

  return ceiling - floor;
}

function resolveMutationStep(args: {
  kind: "load" | "reps" | "duration" | "distance";
  explicitStep?: number | null;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  plan: ProgressionTargetPlan;
}) {
  if (isPositiveNumber(args.explicitStep)) {
    return args.explicitStep;
  }

  const policyKind = args.progressionStepPolicy?.kind ?? null;
  const acceptsPolicy = (
    (args.kind === "load" && policyKind === "load")
    || (args.kind === "reps" && policyKind === "reps")
    || (args.kind === "duration" && policyKind === "duration")
    || (args.kind === "distance" && (policyKind === "distance" || policyKind === "pace_or_volume"))
  );
  if (acceptsPolicy && isPositiveNumber(args.progressionStepPolicy?.defaultValue)) {
    return args.progressionStepPolicy.defaultValue;
  }

  switch (args.kind) {
  case "load":
    return 5;
  case "reps":
    return 1;
  case "duration":
    return 60;
  case "distance":
    return args.plan.distanceUnit === "km" ? 0.25 : 0.1;
  }
}

function resolveVectorForTargetMutation(targetMutation: ProgressionTargetMutationId): ProgressionVectorId | null {
  switch (targetMutation) {
  case "increase_load":
    return "load";
  case "increase_reps":
    return "reps";
  case "increase_load_reset_reps":
    return "coupled_load_reps";
  case "increase_duration":
    return "duration";
  case "increase_distance":
    return "distance";
  case "increase_duration_and_distance":
    return null;
  case "increase_load_and_reps":
  case "none":
    return null;
  }
}

export function normalizeTargetMutation(
  input: unknown,
  fallback: ProgressionTargetMutationId,
): ProgressionTargetMutationId {
  return PROGRESSION_TARGET_MUTATION_IDS.includes(input as ProgressionTargetMutationId)
    ? (input as ProgressionTargetMutationId)
    : fallback;
}

export function resolveLegacyTargetMutation(args: {
  measurementType?: ProgressionTargetPlan["measurementType"] | null;
  promotionBasis?: ProgressionPromotionBasis | unknown;
  targetWeight?: number | null;
}): ProgressionTargetMutationId {
  const measurementType = args.measurementType ?? "reps";
  const promotionBasis = normalizePromotionBasis(args.promotionBasis);

  if (measurementType === "time") {
    return "increase_duration";
  }

  if (measurementType === "distance") {
    return "increase_distance";
  }

  if (measurementType === "time_distance") {
    return "increase_duration_and_distance";
  }

  if (measurementType !== "reps") {
    return "none";
  }

  switch (promotionBasis) {
  case "reps_only":
    return "increase_reps";
  case "weight_only":
    return isPositiveNumber(args.targetWeight) ? "increase_load" : "increase_reps";
  case "weight_and_reps":
  default:
    return isPositiveNumber(args.targetWeight) ? "increase_load_reset_reps" : "increase_reps";
  }
}

export function getDefaultTargetMutationForConfig(args: {
  config?: MutationConfigLike | null;
  plan: ProgressionTargetPlan;
}): ProgressionTargetMutationId {
  const fallback = resolveLegacyTargetMutation({
    measurementType: args.plan.measurementType,
    promotionBasis: args.config?.promotionBasis,
    targetWeight: args.plan.weightMax ?? args.plan.weightMin ?? null,
  });
  return normalizeTargetMutation(args.config?.targetMutation, fallback);
}

export function applyTargetMutation(args: {
  targetMutation?: unknown;
  plan: ProgressionTargetPlan;
  config?: MutationConfigLike | null;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  qualifiedValue?: number | null;
  maxAutoPromotionSteps?: number;
  loadStep?: number | null;
  repStep?: number | null;
  durationStep?: number | null;
  distanceStep?: number | null;
}): ProgressionVectorApplication | null {
  const targetMutation = getDefaultTargetMutationForConfig({
    config: {
      targetMutation: args.targetMutation,
      promotionBasis: args.config?.promotionBasis,
    },
    plan: args.plan,
  });

  if (targetMutation === "none") {
    return {
      proposedTarget: { ...args.plan },
      qualifiedValue: null,
    };
  }

  if (targetMutation === "increase_load_and_reps") {
    const currentWeight = resolveSingleValue(args.plan.weightMin, args.plan.weightMax);
    const repFloor = resolveRepFloor(args.plan);
    const repCeiling = resolveRepCeiling(args.plan);
    const repRangeWidth = resolveRangeWidth(args.plan);
    const loadStep = resolveMutationStep({
      kind: "load",
      explicitStep: args.loadStep ?? null,
      progressionStepPolicy: args.progressionStepPolicy,
      plan: args.plan,
    });
    const repStep = resolveMutationStep({
      kind: "reps",
      explicitStep: args.repStep ?? null,
      progressionStepPolicy: null,
      plan: args.plan,
    });

    if (!isPositiveNumber(currentWeight)
      || !isPositiveNumber(repFloor)
      || !isPositiveNumber(repCeiling)
      || !isPositiveNumber(loadStep)
      || !isPositiveNumber(repStep)) {
      return null;
    }

    const safeQualifiedLoad = isPositiveNumber(args.qualifiedValue) && args.qualifiedValue > currentWeight
      ? args.qualifiedValue
      : currentWeight;
    const uncappedNextWeight = safeQualifiedLoad + loadStep;
    const maxSteps = isPositiveNumber(args.maxAutoPromotionSteps) ? args.maxAutoPromotionSteps : 2;
    const cappedNextWeight = currentWeight + (loadStep * maxSteps);
    const nextWeight = Math.min(uncappedNextWeight, cappedNextWeight);
    const nextRepFloor = repFloor + repStep;
    const nextRepCeiling = repRangeWidth === null ? repCeiling + repStep : nextRepFloor + repRangeWidth;
    const currentRepTarget = isPositiveNumber(args.plan.repsTarget) ? args.plan.repsTarget : repFloor;

    return {
      proposedTarget: {
        ...args.plan,
        repsTarget: currentRepTarget + repStep,
        repsMin: nextRepFloor,
        repsMax: nextRepCeiling,
        weightMin: nextWeight,
        weightMax: nextWeight,
      },
      wasCapped: uncappedNextWeight > cappedNextWeight,
      qualifiedValue: safeQualifiedLoad,
    };
  }

  if (targetMutation === "increase_duration_and_distance") {
    const currentDuration = args.plan.durationSeconds;
    const currentDistance = args.plan.distance;
    const durationStep = resolveMutationStep({
      kind: "duration",
      explicitStep: args.durationStep ?? null,
      progressionStepPolicy: args.progressionStepPolicy,
      plan: args.plan,
    });
    const distanceStep = resolveMutationStep({
      kind: "distance",
      explicitStep: args.distanceStep ?? null,
      progressionStepPolicy: args.progressionStepPolicy,
      plan: args.plan,
    });

    if (!isPositiveNumber(currentDuration)
      || !isPositiveNumber(currentDistance)
      || !isPositiveNumber(durationStep)
      || !isPositiveNumber(distanceStep)) {
      return null;
    }

    return {
      proposedTarget: {
        ...args.plan,
        durationSeconds: Math.round(currentDuration + durationStep),
        distance: Number((currentDistance + distanceStep).toFixed(3)),
      },
      qualifiedValue: currentDistance,
    };
  }

  const vectorId = resolveVectorForTargetMutation(targetMutation);
  if (!vectorId) {
    return null;
  }

  let explicitStep: number | null = null;
  switch (targetMutation) {
  case "increase_load":
  case "increase_load_reset_reps":
    explicitStep = args.loadStep ?? null;
    break;
  case "increase_reps":
    explicitStep = args.repStep ?? null;
    break;
  case "increase_duration":
    explicitStep = args.durationStep ?? null;
    break;
  case "increase_distance":
    explicitStep = args.distanceStep ?? null;
    break;
  default:
    explicitStep = null;
    break;
  }

  const progressionStepPolicy = isPositiveNumber(explicitStep)
    ? {
      kind: targetMutation === "increase_load" || targetMutation === "increase_load_reset_reps"
        ? "load"
        : targetMutation === "increase_reps"
          ? "reps"
          : targetMutation === "increase_duration"
            ? "duration"
            : "distance",
      equipmentFamily: args.progressionStepPolicy?.equipmentFamily ?? "unknown",
      label: args.progressionStepPolicy?.label ?? "Progression step",
      defaultValue: explicitStep,
      unit: args.progressionStepPolicy?.unit ?? null,
      description: args.progressionStepPolicy?.description ?? "Resolved progression step.",
      source: args.progressionStepPolicy?.source ?? "app_fallback",
    } satisfies ProgressionStepPolicy
    : args.progressionStepPolicy;

  return applyProgressionVector({
    vectorId,
    plan: args.plan,
    progressionStepPolicy,
    qualifiedValue: args.qualifiedValue ?? null,
    maxAutoPromotionSteps: args.maxAutoPromotionSteps,
  });
}
