import test from "node:test";
import assert from "node:assert/strict";

import { mapExerciseGoalPayloadToRoutineDayColumns, mapRoutineDayGoalToSessionColumns, parseExerciseGoalPayload } from "./exercise-goal-payload.ts";

test("parseExerciseGoalPayload preserves measurement-optional sets-only goals", () => {
  const formData = new FormData();
  formData.set("targetSets", "3");
  formData.set("goalModality", "strength");

  const result = parseExerciseGoalPayload(formData, { requireSets: true });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected payload parsing to succeed.");
  }

  assert.equal(result.payload.measurement_type, "none");
  assert.equal(result.payload.target_sets_min, 3);
  assert.equal(result.payload.target_reps_min, null);
  assert.equal(result.payload.target_time_seconds_min, null);
});

test("mapRoutineDayGoalToSessionColumns preserves explicit measurement-optional state", () => {
  const mapped = mapRoutineDayGoalToSessionColumns({
    target_sets: 2,
    target_reps: null,
    target_reps_min: null,
    target_reps_max: null,
    target_weight: null,
    target_weight_unit: null,
    target_duration_seconds: null,
    target_distance: null,
    target_distance_unit: null,
    target_calories: null,
    measurement_type: "none",
    default_unit: null,
  });

  assert.equal(mapped.measurement_type, "none");
  assert.equal(mapped.target_sets_min, 2);
  assert.equal(mapped.target_reps_min, null);
});

test("parseExerciseGoalPayload encodes failure goals through the reps sentinel", () => {
  const formData = new FormData();
  formData.set("targetSets", "3");
  formData.set("targetWeight", "100");
  formData.set("targetWeightUnit", "lbs");
  formData.set("targetFailure", "true");
  formData.set("measurementSelections", "weight");
  formData.set("goalModality", "strength");

  const result = parseExerciseGoalPayload(formData, { requireSets: true });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected failure payload parsing to succeed.");
  }

  assert.equal(result.payload.measurement_type, "reps");
  assert.equal(result.payload.target_reps_min, 0);
  assert.equal(result.payload.target_reps_max, 0);
  assert.equal(result.payload.target_weight_min, 100);

  const mapped = mapExerciseGoalPayloadToRoutineDayColumns(result.payload);
  assert.equal(mapped.target_reps, 0);
  assert.equal(mapped.target_reps_min, 0);
  assert.equal(mapped.target_reps_max, 0);
});

test("parseExerciseGoalPayload accepts steps as a cardio distance unit", () => {
  const formData = new FormData();
  formData.set("targetSets", "1");
  formData.set("targetDistance", "5000");
  formData.set("targetDistanceUnit", "steps");
  formData.set("measurementSelections", "distance");
  formData.set("goalModality", "cardio_distance");

  const result = parseExerciseGoalPayload(formData, { requireSets: true });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected steps payload parsing to succeed.");
  }

  assert.equal(result.payload.measurement_type, "distance");
  assert.equal(result.payload.target_distance_min, 5000);
  assert.equal(result.payload.target_distance_unit, "steps");

  const mapped = mapExerciseGoalPayloadToRoutineDayColumns(result.payload);
  assert.equal(mapped.target_distance, 5000);
  assert.equal(mapped.target_distance_unit, "steps");
});
