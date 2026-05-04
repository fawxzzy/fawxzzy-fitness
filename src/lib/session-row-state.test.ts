import test from "node:test";
import assert from "node:assert/strict";

import { deriveSessionRowState } from "./session-row-state.ts";

test("deriveSessionRowState maps completed+skipped into completed card with disabled skip and enabled logging", () => {
  const state = deriveSessionRowState({
    loggedSetCount: 4,
    isSkipped: true,
    targetSetsMin: 4,
    fallbackWeightUnit: "lbs",
  });

  assert.equal(state.cardState, "completed");
  assert.equal(state.badgeText, "Completed");
  assert.equal(state.skipActionLabel, "Unskip");
  assert.equal(state.skipActionIntent, "danger");
  assert.equal(state.quickLogActionIntent, "positive");
  assert.equal(state.isQuickLogDisabled, false);
  assert.equal(state.isSkipDisabled, true);
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
  assert.equal(state.skipActionIntent, "danger");
  assert.equal(state.quickLogActionIntent, "neutral");
  assert.equal(state.quickLogLabel, "Log: 8 reps • 95 lbs");
});

test("deriveSessionRowState falls back quick log label from next, then last, then best", () => {
  const nextState = deriveSessionRowState({
    loggedSetCount: 0,
    isSkipped: false,
    quickLogNextTarget: {
      measurementType: "reps",
      repsMin: 6,
      weightMin: 135,
      weightUnit: "lbs",
    },
    quickLogLastTarget: {
      measurementType: "reps",
      repsMin: 5,
      weightMin: 130,
      weightUnit: "lbs",
    },
    fallbackWeightUnit: "lbs",
  });
  assert.equal(nextState.quickLogLabel, "Log: 6 reps • 135 lbs");

  const lastState = deriveSessionRowState({
    loggedSetCount: 0,
    isSkipped: false,
    quickLogNextTarget: {
      measurementType: "reps",
      repsMin: 0,
      weightMin: 0,
      weightUnit: "lbs",
    },
    quickLogLastTarget: {
      measurementType: "reps",
      repsMin: 5,
      weightMin: 130,
      weightUnit: "lbs",
    },
    quickLogBestTarget: {
      measurementType: "reps",
      repsMin: 4,
      weightMin: 140,
      weightUnit: "lbs",
    },
    fallbackWeightUnit: "lbs",
  });
  assert.equal(lastState.quickLogLabel, "Log: 5 reps • 130 lbs");

  const bestState = deriveSessionRowState({
    loggedSetCount: 0,
    isSkipped: false,
    quickLogBestTarget: {
      measurementType: "reps",
      repsMin: 4,
      weightMin: 140,
      weightUnit: "lbs",
    },
    fallbackWeightUnit: "lbs",
  });
  assert.equal(bestState.quickLogLabel, "Log: 4 reps • 140 lbs");
});
