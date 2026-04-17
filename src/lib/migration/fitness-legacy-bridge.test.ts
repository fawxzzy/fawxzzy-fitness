import assert from "node:assert/strict";
import test from "node:test";
import {
  importFitnessLegacySnapshot,
  type FitnessLegacySnapshot,
} from "./fitness-legacy-bridge.ts";

type TableName =
  | "profiles"
  | "exercises"
  | "routines"
  | "routine_days"
  | "routine_day_exercises"
  | "sessions"
  | "session_exercises"
  | "sets";

type RecordRow = Record<string, unknown>;

function cloneRow<T extends RecordRow>(row: T): T {
  return { ...row };
}

function createSnapshot(overrides: Partial<FitnessLegacySnapshot>): FitnessLegacySnapshot {
  return {
    metadata: {
      snapshot_version: "fitness-legacy-v1",
      source_app: "fawxzzy-fitness",
      source_backend: "legacy-supabase",
      exported_at: "2026-04-17T00:00:00.000Z",
      canonical_tables: [
        "profiles",
        "exercises",
        "routines",
        "routine_days",
        "routine_day_exercises",
        "sessions",
        "session_exercises",
        "sets",
      ],
      excluded_tables: ["exercise_stats", "session_follow_up_jobs"],
    },
    identity: {
      legacy_user_id: "legacy-user-1",
      email: "fawxzzy@gmail.com",
      phone: null,
      created_at: null,
      last_sign_in_at: null,
      raw_app_meta_data: null,
      raw_user_meta_data: null,
    },
    profile: null,
    exercises: [],
    routines: [],
    routine_days: [],
    routine_day_exercises: [],
    sessions: [],
    session_exercises: [],
    sets: [],
    ...overrides,
  };
}

function createAdminStub(seed?: Partial<Record<TableName, RecordRow[]>>) {
  const tables: Record<TableName, RecordRow[]> = {
    profiles: (seed?.profiles ?? []).map(cloneRow),
    exercises: (seed?.exercises ?? []).map(cloneRow),
    routines: (seed?.routines ?? []).map(cloneRow),
    routine_days: (seed?.routine_days ?? []).map(cloneRow),
    routine_day_exercises: (seed?.routine_day_exercises ?? []).map(cloneRow),
    sessions: (seed?.sessions ?? []).map(cloneRow),
    session_exercises: (seed?.session_exercises ?? []).map(cloneRow),
    sets: (seed?.sets ?? []).map(cloneRow),
  };

  const uniqueConstraints: Partial<Record<TableName, string[][]>> = {
    exercises: [["name"]],
    routine_day_exercises: [["routine_day_id", "position"]],
    session_exercises: [["session_id", "position"]],
  };

  function matchesFilter(row: RecordRow, filter: { type: "eq" | "in" | "or"; key?: string; value?: unknown; values?: unknown[]; expression?: string }) {
    if (filter.type === "eq") {
      return String(row[filter.key ?? ""]) === String(filter.value);
    }

    if (filter.type === "in") {
      return (filter.values ?? []).map(String).includes(String(row[filter.key ?? ""]));
    }

    if (filter.expression === "user_id.is.null,is_global.eq.true") {
      return row.user_id === null || row.is_global === true;
    }

    throw new Error(`Unsupported filter ${filter.expression ?? filter.type}`);
  }

  function buildDuplicateError(table: TableName, columns: string[]) {
    const suffix = columns.join("_");
    return {
      message: `duplicate key value violates unique constraint "${table}_${suffix}_uq"`,
    };
  }

  const admin = {
    tables,
    from(table: TableName) {
      const filters: Array<
        { type: "eq"; key: string; value: unknown }
        | { type: "in"; key: string; values: unknown[] }
        | { type: "or"; expression: string }
      > = [];
      let mode: "select" | "delete" = "select";

      const getFilteredRows = () =>
        tables[table].filter((row) => filters.every((filter) => matchesFilter(row, filter)));

      const runDelete = () => {
        const matchingRows = new Set(getFilteredRows());
        tables[table] = tables[table].filter((row) => !matchingRows.has(row));
        return { error: null };
      };

      const chain = {
        select() {
          mode = "select";
          return chain;
        },
        delete() {
          mode = "delete";
          return chain;
        },
        eq(key: string, value: unknown) {
          filters.push({ type: "eq", key, value });
          return chain;
        },
        in(key: string, values: unknown[]) {
          filters.push({ type: "in", key, values });
          if (mode === "delete") {
            return runDelete() as never;
          }
          return chain;
        },
        or(expression: string) {
          filters.push({ type: "or", expression });
          return chain;
        },
        async upsert(payload: RecordRow | RecordRow[], options?: { onConflict?: string }) {
          const rows = Array.isArray(payload) ? payload.map(cloneRow) : [cloneRow(payload)];
          const existingRows = tables[table].map(cloneRow);
          const onConflict = options?.onConflict ?? "id";
          const conflictColumns = onConflict.split(",").map((value) => value.trim());
          const nextRows = existingRows;

          const getConstraintError = () => {
            for (const columns of uniqueConstraints[table] ?? []) {
              const seen = new Set<string>();
              for (const row of nextRows) {
                const key = columns.map((column) => String(row[column])).join("\u0000");
                if (seen.has(key)) {
                  return buildDuplicateError(table, columns);
                }
                seen.add(key);
              }
            }

            return null;
          };

          for (const row of rows) {
            const existingIndex = nextRows.findIndex((candidate) =>
              conflictColumns.every((column) => String(candidate[column]) === String(row[column])),
            );

            if (existingIndex >= 0) {
              nextRows[existingIndex] = { ...nextRows[existingIndex], ...row };
            } else {
              nextRows.push(row);
            }

            const constraintError = getConstraintError();
            if (constraintError) {
              return { error: constraintError };
            }
          }

          tables[table] = nextRows;
          return { error: null };
        },
        async then(resolve: (value: { data: RecordRow[]; error: null }) => unknown) {
          const data = getFilteredRows().map(cloneRow);
          return resolve({ data, error: null });
        },
      };

      return chain;
    },
  };

  return admin;
}

