import test from "node:test";
import assert from "node:assert/strict";
import {
  buildPromotionSessionCountFieldMap,
  ensurePromotionGroupedSessionCountFieldMap,
  getPromotionMeasurementGroupKey,
  serializePromotionGroupedSessionCountFieldMap,
  serializePromotionSessionCountFieldMap,
} from "@/lib/promotion-session-counts";

test("grouped session counts seed from per-measurement values without deleting them", () => {
  const measurementCounts = buildPromotionSessionCountFieldMap({
    defaultValue: "1",
    savedCounts: {
      time: 3,
      distance: 2,
      reps: 4,
      weight: 1,
    },
  });

  const grouped = ensurePromotionGroupedSessionCountFieldMap({
    groups: [["time", "distance"], ["reps"], ["weight"]],
    measurementCounts,
    groupedCounts: {},
    fallbackValue: "1",
  });

  assert.deepEqual(grouped, {
    "time+distance": "3",
  });
  assert.deepEqual(measurementCounts, {
    time: "3",
    distance: "2",
    reps: "4",
    weight: "1",
  });
});

test("THEN to AND to THEN keeps original per-measurement session counts", () => {
  const perMeasurement = {
    time: "3",
    distance: "2",
    reps: "4",
    weight: "1",
  };
  const grouped = ensurePromotionGroupedSessionCountFieldMap({
    groups: [["time", "distance"], ["reps"], ["weight"]],
    measurementCounts: perMeasurement,
    groupedCounts: {
      [getPromotionMeasurementGroupKey(["time", "distance"])]: "5",
    },
    fallbackValue: "1",
  });

  assert.equal(grouped["time+distance"], "5");
  assert.deepEqual(perMeasurement, {
    time: "3",
    distance: "2",
    reps: "4",
    weight: "1",
  });
  assert.deepEqual(serializePromotionSessionCountFieldMap(perMeasurement), {
    time: 3,
    distance: 2,
    reps: 4,
    weight: 1,
  });
  assert.deepEqual(serializePromotionGroupedSessionCountFieldMap(grouped), {
    "time+distance": 5,
  });
});
