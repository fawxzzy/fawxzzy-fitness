import test from "node:test";
import assert from "node:assert/strict";

import {
  formatDistanceNumber,
  formatDistanceUnitLabel,
  getDistanceMetricLabel,
  isFitnessDistanceUnit,
  normalizeFitnessDistanceUnit,
} from "./fitness-distance-units.ts";

test("steps are treated as a valid fitness distance unit", () => {
  assert.equal(isFitnessDistanceUnit("steps"), true);
  assert.equal(normalizeFitnessDistanceUnit("steps", "mi"), "steps");
  assert.equal(getDistanceMetricLabel("steps"), "steps");
  assert.equal(formatDistanceUnitLabel("steps"), "steps");
});

test("step distances format as rounded whole numbers", () => {
  assert.equal(formatDistanceNumber(5234.4, "steps"), "5234");
});

test("non-step distances keep existing formatting", () => {
  assert.equal(normalizeFitnessDistanceUnit("bogus", "mi"), "mi");
  assert.equal(formatDistanceNumber(1.5, "mi"), "1.5");
});