test("resolves global exercises by normalized name across the full global catalog", async () => {
  const admin = createAdminStub({
    exercises: [{
      id: "existing-global-1",
      name: "Push Up",
      user_id: null,
      is_global: true,
    }],
  });
  const snapshot = createSnapshot({
    exercises: [{
      legacy_exercise_id: "legacy-global-1",
      legacy_owner_user_id: null,
      owner_scope: "global",
      normalized_name: "push up",
      name: "Push   Up",
      is_global: true,
      primary_muscle: null,
      primary_muscles: null,
      secondary_muscles: null,
      equipment: null,
      movement_pattern: null,
      measurement_type: "reps",
      default_unit: "reps",
      calories_estimation_method: null,
      how_to_short: null,
      image_howto_path: null,
      image_muscles_path: null,
      created_at: null,
    }],
  });

  const summary = await importFitnessLegacySnapshot({
    admin,
    newUserId: "new-user-1",
    snapshot,
  });

  assert.equal(summary.resolvedGlobalExercises, 1);
  assert.equal(summary.createdGlobalExercises, 0);
  assert.equal(admin.tables.exercises.length, 1);
  assert.equal(admin.tables.exercises[0].id, "existing-global-1");
});

test("normalizes duplicate session exercise positions before import", async () => {
  const admin = createAdminStub({
    exercises: [{
      id: "exercise-1",
      name: "Bench Press",
      user_id: null,
      is_global: true,
    }],
  });
  const snapshot = createSnapshot({
    exercises: [{
      legacy_exercise_id: "exercise-1",
      legacy_owner_user_id: null,
      owner_scope: "global",
      normalized_name: "bench press",
      name: "Bench Press",
      is_global: true,
      primary_muscle: null,
      primary_muscles: null,
      secondary_muscles: null,
      equipment: null,
      movement_pattern: null,
      measurement_type: "reps",
      default_unit: "reps",
      calories_estimation_method: null,
      how_to_short: null,
      image_howto_path: null,
      image_muscles_path: null,
      created_at: null,
    }],
    sessions: [{
      legacy_session_id: "session-1",
      legacy_routine_id: null,
      performed_at: "2026-04-17T00:00:00.000Z",
      routine_day_index: null,
      name: "Workout",
      routine_day_name: null,
      day_name_override: null,
      duration_seconds: null,
      status: "completed",
      notes: null,
    }],
    session_exercises: [
      {
        legacy_session_exercise_id: "session-exercise-1",
        legacy_session_id: "session-1",
        legacy_exercise_id: "exercise-1",
        legacy_routine_day_exercise_id: null,
        position: 0,
        performed_index: 0,
        is_skipped: false,
        notes: null,
        measurement_type: "reps",
        default_unit: "reps",
        target_reps: null,
        target_reps_min: null,
        target_reps_max: null,
        target_sets_min: null,
        target_sets_max: null,
        target_weight: null,
        target_weight_min: null,
        target_weight_max: null,
        target_weight_unit: null,
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
      },
      {
        legacy_session_exercise_id: "session-exercise-2",
        legacy_session_id: "session-1",
        legacy_exercise_id: "exercise-1",
        legacy_routine_day_exercise_id: null,
        position: 0,
        performed_index: 1,
        is_skipped: false,
        notes: null,
        measurement_type: "reps",
        default_unit: "reps",
        target_reps: null,
        target_reps_min: null,
        target_reps_max: null,
        target_sets_min: null,
        target_sets_max: null,
        target_weight: null,
        target_weight_min: null,
        target_weight_max: null,
        target_weight_unit: null,
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
      },
    ],
  });

  await importFitnessLegacySnapshot({
    admin,
    newUserId: "new-user-1",
    snapshot,
  });

  assert.deepEqual(
    admin.tables.session_exercises
      .filter((row) => row.session_id === "session-1")
      .map((row) => row.position),
    [0, 1],
  );
});

