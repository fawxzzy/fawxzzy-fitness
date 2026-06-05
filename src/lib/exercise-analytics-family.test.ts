import assert from "node:assert/strict";
import test from "node:test";

import {
  mapExerciseAnalyticsFamilyToPresentationKind,
  resolveExerciseAnalyticsFamily,
} from "@/lib/exercise-analytics-family";

test("resolveExerciseAnalyticsFamily identifies weighted strength by default", () => {
  assert.equal(
    resolveExerciseAnalyticsFamily({
      measurement_type: "reps",
      equipment: "barbell",
      movement_pattern: "push",
    }),
    "strength-loaded",
  );
});

test("resolveExerciseAnalyticsFamily identifies bodyweight strength", () => {
  assert.equal(
    resolveExerciseAnalyticsFamily({
      measurement_type: "reps",
      equipment: "bodyweight",
      movement_pattern: "pull",
    }),
    "strength-bodyweight",
  );
});

test("resolveExerciseAnalyticsFamily identifies timed holds outside cardio", () => {
  assert.equal(
    resolveExerciseAnalyticsFamily({
      measurement_type: "time",
      equipment: "bodyweight",
      movement_pattern: "brace",
      primary_muscle: "core",
    }),
    "timed-hold",
  );
});

test("resolveExerciseAnalyticsFamily identifies steps-based cardio", () => {
  assert.equal(
    resolveExerciseAnalyticsFamily({
      presentationKind: "cardio",
      measurement_type: "time_distance",
      equipment: "treadmill",
      primary_muscle: "cardio",
      distanceUnit: "steps",
    }),
    "cardio-steps",
  );
});

test("resolveExerciseAnalyticsFamily identifies calorie-first cardio", () => {
  assert.equal(
    resolveExerciseAnalyticsFamily({
      presentationKind: "cardio",
      measurement_type: "calories",
      equipment: "bike",
      primary_muscle: "cardio",
    }),
    "cardio-calories",
  );
});

test("mapExerciseAnalyticsFamilyToPresentationKind keeps family-to-surface mapping stable", () => {
  assert.equal(mapExerciseAnalyticsFamilyToPresentationKind("strength-loaded"), "strength");
  assert.equal(mapExerciseAnalyticsFamilyToPresentationKind("strength-bodyweight"), "bodyweight");
  assert.equal(mapExerciseAnalyticsFamilyToPresentationKind("timed-hold"), "timed");
  assert.equal(mapExerciseAnalyticsFamilyToPresentationKind("cardio-steps"), "cardio");
});
