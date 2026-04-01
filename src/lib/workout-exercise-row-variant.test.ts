import test from "node:test";
import assert from "node:assert/strict";

import { deriveWorkoutExerciseCardVariant } from "./workout-exercise-row-variant.ts";

test("deriveWorkoutExerciseCardVariant prioritizes pending variant", () => {
  const state = deriveWorkoutExerciseCardVariant({
    loggedSetCount: 2,
    isSkipped: false,
    isPending: true,
    targetSetsMin: 3,
  });

  assert.equal(state.variant, "pending");
  assert.equal(state.skipActionLabel, "Skip");
});

test("deriveWorkoutExerciseCardVariant returns skipped semantics with recoverability", () => {
  const state = deriveWorkoutExerciseCardVariant({
    loggedSetCount: 0,
    isSkipped: true,
    targetSetsMin: 3,
  });

  assert.equal(state.variant, "active");
  assert.deepEqual(state.chips, ["skipped"]);
  assert.equal(state.skipActionLabel, "Unskip");
  assert.equal(state.skipActionClassName, "text-amber-100");
  assert.equal(state.isQuickLogDisabled, true);
});

test("deriveWorkoutExerciseCardVariant renders partially logged then skipped distinctly", () => {
  const state = deriveWorkoutExerciseCardVariant({
    loggedSetCount: 2,
    isSkipped: true,
    targetSetsMin: 4,
  });

  assert.deepEqual(state.chips, ["loggedProgress", "endedEarly"]);
  assert.equal(state.progressLabel, "2 of 4 logged");
  assert.equal(state.badgeText, "Partial");
  assert.equal(state.isQuickLogDisabled, true);
});

test("deriveWorkoutExerciseCardVariant preserves completion badge behavior", () => {
  const state = deriveWorkoutExerciseCardVariant({
    loggedSetCount: 3,
    isSkipped: false,
    targetSetsMin: 3,
  });

  assert.equal(state.variant, "active");
  assert.equal(state.cardState, "completed");
  assert.equal(state.badgeText, "Completed");
});
