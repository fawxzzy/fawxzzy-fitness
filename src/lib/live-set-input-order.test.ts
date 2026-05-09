import assert from "node:assert/strict";
import test from "node:test";
import { getLiveSetInputOrder, type LiveSetMetricFlags } from "./live-set-input-order.ts";

const none: LiveSetMetricFlags = {
  reps: false,
  weight: false,
  time: false,
  distance: false,
  calories: false,
};

test("strength inputs only show the required active metrics", () => {
  const result = getLiveSetInputOrder({
    requiredMetrics: { ...none, reps: true, weight: true },
    configuredMetrics: { ...none, reps: true, weight: true },
    draftValues: {},
    isCardio: false,
  });

  assert.deepEqual(result.metricOrder, ["reps", "weight"]);
  assert.deepEqual(result.dimmedMetrics, []);
});

test("time inputs only show active duration fields", () => {
  const result = getLiveSetInputOrder({
    requiredMetrics: { ...none, time: true },
    configuredMetrics: { ...none, time: true },
    draftValues: {},
    isCardio: true,
  });

  assert.deepEqual(result.metricOrder, ["time"]);
  assert.deepEqual(result.dimmedMetrics, []);
});

test("distance inputs put distance first after required promotion", () => {
  const result = getLiveSetInputOrder({
    requiredMetrics: { ...none, distance: true },
    configuredMetrics: { ...none, distance: true },
    draftValues: {},
    isCardio: true,
  });

  assert.deepEqual(result.metricOrder, ["distance"]);
});

test("draft values keep populated optional metrics visible after the required metrics", () => {
  const result = getLiveSetInputOrder({
    requiredMetrics: { ...none, reps: true, weight: true },
    configuredMetrics: { ...none, reps: true, weight: true },
    draftValues: { time: "1:30" },
    isCardio: false,
  });

  assert.deepEqual(result.metricOrder, ["reps", "weight", "time"]);
  assert.deepEqual(result.dimmedMetrics, []);
});

test("measurement-optional exercises expose no active metrics by default", () => {
  const result = getLiveSetInputOrder({
    requiredMetrics: none,
    configuredMetrics: none,
    draftValues: {},
    isCardio: false,
  });

  assert.deepEqual(result.metricOrder, []);
  assert.deepEqual(result.dimmedMetrics, []);
});

test("configured exercise metrics stay visible even when the current progression target only drives one metric", () => {
  const result = getLiveSetInputOrder({
    requiredMetrics: { ...none, reps: true },
    configuredMetrics: { ...none, reps: true, weight: true, time: true },
    draftValues: {},
    isCardio: false,
  });

  assert.deepEqual(result.metricOrder, ["reps", "weight", "time"]);
  assert.deepEqual(result.visibleMetrics, ["reps", "weight", "time"]);
});
