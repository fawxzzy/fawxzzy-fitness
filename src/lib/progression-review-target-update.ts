import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";
import type { FitnessDistanceUnit } from "@/types/db";

export type ProgressionReviewTargetUpdate = {
  target_sets: number | null;
  target_reps: number | null;
  target_reps_min: number | null;
  target_reps_max: number | null;
  target_weight: number | null;
  target_weight_unit: "lbs" | "kg" | null;
  target_duration_seconds: number | null;
  target_distance: number | null;
  target_distance_unit: FitnessDistanceUnit | null;
  target_calories: number | null;
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

export function buildProgressionReviewTargetUpdate(plan: ProgressionTargetPlan): ProgressionReviewTargetUpdate {
  const singleReps = plan.repsMin !== null
    && plan.repsMin !== undefined
    && plan.repsMin === plan.repsMax
    ? plan.repsMin
    : null;
  const currentPhaseReps = typeof plan.repsTarget === "number" && Number.isFinite(plan.repsTarget) && plan.repsTarget > 0
    ? plan.repsTarget
    : singleReps;

  return {
    target_sets: resolveSingleValue(plan.setsMin, plan.setsMax),
    target_reps: currentPhaseReps,
    target_reps_min: plan.repsMin ?? null,
    target_reps_max: plan.repsMax ?? null,
    target_weight: resolveSingleValue(plan.weightMin, plan.weightMax),
    target_weight_unit: plan.weightUnit ?? null,
    target_duration_seconds: plan.durationSeconds ?? null,
    target_distance: plan.distance ?? null,
    target_distance_unit: plan.distanceUnit ?? null,
    target_calories: plan.calories ?? null,
  };
}
