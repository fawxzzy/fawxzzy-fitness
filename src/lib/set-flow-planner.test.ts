import test from "node:test";
import assert from "node:assert/strict";

import { planSetFlowTargets } from "@/lib/set-flow-planner";

test("straight sets repeat the same reps and load", () => {
  const targets = planSetFlowTargets({
    setFlow: "straight_sets",
    targetSets: 3,
    targetWeight: 135,
    targetReps: 8,
  });

  assert.deepEqual(targets, [
    { index: 1, role: "straight", label: "Set 1", targetWeight: 135, targetReps: 8 },
    { index: 2, role: "straight", label: "Set 2", targetWeight: 135, targetReps: 8 },
    { index: 3, role: "straight", label: "Set 3", targetWeight: 135, targetReps: 8 },
  ]);
});

test("straight sets handle missing load safely", () => {
  const targets = planSetFlowTargets({
    setFlow: "straight_sets",
    targetSets: 2,
    targetReps: 10,
  });

  assert.deepEqual(targets, [
    { index: 1, role: "straight", label: "Set 1", targetReps: 10 },
    { index: 2, role: "straight", label: "Set 2", targetReps: 10 },
  ]);
});

test("straight sets handle missing reps safely", () => {
  const targets = planSetFlowTargets({
    setFlow: "straight_sets",
    targetSets: 2,
    targetWeight: 45,
  });

  assert.deepEqual(targets, [
    { index: 1, role: "straight", label: "Set 1", targetWeight: 45 },
    { index: 2, role: "straight", label: "Set 2", targetWeight: 45 },
  ]);
});

test("unknown set flow falls back to straight sets", () => {
  const targets = planSetFlowTargets({
    setFlow: "unsupported_flow",
    targetSets: 2,
    targetWeight: 50,
    targetReps: 12,
  });

  assert.deepEqual(targets.map((target) => target.role), ["straight", "straight"]);
  assert.deepEqual(targets.map((target) => target.targetReps), [12, 12]);
});

test("legacy top set backoff token falls back to straight sets", () => {
  const targets = planSetFlowTargets({
    setFlow: "top_set_backoff",
    targetSets: 2,
    targetWeight: 70,
    targetReps: 5,
  });

  assert.deepEqual(targets.map((target) => target.role), ["straight", "straight"]);
});

test("invalid set count is safe", () => {
  assert.deepEqual(planSetFlowTargets({
    setFlow: "straight_sets",
    targetSets: 0,
    targetWeight: 100,
    targetReps: 5,
  }), []);
  assert.deepEqual(planSetFlowTargets({
    setFlow: "straight_sets",
    targetSets: null,
    targetWeight: 100,
    targetReps: 5,
  }), []);
});

test("ascending ramp increases reps within the range", () => {
  const targets = planSetFlowTargets({
    setFlow: "ascending_ramp",
    targetSets: 3,
    targetWeight: 185,
    repRange: { min: 4, max: 8 },
  });

  assert.deepEqual(targets, [
    { index: 1, role: "ramp", label: "Set 1 - Ramp", targetWeight: 185, targetReps: 4 },
    { index: 2, role: "ramp", label: "Set 2 - Ramp", targetWeight: 185, targetReps: 6 },
    { index: 3, role: "ramp", label: "Set 3 - Ramp", targetWeight: 185, targetReps: 8 },
  ]);
});

test("descending backoff increases reps across backoff sets without guessing load equations", () => {
  const targets = planSetFlowTargets({
    setFlow: "descending_backoff",
    targetSets: 3,
    targetWeight: 185,
    repRange: { min: 4, max: 8 },
  });

  assert.deepEqual(targets, [
    { index: 1, role: "top", label: "Set 1 - Top set", targetWeight: 185, targetReps: 4 },
    { index: 2, role: "backoff", label: "Set 2 - Backoff", targetWeight: 185, targetReps: 6 },
    { index: 3, role: "backoff", label: "Set 3 - Backoff", targetWeight: 185, targetReps: 8 },
  ]);
});

test("invalid rep range falls back safely", () => {
  const targets = planSetFlowTargets({
    setFlow: "ascending_ramp",
    targetSets: 3,
    targetWeight: 185,
    repRange: { min: null, max: null },
  });

  assert.deepEqual(targets, [
    { index: 1, role: "straight", label: "Set 1", targetWeight: 185 },
    { index: 2, role: "straight", label: "Set 2", targetWeight: 185 },
    { index: 3, role: "straight", label: "Set 3", targetWeight: 185 },
  ]);
});

test("source input is not mutated", () => {
  const input = {
    setFlow: "descending_backoff",
    targetSets: 3,
    targetWeight: 185,
    repRange: { min: 4, max: 8 },
    loadStep: 10,
    repStep: 2,
  } as const;
  const before = structuredClone(input);

  void planSetFlowTargets(input);

  assert.deepEqual(input, before);
});
