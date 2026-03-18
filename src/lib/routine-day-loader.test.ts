import test from "node:test";
import assert from "node:assert/strict";

import { getRunnableDayState, getSessionStartErrorMessage, normalizeRunnableDayExercises } from "./runnable-day";
import { loadCanonicalExerciseCatalog } from "./routine-day-loader";

type ExerciseRow = {
  id: string;
  exercise_id?: string | null;
  name: string;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | null;
  default_unit?: string | null;
};

function createSupabaseStub(exercises: ExerciseRow[]) {
  return {
    from(table: string) {
      assert.equal(table, "exercises");
      return {
        select() {
          return {
            in(column: string, values: string[]) {
              const filtered = exercises.filter((exercise) => values.includes(column === "id" ? exercise.id : column === "exercise_id" ? (exercise.exercise_id ?? "") : exercise.name));
              return Promise.resolve({ data: filtered, error: null });
            },
          };
        },
      };
    },
  };
}

test("loadCanonicalExerciseCatalog keeps canonical ids runnable", async () => {
  const canonicalId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const { canonicalExerciseIdByRawId, canonicalExerciseIdSet } = await loadCanonicalExerciseCatalog({
    supabase: createSupabaseStub([{ id: canonicalId, name: "Back Squat" }]) as never,
    exercises: [{ exercise_id: canonicalId } as never],
  });

  assert.equal(canonicalExerciseIdByRawId.get(canonicalId), canonicalId);
  assert.equal(canonicalExerciseIdSet.has(canonicalId), true);
});

test("loadCanonicalExerciseCatalog resolves alias ids stored in exercises.exercise_id", async () => {
  const canonicalId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const legacyAliasId = "legacy-alias-id";
  const { canonicalExerciseIdByRawId } = await loadCanonicalExerciseCatalog({
    supabase: createSupabaseStub([{ id: canonicalId, exercise_id: legacyAliasId, name: "Custom Pulldown" }]) as never,
    exercises: [{ exercise_id: legacyAliasId } as never],
  });

  assert.equal(canonicalExerciseIdByRawId.get(legacyAliasId), canonicalId);
});

test("loadCanonicalExerciseCatalog resolves legacy placeholder ids by exercise name", async () => {
  const legacyBenchPressId = "11111111-1111-1111-1111-111111111111";
  const canonicalId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const { canonicalExerciseIdByRawId } = await loadCanonicalExerciseCatalog({
    supabase: createSupabaseStub([{ id: canonicalId, name: "Bench Press" }]) as never,
    exercises: [{ exercise_id: legacyBenchPressId } as never],
  });

  assert.equal(canonicalExerciseIdByRawId.get(legacyBenchPressId), canonicalId);
});

test("normalizeRunnableDayExercises keeps valid canonical, alias-resolved, fallback-valid, and custom rows while rejecting sentinel placeholders", async () => {
  const legacyBenchPressId = "11111111-1111-1111-1111-111111111111";
  const sentinelId = "66666666-6666-6666-6666-666666666666";
  const catalog = await loadCanonicalExerciseCatalog({
    supabase: createSupabaseStub([
      { id: "canonical-bench", name: "Bench Press", measurement_type: "reps", default_unit: "reps" },
      { id: "canonical-custom", exercise_id: "alias-custom", name: "My Cable Row", measurement_type: "reps", default_unit: "reps" },
      { id: "canonical-direct", name: "Deadlift", measurement_type: "reps", default_unit: "reps" },
    ]) as never,
    exercises: [
      { exercise_id: legacyBenchPressId } as never,
      { exercise_id: "alias-custom" } as never,
      { exercise_id: "canonical-direct" } as never,
      { exercise_id: sentinelId } as never,
      { exercise_id: "missing-id" } as never,
      { exercise_id: "orphan-custom" } as never,
    ],
  });

  const normalizedExercises = [
    { id: "row-1", exercise_id: catalog.canonicalExerciseIdByRawId.get(legacyBenchPressId) ?? legacyBenchPressId, position: 1, notes: null },
    { id: "row-2", exercise_id: catalog.canonicalExerciseIdByRawId.get("alias-custom") ?? "alias-custom", position: 2, notes: null },
    { id: "row-3", exercise_id: catalog.canonicalExerciseIdByRawId.get("canonical-direct") ?? "canonical-direct", position: 3, notes: null },
    { id: "row-4", exercise_id: sentinelId, position: 4, notes: null },
    { id: "row-5", exercise_id: "missing-id", position: 5, notes: null },
    { id: "row-6", exercise_id: "orphan-custom", position: 6, notes: null, measurement_type: "reps" as const, target_sets: 3 },
  ];

  const { runnableExercises, invalidExercises } = normalizeRunnableDayExercises(normalizedExercises, catalog.canonicalExerciseIdSet, {
    getExerciseName: (exercise) => exercise.id === "row-6" ? "Garage Floor Press" : null,
    logSource: "routine-day-loader.test",
  });

  assert.deepEqual(
    runnableExercises.map((exercise) => exercise.exercise_id),
    ["canonical-bench", "canonical-custom", "canonical-direct", "orphan-custom"],
  );
  assert.deepEqual(
    invalidExercises.map((exercise) => ({ id: exercise.id, reason: exercise.reason })),
    [
      { id: "row-4", reason: "sentinel" },
      { id: "row-5", reason: "missing_canonical" },
    ],
  );
});

