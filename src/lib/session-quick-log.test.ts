import test from "node:test";
import assert from "node:assert/strict";

import {
  formatQuickLogPreviewLabel,
  formatQuickLogPreviewLabelForResolvedTarget,
  resolveEffectiveQuickLogTarget,
  resolveSetFlowQuickLogTarget,
  resolveQuickLogFromResolvedTarget,
  resolveQuickLogFromTarget,
  resolveSessionQuickLogAction,
} from "./session-quick-log.ts";

test("set-flow logging keeps the routine target after explicit entries end", () => {
  const plankTarget = { measurementType: "time" as const, durationSeconds: 45 };

  assert.deepEqual(
    resolveSetFlowQuickLogTarget([plankTarget], 3, plankTarget),
    plankTarget,
  );
  assert.equal(resolveSetFlowQuickLogTarget([plankTarget], 3, null), null);
});

test("resolveSetFlowQuickLogTarget derives the canonical/prescribed target purely from set index, independent of any other set's edited values", () => {
  // SessionTimers.tsx's `currentLiveQuickLogTarget` recomputes this on every
  // `sets.length` change to shift to the next set's prescription -- this is
  // intentional (set 2 can have a different prescribed target than set 1).
  // What must NOT happen is this recomputation reaching back and altering an
  // earlier, already-logged/edited set's values. Since this function takes
  // only (setFlowTargets, setIndex, fallbackTarget) and no notion of "what
  // the user is currently typing", it is structurally incapable of clobbering
  // live edited input -- confirmed here by asserting each index's resolved
  // target depends only on that index, not on neighboring indices or on call
  // order.
  const setFlowTargets = [
    { measurementType: "reps" as const, repsMin: 10, repsMax: 10 },
    { measurementType: "reps" as const, repsMin: 8, repsMax: 8 },
    { measurementType: "reps" as const, repsMin: 6, repsMax: 6 },
  ];

  assert.deepEqual(resolveSetFlowQuickLogTarget(setFlowTargets, 0, null), setFlowTargets[0]);
  assert.deepEqual(resolveSetFlowQuickLogTarget(setFlowTargets, 1, null), setFlowTargets[1]);
  assert.deepEqual(resolveSetFlowQuickLogTarget(setFlowTargets, 2, null), setFlowTargets[2]);

  // Re-querying set index 0 after "having queried" index 2 (simulating the
  // user progressing through sets) must still return the same set-0 target,
  // unaffected by whatever happened for later sets.
  assert.deepEqual(resolveSetFlowQuickLogTarget(setFlowTargets, 0, null), setFlowTargets[0]);

  // An index past the end of the explicit set-flow list falls back to the
  // routine's steady-state target, never to some prior set's target.
  const fallback = { measurementType: "reps" as const, repsMin: 5, repsMax: 5 };
  assert.deepEqual(resolveSetFlowQuickLogTarget(setFlowTargets, 5, fallback), fallback);
});

