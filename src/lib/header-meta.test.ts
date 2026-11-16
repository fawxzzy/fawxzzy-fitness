import assert from "node:assert/strict";
import test from "node:test";
import { formatAddExerciseSubtitle, splitSessionHeaderTitle } from "./header-meta.ts";

test("formatAddExerciseSubtitle joins day and routine with a middle dot", () => {
  assert.equal(formatAddExerciseSubtitle("Lower A", "QA Routine"), "Lower A · QA Routine");
  assert.equal(formatAddExerciseSubtitle("  Lower A ", " QA Routine  "), "Lower A · QA Routine");
});

test("formatAddExerciseSubtitle skips a missing or blank part instead of leaving a dangling dot", () => {
  assert.equal(formatAddExerciseSubtitle(null, "QA Routine"), "QA Routine");
  assert.equal(formatAddExerciseSubtitle("Lower A", undefined), "Lower A");
  assert.equal(formatAddExerciseSubtitle("   ", "QA Routine"), "QA Routine");
  assert.equal(formatAddExerciseSubtitle(null, null), "");
});

test("splitSessionHeaderTitle splits merged routine/day labels", () => {
  assert.deepEqual(splitSessionHeaderTitle("4Dayz: Legs"), { title: "4Dayz", subtitle: "Legs" });
  assert.deepEqual(splitSessionHeaderTitle("Upper - Day 2"), { title: "Upper", subtitle: "Day 2" });
});

test("splitSessionHeaderTitle preserves non-merged labels", () => {
  assert.deepEqual(splitSessionHeaderTitle("Push Day"), { title: "Push Day" });
  assert.equal(splitSessionHeaderTitle(""), null);
});
