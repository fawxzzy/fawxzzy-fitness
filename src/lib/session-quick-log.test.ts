import test from "node:test";
import assert from "node:assert/strict";

import { formatQuickLogPreviewLabel } from "./session-quick-log.ts";

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

  assert.equal(label, "Log: 10–15 reps");
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

  assert.equal(label, "Log: 5–8 reps • 225 lbs");
});

test("formatQuickLogPreviewLabel falls back to set progression when no real metrics exist", () => {
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

  assert.equal(label, "Log: Set 2 of 3");
});