test("allowMerge deletes the target user's dependent rows before rewriting reordered session positions", async () => {
  const admin = createAdminStub({
    exercises: [{
      id: "exercise-1",
      name: "Bench Press",
      user_id: null,
      is_global: true,
    }],
  });

  const firstSnapshot = createSnapshot({
    exercises: [{
      legacy_exercise_id: "exercise-1",
      legacy_owner_user_id: null,
      owner_scope: "global",
      normalized_name: "bench press",
      name: "Bench Press",
      is_global: true,
      primary_muscle: null,
      primary_muscles: null,
      secondary_muscles: null,
      equipment: null,
      movement_pattern: null,
      measurement_type: "reps",
      default_unit: "reps",
      calories_estimation_method: null,
      how_to_short: null,
      image_howto_path: null,
      image_muscles_path: null,
      created_at: null,
    }],
    sessions: [{
      legacy_session_id: "session-1",
      legacy_routine_id: null,
      performed_at: "2026-04-17T00:00:00.000Z",
      routine_day_index: null,
      name: "Workout",
      routine_day_name: null,
      day_name_override: null,
      duration_seconds: null,
      status: "completed",
      notes: null,
    }],
    session_exercises: [
      {
        legacy_session_exercise_id: "session-exercise-1",
        legacy_session_id: "session-1",
        legacy_exercise_id: "exercise-1",
        legacy_routine_day_exercise_id: null,
        position: 0,
        performed_index: 0,
        is_skipped: false,
        notes: null,
        measurement_type: "reps",
        default_unit: "reps",
        target_reps: null,
        target_reps_min: null,
        target_reps_max: null,
        target_sets_min: null,
        target_sets_max: null,
        target_weight: null,
        target_weight_min: null,
        target_weight_max: null,
        target_weight_unit: null,
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
      },
      {
        legacy_session_exercise_id: "session-exercise-2",
        legacy_session_id: "session-1",
        legacy_exercise_id: "exercise-1",
        legacy_routine_day_exercise_id: null,
        position: 0,
        performed_index: 1,
        is_skipped: false,
        notes: null,
        measurement_type: "reps",
        default_unit: "reps",
        target_reps: null,
        target_reps_min: null,
        target_reps_max: null,
        target_sets_min: null,
        target_sets_max: null,
        target_weight: null,
        target_weight_min: null,
        target_weight_max: null,
        target_weight_unit: null,
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
      },
    ],
  });

  await importFitnessLegacySnapshot({
    admin,
    newUserId: "new-user-1",
    snapshot: firstSnapshot,
  });

  const secondSnapshot = {
    ...firstSnapshot,
    session_exercises: [
      firstSnapshot.session_exercises[1],
      firstSnapshot.session_exercises[0],
    ],
  };

  await importFitnessLegacySnapshot({
    admin,
    newUserId: "new-user-1",
    snapshot: secondSnapshot,
    allowMerge: true,
  });

  assert.deepEqual(
    admin.tables.session_exercises
      .filter((row) => row.user_id === "new-user-1")
      .map((row) => row.id),
    ["session-exercise-2", "session-exercise-1"],
  );
});
