import test from "node:test";
import assert from "node:assert/strict";
import { GOAL_SCHEMA_MATRIX, deriveGoalMeasurementSelections, getVisibleMetricsForModality, validateGoalConfiguration } from "./exercise-goal-validation.ts";

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
  assert.match(result.message, /require a rep target/i);
});

test("bodyweight prescription is valid with sets + reps", () => {
  const result = validateGoalConfiguration({
    modality: "bodyweight",
    sets: "4",
    repsMin: "10",
    repsMax: "",
    weight: "",
    duration: "",
    distance: "",
    calories: "",
    measurementSelections: new Set(["reps"]),
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
  assert.match(result.message, /time target/i);
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

test("bodyweight modality renders rep-driven metrics only", () => {
  assert.deepEqual(getVisibleMetricsForModality("bodyweight"), ["reps"]);
});

test("hidden bodyweight time values do not influence derived selections", () => {
  const selections = deriveGoalMeasurementSelections("bodyweight", {
    repsMin: "12",
    weight: "",
    duration: "8:00",
    distance: "",
    calories: "",
  });
  assert.deepEqual(selections.sort(), ["reps"]);
});
