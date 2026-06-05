import assert from "node:assert/strict";
import test from "node:test";

import {
  estimateCaloriesFromExerciseMetrics,
  inferCaloriesEstimationMethodFromExercise,
  normalizeCaloriesEstimationMethod,
  resolveCaloriesEstimationMethod,
  resolveExplicitOrEstimatedCalories,
  withEstimatedCaloriesForTarget,
} from "@/lib/calorie-estimation";

test("normalizes cardio calorie estimation aliases", () => {
  assert.equal(normalizeCaloriesEstimationMethod("walk"), "walking_time_distance");
  assert.equal(normalizeCaloriesEstimationMethod("incline_walk"), "incline_walk_time_distance");
  assert.equal(normalizeCaloriesEstimationMethod("manual_only"), "manual_only");
});

test("infers incline walking from treadmill exercise metadata", () => {
  assert.equal(
    inferCaloriesEstimationMethodFromExercise({
      name: "Incline Walk",
      equipment: "Cardio Machine",
      measurementType: "time_distance",
      defaultUnit: "mi",
    }),
    "incline_walk_time_distance",
  );
});

test("infers step-based walking from steps distance unit", () => {
  assert.equal(
    inferCaloriesEstimationMethodFromExercise({
      name: "Daily Walk",
      measurementType: "distance",
      defaultUnit: "steps",
    }),
    "steps_based_walk",
  );
});

test("prefers explicit exercise calorie estimation methods", () => {
  assert.equal(
    resolveCaloriesEstimationMethod({
      name: "Treadmill Walk",
      defaultUnit: "mi",
      caloriesEstimationMethod: "manual_only",
    }),
    "manual_only",
  );
});

test("estimates walking calories from time and distance", () => {
  assert.equal(
    estimateCaloriesFromExerciseMetrics({
      method: "walking_time_distance",
      durationSeconds: 1800,
      distance: 1.5,
      distanceUnit: "mi",
    }),
    129,
  );
});

test("estimates step-based walking calories", () => {
  assert.equal(
    estimateCaloriesFromExerciseMetrics({
      method: "steps_based_walk",
      durationSeconds: 1800,
      distance: 4000,
      distanceUnit: "steps",
    }),
    184,
  );
});

test("uses bodyweight context when available", () => {
  assert.equal(
    estimateCaloriesFromExerciseMetrics({
      method: "walking_time_distance",
      durationSeconds: 1800,
      distance: 1.5,
      distanceUnit: "mi",
      context: {
        userProfile: {
          bodyWeightLbs: 220,
        },
      },
    }),
    183,
  );
});

test("returns null when the method does not support automatic calories", () => {
  assert.equal(
    estimateCaloriesFromExerciseMetrics({
      method: "manual_only",
      durationSeconds: 1800,
      distance: 1.5,
      distanceUnit: "mi",
    }),
    null,
  );
});

test("keeps explicit calories instead of replacing them with estimates", () => {
  assert.equal(
    resolveExplicitOrEstimatedCalories({
      method: "walking_time_distance",
      durationSeconds: 1800,
      distance: 1.5,
      distanceUnit: "mi",
      calories: 222,
    }),
    222,
  );
});

test("enriches quick-log style targets with estimated calories when missing", () => {
  assert.deepEqual(
    withEstimatedCaloriesForTarget({
      target: {
        measurementType: "time_distance",
        durationSeconds: 1800,
        distance: 1.5,
        distanceUnit: "mi",
        calories: null,
      },
      method: "walking_time_distance",
    }),
    {
      measurementType: "time_distance",
      durationSeconds: 1800,
      distance: 1.5,
      distanceUnit: "mi",
      calories: 129,
    },
  );
});
