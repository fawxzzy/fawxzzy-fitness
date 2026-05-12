import test from "node:test";
import assert from "node:assert/strict";

import { formatExerciseGoal, resolveExerciseGoalCurrentReps } from "@/lib/exercise-goal-format";

test("resolves current target reps before rep-range max for non-edit displays", () => {
  assert.equal(resolveExerciseGoalCurrentReps({
    target_reps: 4,
    target_reps_min: 4,
    target_reps_max: 6,
  }), 4);
  assert.equal(resolveExerciseGoalCurrentReps({
    target_reps: null,
    target_reps_min: 5,
    target_reps_max: 8,
  }), 5);
});

test("formats current target reps without exposing the full range outside Edit Day", () => {
  const label = formatExerciseGoal({
    target_sets: 4,
    target_reps: 4,
    target_reps_min: 4,
    target_reps_max: 6,
    target_weight: 225,
    target_weight_unit: "lbs",
    target_duration_seconds: null,
    target_distance: null,
    target_distance_unit: null,
    target_calories: null,
    enabledMeasurements: null,
  });

  assert.match(label, /4 reps/);
  assert.doesNotMatch(label, /4.?6 reps/);
});
