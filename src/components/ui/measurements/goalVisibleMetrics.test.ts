import assert from "node:assert/strict";
import test from "node:test";
import { resolveGoalVisibleMetrics } from "./goalVisibleMetrics.ts";

const EMPTY = { repsMin: "", repsMax: "", weight: "", duration: "", distance: "", calories: "" };

test("strength (Back Squat) shows reps and weight only: no time, distance or calorie fields (goal-schema-matrix.md)", () => {
  assert.deepEqual(resolveGoalVisibleMetrics("strength", { ...EMPTY, repsMin: "8", repsMax: "12" }), ["reps", "weight"]);
});

test("bodyweight shows reps only", () => {
  assert.deepEqual(resolveGoalVisibleMetrics("bodyweight", EMPTY), ["reps"]);
});

test("cardio shows its time and/or distance, never reps or weight", () => {
  assert.deepEqual(resolveGoalVisibleMetrics("cardio_time", EMPTY), ["time"]);
  assert.deepEqual(resolveGoalVisibleMetrics("cardio_distance", EMPTY), ["distance"]);
  assert.deepEqual(resolveGoalVisibleMetrics("cardio_time_distance", EMPTY), ["time", "distance"]);
});

test("time-and-distance cardio keeps the distance field when only a time is typed", () => {
  assert.deepEqual(resolveGoalVisibleMetrics("cardio_time_distance", { ...EMPTY, duration: "20:00" }), ["time", "distance"]);
});

test("calories appear only when asked for (More options) or already set", () => {
  assert.deepEqual(resolveGoalVisibleMetrics("cardio_time", EMPTY, { includeCalories: true }), ["time", "calories"]);
  assert.deepEqual(resolveGoalVisibleMetrics("cardio_distance", { ...EMPTY, calories: "300" }), ["distance", "calories"]);
});

test("a value saved before this change is never hidden", () => {
  assert.deepEqual(resolveGoalVisibleMetrics("strength", { ...EMPTY, repsMin: "5", duration: "60" }), ["reps", "weight", "time"]);
});
