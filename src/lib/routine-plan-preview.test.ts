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

test("routine plan preview helpers preserve workout-plan exercise order by position", () => {
  const sourceExercises = [
    {
      id: "exercise-3",
      displayName: "Chest-Supported Row",
      goalLine: "3 sets | 10 reps",
      position: 2,
      details: null,
    },
    {
      id: "exercise-1",
      displayName: "Stretch",
      goalLine: null,
      position: 0,
      details: {
        slug: "stretch",
        primary_muscle: "Recovery",
      },
    },
    {
      id: "exercise-2",
      displayName: "Bench Press",
      goalLine: "3 sets | 5 reps",
      position: 1,
      details: null,
    },
  ];

  const previewExercises = selectRoutinePlanPreviewExercises(sourceExercises);
  const recapExercises = buildRoutinePlanRecapExercises(sourceExercises);

  assert.deepEqual(previewExercises.map((exercise) => exercise.id), ["exercise-2", "exercise-3"]);
  assert.deepEqual(recapExercises.map((exercise) => exercise.id), ["exercise-2", "exercise-3"]);
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
      progression_playbook_id: "double_progression",
      progression_playbook_config: {
        sessionSettingsEnabled: true,
        setSettingsEnabled: true,
      },
      details: null,
    },
  ]);

  assert.equal(recapExercises[0]?.setLabel, "AUTO \u2022 SESSION \u2022 SET");
  assert.equal(recapExercises[0]?.targetLabel, `3 sets \u2022 5 reps \u2022 225 lbs`);
});

test("buildRoutinePlanRecapExercises keeps disabled progression sections out of the recap state row", () => {
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
      progression_playbook_id: "double_progression",
      progression_playbook_config: {
        sessionSettingsEnabled: false,
        setSettingsEnabled: true,
      },
      details: null,
    },
  ]);

  assert.equal(recapExercises[0]?.setLabel, "AUTO \u2022 SET");
  assert.equal(recapExercises[0]?.targetLabel, `3 sets \u2022 5 reps \u2022 225 lbs`);
});

test("buildRoutinePlanRecapExercises falls back to manual progression state when no playbook is configured", () => {
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
      progression_playbook_id: null,
      progression_playbook_config: null,
      details: null,
    },
  ]);

  assert.equal(recapExercises[0]?.setLabel, "MANUAL");
  assert.equal(recapExercises[0]?.targetLabel, `3 sets \u2022 5 reps \u2022 225 lbs`);
});