test("getRunnableDayState treats mixed valid and invalid exercise days as partial and still runnable", () => {
  assert.equal(getRunnableDayState({ isRest: false, runnableExerciseCount: 2, invalidExerciseCount: 1 }), "partial");
  assert.equal(getRunnableDayState({ isRest: false, runnableExerciseCount: 2, invalidExerciseCount: 0 }), "runnable");
  assert.equal(getRunnableDayState({ isRest: false, runnableExerciseCount: 0, invalidExerciseCount: 2 }), "empty");
});

test("getSessionStartErrorMessage only blocks fully invalid or empty days", () => {
  assert.equal(
    getSessionStartErrorMessage({ isRest: false, runnableExerciseCount: 1, invalidExerciseCount: 2 }),
    null,
  );
  assert.equal(
    getSessionStartErrorMessage({ isRest: false, runnableExerciseCount: 0, invalidExerciseCount: 2 }),
    "This day has invalid exercises. Edit the day before starting a workout.",
  );
});


test("isRunnableDayState treats partial days as runnable", async () => {
  const { isRunnableDayState } = await import("./runnable-day");

  assert.equal(isRunnableDayState("partial"), true);
  assert.equal(isRunnableDayState("runnable"), true);
  assert.equal(isRunnableDayState("empty"), false);
});

test("buildCanonicalDaySummaries keeps partial days startable while fully invalid days stay blocked", async () => {
  const canonicalId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const supabase = createSupabaseStub([{ id: canonicalId, name: "Pull Up", measurement_type: "reps", default_unit: "reps" }]) as never;
  const routineDays = [
    { id: "day-partial", user_id: "user-1", routine_id: "routine-1", day_index: 1, name: "Pull", is_rest: false, notes: null },
    { id: "day-invalid", user_id: "user-1", routine_id: "routine-1", day_index: 2, name: "Broken", is_rest: false, notes: null },
  ] as never;
  const allDayExercises = [
    { id: "ex-valid", user_id: "user-1", routine_day_id: "day-partial", exercise_id: canonicalId, position: 1, notes: null, target_sets: 3, measurement_type: "reps", default_unit: "reps" },
    { id: "ex-invalid", user_id: "user-1", routine_day_id: "day-partial", exercise_id: "missing-id", position: 2, notes: null },
    { id: "ex-only-invalid", user_id: "user-1", routine_day_id: "day-invalid", exercise_id: "missing-id", position: 1, notes: null },
  ] as never;

  const { buildCanonicalDaySummaries } = await import("./routine-day-loader");
  const { summaries } = await buildCanonicalDaySummaries({ supabase, routineDays, allDayExercises });
  const partialDay = summaries.find((summary) => summary.day.id === "day-partial");
  const invalidDay = summaries.find((summary) => summary.day.id === "day-invalid");

  assert.ok(partialDay);
  assert.equal(partialDay.state, "partial");
  assert.equal(partialDay.runnableExercises.length, 1);
  assert.equal(
    getSessionStartErrorMessage({
      isRest: partialDay.day.is_rest,
      runnableExerciseCount: partialDay.runnableExercises.length,
      invalidExerciseCount: partialDay.invalidExercises.length,
    }),
    null,
  );

  assert.ok(invalidDay);
  assert.equal(invalidDay.state, "empty");
  assert.equal(invalidDay.runnableExercises.length, 0);
  assert.equal(
    getSessionStartErrorMessage({
      isRest: invalidDay.day.is_rest,
      runnableExerciseCount: invalidDay.runnableExercises.length,
      invalidExerciseCount: invalidDay.invalidExercises.length,
    }),
    "This day has invalid exercises. Edit the day before starting a workout.",
  );
});
