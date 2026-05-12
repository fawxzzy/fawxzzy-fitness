import test from "node:test";
import assert from "node:assert/strict";
import {
  applyTargetMutation,
  getDefaultTargetMutationForConfig,
  normalizeTargetMutation,
  resolveLegacyTargetMutation,
} from "@/lib/progression-target-mutation";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";

function buildStrengthPlan(args: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
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
    ...args,
  };
}

function buildTimePlan(args: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "time",
    durationSeconds: 1200,
    ...args,
  };
}

function buildDistancePlan(args: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "distance",
    distance: 2,
    distanceUnit: "mi",
    ...args,
  };
}

function buildTimeDistancePlan(args: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "time_distance",
    durationSeconds: 1200,
    distance: 2,
    distanceUnit: "mi",
    ...args,
  };
}

test("normalizes valid target mutation ids and falls back safely for invalid ids", () => {
  assert.equal(normalizeTargetMutation("increase_load_and_reps"), "increase_load_and_reps");
  assert.equal(normalizeTargetMutation("bad-value", "increase_reps"), "increase_reps");
});

test("legacy resolver keeps classic double progression separate from promotion basis", () => {
  assert.equal(resolveLegacyTargetMutation({
    plan: buildStrengthPlan(),
    promotionBasis: "weight_and_reps",
  }), "increase_load_reset_reps");
  assert.equal(resolveLegacyTargetMutation({
    plan: buildStrengthPlan(),
    promotionBasis: "reps_only",
  }), "increase_reps");
  assert.equal(resolveLegacyTargetMutation({
    plan: buildStrengthPlan(),
    promotionBasis: "weight_only",
  }), "increase_load");
});

test("default mutation resolver preserves legacy time, distance, and time+distance behavior", () => {
  assert.equal(getDefaultTargetMutationForConfig({
    plan: buildTimePlan(),
  }), "increase_duration");
  assert.equal(getDefaultTargetMutationForConfig({
    plan: buildDistancePlan(),
  }), "increase_distance");
  assert.equal(getDefaultTargetMutationForConfig({
    plan: buildTimeDistancePlan(),
  }), "increase_distance");
});

test("none does not mutate the target", () => {
  const plan = buildStrengthPlan();
  const result = applyTargetMutation({
    plan,
    targetMutation: "none",
  });

  assert.ok(result);
  assert.equal(result.changed, false);
  assert.notEqual(result.proposedTarget, plan);
  assert.deepEqual(result.proposedTarget, plan);
});

test("increase_load changes only load", () => {
  const plan = buildStrengthPlan();
  const result = applyTargetMutation({
    plan,
    targetMutation: "increase_load",
    loadStep: 5,
    qualifiedValue: 135,
  });

  assert.ok(result);
  assert.equal(result.proposedTarget.weightMin, 140);
  assert.equal(result.proposedTarget.weightMax, 140);
  assert.equal(result.proposedTarget.repsTarget, 8);
  assert.equal(result.proposedTarget.repsMin, 8);
  assert.equal(result.proposedTarget.repsMax, 12);
});

test("increase_reps changes only reps", () => {
  const plan = buildStrengthPlan();
  const result = applyTargetMutation({
    plan,
    targetMutation: "increase_reps",
    repStep: 1,
  });

  assert.ok(result);
  assert.equal(result.proposedTarget.weightMin, 135);
  assert.equal(result.proposedTarget.weightMax, 135);
  assert.equal(result.proposedTarget.repsTarget, 9);
  assert.equal(result.proposedTarget.repsMin, 9);
  assert.equal(result.proposedTarget.repsMax, 13);
});

test("increase_load_reset_reps preserves classic double progression behavior", () => {
  const plan = buildStrengthPlan({
    repsTarget: 12,
    repsMin: 8,
    repsMax: 12,
  });
  const result = applyTargetMutation({
    plan,
    targetMutation: "increase_load_reset_reps",
    loadStep: 5,
    qualifiedValue: 135,
  });

  assert.ok(result);
  assert.equal(result.proposedTarget.weightMin, 140);
  assert.equal(result.proposedTarget.weightMax, 140);
  assert.equal(result.proposedTarget.repsTarget, 8);
  assert.equal(result.proposedTarget.repsMin, 8);
  assert.equal(result.proposedTarget.repsMax, 12);
});

test("increase_load_and_reps changes both load and reps for ranged targets", () => {
  const plan = buildStrengthPlan({
    repsTarget: 8,
    repsMin: 8,
    repsMax: 12,
    weightMin: 135,
    weightMax: 135,
  });
  const result = applyTargetMutation({
    plan,
    targetMutation: "increase_load_and_reps",
    loadStep: 5,
    repStep: 1,
    qualifiedValue: 135,
  });

  assert.ok(result);
  assert.equal(result.proposedTarget.weightMin, 140);
  assert.equal(result.proposedTarget.weightMax, 140);
  assert.equal(result.proposedTarget.repsTarget, 9);
  assert.equal(result.proposedTarget.repsMin, 9);
  assert.equal(result.proposedTarget.repsMax, 13);
});

test("increase_load_and_reps changes both load and reps for fixed-rep targets", () => {
  const plan = buildStrengthPlan({
    repsTarget: 8,
    repsMin: 8,
    repsMax: 8,
    weightMin: 135,
    weightMax: 135,
  });
  const result = applyTargetMutation({
    plan,
    targetMutation: "increase_load_and_reps",
    loadStep: 5,
    repStep: 1,
    qualifiedValue: 135,
  });

  assert.ok(result);
  assert.equal(result.proposedTarget.weightMin, 140);
  assert.equal(result.proposedTarget.weightMax, 140);
  assert.equal(result.proposedTarget.repsTarget, 9);
  assert.equal(result.proposedTarget.repsMin, 9);
  assert.equal(result.proposedTarget.repsMax, 9);
});

test("duration, distance, and duration+distance mutations work when targets support them", () => {
  const durationResult = applyTargetMutation({
    plan: buildTimePlan(),
    targetMutation: "increase_duration",
    durationSecondsStep: 60,
  });
  assert.ok(durationResult);
  assert.equal(durationResult.proposedTarget.durationSeconds, 1260);

  const distanceResult = applyTargetMutation({
    plan: buildDistancePlan(),
    targetMutation: "increase_distance",
    distanceStep: 0.1,
  });
  assert.ok(distanceResult);
  assert.equal(distanceResult.proposedTarget.distance, 2.1);

  const combinedResult = applyTargetMutation({
    plan: buildTimeDistancePlan(),
    targetMutation: "increase_duration_and_distance",
    durationSecondsStep: 60,
    distanceStep: 0.1,
  });
  assert.ok(combinedResult);
  assert.equal(combinedResult.proposedTarget.durationSeconds, 1260);
  assert.equal(combinedResult.proposedTarget.distance, 2.1);
});

test("invalid steps are safe and input targets are not mutated", () => {
  const plan = buildStrengthPlan();
  const snapshot = structuredClone(plan);

  const badLoad = applyTargetMutation({
    plan,
    targetMutation: "increase_load",
    loadStep: 0,
  });
  assert.equal(badLoad, null);

  const badCombo = applyTargetMutation({
    plan,
    targetMutation: "increase_load_and_reps",
    loadStep: 5,
    repStep: 0,
  });
  assert.equal(badCombo, null);

  assert.deepEqual(plan, snapshot);
});
