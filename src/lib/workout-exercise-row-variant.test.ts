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

  assert.equal(state.variant, "skipped");
  assert.deepEqual(state.chips, ["skipped"]);
  assert.equal(state.skipActionLabel, "Unskip");
  assert.equal(state.skipActionClassName, "text-amber-100");
});

test("deriveWorkoutExerciseCardVariant preserves logged completion badge behavior", () => {
  const state = deriveWorkoutExerciseCardVariant({
    loggedSetCount: 3,
    isSkipped: false,
    targetSetsMin: 3,
  });

  assert.equal(state.variant, "logged");
  assert.equal(state.cardState, "completed");
  assert.equal(state.badgeText, "3 logged");
});
