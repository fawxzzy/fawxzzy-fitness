import test from "node:test";
import assert from "node:assert/strict";

import {
  applyEffortScheduleToProgressionTargetPlan,
  applyEffortScheduleToRoutineDayExercise,
} from "@/lib/progression-effective-target";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";
import type { RoutineDayExerciseRow } from "@/types/db";

function buildPlan(overrides: Partial<ProgressionTargetPlan> = {}): ProgressionTargetPlan {
  return {
    measurementType: "reps",
    setsMin: 3,
    setsMax: 3,
    repsTarget: 8,
    repsMin: 8,
    repsMax: 10,
    weightMin: 100,
    weightMax: 100,
    weightUnit: "lbs",
    ...overrides,
  };
}

function buildExercise(overrides: Partial<RoutineDayExerciseRow> = {}): RoutineDayExerciseRow {
  return {
    id: "routine-exercise-1",
    user_id: "user-1",
    routine_day_id: "day-1",
    exercise_id: "exercise-1",
    position: 1,
    target_sets: 3,
    target_reps: 8,
    target_reps_min: 8,
    target_reps_max: 10,
    target_weight: 100,
    target_weight_unit: "lbs",
    target_duration_seconds: null,
    target_distance: null,
    target_distance_unit: null,
    target_calories: null,
    measurement_type: "reps",
    default_unit: null,
    progression_playbook_id: "double_progression",
    progression_playbook_config: {
      version: 1,
      loadIncrement: 5,
      dayProgressionMode: "unsynced",
      dayProgressionSteps: {
        loadStep: 5,
        repStep: 1,
      },
      effortWaveDirections: ["up", "down", "straight", "straight", "straight", "straight", "straight"],
    },
    notes: null,
    ...overrides,
  };
}

test("applyEffortScheduleToProgressionTargetPlan shifts reps and load by day direction", () => {
  const dayOne = applyEffortScheduleToProgressionTargetPlan({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      dayProgressionMode: "unsynced",
      dayProgressionSteps: {
        loadStep: 5,
        repStep: 1,
      },
      effortWaveDirections: ["up", "down", "straight", "straight", "straight", "straight", "straight"],
    },
    routineDayIndex: 1,
    plan: buildPlan(),
  });
  const dayTwo = applyEffortScheduleToProgressionTargetPlan({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      dayProgressionMode: "unsynced",
      dayProgressionSteps: {
        loadStep: 5,
        repStep: 1,
      },
      effortWaveDirections: ["up", "down", "straight", "straight", "straight", "straight", "straight"],
    },
    routineDayIndex: 2,
    plan: buildPlan(),
  });

  assert.equal(dayOne?.weightMin, 105);
  assert.equal(dayOne?.repsTarget, 9);
  assert.equal(dayTwo?.weightMin, 95);
  assert.equal(dayTwo?.repsTarget, 7);
});

test("applyEffortScheduleToProgressionTargetPlan does not turn optional cardio load into effort-adjusted load", () => {
  const adjusted = applyEffortScheduleToProgressionTargetPlan({
    playbookId: "double_progression",
    config: {
      version: 1,
      loadIncrement: 5,
      dayProgressionMode: "unsynced",
      dayProgressionSteps: {
        durationSecondsStep: 60,
        distanceStep: 0.1,
        loadStep: 10,
      },
      effortWaveDirections: ["up", "straight", "straight", "straight", "straight", "straight", "straight"],
    },
    routineDayIndex: 1,
    plan: buildPlan({
      measurementType: "time_distance",
      repsTarget: null,
      repsMin: null,
      repsMax: null,
      weightMin: 25,
      weightMax: 25,
      durationSeconds: 1200,
      distance: 2,
      distanceUnit: "mi",
    }),
  });

  assert.equal(adjusted?.durationSeconds, 1260);
  assert.equal(adjusted?.distance, 2.1);
  assert.equal(adjusted?.weightMin, 25);
});

test("applyEffortScheduleToRoutineDayExercise mirrors synced load step from canonical progression settings", () => {
  const adjusted = applyEffortScheduleToRoutineDayExercise({
    exercise: buildExercise({
      progression_playbook_config: {
        version: 1,
        loadIncrement: 7.5,
        dayProgressionMode: "synced",
        effortWaveDirections: ["up", "straight", "straight", "straight", "straight", "straight", "straight"],
      },
    }),
    routineDayIndex: 1,
  });

  assert.equal(adjusted.target_weight, 107.5);
});
