import test from "node:test";
import assert from "node:assert/strict";

import {
  doesCardioVectorModeIgnoreLoad,
  doesCardioVectorModeUseDistance,
  doesCardioVectorModeUseDuration,
  inferCardioVectorMode,
  isCardioMeasurementType,
  normalizeCardioVectorMode,
  resolveCardioVectorMode,
  shouldIgnoreCardioLoad,
} from "@/lib/cardio-progression-vectors";

test("time-only cardio infers duration mode", () => {
  assert.equal(inferCardioVectorMode({ measurementType: "time" }), "duration");
  assert.equal(resolveCardioVectorMode({ measurementType: "time" }), "duration");
});

test("distance-only cardio infers distance mode", () => {
  assert.equal(inferCardioVectorMode({ measurementType: "distance" }), "distance");
  assert.equal(resolveCardioVectorMode({ measurementType: "distance" }), "distance");
});

test("time plus distance preserves current hold-duration increase-distance behavior", () => {
  assert.equal(inferCardioVectorMode({ measurementType: "time_distance" }), "hold_duration_increase_distance");
  assert.equal(resolveCardioVectorMode({ measurementType: "time_distance" }), "hold_duration_increase_distance");
});

test("optional cardio weight is ignored as load progression", () => {
  assert.equal(shouldIgnoreCardioLoad({
    measurementType: "time_distance",
    cardioVectorMode: "hold_duration_increase_distance",
    targetWeight: 25,
  }), true);
  assert.equal(doesCardioVectorModeIgnoreLoad("duration"), true);
});

test("invalid cardio vector config falls back safely from measurement shape", () => {
  assert.equal(resolveCardioVectorMode({
    measurementType: "time",
    cardioVectorMode: "legacy-load-step",
  }), "duration");
});

test("duration and distance participation helpers reflect mode semantics", () => {
  assert.equal(doesCardioVectorModeUseDuration("duration"), true);
  assert.equal(doesCardioVectorModeUseDuration("distance"), false);
  assert.equal(doesCardioVectorModeUseDuration("hold_duration_increase_distance"), true);

  assert.equal(doesCardioVectorModeUseDistance("distance"), true);
  assert.equal(doesCardioVectorModeUseDistance("duration"), false);
  assert.equal(doesCardioVectorModeUseDistance("hold_duration_increase_distance"), true);
});

test("cardio measurement detection stays limited to cardio measurement types", () => {
  assert.equal(isCardioMeasurementType("time"), true);
  assert.equal(isCardioMeasurementType("distance"), true);
  assert.equal(isCardioMeasurementType("time_distance"), true);
  assert.equal(isCardioMeasurementType("reps"), false);
  assert.equal(isCardioMeasurementType("none"), false);
});

test("normalization accepts future cardio vector modes and rejects unknown values", () => {
  assert.equal(normalizeCardioVectorMode("hold distance reduce duration"), "hold_distance_reduce_duration");
  assert.equal(normalizeCardioVectorMode("pace"), "pace");
  assert.equal(normalizeCardioVectorMode("unsupported_mode"), null);
});

test("shape inference falls back safely when measurement type is absent", () => {
  assert.equal(inferCardioVectorMode({ durationSeconds: 900 }), "duration");
  assert.equal(inferCardioVectorMode({ distance: 3.1 }), "distance");
  assert.equal(inferCardioVectorMode({ durationSeconds: 900, distance: 3.1 }), "hold_duration_increase_distance");
  assert.equal(inferCardioVectorMode({ calories: 250 }), "calories");
});

test("source config objects are not mutated", () => {
  const input = {
    measurementType: "time_distance",
    cardioVectorMode: " pace ",
    durationSeconds: 1200,
    distance: 2,
    targetWeight: 15,
  } as const;
  const before = structuredClone(input);

  const resolved = resolveCardioVectorMode(input);

  assert.equal(resolved, "pace");
  assert.deepEqual(input, before);
});
