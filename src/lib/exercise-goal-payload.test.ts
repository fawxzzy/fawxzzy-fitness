import test from "node:test";
import assert from "node:assert/strict";

import { mapRoutineDayGoalToSessionColumns, parseExerciseGoalPayload } from "./exercise-goal-payload.ts";

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
