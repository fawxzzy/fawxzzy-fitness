import type {
  ProgressionMeasurementType,
  ProgressionMethodLayerId,
  ProgressionTargetPlan,
} from "@/lib/progression-playbooks";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";

export type ProgressionVectorId =
  | "load"
  | "reps"
  | "duration"
  | "distance"
  | "pace_volume"
  | "coupled_load_reps"
  | "coupled_duration_distance"
  | "none";

export type ProgressionQualificationPolicyId =
  | "all_checked_sets_at_top_reps"
  | "target_duration_complete"
  | "target_distance_complete"
  | "target_time_distance_complete"
  | "manual_review"
  | "none";

export type ProgressionVectorApplication = {
  proposedTarget: ProgressionTargetPlan;
  wasCapped?: boolean;
  qualifiedValue?: number | null;
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

function resolveDefaultStep(args: {
  vectorId: ProgressionVectorId;
  plan: ProgressionTargetPlan;
  progressionStepPolicy?: ProgressionStepPolicy | null;
}) {
  const policyKind = args.progressionStepPolicy?.kind ?? null;
  const compatiblePolicy = (
    (args.vectorId === "load" || args.vectorId === "coupled_load_reps")
      ? policyKind === "load"
      : args.vectorId === "reps"
        ? policyKind === "reps"
        : args.vectorId === "duration"
          ? policyKind === "duration"
          : args.vectorId === "distance"
            ? policyKind === "distance"
            : args.vectorId === "coupled_duration_distance"
              ? policyKind === "distance" || policyKind === "pace_or_volume"
              : false
  );
  if (compatiblePolicy && isPositiveNumber(args.progressionStepPolicy?.defaultValue)) {
    return args.progressionStepPolicy.defaultValue;
  }

  switch (args.vectorId) {
  case "duration":
    return 60;
  case "distance":
  case "coupled_duration_distance":
    return args.plan.distanceUnit === "km" ? 0.25 : 0.1;
  case "reps":
    return 1;
  case "load":
  case "coupled_load_reps":
    return 5;
  case "pace_volume":
  case "none":
    return null;
  }
}

export function resolveProgressionVector(args: {
  measurementType?: ProgressionMeasurementType | null;
  targetWeight?: number | null;
  progressionMethod?: ProgressionMethodLayerId | null;
}): ProgressionVectorId {
  const measurementType = args.measurementType ?? "reps";
  const method = args.progressionMethod ?? "manual";

  if (method === "manual" || method === "hold_and_review" || measurementType === "none") {
    return "none";
  }

  if (measurementType === "reps") {
    return isPositiveNumber(args.targetWeight) ? "coupled_load_reps" : "reps";
  }

  if (measurementType === "time") {
    return "duration";
  }

  if (measurementType === "distance") {
    return "distance";
  }

  if (measurementType === "time_distance") {
    return "coupled_duration_distance";
  }

  return "none";
}

export function resolveProgressionVectorForPlan(args: {
  plan: ProgressionTargetPlan;
  progressionMethod?: ProgressionMethodLayerId | null;
}) {
  return resolveProgressionVector({
    measurementType: args.plan.measurementType,
    targetWeight: args.plan.weightMax ?? args.plan.weightMin ?? null,
    progressionMethod: args.progressionMethod,
  });
}

export function resolveProgressionQualificationPolicy(args: {
  measurementType?: ProgressionMeasurementType | null;
  progressionMethod?: ProgressionMethodLayerId | null;
}): ProgressionQualificationPolicyId {
  const measurementType = args.measurementType ?? "reps";
  const method = args.progressionMethod ?? "manual";

  if (method === "manual" || method === "hold_and_review") {
    return "manual_review";
  }

  switch (measurementType) {
  case "reps":
    return "all_checked_sets_at_top_reps";
  case "time":
    return "target_duration_complete";
  case "distance":
    return "target_distance_complete";
  case "time_distance":
    return "target_time_distance_complete";
  case "none":
    return "none";
  }
}

export function applyProgressionVector(args: {
  vectorId: ProgressionVectorId;
  plan: ProgressionTargetPlan;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  qualifiedValue?: number | null;
  maxAutoPromotionSteps?: number;
}): ProgressionVectorApplication | null {
  const step = resolveDefaultStep({
    vectorId: args.vectorId,
    plan: args.plan,
    progressionStepPolicy: args.progressionStepPolicy,
  });

  if (!isPositiveNumber(step)) {
    return null;
  }

  if (args.vectorId === "coupled_load_reps" || args.vectorId === "load") {
    const currentWeight = resolveSingleValue(args.plan.weightMin, args.plan.weightMax);
    if (!isPositiveNumber(currentWeight)) {
      return null;
    }

    const safeQualifiedLoad = isPositiveNumber(args.qualifiedValue) && args.qualifiedValue > currentWeight
      ? args.qualifiedValue
      : currentWeight;
    const uncappedNextWeight = safeQualifiedLoad + step;
    const maxSteps = isPositiveNumber(args.maxAutoPromotionSteps) ? args.maxAutoPromotionSteps : 2;
    const cappedNextWeight = currentWeight + (step * maxSteps);
    const nextWeight = Math.min(uncappedNextWeight, cappedNextWeight);
    const nextReps = args.vectorId === "coupled_load_reps" ? resolveRepFloor(args.plan) : null;

    return {
      proposedTarget: {
        ...args.plan,
        repsTarget: nextReps ?? args.plan.repsTarget ?? null,
        repsMin: args.plan.repsMin ?? nextReps ?? null,
        repsMax: args.plan.repsMax ?? nextReps ?? null,
        weightMin: nextWeight,
        weightMax: nextWeight,
      },
      wasCapped: uncappedNextWeight > cappedNextWeight,
      qualifiedValue: safeQualifiedLoad,
    };
  }

  if (args.vectorId === "reps") {
    const minReps = isPositiveNumber(args.plan.repsMin) ? args.plan.repsMin : null;
    const maxReps = isPositiveNumber(args.plan.repsMax) ? args.plan.repsMax : minReps;
    const fixedReps = resolveSingleValue(args.plan.repsMin, args.plan.repsMax);
    if (!isPositiveNumber(fixedReps)) {
      return null;
    }

    return {
      proposedTarget: {
        ...args.plan,
        repsMin: minReps ? minReps + step : fixedReps + step,
        repsMax: maxReps ? maxReps + step : fixedReps + step,
      },
      qualifiedValue: fixedReps,
    };
  }

  if (args.vectorId === "duration") {
    if (!isPositiveNumber(args.plan.durationSeconds)) {
      return null;
    }

    return {
      proposedTarget: {
        ...args.plan,
        durationSeconds: Math.round(args.plan.durationSeconds + step),
      },
      qualifiedValue: args.plan.durationSeconds,
    };
  }

  if (args.vectorId === "distance" || args.vectorId === "coupled_duration_distance") {
    if (!isPositiveNumber(args.plan.distance)) {
      return null;
    }

    return {
      proposedTarget: {
        ...args.plan,
        distance: Number((args.plan.distance + step).toFixed(3)),
      },
      qualifiedValue: args.plan.distance,
    };
  }

  return null;
}

export function getProgressionVectorLabel(vectorId: ProgressionVectorId) {
  switch (vectorId) {
  case "load":
    return "Load";
  case "reps":
    return "Reps";
  case "duration":
    return "Duration";
  case "distance":
    return "Distance";
  case "pace_volume":
    return "Pace / volume";
  case "coupled_load_reps":
    return "Coupled load + reps";
  case "coupled_duration_distance":
    return "Coupled duration + distance";
  case "none":
    return "None";
  }
}

export function getProgressionQualificationPolicyLabel(policyId: ProgressionQualificationPolicyId) {
  switch (policyId) {
  case "all_checked_sets_at_top_reps":
    return "All checked sets at top reps";
  case "target_duration_complete":
    return "Target duration complete";
  case "target_distance_complete":
    return "Target distance complete";
  case "target_time_distance_complete":
    return "Target time + distance complete";
  case "manual_review":
    return "Manual review";
  case "none":
    return "None";
  }
}