test("formatQuickLogPreviewLabel omits unconfigured zero-valued metrics", () => {
  const label = formatQuickLogPreviewLabel({
    target: {
      repsMin: 10,
      repsMax: 15,
      weightMin: 0,
      weightMax: 0,
      weightUnit: "lbs",
      measurementType: "reps",
    },
    loggedSetCount: 0,
    targetSetsMin: 3,
    targetSetsMax: 3,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(label, "15 reps");
});

test("formatQuickLogPreviewLabel keeps configured non-zero strength metrics", () => {
  const label = formatQuickLogPreviewLabel({
    target: {
      repsMin: 5,
      repsMax: 8,
      weightMin: 225,
      weightMax: 225,
      weightUnit: "lbs",
      measurementType: "reps",
    },
    loggedSetCount: 0,
    targetSetsMin: 4,
    targetSetsMax: 4,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(label, "8 reps | 225 lbs");
});

test("formatQuickLogPreviewLabel falls back to blank when no real metrics exist", () => {
  const label = formatQuickLogPreviewLabel({
    target: {
      repsMin: 0,
      repsMax: 0,
      weightMin: 0,
      weightMax: 0,
      measurementType: "reps",
    },
    loggedSetCount: 1,
    targetSetsMin: 3,
    targetSetsMax: 3,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(label, "");
});

test("formatQuickLogPreviewLabel uses metric-based cardio summary when metrics exist", () => {
  const label = formatQuickLogPreviewLabel({
    target: {
      durationSeconds: 720,
      distance: 2,
      distanceUnit: "mi",
      calories: 250,
      measurementType: "time_distance",
    },
    loggedSetCount: 0,
    targetSetsMin: 3,
    targetSetsMax: 3,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(label, "12:00 s | 2 mi | 250 cal");
});

test("formatQuickLogPreviewLabel preserves steps distance units", () => {
  const label = formatQuickLogPreviewLabel({
    target: {
      distance: 5000,
      distanceUnit: "steps",
      measurementType: "distance",
    },
    loggedSetCount: 0,
    targetSetsMin: 1,
    targetSetsMax: 1,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(label, "5000 steps");
});

test("resolveQuickLogFromTarget keeps estimated cardio calories in the payload", () => {
  const result = resolveQuickLogFromTarget({
    durationSeconds: 900,
    distance: 2,
    distanceUnit: "mi",
    calories: 129,
    measurementType: "time_distance",
  }, "lbs");

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected cardio quick log resolution to succeed.");
  }

  assert.deepEqual(result.payload, {
    weight: 0,
    reps: 0,
    durationSeconds: 900,
    distance: 2,
    distanceUnit: "mi",
    calories: 129,
    weightUnit: "lbs",
  });
});

test("measurement-optional quick log resolves without reps or time", () => {
  const result = resolveQuickLogFromTarget({ measurementType: "none" }, "lbs");

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected quick log resolution to succeed.");
  }

  assert.deepEqual(result.payload, {
    weight: 0,
    reps: 0,
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
    weightUnit: "lbs",
  });
});

test("measurement-optional quick log preview stays empty", () => {
  const preview = formatQuickLogPreviewLabel({
    target: { measurementType: "none" },
    loggedSetCount: 0,
    targetSetsMin: null,
    targetSetsMax: null,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(preview, "");
});

test("measurementless quick log override keeps preview empty even when targets exist", () => {
  const preview = formatQuickLogPreviewLabel({
    target: {
      measurementType: "time",
      durationSeconds: 30,
      allowMeasurementlessLog: true,
    },
    loggedSetCount: 0,
    targetSetsMin: 1,
    targetSetsMax: 1,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(preview, "");
});

test("measurementless quick log override resolves without target metrics", () => {
  const result = resolveQuickLogFromTarget({
    measurementType: "time",
    durationSeconds: 30,
    allowMeasurementlessLog: true,
  }, "lbs");

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected quick log resolution to succeed.");
  }

  assert.deepEqual(result.payload, {
    weight: 0,
    reps: 0,
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
    weightUnit: "lbs",
  });
});

test("effective quick log target falls back from next to last to best", () => {
  const nextTarget = resolveEffectiveQuickLogTarget({
    quickLogTarget: undefined,
    nextTarget: { measurementType: "reps", repsMin: 6, weightMin: 135, weightUnit: "lbs" },
    lastTarget: { measurementType: "reps", repsMin: 5, weightMin: 130, weightUnit: "lbs" },
    bestTarget: { measurementType: "reps", repsMin: 4, weightMin: 140, weightUnit: "lbs" },
  });
  assert.equal(nextTarget?.source, "next");

  const lastTarget = resolveEffectiveQuickLogTarget({
    quickLogTarget: undefined,
    nextTarget: { measurementType: "reps", repsMin: 0, weightMin: 0, weightUnit: "lbs" },
    lastTarget: { measurementType: "reps", repsMin: 5, weightMin: 130, weightUnit: "lbs" },
    bestTarget: { measurementType: "reps", repsMin: 4, weightMin: 140, weightUnit: "lbs" },
  });
  assert.equal(lastTarget?.source, "last");

  const bestTarget = resolveEffectiveQuickLogTarget({
    quickLogTarget: undefined,
    nextTarget: undefined,
    lastTarget: undefined,
    bestTarget: { measurementType: "reps", repsMin: 4, weightMin: 140, weightUnit: "lbs" },
  });
  assert.equal(bestTarget?.source, "best");
});

test("resolved quick log preview and payload use fallback target chain", () => {
  const resolvedTarget = resolveEffectiveQuickLogTarget({
    quickLogTarget: undefined,
    nextTarget: { measurementType: "reps", repsMin: 8, weightMin: 95, weightUnit: "lbs" },
    lastTarget: { measurementType: "reps", repsMin: 7, weightMin: 90, weightUnit: "lbs" },
  });

  const label = formatQuickLogPreviewLabelForResolvedTarget({
    resolvedTarget,
    loggedSetCount: 0,
    targetSetsMin: 3,
    targetSetsMax: 3,
    fallbackWeightUnit: "lbs",
  });
  assert.equal(label, "8 reps | 95 lbs");

  const result = resolveQuickLogFromResolvedTarget(resolvedTarget, "lbs");
  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected resolved quick log resolution to succeed.");
  }

  assert.deepEqual(result.payload, {
    weight: 95,
    reps: 8,
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
    weightUnit: "lbs",
  });
});

test("quick-log action derives its label from the exact payload it will persist", () => {
  const action = resolveSessionQuickLogAction({
    draftPayload: {
      weight: 225,
      reps: 5,
      durationSeconds: null,
      distance: null,
      distanceUnit: null,
      calories: null,
      isWarmup: false,
      notes: null,
      weightUnit: "lbs",
    },
    resolvedTarget: resolveEffectiveQuickLogTarget({
      quickLogTarget: { measurementType: "reps", repsMin: 5, weightMin: 245, weightUnit: "lbs" },
    }),
    fallbackWeightUnit: "lbs",
  });

  assert.equal(action.ok, true);
  if (!action.ok) {
    throw new Error("Expected an atomic quick-log action.");
  }
  assert.equal(action.label, "Log: 5 reps | 225 lbs");
  assert.equal(action.payload.weight, 225);
  assert.doesNotMatch(action.label, /245/);
});

test("quick-log action derives both fallback label and payload from one resolved target", () => {
  const action = resolveSessionQuickLogAction({
    draftPayload: null,
    resolvedTarget: resolveEffectiveQuickLogTarget({
      quickLogTarget: { measurementType: "reps", repsMin: 5, weightMin: 245, weightUnit: "lbs" },
    }),
    fallbackWeightUnit: "lbs",
  });

  assert.equal(action.ok, true);
  if (!action.ok) {
    throw new Error("Expected an atomic quick-log action.");
  }
  assert.equal(action.label, "Log: 5 reps | 245 lbs");
  assert.equal(action.payload.weight, 245);
});
