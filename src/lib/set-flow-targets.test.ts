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

// Custom (non-legacy-preset) per-field direction combinations, exercised via
// setFlowDirections directly. Weight is the primary training-domain signal
// for role selection: an explicit weight direction always wins, and reps
// only decides the role when weight itself is "straight". This matrix locks
// in every meaningful weight x reps combination so a future change can't
// silently reintroduce either of the two defects found in review of #141:
// (1) weight="down" was mislabeled "ramp" whenever reps also happened to be
// "down", instead of the correct "backoff"/"top_set" (weight is what's
// actually decreasing); (2) reps="straight" was never honored once weight
// was up/down -- reps silently ramped anyway instead of staying constant.
const customDirectionPlan: ProgressionTargetPlan = {
  measurementType: "reps",
  setsMin: 4,
  setsMax: 4,
  repsMin: 5,
  repsMax: 10,
  weightMin: 100,
  weightMax: 100,
  weightUnit: "lbs",
};

function runCustomDirections(weight: "up" | "down" | "straight", reps: "up" | "down" | "straight") {
  return generateSetFlowTargets({
    setFlow: "straight_sets",
    setFlowDirections: { time: "straight", distance: "straight", reps, weight },
    plan: customDirectionPlan,
    targetSets: 4,
  });
}

test("custom directions: weight is the primary signal for role selection, not reps", () => {
  // Canonical-equivalent combinations (weight and reps agree) -- unaffected by the fix.
  assert.deepEqual(runCustomDirections("up", "down").map((t) => t.role), ["ramp", "ramp", "ramp", "ramp"]);
  assert.deepEqual(runCustomDirections("down", "up").map((t) => t.role), ["top_set", "backoff", "backoff", "backoff"]);

  // The fixed defect: weight down + reps down must be a backoff (load is
  // decreasing), never a ramp, even though reps also happens to be "down".
  const weightDownRepsDown = runCustomDirections("down", "down");
  assert.deepEqual(weightDownRepsDown.map((t) => t.role), ["top_set", "backoff", "backoff", "backoff"]);
  assert.deepEqual(weightDownRepsDown.map((t) => t.targetWeight), [100, 95, 90, 85]);

  // weight up + reps up: weight still wins (ramp), reps honored as "up".
  const weightUpRepsUp = runCustomDirections("up", "up");
  assert.deepEqual(weightUpRepsUp.map((t) => t.role), ["ramp", "ramp", "ramp", "ramp"]);
  assert.deepEqual(weightUpRepsUp.map((t) => t.targetWeight), [85, 90, 95, 100]);

  // weight "straight" defers to reps for role selection (reps-only progression).
  assert.deepEqual(runCustomDirections("straight", "down").map((t) => t.role), ["ramp", "ramp", "ramp", "ramp"]);
  assert.deepEqual(runCustomDirections("straight", "up").map((t) => t.role), ["top_set", "backoff", "backoff", "backoff"]);

  // Both straight: falls through to plain straight sets, not ramp/backoff.
  assert.deepEqual(runCustomDirections("straight", "straight").map((t) => t.role), ["work", "work", "work", "work"]);
});

test("custom directions: reps=\"straight\" always stays constant, regardless of the weight direction", () => {
  // The fixed defect: reps must never silently ramp when explicitly configured "straight".
  const weightUp = runCustomDirections("up", "straight");
  assert.deepEqual(weightUp.map((t) => t.targetWeight), [85, 90, 95, 100]);
  assert.deepEqual(weightUp.map((t) => t.targetRepsMin), [5, 5, 5, 5]);
  assert.deepEqual(weightUp.map((t) => t.targetRepsMax), [5, 5, 5, 5]);

  const weightDown = runCustomDirections("down", "straight");
  assert.deepEqual(weightDown.map((t) => t.targetWeight), [100, 95, 90, 85]);
  assert.deepEqual(weightDown.map((t) => t.targetRepsMin), [5, 5, 5, 5]);
  assert.deepEqual(weightDown.map((t) => t.targetRepsMax), [5, 5, 5, 5]);
});

test("custom directions: full weight x reps matrix produces the exact expected role and weight trend for every combination", () => {
  const expected: Array<{
    weight: "up" | "down" | "straight";
    reps: "up" | "down" | "straight";
    roles: string[];
    weights: Array<number | null>;
  }> = [
    { weight: "up", reps: "up", roles: ["ramp", "ramp", "ramp", "ramp"], weights: [85, 90, 95, 100] },
    { weight: "up", reps: "down", roles: ["ramp", "ramp", "ramp", "ramp"], weights: [85, 90, 95, 100] },
    { weight: "up", reps: "straight", roles: ["ramp", "ramp", "ramp", "ramp"], weights: [85, 90, 95, 100] },
    { weight: "down", reps: "up", roles: ["top_set", "backoff", "backoff", "backoff"], weights: [100, 95, 90, 85] },
    { weight: "down", reps: "down", roles: ["top_set", "backoff", "backoff", "backoff"], weights: [100, 95, 90, 85] },
    { weight: "down", reps: "straight", roles: ["top_set", "backoff", "backoff", "backoff"], weights: [100, 95, 90, 85] },
    { weight: "straight", reps: "up", roles: ["top_set", "backoff", "backoff", "backoff"], weights: [100, 100, 100, 100] },
    { weight: "straight", reps: "down", roles: ["ramp", "ramp", "ramp", "ramp"], weights: [100, 100, 100, 100] },
    { weight: "straight", reps: "straight", roles: ["work", "work", "work", "work"], weights: [100, 100, 100, 100] },
  ];

  for (const { weight, reps, roles, weights } of expected) {
    const targets = runCustomDirections(weight, reps);
    assert.deepEqual(targets.map((t) => t.role), roles, `roles mismatch for weight=${weight} reps=${reps}`);
    assert.deepEqual(targets.map((t) => t.targetWeight), weights, `weights mismatch for weight=${weight} reps=${reps}`);
  }
});
