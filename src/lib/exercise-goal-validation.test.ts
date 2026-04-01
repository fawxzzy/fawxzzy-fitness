import test from "node:test";
import assert from "node:assert/strict";
import { validateGoalConfiguration } from "./exercise-goal-validation.ts";

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
