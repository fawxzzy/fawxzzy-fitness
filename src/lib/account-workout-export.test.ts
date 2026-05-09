import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";

import {
  buildAccountWorkoutExportCsvRows,
  buildAccountWorkoutExportFilename,
  buildAccountWorkoutExportPayload,
  buildAccountWorkoutExportWorkbookBuffer,
  getAccountWorkoutExportSuggestedDateRange,
  getAccountWorkoutExportContentType,
  resolveAccountWorkoutExportSuggestedDateRange,
  sanitizeAccountWorkoutExportName,
  serializeAccountWorkoutExportCsv,
  type AccountWorkoutExportExerciseRow,
  type AccountWorkoutExportPayload,
  type AccountWorkoutExportProfileRow,
  type AccountWorkoutExportRoutineDayExerciseRow,
  type AccountWorkoutExportRoutineDayRow,
  type AccountWorkoutExportRoutineRow,
  type AccountWorkoutExportSessionExerciseRow,
} from "@/lib/account-workout-export";
import type { SessionRow, SetRow } from "@/types/db";

type TableName =
  | "profiles"
  | "routines"
  | "routine_days"
  | "routine_day_exercises"
  | "sessions"
  | "session_exercises"
  | "sets"
  | "exercises";

type QueryFilter =
  | { kind: "eq"; column: string; value: unknown }
  | { kind: "in"; column: string; values: unknown[] }
  | { kind: "gte"; column: string; value: string }
  | { kind: "lte"; column: string; value: string };

