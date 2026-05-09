import test from "node:test";
import assert from "node:assert/strict";
import {
  applyProgressionVector,
  resolveProgressionQualificationPolicy,
  resolveProgressionVector,
  resolveProgressionVectorForPlan,
} from "@/lib/progression-vector";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

function plan(overrides: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsMin: 5,
    repsMax: 8,
    weightMin: 25,
    weightMax: 25,
    weightUnit: "lbs",
    ...overrides,
  };
}

test("resolves measurement-aware progression vectors", () => {
  assert.equal(resolveProgressionVector({ measurementType: "reps", targetWeight: 25, progressionMethod: "double_progression" }), "coupled_load_reps");
  assert.equal(resolveProgressionVector({ measurementType: "reps", targetWeight: null, progressionMethod: "double_progression" }), "reps");
  assert.equal(resolveProgressionVector({ measurementType: "time", progressionMethod: "double_progression" }), "duration");
  assert.equal(resolveProgressionVector({ measurementType: "distance", progressionMethod: "double_progression" }), "distance");
  assert.equal(resolveProgressionVector({ measurementType: "time_distance", progressionMethod: "double_progression" }), "coupled_duration_distance");
  assert.equal(resolveProgressionVector({ measurementType: "none", progressionMethod: "double_progression" }), "none");
  assert.equal(resolveProgressionVector({ measurementType: "reps", targetWeight: 25, progressionMethod: "manual" }), "none");
});

test("resolves vector from target shape", () => {
  assert.equal(resolveProgressionVectorForPlan({ plan: plan(), progressionMethod: "double_progression" }), "coupled_load_reps");
  assert.equal(resolveProgressionVectorForPlan({ plan: plan({ weightMin: null, weightMax: null }), progressionMethod: "double_progression" }), "reps");
});

test("resolves qualification policy separately from vector", () => {
  assert.equal(resolveProgressionQualificationPolicy({ measurementType: "reps", progressionMethod: "double_progression" }), "all_checked_sets_at_top_reps");
  assert.equal(resolveProgressionQualificationPolicy({ measurementType: "time", progressionMethod: "double_progression" }), "target_duration_complete");
  assert.equal(resolveProgressionQualificationPolicy({ measurementType: "distance", progressionMethod: "double_progression" }), "target_distance_complete");
  assert.equal(resolveProgressionQualificationPolicy({ measurementType: "time_distance", progressionMethod: "double_progression" }), "target_time_distance_complete");
  assert.equal(resolveProgressionQualificationPolicy({ measurementType: "reps", progressionMethod: "manual" }), "manual_review");
});

test("coupled load and reps increases load and resets reps to lower target", () => {
  const result = applyProgressionVector({
    vectorId: "coupled_load_reps",
    plan: plan(),
    progressionStepPolicy: {
      kind: "load",
      equipmentFamily: "bodyweight",
      label: "Load step",
      defaultValue: 5,
      unit: "lbs",
      description: "Test step.",
      source: "exercise_override",
    },
    qualifiedValue: 30,
  });

  assert.equal(result?.proposedTarget.weightMin, 35);
  assert.equal(result?.proposedTarget.weightMax, 35);
  assert.equal(result?.proposedTarget.repsTarget, 5);
  assert.equal(result?.proposedTarget.repsMin, 5);
  assert.equal(result?.proposedTarget.repsMax, 8);
  assert.equal(result?.wasCapped, false);
});

test("coupled load progression caps large jumps", () => {
  const result = applyProgressionVector({
    vectorId: "coupled_load_reps",
    plan: plan(),
    progressionStepPolicy: {
      kind: "load",
      equipmentFamily: "barbell",
      label: "Load step",
      defaultValue: 5,
      unit: "lbs",
      description: "Test step.",
      source: "exercise_override",
    },
    qualifiedValue: 80,
  });

  assert.equal(result?.proposedTarget.weightMin, 35);
  assert.equal(result?.wasCapped, true);
});

test("reps vector preserves range width", () => {
  const result = applyProgressionVector({
    vectorId: "reps",
    plan: plan({ weightMin: null, weightMax: null, repsMin: 8, repsMax: 12 }),
    progressionStepPolicy: {
      kind: "reps",
      equipmentFamily: "bodyweight",
      label: "Rep step",
      defaultValue: 1,
      unit: "reps",
      description: "Test step.",
      source: "equipment_default",
    },
  });

  assert.equal(result?.proposedTarget.repsMin, 9);
  assert.equal(result?.proposedTarget.repsMax, 13);
});

test("duration distance and coupled duration-distance vectors apply metric steps", () => {
  const duration = applyProgressionVector({
    vectorId: "duration",
    plan: plan({ measurementType: "time", durationSeconds: 1200, repsMin: null, repsMax: null, weightMin: null, weightMax: null }),
    progressionStepPolicy: {
      kind: "duration",
      equipmentFamily: "cardio",
      label: "Duration step",
      defaultValue: 60,
      unit: "seconds",
      description: "Test step.",
      source: "equipment_default",
    },
  });
  const distance = applyProgressionVector({
    vectorId: "distance",
    plan: plan({ measurementType: "distance", distance: 2, distanceUnit: "mi", repsMin: null, repsMax: null, weightMin: null, weightMax: null }),
    progressionStepPolicy: {
      kind: "distance",
      equipmentFamily: "cardio",
      label: "Distance step",
      defaultValue: 0.1,
      unit: "mi",
      description: "Test step.",
      source: "equipment_default",
    },
  });
  const timeDistance = applyProgressionVector({
    vectorId: "coupled_duration_distance",
    plan: plan({ measurementType: "time_distance", durationSeconds: 1200, distance: 2, distanceUnit: "mi", repsMin: null, repsMax: null, weightMin: null, weightMax: null }),
    progressionStepPolicy: {
      kind: "distance",
      equipmentFamily: "cardio",
      label: "Distance step",
      defaultValue: 0.1,
      unit: "mi",
      description: "Test step.",
      source: "equipment_default",
    },
  });

  assert.equal(duration?.proposedTarget.durationSeconds, 1260);
  assert.equal(distance?.proposedTarget.distance, 2.1);
  assert.equal(timeDistance?.proposedTarget.durationSeconds, 1200);
  assert.equal(timeDistance?.proposedTarget.distance, 2.1);
});
