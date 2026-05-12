import {
  DEFAULT_PROGRESSION_PROMOTION_BASIS,
  normalizePromotionBasis,
  type ProgressionPromotionBasis,
} from "@/lib/progression-promotion";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import { applyProgressionVector } from "@/lib/progression-vector";

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

export type ProgressionTargetMutationApplication = {
  mutationId: ProgressionTargetMutationId;
  proposedTarget: ProgressionTargetPlan;
  changed: boolean;
  wasCapped?: boolean;
  qualifiedValue?: number | null;
};

const TARGET_MUTATION_ID_SET = new Set<ProgressionTargetMutationId>(PROGRESSION_TARGET_MUTATION_IDS);

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function normalizeStepValue(value: unknown) {
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

function resolveRepFloor(plan: ProgressionTargetPlan) {
  return isPositiveInteger(plan.repsMin)
    ? plan.repsMin
    : resolveSingleValue(plan.repsMin, plan.repsMax);
}

function resolveCurrentRepTarget(plan: ProgressionTargetPlan) {
  if (isPositiveInteger(plan.repsTarget)) {
    return plan.repsTarget;
  }

  return resolveRepFloor(plan);
}

function resolveExplicitOrPolicyStep(args: {
  explicitStep?: number | null;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  allowedPolicyKinds: Array<ProgressionStepPolicy["kind"]>;
}) {
  const explicitStep = normalizeStepValue(args.explicitStep);
  if (explicitStep !== null) {
    return explicitStep;
  }

  if (
    args.progressionStepPolicy
    && args.allowedPolicyKinds.includes(args.progressionStepPolicy.kind)
    && isPositiveNumber(args.progressionStepPolicy.defaultValue)
  ) {
    return Number(args.progressionStepPolicy.defaultValue.toFixed(4));
  }

  return null;
}

function hasWeightTarget(plan: ProgressionTargetPlan) {
  return isPositiveNumber(plan.weightMax) || isPositiveNumber(plan.weightMin);
}

function buildIncrementedRepPlan(plan: ProgressionTargetPlan, repStep: number) {
  const baseTarget = resolveCurrentRepTarget(plan);
  const baseMin = isPositiveInteger(plan.repsMin) ? plan.repsMin : baseTarget;
  const baseMax = isPositiveInteger(plan.repsMax) ? plan.repsMax : baseTarget;
  if (!isPositiveInteger(baseTarget) || !isPositiveInteger(baseMin) || !isPositiveInteger(baseMax)) {
    return null;
  }

  return {
    ...plan,
    repsTarget: baseTarget + repStep,
    repsMin: baseMin + repStep,
    repsMax: baseMax + repStep,
  } satisfies ProgressionTargetPlan;
}

function plansMatch(left: ProgressionTargetPlan, right: ProgressionTargetPlan) {
  return left.measurementType === right.measurementType
    && (left.setsMin ?? null) === (right.setsMin ?? null)
    && (left.setsMax ?? null) === (right.setsMax ?? null)
    && (left.repsTarget ?? null) === (right.repsTarget ?? null)
    && (left.repsMin ?? null) === (right.repsMin ?? null)
    && (left.repsMax ?? null) === (right.repsMax ?? null)
    && (left.weightMin ?? null) === (right.weightMin ?? null)
    && (left.weightMax ?? null) === (right.weightMax ?? null)
    && (left.weightUnit ?? null) === (right.weightUnit ?? null)
    && (left.durationSeconds ?? null) === (right.durationSeconds ?? null)
    && (left.distance ?? null) === (right.distance ?? null)
    && (left.distanceUnit ?? null) === (right.distanceUnit ?? null)
    && (left.calories ?? null) === (right.calories ?? null);
}

function buildLoadStepPolicy(args: {
  plan: ProgressionTargetPlan;
  loadStep: number;
}) {
  return {
    kind: "load",
    equipmentFamily: "unknown",
    label: "Load step",
    defaultValue: args.loadStep,
    unit: args.plan.weightUnit ?? "lbs",
    description: "Resolved target mutation load step.",
    source: "app_fallback",
  } satisfies ProgressionStepPolicy;
}

function buildDurationStepPolicy(durationSecondsStep: number) {
  return {
    kind: "duration",
    equipmentFamily: "cardio",
    label: "Duration step",
    defaultValue: durationSecondsStep,
    unit: "seconds",
    description: "Resolved target mutation duration step.",
    source: "app_fallback",
  } satisfies ProgressionStepPolicy;
}

function buildDistanceStepPolicy(args: {
  plan: ProgressionTargetPlan;
  distanceStep: number;
}) {
  return {
    kind: "distance",
    equipmentFamily: "cardio",
    label: "Distance step",
    defaultValue: args.distanceStep,
    unit: args.plan.distanceUnit === "km" ? "km" : "mi",
    description: "Resolved target mutation distance step.",
    source: "app_fallback",
  } satisfies ProgressionStepPolicy;
}

function resolveRepStep(args: {
  repStep?: number | null;
  progressionStepPolicy?: ProgressionStepPolicy | null;
}) {
  if (typeof args.repStep !== "undefined" && args.repStep !== null) {
    return isPositiveInteger(args.repStep) ? args.repStep : null;
  }

  return resolveExplicitOrPolicyStep({
    explicitStep: args.repStep,
    progressionStepPolicy: args.progressionStepPolicy,
    allowedPolicyKinds: ["reps"],
  }) ?? 1;
}

export function getDefaultStrengthTargetMutationForPromotionBasis(
  promotionBasis: unknown,
): "increase_load" | "increase_reps" | "increase_load_reset_reps" {
  switch (normalizePromotionBasis(promotionBasis, DEFAULT_PROGRESSION_PROMOTION_BASIS)) {
  case "reps_only":
    return "increase_reps";
  case "weight_only":
    return "increase_load";
  case "weight_and_reps":
  default:
    return "increase_load_reset_reps";
  }
}

export function shouldPersistExplicitTargetMutation(args: {
  targetMutation: unknown;
  promotionBasis: unknown;
}) {
  const mutationId = normalizeTargetMutation(
    args.targetMutation,
    getDefaultStrengthTargetMutationForPromotionBasis(args.promotionBasis),
  );
  return mutationId !== getDefaultStrengthTargetMutationForPromotionBasis(args.promotionBasis);
}

export function normalizeTargetMutation(
  input: unknown,
  fallback: ProgressionTargetMutationId = "none",
): ProgressionTargetMutationId {
  return TARGET_MUTATION_ID_SET.has(input as ProgressionTargetMutationId)
    ? (input as ProgressionTargetMutationId)
    : fallback;
}

export function getDefaultTargetMutationForConfig(args: {
  plan: ProgressionTargetPlan;
  promotionBasis?: unknown;
  targetMutation?: unknown;
}) {
  if (typeof args.targetMutation !== "undefined") {
    return normalizeTargetMutation(args.targetMutation);
  }

  switch (args.plan.measurementType) {
  case "time":
    return "increase_duration";
  case "distance":
    return "increase_distance";
  case "time_distance":
    return "increase_distance";
  case "none":
    return "none";
  case "reps":
  default: {
    const promotionBasis = normalizePromotionBasis(args.promotionBasis, DEFAULT_PROGRESSION_PROMOTION_BASIS);

    if (promotionBasis === "reps_only" || !hasWeightTarget(args.plan)) {
      return "increase_reps";
    }

    if (promotionBasis === "weight_only") {
      return "increase_load";
    }

    return getDefaultStrengthTargetMutationForPromotionBasis(promotionBasis);
  }
  }
}

export function resolveLegacyTargetMutation(args: {
  plan: ProgressionTargetPlan;
  promotionBasis?: unknown;
  targetMutation?: unknown;
}) {
  return getDefaultTargetMutationForConfig(args);
}

export function applyTargetMutation(args: {
  plan: ProgressionTargetPlan;
  promotionBasis?: ProgressionPromotionBasis | unknown;
  targetMutation?: unknown;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  loadStep?: number | null;
  repStep?: number | null;
  durationSecondsStep?: number | null;
  distanceStep?: number | null;
  qualifiedValue?: number | null;
  maxAutoPromotionSteps?: number;
}): ProgressionTargetMutationApplication | null {
  const mutationId = resolveLegacyTargetMutation({
    plan: args.plan,
    promotionBasis: args.promotionBasis,
    targetMutation: args.targetMutation,
  });

  if (mutationId === "none") {
    return {
      mutationId,
      proposedTarget: { ...args.plan },
      changed: false,
    };
  }

  if (mutationId === "increase_reps") {
    const repStep = resolveRepStep(args);
    if (!isPositiveInteger(repStep)) {
      return null;
    }

    const repPlan = buildIncrementedRepPlan(args.plan, repStep);
    if (!repPlan) {
      return null;
    }

    return {
      mutationId,
      proposedTarget: repPlan,
      changed: !plansMatch(args.plan, repPlan),
    };
  }

  if (mutationId === "increase_load" || mutationId === "increase_load_reset_reps" || mutationId === "increase_load_and_reps") {
    const loadStep = resolveExplicitOrPolicyStep({
      explicitStep: args.loadStep,
      progressionStepPolicy: args.progressionStepPolicy,
      allowedPolicyKinds: ["load"],
    });
    if (loadStep === null) {
      return null;
    }

    const loadOnlyResult = applyProgressionVector({
      vectorId: "load",
      plan: args.plan,
      progressionStepPolicy: buildLoadStepPolicy({
        plan: args.plan,
        loadStep,
      }),
      qualifiedValue: args.qualifiedValue,
      maxAutoPromotionSteps: args.maxAutoPromotionSteps,
    });
    if (!loadOnlyResult) {
      return null;
    }

    if (mutationId === "increase_load") {
      return {
        mutationId,
        proposedTarget: loadOnlyResult.proposedTarget,
        changed: !plansMatch(args.plan, loadOnlyResult.proposedTarget),
        wasCapped: loadOnlyResult.wasCapped,
        qualifiedValue: loadOnlyResult.qualifiedValue,
      };
    }

    if (mutationId === "increase_load_reset_reps") {
      const repFloor = resolveRepFloor(args.plan);
      if (!isPositiveInteger(repFloor)) {
        return null;
      }

      const proposedTarget: ProgressionTargetPlan = {
        ...loadOnlyResult.proposedTarget,
        repsTarget: repFloor,
        repsMin: args.plan.repsMin ?? repFloor,
        repsMax: args.plan.repsMax ?? repFloor,
      };

      return {
        mutationId,
        proposedTarget,
        changed: !plansMatch(args.plan, proposedTarget),
        wasCapped: loadOnlyResult.wasCapped,
        qualifiedValue: loadOnlyResult.qualifiedValue,
      };
    }

    const repStep = resolveRepStep(args);
    if (!isPositiveInteger(repStep)) {
      return null;
    }

    const repPlan = buildIncrementedRepPlan(args.plan, repStep);
    if (!repPlan) {
      return null;
    }

    const proposedTarget: ProgressionTargetPlan = {
      ...loadOnlyResult.proposedTarget,
      repsTarget: repPlan.repsTarget ?? null,
      repsMin: repPlan.repsMin ?? null,
      repsMax: repPlan.repsMax ?? null,
    };

    return {
      mutationId,
      proposedTarget,
      changed: !plansMatch(args.plan, proposedTarget),
      wasCapped: loadOnlyResult.wasCapped,
      qualifiedValue: loadOnlyResult.qualifiedValue,
    };
  }

  if (mutationId === "increase_duration" || mutationId === "increase_duration_and_distance") {
    const durationStep = resolveExplicitOrPolicyStep({
      explicitStep: args.durationSecondsStep,
      progressionStepPolicy: args.progressionStepPolicy,
      allowedPolicyKinds: ["duration"],
    });
    if (durationStep === null) {
      return null;
    }

    const durationResult = applyProgressionVector({
      vectorId: "duration",
      plan: args.plan,
      progressionStepPolicy: buildDurationStepPolicy(durationStep),
    });
    if (!durationResult) {
      return null;
    }

    if (mutationId === "increase_duration") {
      return {
        mutationId,
        proposedTarget: durationResult.proposedTarget,
        changed: !plansMatch(args.plan, durationResult.proposedTarget),
      };
    }

    const distanceStep = resolveExplicitOrPolicyStep({
      explicitStep: args.distanceStep,
      progressionStepPolicy: args.progressionStepPolicy,
      allowedPolicyKinds: ["distance", "pace_or_volume"],
    });
    if (distanceStep === null) {
      return null;
    }

    const distanceResult = applyProgressionVector({
      vectorId: "distance",
      plan: args.plan,
      progressionStepPolicy: buildDistanceStepPolicy({
        plan: args.plan,
        distanceStep,
      }),
    });
    if (!distanceResult) {
      return null;
    }

    const proposedTarget: ProgressionTargetPlan = {
      ...durationResult.proposedTarget,
      distance: distanceResult.proposedTarget.distance ?? null,
      distanceUnit: distanceResult.proposedTarget.distanceUnit ?? args.plan.distanceUnit ?? null,
    };

    return {
      mutationId,
      proposedTarget,
      changed: !plansMatch(args.plan, proposedTarget),
    };
  }

  if (mutationId === "increase_distance") {
    const distanceStep = resolveExplicitOrPolicyStep({
      explicitStep: args.distanceStep,
      progressionStepPolicy: args.progressionStepPolicy,
      allowedPolicyKinds: ["distance", "pace_or_volume"],
    });
    if (distanceStep === null) {
      return null;
    }

    const distanceResult = applyProgressionVector({
      vectorId: "distance",
      plan: args.plan,
      progressionStepPolicy: buildDistanceStepPolicy({
        plan: args.plan,
        distanceStep,
      }),
    });
    if (!distanceResult) {
      return null;
    }

    return {
      mutationId,
      proposedTarget: distanceResult.proposedTarget,
      changed: !plansMatch(args.plan, distanceResult.proposedTarget),
    };
  }

  return null;
}
