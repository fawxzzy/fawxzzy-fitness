import test from "node:test";
import assert from "node:assert/strict";
import {
  applyTargetMutation,
  getDefaultTargetMutationForConfig,
  normalizeTargetMutation,
  resolveLegacyTargetMutation,
} from "@/lib/progression-target-mutation";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

function strengthPlan(overrides: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsTarget: 8,
    repsMin: 8,
    repsMax: 12,
    weightMin: 135,
    weightMax: 135,
    weightUnit: "lbs",
    ...overrides,
  };
}

test("legacy config with no targetMutation keeps classic double progression defaults", () => {
  assert.equal(getDefaultTargetMutationForConfig({
    config: { promotionBasis: "weight_and_reps" },
    plan: strengthPlan(),
  }), "increase_load_reset_reps");
  assert.equal(resolveLegacyTargetMutation({
    measurementType: "reps",
    promotionBasis: "weight_and_reps",
    targetWeight: 135,
  }), "increase_load_reset_reps");
});

test("increase_load only changes load", () => {
  const original = strengthPlan();
  const result = applyTargetMutation({
    targetMutation: "increase_load",
    plan: original,
    loadStep: 5,
    qualifiedValue: 135,
  });

  assert.equal(result?.proposedTarget.weightMin, 140);
  assert.equal(result?.proposedTarget.weightMax, 140);
  assert.equal(result?.proposedTarget.repsMin, 8);
  assert.equal(result?.proposedTarget.repsMax, 12);
  assert.deepEqual(original, strengthPlan());
});

test("increase_reps only changes reps", () => {
  const original = strengthPlan({ weightMin: null, weightMax: null, weightUnit: null });
  const result = applyTargetMutation({
    targetMutation: "increase_reps",
    plan: original,
    repStep: 1,
  });

  assert.equal(result?.proposedTarget.repsMin, 9);
  assert.equal(result?.proposedTarget.repsMax, 13);
  assert.equal(result?.proposedTarget.weightMin, null);
  assert.deepEqual(original, strengthPlan({ weightMin: null, weightMax: null, weightUnit: null }));
});

test("increase_load_reset_reps preserves classic double progression", () => {
  const result = applyTargetMutation({
    targetMutation: "increase_load_reset_reps",
    plan: strengthPlan({ repsTarget: 12 }),
    loadStep: 5,
    qualifiedValue: 135,
  });

  assert.equal(result?.proposedTarget.weightMin, 140);
  assert.equal(result?.proposedTarget.repsTarget, 8);
  assert.equal(result?.proposedTarget.repsMin, 8);
  assert.equal(result?.proposedTarget.repsMax, 12);
});

test("increase_load_and_reps changes both load and ranged reps", () => {
  const result = applyTargetMutation({
    targetMutation: "increase_load_and_reps",
    plan: strengthPlan({ repsTarget: 8 }),
    loadStep: 5,
    repStep: 1,
    qualifiedValue: 135,
  });

  assert.equal(result?.proposedTarget.weightMin, 140);
  assert.equal(result?.proposedTarget.repsTarget, 9);
  assert.equal(result?.proposedTarget.repsMin, 9);
  assert.equal(result?.proposedTarget.repsMax, 13);
});

test("increase_load_and_reps changes both load and fixed reps", () => {
  const result = applyTargetMutation({
    targetMutation: "increase_load_and_reps",
    plan: strengthPlan({ repsTarget: 8, repsMin: 8, repsMax: 8 }),
    loadStep: 5,
    repStep: 1,
    qualifiedValue: 135,
  });

  assert.equal(result?.proposedTarget.weightMin, 140);
  assert.equal(result?.proposedTarget.repsTarget, 9);
  assert.equal(result?.proposedTarget.repsMin, 9);
  assert.equal(result?.proposedTarget.repsMax, 9);
});

test("duration distance and coupled duration-distance mutations work", () => {
  const duration = applyTargetMutation({
    targetMutation: "increase_duration",
    plan: {
      measurementType: "time",
      durationSeconds: 1200,
    },
    durationStep: 60,
  });
  const distance = applyTargetMutation({
    targetMutation: "increase_distance",
    plan: {
      measurementType: "distance",
      distance: 2,
      distanceUnit: "mi",
    },
    distanceStep: 0.1,
  });
  const both = applyTargetMutation({
    targetMutation: "increase_duration_and_distance",
    plan: {
      measurementType: "time_distance",
      durationSeconds: 1200,
      distance: 2,
      distanceUnit: "mi",
    },
    distanceStep: 0.1,
  });

  assert.equal(duration?.proposedTarget.durationSeconds, 1260);
  assert.equal(distance?.proposedTarget.distance, 2.1);
  assert.equal(both?.proposedTarget.durationSeconds, 1260);
  assert.equal(both?.proposedTarget.distance, 2.1);
});

test("none leaves the target unchanged", () => {
  const original = strengthPlan();
  const result = applyTargetMutation({
    targetMutation: "none",
    plan: original,
  });

  assert.deepEqual(result?.proposedTarget, original);
  assert.notEqual(result?.proposedTarget, original);
});

test("invalid steps and invalid target shapes fail safe", () => {
  const fallbackMutation = applyTargetMutation({
    targetMutation: "increase_load_and_reps",
    plan: strengthPlan(),
    loadStep: 0,
    repStep: 1,
  });
  assert.equal(fallbackMutation?.proposedTarget.weightMin, 140);
  assert.equal(fallbackMutation?.proposedTarget.repsMin, 9);
  assert.equal(applyTargetMutation({
    targetMutation: "increase_load",
    plan: strengthPlan({ weightMin: null, weightMax: null, weightUnit: null }),
    loadStep: 5,
  }), null);
});

test("normalization falls back safely", () => {
  assert.equal(normalizeTargetMutation("bad", "increase_load"), "increase_load");
});
