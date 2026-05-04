import test from "node:test";
import assert from "node:assert/strict";

import {
  formatQuickLogPreviewLabel,
  formatQuickLogPreviewLabelForResolvedTarget,
  resolveEffectiveQuickLogTarget,
  resolveQuickLogFromResolvedTarget,
  resolveQuickLogFromTarget,
} from "./session-quick-log.ts";

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

  assert.equal(label, "8 reps • 225 lbs");
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

  assert.equal(label, "12:00 s • 2 mi • 250 cal");
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
  assert.equal(label, "8 reps â€¢ 95 lbs");

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
