import test from "node:test";
import assert from "node:assert/strict";

import type { AccountWorkoutExportPayload } from "@/lib/account-workout-export";
import { buildAccountWorkoutExportPreview } from "@/lib/account-workout-export-preview";
import type {
  ProgressionEventRow,
  RoutineDayExerciseRow,
  RoutineDayRow,
  RoutineRow,
  SessionExerciseRow,
  SessionRow,
  SetRow,
} from "@/types/db";

function buildPayload(): AccountWorkoutExportPayload {
  const routines: RoutineRow[] = [{
    id: "routine-1",
    user_id: "user-1",
    name: "Atlas Routine",
    cycle_length_days: 4,
    start_date: "2026-05-01",
    timezone: "America/New_York",
    updated_at: "2026-05-04T10:00:00.000Z",
    weight_unit: "lbs",
    default_progression_playbook_id: null,
    default_progression_playbook_config: null,
  }];
  const routineDays: RoutineDayRow[] = [{
    id: "day-1",
    user_id: "user-1",
    routine_id: "routine-1",
    day_index: 1,
    name: "Lower A",
    is_rest: false,
    notes: null,
  }];
  const routineExercises: RoutineDayExerciseRow[] = [{
    id: "routine-exercise-1",
    user_id: "user-1",
    routine_day_id: "day-1",
    exercise_id: "exercise-1",
    position: 1,
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
    progression_playbook_id: "double_progression",
    progression_playbook_config: { version: 1, loadIncrement: 5 },
    measurement_type: "reps",
    default_unit: null,
    notes: null,
  }];
  const sessions: SessionRow[] = [{
    id: "session-1",
    user_id: "user-1",
    performed_at: "2026-05-04T10:00:00.000Z",
    notes: "Felt strong",
    routine_id: "routine-1",
    routine_day_index: 1,
    name: "Atlas Routine",
    routine_day_name: "Lower A",
    day_name_override: null,
    duration_seconds: 1800,
    status: "completed",
  }];
  const sessionExercises: SessionExerciseRow[] = [{
    id: "session-exercise-1",
    session_id: "session-1",
    user_id: "user-1",
    exercise_id: "exercise-1",
    routine_day_exercise_id: "routine-exercise-1",
    position: 1,
    performed_index: 1,
    notes: null,
    is_skipped: false,
    measurement_type: "reps",
    default_unit: null,
    target_sets_min: 4,
    target_sets_max: 4,
    target_reps_min: 4,
    target_reps_max: 6,
    target_weight_min: 225,
    target_weight_max: 225,
    target_weight_unit: "lbs",
    target_time_seconds_min: null,
    target_time_seconds_max: null,
    target_distance_min: null,
    target_distance_max: null,
    target_distance_unit: null,
    target_calories_min: null,
    target_calories_max: null,
  }];
  const sets: SetRow[] = [{
    id: "set-1",
    client_log_id: null,
    session_exercise_id: "session-exercise-1",
    user_id: "user-1",
    set_index: 1,
    weight: 225,
    reps: 4,
    is_warmup: false,
    notes: "Paused",
    duration_seconds: null,
    distance: null,
    distance_unit: null,
    calories: null,
    rpe: 8,
    weight_unit: "lbs",
  }];
  const progressionEvents: ProgressionEventRow[] = [{
    id: "event-1",
    user_id: "user-1",
    routine_id: "routine-1",
    routine_day_exercise_id: "routine-exercise-1",
    exercise_id: "exercise-1",
    event_type: "promotion_applied",
    from_target: { repsMin: 4, repsMax: 6, weightMin: 225, weightMax: 225 },
    to_target: { repsMin: 4, repsMax: 4, weightMin: 230, weightMax: 230 },
    method: "double_progression",
    vector: "coupled_load_reps",
    step: { loadDelta: 5 },
    reason: "Met the promotion target.",
    source_session_id: "session-1",
    created_at: "2026-05-05T10:00:00.000Z",
  }];

  return {
    metadata: {
      exportedAt: "2026-05-09T00:00:00.000Z",
      scope: "all",
      dateFrom: null,
      dateTo: null,
      counts: {
        sessions: 1,
        completedSessions: 1,
        sessionExercises: 1,
        sets: 1,
        routines: 1,
        routineDays: 1,
        routineExercises: 1,
        exercises: 1,
        progressionEvents: 1,
      },
    },
    sessions,
    sessionExercises,
    sets,
    routines,
    routineDays,
    routineExercises,
    progressionEvents,
    exercises: [{
      id: "exercise-1",
      name: "Back Squat",
    }],
  };
}

test("preview includes progression events and clean section labels", () => {
  const payload = buildPayload();
  const preview = buildAccountWorkoutExportPreview({
    payload,
    options: {
      fileType: "csv",
      scope: "all",
      dateFrom: null,
      dateTo: null,
    },
  });

  assert.equal(preview.includesProgressionEvents, true);
  assert.deepEqual(
    preview.tables.map((table) => table.name),
    [
      "History Sessions",
      "History Exercises",
      "History Sets",
      "History Progression Events",
      "Routines",
      "Routine Days",
      "Routine Exercises",
    ],
  );
});

test("preview reflects history scope and selected date range", () => {
  const payload = buildPayload();
  payload.metadata.scope = "history";
  payload.routines = [];
  payload.routineDays = [];
  payload.routineExercises = [];
  payload.metadata.counts.routines = 0;
  payload.metadata.counts.routineDays = 0;
  payload.metadata.counts.routineExercises = 0;

  const preview = buildAccountWorkoutExportPreview({
    payload,
    options: {
      fileType: "json",
      scope: "history",
      dateFrom: "2026-05-01",
      dateTo: "2026-05-09",
    },
  });

  assert.equal(preview.scopeLabel, "History");
  assert.equal(preview.scopeSummaryLabel, "History exports only session, set, and progression data.");
  assert.equal(preview.dateRange.label, "2026-05-01 to 2026-05-09");
  assert.deepEqual(
    preview.tables.map((table) => table.key),
    [
      "historySessions",
      "historyExercises",
      "historySets",
      "historyProgressionEvents",
    ],
  );
});

test("preview for routines scope omits progression-event inclusion", () => {
  const payload = buildPayload();
  payload.metadata.scope = "routines";
  payload.sessions = [];
  payload.sessionExercises = [];
  payload.sets = [];
  payload.progressionEvents = [];
  payload.metadata.counts.sessions = 0;
  payload.metadata.counts.completedSessions = 0;
  payload.metadata.counts.sessionExercises = 0;
  payload.metadata.counts.sets = 0;
  payload.metadata.counts.progressionEvents = 0;

  const preview = buildAccountWorkoutExportPreview({
    payload,
    options: {
      fileType: "xlsx",
      scope: "routines",
      dateFrom: null,
      dateTo: null,
    },
  });

  assert.equal(preview.includesProgressionEvents, false);
  assert.deepEqual(
    preview.tables.map((table) => table.key),
    ["routines", "routineDays", "routineExercises"],
  );
});

test("preview reports exact payload counts without mutating export truth", () => {
  const payload = buildPayload();
  const before = structuredClone(payload);
  const preview = buildAccountWorkoutExportPreview({
    payload,
    options: {
      fileType: "json",
      scope: "all",
      dateFrom: null,
      dateTo: null,
    },
  });

  assert.equal(preview.counts.progressionEvents, 1);
  assert.deepEqual(payload, before);
});
