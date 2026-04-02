import test from "node:test";
import assert from "node:assert/strict";

import { deriveSessionRowState } from "./session-row-state.ts";

test("deriveSessionRowState maps completed+skipped into completed card with unskip action", () => {
  const state = deriveSessionRowState({
    loggedSetCount: 4,
    isSkipped: true,
    targetSetsMin: 4,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(state.cardState, "completed");
  assert.equal(state.badgeText, "Completed");
  assert.equal(state.skipActionLabel, "Unskip");
  assert.equal(state.isQuickLogDisabled, true);
  assert.equal(state.quickLogDisabledMessage, "Unavailable while skipped");
});

test("deriveSessionRowState keeps quick log label and partial chips from one contract", () => {
  const state = deriveSessionRowState({
    loggedSetCount: 1,
    isSkipped: true,
    targetSetsMin: 3,
    quickLogTarget: {
      measurementType: "reps",
      repsMin: 8,
      weightMin: 95,
      weightUnit: "lbs",
    },
    fallbackWeightUnit: "lbs",
  });

  assert.equal(state.badgeText, "Partial");
  assert.deepEqual(state.chips, ["loggedProgress", "endedEarly"]);
  assert.equal(state.quickLogLabel, "Quick Log: 8 reps • 95 lbs");
});
