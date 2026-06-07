import assert from "node:assert/strict";
import test from "node:test";

import {
  chooseCardioBestMetric,
  getDisplayPace,
  isCardioMeasurementType,
  resolveEffectiveKind,
} from "@/lib/cardio-best";

test("step-based cardio best metric favors steps instead of pace", () => {
  const metric = chooseCardioBestMetric({
    durationSeconds: 1800,
    distance: 5000,
    distanceUnit: "steps",
  });

  assert.deepEqual(metric, {
    kind: "distance",
    label: "Best distance",
    value: "5000 steps",
  });
});

test("step-based cardio does not derive a pace metric", () => {
  assert.equal(getDisplayPace(1800, 5000, "steps"), null);
});

test("duration-only cardio labels best time instead of best duration", () => {
  const metric = chooseCardioBestMetric({
    durationSeconds: 600,
    distance: null,
    distanceUnit: "mi",
  });

  assert.deepEqual(metric, {
    kind: "duration",
    label: "Best time",
    value: "10:00",
  });
});

test("calorie-based cardio is treated as cardio when calorie signal exists", () => {
  assert.equal(isCardioMeasurementType("calories"), true);
  assert.equal(resolveEffectiveKind("calories", false, false, true), "cardio");
});
