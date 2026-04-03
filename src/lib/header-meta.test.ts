import assert from "node:assert/strict";
import test from "node:test";
import { formatAddExerciseHeaderSubtitle, splitSessionHeaderTitle } from "./header-meta.ts";

test("formatAddExerciseHeaderSubtitle strips stale exercise-count metadata", () => {
  assert.equal(formatAddExerciseHeaderSubtitle("Push Day • 8 exercises"), "Push Day");
  assert.equal(formatAddExerciseHeaderSubtitle("Leg Day • 1 exercise"), "Leg Day");
});

test("formatAddExerciseHeaderSubtitle strips taxonomy-aware metadata", () => {
  assert.equal(formatAddExerciseHeaderSubtitle("Push Day • 8 strength"), "Push Day");
  assert.equal(formatAddExerciseHeaderSubtitle("Conditioning • 3 cardio"), "Conditioning");
});

test("formatAddExerciseHeaderSubtitle preserves plain routine names", () => {
  assert.equal(formatAddExerciseHeaderSubtitle("Upper Body"), "Upper Body");
});

test("splitSessionHeaderTitle splits merged routine/day labels", () => {
  assert.deepEqual(splitSessionHeaderTitle("4Dayz: Legs"), { title: "4Dayz", subtitle: "Legs" });
  assert.deepEqual(splitSessionHeaderTitle("Upper - Day 2"), { title: "Upper", subtitle: "Day 2" });
});

test("splitSessionHeaderTitle preserves non-merged labels", () => {
  assert.deepEqual(splitSessionHeaderTitle("Push Day"), { title: "Push Day" });
  assert.equal(splitSessionHeaderTitle(""), null);
});
