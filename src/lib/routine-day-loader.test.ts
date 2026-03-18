import test from "node:test";
import assert from "node:assert/strict";

import { normalizeRunnableDayExercises } from "./runnable-day";
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
