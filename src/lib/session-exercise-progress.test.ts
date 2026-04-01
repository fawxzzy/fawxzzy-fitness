import test from "node:test";
import assert from "node:assert/strict";

import { deriveReadOnlyExercisePresentation, deriveSessionExerciseProgressState } from "./session-exercise-progress.ts";

test("deriveSessionExerciseProgressState returns untouched for no logs and not skipped", () => {
  const state = deriveSessionExerciseProgressState({
    loggedSetCount: 0,
    isSkipped: false,
    targetSetsMin: 3,
  });

  assert.equal(state.kind, "untouched");
  assert.deepEqual(state.chips, []);
  assert.equal(state.allowQuickLog, true);
});

test("deriveSessionExerciseProgressState returns skipped before any logging", () => {
  const state = deriveSessionExerciseProgressState({
    loggedSetCount: 0,
    isSkipped: true,
    targetSetsMin: 3,
  });

  assert.equal(state.executionState, "skipped");
  assert.equal(state.kind, "skipped");
  assert.deepEqual(state.chips, ["skipped"]);
  assert.equal(state.badgeText, undefined);
  assert.equal(state.allowQuickLog, false);
});

test("deriveSessionExerciseProgressState returns partialSkipped for abandoned logged exercise", () => {
  const state = deriveSessionExerciseProgressState({
    loggedSetCount: 1,
    isSkipped: true,
    targetSetsMin: 3,
  });

  assert.equal(state.executionState, "partial");
  assert.equal(state.kind, "partialSkipped");
  assert.deepEqual(state.chips, ["loggedProgress", "endedEarly"]);
  assert.equal(state.progressLabel, "1 of 3 logged");
  assert.equal(state.badgeText, "Partial");
  assert.equal(state.skipActionLabel, "Unskip");
});

test("deriveSessionExerciseProgressState returns completed for goal completion", () => {
  const state = deriveSessionExerciseProgressState({
    loggedSetCount: 3,
    isSkipped: false,
    targetSetsMin: 3,
  });

  assert.equal(state.executionState, "completed");
  assert.equal(state.kind, "completed");
  assert.equal(state.cardState, "completed");
  assert.equal(state.badgeText, "Completed");
});

test("deriveSessionExerciseProgressState returns read-only skipped badge for summary surface", () => {
  const state = deriveSessionExerciseProgressState({
    loggedSetCount: 0,
    isSkipped: true,
    targetSetsMin: 3,
    surface: "summary",
  });

  assert.equal(state.executionState, "skipped");
  assert.equal(state.badgeText, "Skipped");
  assert.deepEqual(state.chips, []);
});

test("deriveReadOnlyExercisePresentation maps skipped-after-logging into explicit partial state", () => {
  const presentation = deriveReadOnlyExercisePresentation({
    loggedSetCount: 2,
    isSkipped: true,
    targetSetsMin: 4,
  });

  assert.equal(presentation.state, "partial");
  assert.equal(presentation.badgeText, "Partial");
  assert.deepEqual(presentation.chips, ["loggedProgress", "endedEarly"]);
});

test("deriveReadOnlyExercisePresentation maps completed-then-skipped into explicit partial-with-remaining-skipped state", () => {
  const presentation = deriveReadOnlyExercisePresentation({
    loggedSetCount: 3,
    isSkipped: true,
    targetSetsMin: 3,
  });

  assert.equal(presentation.state, "partial_with_remaining_skipped");
  assert.equal(presentation.badgeText, "Partial");
  assert.deepEqual(presentation.chips, ["loggedProgress", "endedEarly"]);
});
