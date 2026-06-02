import assert from "node:assert/strict";
import test from "node:test";

import {
  formatRoutineDayExerciseCountLabel,
  resolveRoutineDayAdjustmentIndicator,
  resolveRoutineDayExerciseDescriptor,
} from "@/lib/routine-day-card-summary";

test("routine day card count label uses exercise pluralization and empty fallback", () => {
  assert.equal(formatRoutineDayExerciseCountLabel(0), "No exercises");
  assert.equal(formatRoutineDayExerciseCountLabel(1), "1 exercise");
  assert.equal(formatRoutineDayExerciseCountLabel(6), "6 exercises");
});

test("routine day card descriptor resolves focused and heavy categories", () => {
  assert.equal(resolveRoutineDayExerciseDescriptor({
    total: 4,
    strength: 4,
    cardio: 0,
    bodyweight: 0,
    unknown: 0,
  }), "Strength-focused");

  assert.equal(resolveRoutineDayExerciseDescriptor({
    total: 5,
    strength: 3,
    cardio: 1,
    bodyweight: 1,
    unknown: 0,
  }), "Strength-heavy");

  assert.equal(resolveRoutineDayExerciseDescriptor({
    total: 5,
    strength: 1,
    cardio: 1,
    bodyweight: 3,
    unknown: 0,
  }), "Bodyweight-heavy");
});

test("routine day card descriptor falls back to mixed for split or unknown-diluted days", () => {
  assert.equal(resolveRoutineDayExerciseDescriptor({
    total: 5,
    strength: 2,
    cardio: 2,
    bodyweight: 1,
    unknown: 0,
  }), "Mixed");

  assert.equal(resolveRoutineDayExerciseDescriptor({
    total: 4,
    strength: 2,
    cardio: 0,
    bodyweight: 0,
    unknown: 2,
  }), "Mixed");
});

test("routine day card adjustment indicator only surfaces up and down", () => {
  assert.equal(resolveRoutineDayAdjustmentIndicator("up"), "up");
  assert.equal(resolveRoutineDayAdjustmentIndicator("down"), "down");
  assert.equal(resolveRoutineDayAdjustmentIndicator("straight"), null);
  assert.equal(resolveRoutineDayAdjustmentIndicator(null), null);
});
