import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAccountWorkoutExportCsvTables,
  buildAccountWorkoutExportWorkbookSheets,
  type AccountWorkoutExportPayload,
} from "@/lib/account-workout-export";
import { buildAccountWorkoutExportPreview } from "@/lib/account-workout-export-preview";
import type {
  ProfileRow,
  ProgressionEventRow,
  RoutineDayExerciseRow,
  RoutineDayRow,
  RoutineRow,
  SessionExerciseRow,
  SessionRow,
  SetRow,
} from "@/types/db";

function buildPayload(): AccountWorkoutExportPayload {
  const profile: ProfileRow = {
    id: "user-1",
    timezone: "America/New_York",
    active_routine_id: "routine-1",
    preferred_weight_unit: "lbs",
    preferred_distance_unit: "mi",
    show_qa_llel_data: false,
    user_number: 101,
    user_kind: "human",
    user_number_assigned_at: "2026-05-01T00:00:00.000Z",
  };
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
  const routineDayExercises: RoutineDayExerciseRow[] = [{
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
        sessions: sessions.length,
        completedSessions: 1,
        sessionExercises: sessionExercises.length,
        sets: sets.length,
        routines: routines.length,
        routineDays: routineDays.length,
        routineDayExercises: routineDayExercises.length,
        exercises: 1,
        progressionEvents: progressionEvents.length,
      },
    },
    profile,
    sessions,
    sessionExercises,
    sets,
    routines,
    routineDays,
    routineDayExercises,
    progressionEvents,
    exercises: [{
      id: "exercise-1",
      name: "Back Squat",
      user_id: null,
      is_global: true,
      primary_muscle: "Quads",
      equipment: "Barbell",
      movement_pattern: "squat",
      measurement_type: "reps",
      default_unit: "lbs",
      calories_estimation_method: null,
      image_path: null,
      image_icon_path: null,
      image_howto_path: null,
      slug: "back-squat",
      how_to_short: null,
      curation_tags: null,
      created_at: "2026-01-01T00:00:00.000Z",
    }],
  };
}

test("preview includes progression events and exact CSV table names", () => {
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
    buildAccountWorkoutExportCsvTables(payload).map((table) => table.name),
  );
});

test("preview reflects current routine scope and selected date range", () => {
  const payload = buildPayload();
  const preview = buildAccountWorkoutExportPreview({
    payload,
    options: {
      fileType: "json",
      scope: "current_routine",
      dateFrom: "2026-05-01",
      dateTo: "2026-05-09",
    },
  });

  assert.equal(preview.scopeLabel, "Current routine");
  assert.equal(preview.routineScopeLabel, "Atlas Routine");
  assert.equal(preview.dateRange.label, "2026-05-01 to 2026-05-09");
});

test("preview table names match workbook sheets for xlsx", () => {
  const payload = buildPayload();
  const preview = buildAccountWorkoutExportPreview({
    payload,
    options: {
      fileType: "xlsx",
      scope: "all",
      dateFrom: null,
      dateTo: null,
    },
  });

  assert.deepEqual(
    preview.tables.map((table) => table.name),
    buildAccountWorkoutExportWorkbookSheets(payload).map((sheet) => sheet.name),
  );
});

test("empty progression events preview stays stable and does not mutate payload", () => {
  const payload = buildPayload();
  payload.progressionEvents = [];
  payload.metadata.counts.progressionEvents = 0;
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

  const progressionTable = preview.tables.find((table) => table.name === "progressionEvents");
  assert.ok(progressionTable);
  assert.equal(progressionTable?.rowCount, 0);
  assert.equal(progressionTable?.empty, true);
  assert.deepEqual(payload, before);
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
