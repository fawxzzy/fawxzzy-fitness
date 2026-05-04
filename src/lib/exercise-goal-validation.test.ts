import test from "node:test";
import assert from "node:assert/strict";
import { GOAL_SCHEMA_MATRIX, deriveGoalMeasurementSelections, getDefaultMeasurementsForGoalModality, getGoalMeasurementOrder, getVisibleMetricsForModality, inferMeasurementTypeFromGoalModality, resolveGoalModality, validateGoalConfiguration } from "./exercise-goal-validation.ts";

test("strength prescription requires reps and sets", () => {
  const result = validateGoalConfiguration({
    modality: "strength",
    sets: "3",
    repsMin: "",
    repsMax: "",
    weight: "",
    duration: "",
    distance: "",
    calories: "",
    measurementSelections: new Set(["reps", "weight"]),
  });

  assert.equal(result.isValid, false);
  assert.equal(result.message, "Missing Min Rep");
});

test("bodyweight prescription is valid with sets + reps", () => {
  const result = validateGoalConfiguration({
    modality: "bodyweight",
    sets: "4",
    repsMin: "10",
    repsMax: "",
    failure: false,
    weight: "",
    duration: "",
    distance: "",
    calories: "",
    measurementSelections: new Set(["reps"]),
  });

  assert.equal(result.isValid, true);
});

test("strength prescription accepts failure mode without reps", () => {
  const result = validateGoalConfiguration({
    modality: "strength",
    sets: "3",
    repsMin: "",
    repsMax: "",
    failure: true,
    weight: "100",
    duration: "",
    distance: "",
    calories: "",
    measurementSelections: new Set(["reps", "weight"]),
  });

  assert.equal(result.isValid, true);
});

test("time-based cardio requires time", () => {
  const result = validateGoalConfiguration({
    modality: "cardio_time",
    sets: "2",
    repsMin: "",
    repsMax: "",
    weight: "",
    duration: "",
    distance: "",
    calories: "",
    measurementSelections: new Set(["time"]),
  });

  assert.equal(result.isValid, false);
  assert.equal(result.message, "Missing Time");
});

test("distance-based cardio requires distance", () => {
  const result = validateGoalConfiguration({
    modality: "cardio_distance",
    sets: "2",
    repsMin: "",
    repsMax: "",
    weight: "",
    duration: "",
    distance: "1.5",
    calories: "",
    measurementSelections: new Set(["distance"]),
  });

  assert.equal(result.isValid, true);
});

test("time + distance cardio accepts time-only mode", () => {
  const result = validateGoalConfiguration({
    modality: "cardio_time",
    sets: "1",
    repsMin: "",
    repsMax: "",
    weight: "",
    duration: "8:00",
    distance: "",
    calories: "",
    measurementSelections: new Set(["time"]),
  });

  assert.equal(result.isValid, true);
});

test("goal schema matrix keeps strength minimum requirements stable", () => {
  assert.deepEqual(GOAL_SCHEMA_MATRIX.strength.requiredFields, ["sets", "repsMin"]);
});

test("bodyweight modality still exposes rep-driven primary metrics", () => {
  assert.deepEqual(getVisibleMetricsForModality("bodyweight"), ["reps"]);
});

test("entered auxiliary bodyweight values stay in derived selections", () => {
  const selections = deriveGoalMeasurementSelections("bodyweight", {
    repsMin: "12",
    repsMax: "",
    weight: "",
    duration: "8:00",
    distance: "",
    calories: "",
  });
  assert.deepEqual(selections.sort(), ["reps", "time"]);
});

test("goal layouts use the fixed shared measurement ordering", () => {
  assert.deepEqual(getGoalMeasurementOrder("cardio_time"), ["reps", "time", "distance", "calories", "weight"]);
});

test("goal modality keeps strength measurement type stable when auxiliary values are present", () => {
  assert.equal(inferMeasurementTypeFromGoalModality("strength"), "reps");
});

test("goal defaults stay aligned with distance-first cardio exercises", () => {
  assert.deepEqual(getDefaultMeasurementsForGoalModality("cardio_distance"), ["distance"]);
});

test("goal defaults stay aligned with mixed cardio exercises", () => {
  assert.deepEqual(getDefaultMeasurementsForGoalModality("cardio_time_distance"), ["time", "distance"]);
});

test("bodyweight modality resolves from exercise taxonomy tags", () => {
  assert.equal(resolveGoalModality({
    measurementType: "reps",
    equipment: "Pull-Up Bar",
    name: "Pull-Up",
    tags: new Set(["bodyweight", "vertical pull"]),
  }), "bodyweight");
});

test("reps max without reps min is invalid", () => {
  const result = validateGoalConfiguration({
    modality: "strength",
    sets: "3",
    repsMin: "",
    repsMax: "12",
    weight: "",
    duration: "",
    distance: "",
    calories: "",
    measurementSelections: new Set(["reps"]),
  });

  assert.equal(result.isValid, false);
  assert.equal(result.message, "Missing Min Rep");
});
