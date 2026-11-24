import assert from "node:assert/strict";
import test from "node:test";
import { resolveAddExerciseWeightUnit } from "@/lib/add-exercise-weight-unit";

test("an explicit routine unit wins over either destination default", () => {
  assert.equal(resolveAddExerciseWeightUnit("kg", "lbs"), "kg");
  assert.equal(resolveAddExerciseWeightUnit("lbs", "kg"), "lbs");
});

test("a missing or unknown routine unit falls back to the destination default", () => {
  assert.equal(resolveAddExerciseWeightUnit(null, "lbs"), "lbs");
  assert.equal(resolveAddExerciseWeightUnit(undefined, "kg"), "kg");
  assert.equal(resolveAddExerciseWeightUnit("stone", "lbs"), "lbs");
});
