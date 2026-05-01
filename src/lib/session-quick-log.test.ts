import test from "node:test";
import assert from "node:assert/strict";

import { formatQuickLogPreviewLabel, resolveQuickLogFromTarget } from "./session-quick-log.ts";

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