class MockQueryBuilder {
  private filters: QueryFilter[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private readonly rows: Record<TableName, Record<string, unknown>[]>;
  private readonly table: TableName;

  constructor(rows: Record<TableName, Record<string, unknown>[]>, table: TableName) {
    this.rows = rows;
    this.table = table;
  }

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: "eq", column, value });
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ kind: "in", column, values });
    return this;
  }

  gte(column: string, value: string) {
    this.filters.push({ kind: "gte", column, value });
    return this;
  }

  lte(column: string, value: string) {
    this.filters.push({ kind: "lte", column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  maybeSingle() {
    const result = this.execute().data[0] ?? null;
    return Promise.resolve({ data: result });
  }

  then<TResult1 = { data: Record<string, unknown>[] }, TResult2 = never>(
    onfulfilled?: ((value: { data: Record<string, unknown>[] }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected);
  }

  private execute() {
    const filtered = [...this.rows[this.table]].filter((row) => this.filters.every((filter) => {
      const value = row[filter.column];
      switch (filter.kind) {
      case "eq":
        return value === filter.value;
      case "in":
        return filter.values.includes(value);
      case "gte":
        return typeof value === "string" && value >= filter.value;
      case "lte":
        return typeof value === "string" && value <= filter.value;
      }
    }));

    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      filtered.sort((left, right) => {
        const leftValue = left[column];
        const rightValue = right[column];
        if (leftValue === rightValue) {
          return 0;
        }

        if (leftValue === undefined || leftValue === null) {
          return ascending ? 1 : -1;
        }

        if (rightValue === undefined || rightValue === null) {
          return ascending ? -1 : 1;
        }

        if (leftValue < rightValue) {
          return ascending ? -1 : 1;
        }

        return ascending ? 1 : -1;
      });
    }

    return { data: filtered };
  }
}

function createMockSupabase(rows: Record<TableName, Record<string, unknown>[]>) {
  return {
    from(table: TableName) {
      return new MockQueryBuilder(rows, table);
    },
  };
}

function buildPayload(): AccountWorkoutExportPayload {
  const profile: AccountWorkoutExportProfileRow = {
    id: "user-1",
    timezone: "America/New_York",
    active_routine_id: "routine-1",
    preferred_weight_unit: "lbs",
    preferred_distance_unit: "mi",
    show_qa_llel_data: false,
    user_number: 101,
    user_kind: "human",
    user_number_assigned_at: "2026-05-01T00:00:00.000Z",
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-09T00:00:00.000Z",
  };
  const routines: AccountWorkoutExportRoutineRow[] = [{
    id: "routine-1",
    user_id: "user-1",
    name: "Atlas Routine",
    cycle_length_days: 4,
    start_date: "2026-05-01",
    timezone: "America/New_York",
    progression_mode: "progressive_overload",
    temperament: "moderate",
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-04T10:00:00.000Z",
    weight_unit: "lbs",
    default_progression_playbook_id: null,
    default_progression_playbook_config: null,
  }];
  const routineDays: AccountWorkoutExportRoutineDayRow[] = [{
    id: "day-1",
    user_id: "user-1",
    routine_id: "routine-1",
    day_index: 1,
    name: "Lower A",
    is_rest: false,
    notes: null,
    created_at: "2026-05-01T00:00:00.000Z",
  }];
  const routineDayExercises: AccountWorkoutExportRoutineDayExerciseRow[] = [{
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
    notes: "Tempo focus",
    created_at: "2026-05-01T00:00:00.000Z",
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
  const sessionExercises: AccountWorkoutExportSessionExerciseRow[] = [{
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
    target_reps: 4,
    target_sets_min: 4,
    target_sets_max: 4,
    target_reps_min: 4,
    target_reps_max: 6,
    target_weight: 225,
    target_weight_min: 225,
    target_weight_max: 225,
    target_weight_unit: "lbs",
    target_duration_seconds: null,
    target_time_seconds_min: null,
    target_time_seconds_max: null,
    target_distance: null,
    target_distance_min: null,
    target_distance_max: null,
    target_distance_unit: null,
    target_calories: null,
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

  return {
    metadata: {
      snapshotVersion: "fitness-account-export-v1",
      sourceApp: "fawxzzy-fitness",
      sourceBackend: "primary-supabase",
      exportedAt: "2026-05-09T00:00:00.000Z",
      scope: "all",
      dateFrom: null,
      dateTo: null,
      activeRoutineId: "routine-1",
      canonicalTables: [
        "profiles",
        "exercises",
        "routines",
        "routine_days",
        "routine_day_exercises",
        "sessions",
        "session_exercises",
        "sets",
      ],
      excludedTables: [
        "exercise_stats",
        "session_follow_up_jobs",
      ],
      counts: {
        profile: 1,
        sessions: sessions.length,
        completedSessions: 1,
        sessionExercises: sessionExercises.length,
        sets: sets.length,
        routines: routines.length,
        routineDays: routineDays.length,
        routineDayExercises: routineDayExercises.length,
        exercises: 1,
        globalExercises: 1,
        userOwnedExercises: 0,
      },
    },
    profile,
    sessions,
    sessionExercises,
    sets,
    routines,
    routineDays,
    routineDayExercises,
    exercises: [{
      id: "exercise-1",
      name: "Back Squat",
      user_id: null,
      is_global: true,
      primary_muscle: "Quads",
      primary_muscles: ["quads", "glutes"],
      secondary_muscles: ["core"],
      equipment: "Barbell",
      movement_pattern: "squat",
      measurement_type: "reps",
      default_unit: "lbs",
      calories_estimation_method: null,
      image_path: null,
      image_icon_path: null,
      image_howto_path: null,
      image_muscles_path: null,
      slug: "back-squat",
      kind: null,
      type: null,
      tags: null,
      categories: null,
      how_to_short: null,
      curation_tags: null,
      created_at: "2026-01-01T00:00:00.000Z",
    }] satisfies AccountWorkoutExportExerciseRow[],
  };
}

test("sanitizes export filenames and preserves extensions", () => {
  assert.equal(sanitizeAccountWorkoutExportName("../Fitness Export:May?"), "..-Fitness-Export-May");
  assert.equal(buildAccountWorkoutExportFilename({
    exportName: " Atlas Export ",
    fileType: "csv",
  }), "Atlas-Export.csv");
  assert.equal(buildAccountWorkoutExportFilename({
    exportName: " Atlas Export ",
    fileType: "xlsx",
  }), "Atlas-Export.xlsx");
});

test("builds tabular CSV rows and escapes values", () => {
  const payload = buildPayload();
  const rows = buildAccountWorkoutExportCsvRows(payload);
  const csv = serializeAccountWorkoutExportCsv(rows);

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.routine_name, "Atlas Routine");
  assert.equal(rows[0]?.exercise_name, "Back Squat");
  assert.equal(rows[0]?.target_reps, 4);
  assert.equal(rows[0]?.set_id, "set-1");
  assert.match(csv, /session_id,performed_at,session_status/);
  assert.match(csv, /Back Squat/);
  assert.match(csv, /Paused/);
});

test("builds an xlsx workbook with the expected sheet names", () => {
  const payload = buildPayload();
  const workbookBuffer = buildAccountWorkoutExportWorkbookBuffer(payload);
  const workbook = XLSX.read(workbookBuffer, { type: "buffer" });

  assert.deepEqual(workbook.SheetNames, [
    "Metadata",
    "Profile",
    "Sessions",
    "Completed Sessions",
    "Session Exercises",
    "Sets",
    "Exercises",
    "Routines",
    "Routine Days",
    "Routine Day Exercises",
    "Progression Summary",
  ]);
});

test("includes metadata and profile workbook sheets", () => {
  const payload = buildPayload();
  const workbookBuffer = buildAccountWorkoutExportWorkbookBuffer(payload);
  const workbook = XLSX.read(workbookBuffer, { type: "buffer" });
  const metadataRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Metadata);
  const profileRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets.Profile);

  assert.equal(metadataRows[0]?.snapshot_version, "fitness-account-export-v1");
  assert.equal(metadataRows[0]?.active_routine_id, "routine-1");
  assert.equal(profileRows[0]?.id, "user-1");
  assert.equal(profileRows[0]?.preferred_weight_unit, "lbs");
});

test("reports the xlsx content type", () => {
  assert.equal(
    getAccountWorkoutExportContentType("xlsx"),
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
});

test("filters export payload to completed sessions only", async () => {
  const rows = {
    profiles: [{
      id: "user-1",
      timezone: "America/New_York",
      active_routine_id: "routine-1",
      preferred_weight_unit: "lbs",
      preferred_distance_unit: "mi",
      show_qa_llel_data: false,
      user_number: 101,
      user_kind: "human",
      user_number_assigned_at: "2026-05-01T00:00:00.000Z",
    }],
    routines: [{
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
    }],
    routine_days: [],
    routine_day_exercises: [],
    sessions: [
      {
        id: "session-complete",
        user_id: "user-1",
        performed_at: "2026-05-04T10:00:00.000Z",
        notes: null,
        routine_id: "routine-1",
        routine_day_index: 1,
        name: "Atlas Routine",
        routine_day_name: "Lower A",
        day_name_override: null,
        duration_seconds: 1800,
        status: "completed",
      },
      {
        id: "session-live",
        user_id: "user-1",
        performed_at: "2026-05-05T10:00:00.000Z",
        notes: null,
        routine_id: "routine-1",
        routine_day_index: 2,
        name: "Atlas Routine",
        routine_day_name: "Upper A",
        day_name_override: null,
        duration_seconds: 1200,
        status: "in_progress",
      },
    ],
    session_exercises: [],
    sets: [],
    exercises: [],
  } satisfies Record<TableName, Record<string, unknown>[]>;

  const payload = await buildAccountWorkoutExportPayload({
    supabase: createMockSupabase(rows),
    userId: "user-1",
    options: {
      fileType: "json",
      scope: "completed_only",
    },
  });

  assert.deepEqual(payload.sessions.map((session) => session.id), ["session-complete"]);
  assert.equal(payload.metadata.counts.completedSessions, 1);
});

test("filters export payload to the current active routine", async () => {
  const rows = {
    profiles: [{
      id: "user-1",
      timezone: "America/New_York",
      active_routine_id: "routine-2",
      preferred_weight_unit: "lbs",
      preferred_distance_unit: "mi",
      show_qa_llel_data: false,
      user_number: 101,
      user_kind: "human",
      user_number_assigned_at: "2026-05-01T00:00:00.000Z",
    }],
    routines: [
      {
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
      },
      {
        id: "routine-2",
        user_id: "user-1",
        name: "Travel Routine",
        cycle_length_days: 3,
        start_date: "2026-05-02",
        timezone: "America/New_York",
        updated_at: "2026-05-05T10:00:00.000Z",
        weight_unit: "lbs",
        default_progression_playbook_id: null,
        default_progression_playbook_config: null,
      },
    ],
    routine_days: [
      { id: "day-1", user_id: "user-1", routine_id: "routine-1", day_index: 1, name: "Lower A", is_rest: false, notes: null },
      { id: "day-2", user_id: "user-1", routine_id: "routine-2", day_index: 1, name: "Hotel Gym", is_rest: false, notes: null },
    ],
    routine_day_exercises: [
      {
        id: "routine-exercise-1",
        user_id: "user-1",
        routine_day_id: "day-1",
        exercise_id: "exercise-1",
        position: 1,
        target_sets: 3,
        target_reps: 5,
        target_reps_min: 5,
        target_reps_max: 5,
        target_weight: 185,
        target_weight_unit: "lbs",
        target_duration_seconds: null,
        target_distance: null,
        target_distance_unit: null,
        target_calories: null,
        progression_playbook_id: null,
        progression_playbook_config: null,
        measurement_type: "reps",
        default_unit: null,
        notes: null,
      },
      {
        id: "routine-exercise-2",
        user_id: "user-1",
        routine_day_id: "day-2",
        exercise_id: "exercise-2",
        position: 1,
        target_sets: 1,
        target_reps: null,
        target_reps_min: null,
        target_reps_max: null,
        target_weight: null,
        target_weight_unit: null,
        target_duration_seconds: 900,
        target_distance: null,
        target_distance_unit: null,
        target_calories: null,
        progression_playbook_id: null,
        progression_playbook_config: null,
        measurement_type: "time",
        default_unit: null,
        notes: null,
      },
    ],
    sessions: [
      {
        id: "session-routine-1",
        user_id: "user-1",
        performed_at: "2026-05-04T10:00:00.000Z",
        notes: null,
        routine_id: "routine-1",
        routine_day_index: 1,
        name: "Atlas Routine",
        routine_day_name: "Lower A",
        day_name_override: null,
        duration_seconds: 1800,
        status: "completed",
      },
      {
        id: "session-routine-2",
        user_id: "user-1",
        performed_at: "2026-05-05T10:00:00.000Z",
        notes: null,
        routine_id: "routine-2",
        routine_day_index: 1,
        name: "Travel Routine",
        routine_day_name: "Hotel Gym",
        day_name_override: null,
        duration_seconds: 900,
        status: "completed",
      },
    ],
    session_exercises: [],
    sets: [],
    exercises: [
      {
        id: "exercise-2",
        name: "Bike",
        user_id: null,
        is_global: true,
        primary_muscle: "Cardio",
        equipment: "Bike",
        movement_pattern: "gait",
        measurement_type: "time",
        default_unit: "seconds",
        calories_estimation_method: null,
        image_path: null,
        image_icon_path: null,
        image_howto_path: null,
        slug: "bike",
        how_to_short: null,
        curation_tags: null,
        created_at: "2026-01-01T00:00:00.000Z",
      },
    ],
  } satisfies Record<TableName, Record<string, unknown>[]>;

  const payload = await buildAccountWorkoutExportPayload({
    supabase: createMockSupabase(rows),
    userId: "user-1",
    options: {
      fileType: "json",
      scope: "current_routine",
    },
  });

  assert.deepEqual(payload.routines.map((routine) => routine.id), ["routine-2"]);
  assert.deepEqual(payload.routineDays.map((day) => day.id), ["day-2"]);
  assert.deepEqual(payload.routineDayExercises.map((exercise) => exercise.id), ["routine-exercise-2"]);
  assert.deepEqual(payload.sessions.map((session) => session.id), ["session-routine-2"]);
  assert.equal(payload.metadata.activeRoutineId, "routine-2");
});

test("rejects current routine export when no active routine is set", async () => {
  const rows = {
    profiles: [{
      id: "user-1",
      timezone: "America/New_York",
      active_routine_id: null,
      preferred_weight_unit: "lbs",
      preferred_distance_unit: "mi",
      show_qa_llel_data: false,
      user_number: 101,
      user_kind: "human",
      user_number_assigned_at: "2026-05-01T00:00:00.000Z",
    }],
    routines: [],
    routine_days: [],
    routine_day_exercises: [],
    sessions: [],
    session_exercises: [],
    sets: [],
    exercises: [],
  } satisfies Record<TableName, Record<string, unknown>[]>;

  await assert.rejects(
    () => buildAccountWorkoutExportPayload({
      supabase: createMockSupabase(rows),
      userId: "user-1",
      options: {
        fileType: "json",
        scope: "current_routine",
      },
    }),
    /No active routine is set for this account\./,
  );
});

test("rejects invalid export date windows", async () => {
  const rows = {
    profiles: [],
    routines: [],
    routine_days: [],
    routine_day_exercises: [],
    sessions: [],
    session_exercises: [],
    sets: [],
    exercises: [],
  } satisfies Record<TableName, Record<string, unknown>[]>;

  await assert.rejects(
    () => buildAccountWorkoutExportPayload({
      supabase: createMockSupabase(rows),
      userId: "user-1",
      options: {
        fileType: "json",
        scope: "all",
        dateFrom: "2026-05-09",
        dateTo: "2026-05-01",
      },
    }),
    /From date must be on or before To date\./,
  );
});

test("suggested export date range uses the oldest available account workout date and today", () => {
  assert.deepEqual(
    resolveAccountWorkoutExportSuggestedDateRange({
      today: "2026-05-09",
      oldestSessionPerformedAt: "2026-05-04T10:00:00.000Z",
      oldestRoutineStartDate: "2026-05-01",
    }),
    {
      dateFrom: "2026-05-01",
      dateTo: "2026-05-09",
    },
  );
});

test("suggested export date range falls back to today when no account workout dates exist", () => {
  assert.deepEqual(
    resolveAccountWorkoutExportSuggestedDateRange({
      today: "2026-05-09",
      oldestSessionPerformedAt: null,
      oldestRoutineStartDate: null,
    }),
    {
      dateFrom: "2026-05-09",
      dateTo: "2026-05-09",
    },
  );
});

test("loads suggested export date range from account workout data", async () => {
  const supabase = createMockSupabase({
    profiles: [],
    routines: [
      {
        id: "routine-1",
        user_id: "user-1",
        name: "Atlas Routine",
        cycle_length_days: 4,
        start_date: "2026-05-01",
        timezone: "America/New_York",
        updated_at: "2026-05-04T10:00:00.000Z",
        weight_unit: "lbs",
      },
    ],
    routine_days: [],
    routine_day_exercises: [],
    sessions: [
      {
        id: "session-1",
        user_id: "user-1",
        performed_at: "2026-05-04T10:00:00.000Z",
        notes: null,
        routine_id: "routine-1",
        routine_day_index: 1,
        name: "Atlas Routine",
        routine_day_name: "Lower A",
        day_name_override: null,
        duration_seconds: 1800,
        status: "completed",
      },
    ],
    session_exercises: [],
    sets: [],
    exercises: [],
  } satisfies Record<TableName, Record<string, unknown>[]>);

  const suggested = await getAccountWorkoutExportSuggestedDateRange({
    supabase,
    userId: "user-1",
    today: "2026-05-09",
  });

  assert.deepEqual(suggested, {
    dateFrom: "2026-05-01",
    dateTo: "2026-05-09",
  });
});
