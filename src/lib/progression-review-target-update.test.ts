import test from "node:test";
import assert from "node:assert/strict";
import { buildProgressionReviewTargetUpdate } from "@/lib/progression-review-target-update";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

function buildTarget(overrides: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsMin: 8,
    repsMax: 10,
    weightMin: 135,
    weightMax: 135,
    weightUnit: "lbs",
    ...overrides,
  };
}

test("maps a promotion target to one routine exercise update payload", () => {
  assert.deepEqual(
    buildProgressionReviewTargetUpdate(buildTarget({
      repsMin: 8,
      repsMax: 8,
      weightMin: 140,
      weightMax: 140,
    })),
    {
      target_sets: 3,
      target_reps: 8,
      target_reps_min: 8,
      target_reps_max: 8,
      target_weight: 140,
      target_weight_unit: "lbs",
      target_duration_seconds: null,
      target_distance: null,
      target_distance_unit: null,
      target_calories: null,
    },
  );
});

test("keeps rep range fields when a target is not a single rep value", () => {
  assert.deepEqual(
    buildProgressionReviewTargetUpdate(buildTarget()),
    {
      target_sets: 3,
      target_reps: null,
      target_reps_min: 8,
      target_reps_max: 10,
      target_weight: 135,
      target_weight_unit: "lbs",
      target_duration_seconds: null,
      target_distance: null,
      target_distance_unit: null,
      target_calories: null,
    },
  );
});

test("stores current phase reps separately from the preserved rep range", () => {
  assert.deepEqual(
    buildProgressionReviewTargetUpdate(buildTarget({
      repsTarget: 5,
      repsMin: 4,
      repsMax: 6,
      weightMin: 230,
      weightMax: 230,
    })),
    {
      target_sets: 3,
      target_reps: 5,
      target_reps_min: 4,
      target_reps_max: 6,
      target_weight: 230,
      target_weight_unit: "lbs",
      target_duration_seconds: null,
      target_distance: null,
      target_distance_unit: null,
      target_calories: null,
    },
  );
});
