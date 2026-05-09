import test from "node:test";
import assert from "node:assert/strict";
import { generateSetFlowTargets, describePlannedSetTarget } from "@/lib/set-flow-targets";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";

const plan: ProgressionTargetPlan = {
  measurementType: "reps",
  setsMin: 3,
  setsMax: 3,
  repsMin: 8,
  repsMax: 10,
  weightMin: 135,
  weightMax: 135,
  weightUnit: "lbs",
};

const stepPolicy: ProgressionStepPolicy = {
  kind: "load",
  equipmentFamily: "barbell",
  label: "Load step",
  defaultValue: 10,
  unit: "lbs",
  description: "Barbell progression defaults to 10 lb.",
  source: "equipment_default",
};

test("straight sets repeat the same work target", () => {
  const targets = generateSetFlowTargets({ setFlow: "straight_sets", plan, progressionStepPolicy: stepPolicy });

  assert.equal(targets.length, 3);
  assert.deepEqual(targets.map((target) => target.role), ["work", "work", "work"]);
  assert.deepEqual(targets.map((target) => target.targetWeight), [135, 135, 135]);
  assert.deepEqual(targets.map((target) => target.targetRepsMin), [8, 8, 8]);
  assert.deepEqual(targets.map((target) => target.targetRepsMax), [10, 10, 10]);
});

test("ascending ramp increases load while reps move down", () => {
  const targets = generateSetFlowTargets({ setFlow: "ascending_ramp", plan, progressionStepPolicy: stepPolicy });

  assert.deepEqual(targets.map((target) => target.role), ["ramp", "ramp", "ramp"]);
  assert.deepEqual(targets.map((target) => target.targetWeight), [115, 125, 135]);
  assert.deepEqual(targets.map((target) => target.targetRepsMin), [10, 10, 8]);
});

test("descending backoff starts heavier then reduces load", () => {
  const targets = generateSetFlowTargets({ setFlow: "descending_backoff", plan, progressionStepPolicy: stepPolicy });

  assert.deepEqual(targets.map((target) => target.role), ["top_set", "backoff", "backoff"]);
  assert.deepEqual(targets.map((target) => target.targetWeight), [135, 125, 115]);
  assert.deepEqual(targets.map((target) => target.targetRepsMin), [8, 10, 10]);
});

test("set flow load step overrides promotion load step for per-set targets", () => {
  const targets = generateSetFlowTargets({
    setFlow: "ascending_ramp",
    plan,
    progressionStepPolicy: stepPolicy,
    setFlowSteps: { loadStep: 5 },
  });

  assert.deepEqual(targets.map((target) => target.targetWeight), [125, 130, 135]);
});

test("set flow rep step controls per-set rep targets", () => {
  const phasePlan: ProgressionTargetPlan = {
    ...plan,
    repsTarget: 4,
    repsMin: 4,
    repsMax: 6,
  };

  const ramp = generateSetFlowTargets({
    setFlow: "ascending_ramp",
    plan: phasePlan,
    progressionStepPolicy: stepPolicy,
    setFlowSteps: { repStep: 1 },
  });
  const backoff = generateSetFlowTargets({
    setFlow: "descending_backoff",
    plan: phasePlan,
    progressionStepPolicy: stepPolicy,
    setFlowSteps: { repStep: 1 },
  });

  assert.deepEqual(ramp.map((target) => target.targetRepsMin), [6, 5, 4]);
  assert.deepEqual(backoff.map((target) => target.targetRepsMin), [4, 5, 6]);
});

test("straight sets use current phase reps when target reps is set", () => {
  const targets = generateSetFlowTargets({
    setFlow: "straight_sets",
    plan: {
      ...plan,
      repsTarget: 4,
      repsMin: 4,
      repsMax: 6,
    },
    progressionStepPolicy: stepPolicy,
  });

  assert.deepEqual(targets.map((target) => target.targetRepsMin), [4, 4, 4]);
  assert.deepEqual(targets.map((target) => target.targetRepsMax), [4, 4, 4]);
});

test("missing or unsupported targets fallback safely", () => {
  assert.deepEqual(generateSetFlowTargets({ setFlow: "straight_sets", plan: null }), []);
  assert.deepEqual(generateSetFlowTargets({ setFlow: "straight_sets", plan: { measurementType: "none" } }), []);
  assert.deepEqual(generateSetFlowTargets({ setFlow: "ascending_ramp", plan: { ...plan, setsMin: null, setsMax: null } }), []);
});

test("cardio duration set flow uses duration set steps", () => {
  const targets = generateSetFlowTargets({
    setFlow: "ascending_ramp",
    plan: { measurementType: "time", setsMin: 2, setsMax: 2, durationSeconds: 1200 },
    setFlowSteps: { durationSecondsStep: 30 },
  });

  assert.equal(targets.length, 2);
  assert.deepEqual(targets.map((target) => target.role), ["ramp", "ramp"]);
  assert.deepEqual(targets.map((target) => target.durationSeconds), [1170, 1200]);
  assert.equal(describePlannedSetTarget(targets[0]), "Set 1 - Ramp: 1170s");
});

test("cardio distance set flow uses distance set steps", () => {
  const targets = generateSetFlowTargets({
    setFlow: "descending_backoff",
    plan: { measurementType: "distance", setsMin: 3, setsMax: 3, distance: 1.5 },
    setFlowSteps: { distanceStep: 0.25 },
  });

  assert.equal(targets.length, 3);
  assert.deepEqual(targets.map((target) => target.role), ["top_set", "backoff", "backoff"]);
  assert.deepEqual(targets.map((target) => target.distance), [1.5, 1.25, 1]);
});

test("legacy top set backoff set flow normalizes to straight sets", () => {
  const targets = generateSetFlowTargets({ setFlow: "top_set_backoff", plan, progressionStepPolicy: stepPolicy });

  assert.deepEqual(targets.map((target) => target.role), ["work", "work", "work"]);
  assert.deepEqual(targets.map((target) => target.targetWeight), [135, 135, 135]);
  assert.deepEqual(targets.map((target) => target.targetRepsMin), [8, 8, 8]);
});
