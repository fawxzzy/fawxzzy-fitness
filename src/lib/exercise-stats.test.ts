import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeExerciseStatsWithLatestProgression,
  type ExerciseStatsWithLatestProgression as ExerciseStatsRow,
  type LatestCompletedExerciseProgressionRow,
  type LatestConfiguredExerciseSetupRow,
} from "@/lib/exercise-stats-progression";

test("mergeExerciseStatsWithLatestProgression applies the latest completed progression snapshot per exercise", () => {
  const statsRows: ExerciseStatsRow[] = [
    {
      exercise_id: "exercise-a",
      last_weight: 50,
      last_reps: 8,
      last_unit: "lbs",
      last_performed_at: "2026-05-31T10:00:00.000Z",
      pr_weight: 60,
      pr_reps: 8,
      pr_est_1rm: 72,
      pr_achieved_at: "2026-05-31T10:00:00.000Z",
      actual_pr_weight: 60,
      actual_pr_reps: 8,
      actual_pr_at: "2026-05-31T10:00:00.000Z",
    },
  ];

  const progressionRows: LatestCompletedExerciseProgressionRow[] = [
    {
      exercise_id: "exercise-a",
      performed_at: "2026-05-28T10:00:00.000Z",
      progression_playbook_id: "double_progression",
      progression_playbook_config: { loadIncrement: 5 },
    },
    {
      exercise_id: "exercise-a",
      performed_at: "2026-05-31T10:00:00.000Z",
      progression_playbook_id: "deload_after_stall",
      progression_playbook_config: { stallSessions: 2 },
    },
  ];

  const merged = mergeExerciseStatsWithLatestProgression(statsRows, progressionRows);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.last_progression_playbook_id, "deload_after_stall");
  assert.deepEqual(merged[0]?.last_progression_playbook_config, { stallSessions: 2 });
});

test("mergeExerciseStatsWithLatestProgression preserves progression-only rows when no stats row exists yet", () => {
  const merged = mergeExerciseStatsWithLatestProgression([], [
    {
      exercise_id: "exercise-b",
      performed_at: "2026-05-31T10:00:00.000Z",
      progression_playbook_id: null,
      progression_playbook_config: null,
    },
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.exercise_id, "exercise-b");
  assert.equal(merged[0]?.last_progression_playbook_id, null);
  assert.equal(merged[0]?.last_performed_at, "2026-05-31T10:00:00.000Z");
});

test("mergeExerciseStatsWithLatestProgression falls back to the latest configured setup when no completed stats exist yet", () => {
  const configuredRows: LatestConfiguredExerciseSetupRow[] = [
    {
      exercise_id: "exercise-c",
      created_at: "2026-06-01T09:15:00.000Z",
      target_sets: 3,
      target_reps_min: 8,
      target_reps_max: 10,
      target_weight: 80,
      target_weight_unit: "lbs",
      target_duration_seconds: null,
      target_distance: null,
      target_distance_unit: null,
      target_calories: null,
      measurement_type: "reps",
      default_unit: null,
      progression_playbook_id: "double_progression",
      progression_playbook_config: { loadIncrement: 5 },
    },
  ];

  const merged = mergeExerciseStatsWithLatestProgression([], [], configuredRows);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.exercise_id, "exercise-c");
  assert.equal(merged[0]?.last_progression_playbook_id, "double_progression");
  assert.deepEqual(merged[0]?.last_progression_playbook_config, { loadIncrement: 5 });
  assert.equal(merged[0]?.last_configured_target_sets, 3);
  assert.equal(merged[0]?.last_configured_target_reps_min, 8);
  assert.equal(merged[0]?.last_configured_target_reps_max, 10);
  assert.equal(merged[0]?.last_configured_target_weight, 80);
  assert.equal(merged[0]?.last_configured_target_weight_unit, "lbs");
});

test("mergeExerciseStatsWithLatestProgression prefers completed-session progression while still carrying the latest configured targets", () => {
  const statsRows: ExerciseStatsRow[] = [
    {
      exercise_id: "exercise-d",
      last_weight: 60,
      last_reps: 6,
      last_unit: "lbs",
      last_performed_at: "2026-05-20T08:00:00.000Z",
      pr_weight: 70,
      pr_reps: 6,
      pr_est_1rm: 84,
      pr_achieved_at: "2026-05-20T08:00:00.000Z",
      actual_pr_weight: 70,
      actual_pr_reps: 6,
      actual_pr_at: "2026-05-20T08:00:00.000Z",
    },
  ];
  const progressionRows: LatestCompletedExerciseProgressionRow[] = [
    {
      exercise_id: "exercise-d",
      performed_at: "2026-05-20T08:00:00.000Z",
      progression_playbook_id: "deload_after_stall",
      progression_playbook_config: { failureCount: 2 },
    },
  ];
  const configuredRows: LatestConfiguredExerciseSetupRow[] = [
    {
      exercise_id: "exercise-d",
      created_at: "2026-06-01T09:15:00.000Z",
      target_sets: 4,
      target_reps_min: 10,
      target_reps_max: 12,
      target_weight: 65,
      target_weight_unit: "lbs",
      target_duration_seconds: null,
      target_distance: null,
      target_distance_unit: null,
      target_calories: null,
      measurement_type: "reps",
      default_unit: null,
      progression_playbook_id: "double_progression",
      progression_playbook_config: { loadIncrement: 2.5 },
    },
  ];

  const merged = mergeExerciseStatsWithLatestProgression(statsRows, progressionRows, configuredRows);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.last_progression_playbook_id, "deload_after_stall");
  assert.deepEqual(merged[0]?.last_progression_playbook_config, { failureCount: 2 });
  assert.equal(merged[0]?.last_configured_target_sets, 4);
  assert.equal(merged[0]?.last_configured_target_reps_min, 10);
  assert.equal(merged[0]?.last_configured_target_reps_max, 12);
  assert.equal(merged[0]?.last_configured_target_weight, 65);
});
