import assert from "node:assert/strict";
import test from "node:test";

import { buildRoutinePlanRecapExercises, selectRoutinePlanPreviewExercises } from "@/lib/routine-plan-preview";

test("selectRoutinePlanPreviewExercises normalizes decorated goal-line separators", () => {
  const previewExercises = selectRoutinePlanPreviewExercises([
    {
      id: "exercise-1",
      displayName: "Bench Press",
      goalLine: "3 sets | 5 reps \u00e2\u20ac\u00a2 225 lbs",
      details: null,
    },
  ]);

  assert.equal(previewExercises[0]?.goalLine, "3 sets | 5 reps \u2022 225 lbs");
});

test("buildRoutinePlanRecapExercises separates set and target labels for workout-plan recaps", () => {
  const recapExercises = buildRoutinePlanRecapExercises([
    {
      id: "exercise-1",
      displayName: "Bench Press",
      goalLine: "3 sets | 5 reps \u00e2\u20ac\u00a2 225 lbs",
      target_sets: 3,
      target_reps: 5,
      target_reps_min: 5,
      target_reps_max: 5,
      target_weight: 225,
      target_weight_unit: "lbs",
      details: null,
    },
  ]);

  assert.equal(recapExercises[0]?.setLabel, "3 sets");
  assert.equal(recapExercises[0]?.targetLabel, `5 reps \u2022 225 lbs`);
});
