import test from "node:test";
import assert from "node:assert/strict";
import { parseExerciseGoalPayload } from "./exercise-goal-payload.ts";

function createGoalFormData(entries: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

test("strength payload keeps auxiliary time and calories targets instead of dropping them", () => {
  const result = parseExerciseGoalPayload(createGoalFormData({
    targetSets: "3",
    targetRepsMin: "8",
    targetRepsMax: "10",
    targetWeight: "65",
    targetWeightUnit: "lbs",
    targetDuration: "3:00",
    targetDistance: "",
    targetDistanceUnit: "mi",
    targetCalories: "120",
    goalModality: "strength",
    defaultUnit: "mi",
  }), { requireSets: true });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.payload.measurement_type, "reps");
  assert.equal(result.payload.target_reps_min, 8);
  assert.equal(result.payload.target_reps_max, 10);
  assert.equal(result.payload.target_weight_min, 65);
  assert.equal(result.payload.target_time_seconds_min, 180);
  assert.equal(result.payload.target_calories_min, 120);
});

test("cardio time payload keeps auxiliary reps, weight, and distance while preserving cardio measurement type", () => {
  const result = parseExerciseGoalPayload(createGoalFormData({
    targetSets: "2",
    targetRepsMin: "20",
    targetRepsMax: "25",
    targetWeight: "15",
    targetWeightUnit: "lbs",
    targetDuration: "12:00",
    targetDistance: "1.5",
    targetDistanceUnit: "mi",
    targetCalories: "180",
    goalModality: "cardio_time",
    defaultUnit: "mi",
  }), { requireSets: true });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.payload.measurement_type, "time");
  assert.equal(result.payload.target_reps_min, 20);
  assert.equal(result.payload.target_weight_min, 15);
  assert.equal(result.payload.target_time_seconds_min, 720);
  assert.equal(result.payload.target_distance_min, 1.5);
  assert.equal(result.payload.target_calories_min, 180);
});
