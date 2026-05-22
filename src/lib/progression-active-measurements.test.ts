import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PROMOTION_MEASUREMENT_ORDER_MAP,
  detectActiveMeasurementsFromTargets,
  getActiveMeasurementLabels,
  getPromotionMeasurementKey,
  hasActiveMeasurement,
  normalizePromotionMeasurements,
  normalizePromotionMeasurementOrderMap,
  resolvePromotionMeasurementFamily,
  resolvePromotionMeasurementsFromOrderMap,
  sortPromotionMeasurementsByHierarchy,
  usesMeasurementForPromotion,
} from "@/lib/progression-active-measurements";

test("detects reps targets as active", () => {
  assert.deepEqual(detectActiveMeasurementsFromTargets({
    measurementType: "reps",
    repsMin: 8,
    repsMax: 12,
  }), ["reps"]);
});

test("detects weight targets as active", () => {
  assert.deepEqual(detectActiveMeasurementsFromTargets({
    measurementType: "reps",
    weightMin: 135,
    weightMax: 135,
  }), ["weight"]);
});

test("detects reps and weight targets together", () => {
  assert.deepEqual(detectActiveMeasurementsFromTargets({
    measurementType: "reps",
    repsMin: 5,
    repsMax: 8,
    weightMin: 185,
  }), ["reps", "weight"]);
});

test("detects time targets as active", () => {
  assert.deepEqual(detectActiveMeasurementsFromTargets({
    measurementType: "time",
    durationSeconds: 300,
  }), ["time"]);
});

test("detects distance targets as active", () => {
  assert.deepEqual(detectActiveMeasurementsFromTargets({
    measurementType: "distance",
    distance: 1.5,
  }), ["distance"]);
});

test("detects time and distance targets together", () => {
  assert.deepEqual(detectActiveMeasurementsFromTargets({
    measurementType: "time_distance",
    durationSeconds: 900,
    distance: 3,
  }), ["time", "distance"]);
});

test("detects calories target as active when present", () => {
  assert.deepEqual(detectActiveMeasurementsFromTargets({
    measurementType: "time",
    calories: 200,
  }), ["calories"]);
});

test("treats missing, null, and zero targets as inactive", () => {
  assert.deepEqual(detectActiveMeasurementsFromTargets({
    measurementType: "reps",
    repsMin: 0,
    repsMax: null,
    weightMin: undefined,
    durationSeconds: 0,
    distance: null,
    calories: 0,
  }), []);
});

test("manual measurement type stays inactive", () => {
  assert.deepEqual(detectActiveMeasurementsFromTargets({
    measurementType: "none",
    repsMin: 8,
    weightMin: 135,
  }), []);
});

test("unknown target shape is safe", () => {
  assert.deepEqual(detectActiveMeasurementsFromTargets({
    measurementType: "mystery",
  }), []);
});

test("normalizes promotion measurements and drops unsupported or inactive values", () => {
  assert.deepEqual(normalizePromotionMeasurements({
    measurements: ["weight", "distance", "bogus", "weight", "reps"],
    activeMeasurements: ["reps", "weight"],
  }), ["reps", "weight"]);
});

test("usesMeasurementForPromotion respects normalized active selection", () => {
  assert.equal(usesMeasurementForPromotion({
    measurements: ["distance", "reps", "bogus"],
    activeMeasurements: ["reps", "weight"],
    measurement: "reps",
  }), true);
  assert.equal(usesMeasurementForPromotion({
    measurements: ["distance", "reps", "bogus"],
    activeMeasurements: ["reps", "weight"],
    measurement: "distance",
  }), false);
});

test("getPromotionMeasurementKey returns combined keys for supported pairs", () => {
  assert.equal(getPromotionMeasurementKey({
    measurements: ["weight", "reps"],
  }), "reps_weight");
  assert.equal(getPromotionMeasurementKey({
    measurements: ["time", "distance"],
  }), "time_distance");
});

test("getPromotionMeasurementKey returns none or custom when needed", () => {
  assert.equal(getPromotionMeasurementKey({ measurements: [] }), "none");
  assert.equal(getPromotionMeasurementKey({
    measurements: ["reps", "weight", "calories"],
  }), "custom");
});

test("sorts promotion measurements deterministically with reps before weight", () => {
  assert.deepEqual(sortPromotionMeasurementsByHierarchy({
    measurements: ["weight", "reps", "calories"],
  }), ["reps", "weight", "calories"]);
});

test("sorts time and distance explicitly for hold-duration increase-distance mode", () => {
  assert.deepEqual(sortPromotionMeasurementsByHierarchy({
    measurements: ["time", "distance"],
    cardioVectorMode: "hold_duration_increase_distance",
  }), ["distance", "time"]);
});

test("sorts time before distance for hold-distance reduce-duration mode", () => {
  assert.deepEqual(sortPromotionMeasurementsByHierarchy({
    measurements: ["distance", "time"],
    cardioVectorMode: "hold_distance_reduce_duration",
  }), ["time", "distance"]);
});

test("normalizes routine promotion order maps without losing user order", () => {
  assert.deepEqual(
    normalizePromotionMeasurementOrderMap({
      strength: ["time", "weight", "time"],
      bodyweight: ["distance", "reps"],
      cardio: ["distance", "time"],
    }),
    {
      strength: ["time", "weight", "distance", "reps"],
      bodyweight: ["distance", "reps", "time", "weight"],
      cardio: ["distance", "time", "reps", "weight"],
    },
  );
});

test("resolves family-specific promotion measurements in saved order before appending remaining active measurements", () => {
  assert.deepEqual(
    resolvePromotionMeasurementsFromOrderMap({
      orderMap: {
        ...DEFAULT_PROMOTION_MEASUREMENT_ORDER_MAP,
        bodyweight: ["time", "reps", "distance", "weight"],
      },
      activeMeasurements: ["reps", "time", "distance"],
      measurementType: "reps",
    }),
    {
      family: "bodyweight",
      promotionMeasurements: ["time", "reps", "distance"],
    },
  );
});

test("resolves promotion family from active measurement shape", () => {
  assert.equal(
    resolvePromotionMeasurementFamily({
      activeMeasurements: ["weight", "time"],
      measurementType: "time",
    }),
    "strength",
  );
  assert.equal(
    resolvePromotionMeasurementFamily({
      activeMeasurements: ["reps", "time"],
      measurementType: "reps",
    }),
    "bodyweight",
  );
  assert.equal(
    resolvePromotionMeasurementFamily({
      activeMeasurements: ["time", "distance"],
      measurementType: "time_distance",
    }),
    "cardio",
  );
});

test("hasActiveMeasurement and labels reuse the same detection contract", () => {
  const targets = {
    measurementType: "time_distance" as const,
    durationSeconds: 1200,
    distance: 5,
  };

  assert.equal(hasActiveMeasurement(targets, "time"), true);
  assert.equal(hasActiveMeasurement(targets, "weight"), false);
  assert.deepEqual(getActiveMeasurementLabels(targets), ["Time", "Distance"]);
});

test("input values are not mutated", () => {
  const targets = {
    measurementType: "reps" as const,
    repsMin: 8,
    repsMax: 12,
    weightMin: 135,
  };
  const measurements = ["weight", "reps", "bogus"];
  const targetsSnapshot = structuredClone(targets);
  const measurementsSnapshot = structuredClone(measurements);

  void detectActiveMeasurementsFromTargets(targets);
  void normalizePromotionMeasurements({ measurements });
  void getPromotionMeasurementKey({ measurements });

  assert.deepEqual(targets, targetsSnapshot);
  assert.deepEqual(measurements, measurementsSnapshot);
});
