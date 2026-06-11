import assert from "node:assert/strict";
import test from "node:test";

import { resolveHistoryGraphMetricKey } from "@/lib/exercise-info-history-axis";

test("resolveHistoryGraphMetricKey keeps weighted strength on load", () => {
  assert.equal(resolveHistoryGraphMetricKey({
    kind: "strength",
    latestWeight: 225,
  }), "weight");
});

test("resolveHistoryGraphMetricKey falls back to reps for bodyweight strength", () => {
  assert.equal(resolveHistoryGraphMetricKey({
    kind: "strength",
    latestWeight: 0,
  }), "reps");
});

test("resolveHistoryGraphMetricKey prefers duration for time cardio", () => {
  assert.equal(resolveHistoryGraphMetricKey({
    kind: "cardio",
    measurementType: "time",
    targetDurationSeconds: 900,
    latestDurationSeconds: 1200,
  }), "time");
});

test("resolveHistoryGraphMetricKey lets the current target override a mixed latest logged shape", () => {
  assert.equal(resolveHistoryGraphMetricKey({
    kind: "cardio",
    measurementType: "time_distance",
    cardioVectorMode: "hold_duration_increase_distance",
    targetDurationSeconds: 1200,
    targetDistance: 0,
    latestDurationSeconds: 1200,
    latestDistance: 1.9,
  }), "time");
});

test("resolveHistoryGraphMetricKey respects hold-distance reduce-duration cardio targets", () => {
  assert.equal(resolveHistoryGraphMetricKey({
    kind: "cardio",
    measurementType: "time_distance",
    cardioVectorMode: "hold_distance_reduce_duration",
    targetDurationSeconds: 900,
    targetDistance: 2,
  }), "time");
});

test("resolveHistoryGraphMetricKey keeps mixed cardio targets time-first for the graph", () => {
  assert.equal(resolveHistoryGraphMetricKey({
    kind: "cardio",
    measurementType: "time_distance",
    cardioVectorMode: "hold_duration_increase_distance",
    targetDurationSeconds: 900,
    targetDistance: 2,
  }), "time");
});

test("resolveHistoryGraphMetricKey keeps time_distance duration-first when no vector mode is configured", () => {
  assert.equal(resolveHistoryGraphMetricKey({
    kind: "cardio",
    measurementType: "time_distance",
    latestDurationSeconds: 1200,
    latestDistance: 1.85,
  }), "time");
});

test("resolveHistoryGraphMetricKey lets the latest logged time-only shape override a distance-oriented vector mode", () => {
  assert.equal(resolveHistoryGraphMetricKey({
    kind: "cardio",
    measurementType: "time_distance",
    cardioVectorMode: "hold_duration_increase_distance",
    targetDurationSeconds: 900,
    targetDistance: 2,
    latestDurationSeconds: 1200,
    latestDistance: 0,
  }), "time");
});

test("resolveHistoryGraphMetricKey lets the latest logged time-only shape override a distance-only target", () => {
  assert.equal(resolveHistoryGraphMetricKey({
    kind: "cardio",
    measurementType: "time_distance",
    cardioVectorMode: "hold_duration_increase_distance",
    targetDurationSeconds: 0,
    targetDistance: 2,
    latestDurationSeconds: 1200,
    latestDistance: 0,
  }), "time");
});

test("resolveHistoryGraphMetricKey keeps mixed latest cardio rows time-first for the graph", () => {
  assert.equal(resolveHistoryGraphMetricKey({
    kind: "cardio",
    measurementType: "time_distance",
    cardioVectorMode: "hold_duration_increase_distance",
    latestDurationSeconds: 1200,
    latestDistance: 1.9,
  }), "time");
});
