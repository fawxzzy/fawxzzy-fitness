import assert from "node:assert/strict";
import test from "node:test";
import { formatAddExerciseHeaderSubtitle } from "./header-meta.ts";

test("formatAddExerciseHeaderSubtitle strips stale exercise-count metadata", () => {
  assert.equal(formatAddExerciseHeaderSubtitle("Push Day • 8 exercises"), "Push Day");
  assert.equal(formatAddExerciseHeaderSubtitle("Leg Day • 1 exercise"), "Leg Day");
});

test("formatAddExerciseHeaderSubtitle preserves plain routine names", () => {
  assert.equal(formatAddExerciseHeaderSubtitle("Upper Body"), "Upper Body");
});
