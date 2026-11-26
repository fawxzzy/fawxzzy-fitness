import test from "node:test";
import assert from "node:assert/strict";
import {
  CALORIES_STEP,
  resolveDistanceStep,
  resolveNumericInputMode,
  resolveWeightStep,
  stepNumericValue,
} from "./numericFieldPolicy.ts";

test("number fields open a number pad; time keeps text for m:ss", () => {
  assert.equal(resolveNumericInputMode("reps"), "numeric");
  assert.equal(resolveNumericInputMode("sets"), "numeric");
  assert.equal(resolveNumericInputMode("calories"), "numeric");
  assert.equal(resolveNumericInputMode("weight"), "decimal");
  assert.equal(resolveNumericInputMode("distance"), "decimal");
  assert.equal(resolveNumericInputMode("rpe"), "decimal");
  assert.equal(resolveNumericInputMode("time"), "text");
});

test("weight steps depend on the unit", () => {
  assert.equal(resolveWeightStep("lb"), 2.5);
  assert.equal(resolveWeightStep("lbs"), 2.5);
  assert.equal(resolveWeightStep("kg"), 1);
  assert.equal(resolveWeightStep(undefined), 1);
});

test("distance steps depend on the unit", () => {
  assert.equal(resolveDistanceStep("mi"), 0.25);
  assert.equal(resolveDistanceStep("km"), 0.5);
  assert.equal(resolveDistanceStep("m"), 100);
  assert.equal(resolveDistanceStep("steps"), 100);
  assert.equal(CALORIES_STEP, 5);
});

test("stepping from empty gives one step", () => {
  assert.equal(stepNumericValue("", 2.5, 1), "2.5");
  assert.equal(stepNumericValue(undefined, 1, 1), "1");
  assert.equal(stepNumericValue("", 2.5, -1), "0");
});

test("stepping on the grid moves exactly one step", () => {
  assert.equal(stepNumericValue("135", 2.5, 1), "137.5");
  assert.equal(stepNumericValue("137.5", 2.5, 1), "140");
  assert.equal(stepNumericValue("140", 2.5, -1), "137.5");
  assert.equal(stepNumericValue("1.25", 0.25, 1), "1.5");
  assert.equal(stepNumericValue("20", 1, -1), "19");
});

test("off-grid values snap to the next grid line in the pressed direction", () => {
  assert.equal(stepNumericValue("137", 2.5, 1), "137.5");
  assert.equal(stepNumericValue("137", 2.5, -1), "135");
  assert.equal(stepNumericValue("1.1", 0.25, 1), "1.25");
  assert.equal(stepNumericValue("1.1", 0.25, -1), "1");
});

test("never goes below the minimum, can clear at the minimum, respects max", () => {
  assert.equal(stepNumericValue("1", 2.5, -1), "0");
  assert.equal(stepNumericValue("1", 1, -1, { emptyAtMin: true }), "");
  assert.equal(stepNumericValue("2", 1, -1, { emptyAtMin: true }), "1");
  assert.equal(stepNumericValue("10", 1, 1, { max: 10 }), "10");
  assert.equal(stepNumericValue("garbage", 5, 1), "5");
});

test("no floating point noise in results", () => {
  assert.equal(stepNumericValue("0.1", 0.25, 1), "0.25");
  assert.equal(stepNumericValue("0.75", 0.25, 1), "1");
  assert.equal(stepNumericValue("2.2", 0.1, 1), "2.3");
});

test("measurement panel and goal form use the policy, not a hard-coded text keyboard", async () => {
  const { readFileSync } = await import("node:fs");
  const panel = readFileSync(new URL("./MeasurementPanelV2.tsx", import.meta.url), "utf8");
  const goal = readFileSync(new URL("./ExerciseGoalForm.tsx", import.meta.url), "utf8");
  assert.equal(/inputMode="text"/.test(panel), false, "no field in the panel forces the full keyboard");
  assert.equal(/inputMode="text"/.test(goal), false, "the sets field opens a number pad");
  assert.match(panel, /resolveWeightStep\(values\.weightUnit\)/, "weight steppers are unit-aware");
  assert.match(panel, /resolveDistanceStep\(resolvedDistanceUnit\)/, "distance steppers are unit-aware");
});
