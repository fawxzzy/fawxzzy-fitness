import assert from "node:assert/strict";
import test from "node:test";
import { loadHistoryDetailRows, resolveHistoryExerciseName } from "./history-session-detail-loader.ts";

type SessionExerciseSeed = {
  id: string;
  session_id: string;
  user_id: string | null;
  exercise_id: string;
  routine_day_exercise_id?: string | null;
  routine_day_exercise?: { notes?: string | null } | Array<{ notes?: string | null }> | null;
  position: number;
  performed_index: number | null;
  notes: string | null;
  copilot_feedback_note?: string | null;
  is_skipped: boolean;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  default_unit?: string | null;
};

type SetSeed = {
  id: string;
  session_exercise_id: string;
  user_id: string | null;
  set_index: number;
  weight: number;
  reps: number;
  is_warmup: boolean;
  notes: string | null;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: "mi" | "km" | "m" | null;
  calories: number | null;
  rpe: number | null;
  weight_unit: "lbs" | "kg" | null;
};

type ExerciseSeed = {
  id: string;
  name: string | null;
  slug: string | null;
  image_path: string | null;
  image_icon_path: string | null;
  image_howto_path: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  default_unit: string | null;
};

function createSupabaseStub(seed: { sessionExercises: SessionExerciseSeed[]; sets: SetSeed[]; exercises?: ExerciseSeed[] }) {
  return {
    from(table: "session_exercises" | "sets" | "exercises") {
      const state = {
        table,
        filters: [] as Array<{ key: string; value: string }>,
        inFilter: null as { key: string; values: string[] } | null,
      };

      const chain = {
        select() {
          return chain;
        },
        eq(key: string, value: string) {
          state.filters.push({ key, value });
          return chain;
        },
        in(key: string, values: string[]) {
          state.inFilter = { key, values };
          return chain;
        },
        async order() {
          if (state.table === "session_exercises") {
            const rows = seed.sessionExercises.filter((row) => state.filters.every((filter) => String((row as Record<string, unknown>)[filter.key]) === filter.value));
            return { data: rows };
          }

          if (state.table === "exercises") {
            const rows = (seed.exercises ?? []).filter((row) => {
              const matchesEq = state.filters.every((filter) => String((row as Record<string, unknown>)[filter.key]) === filter.value);
              const matchesIn = !state.inFilter || state.inFilter.values.includes(String((row as Record<string, unknown>)[state.inFilter.key]));
              return matchesEq && matchesIn;
            });
            return { data: rows };
          }

          const rows = seed.sets.filter((row) => {
            const matchesEq = state.filters.every((filter) => String((row as Record<string, unknown>)[filter.key]) === filter.value);
            const matchesIn = !state.inFilter || state.inFilter.values.includes(String((row as Record<string, unknown>)[state.inFilter.key]));
            return matchesEq && matchesIn;
          });
          return { data: rows };
        },
        async then(resolve: (value: { data: ExerciseSeed[] }) => unknown) {
          if (state.table !== "exercises") {
            return resolve({ data: [] });
          }
          const rows = (seed.exercises ?? []).filter((row) => {
            const matchesEq = state.filters.every((filter) => String((row as Record<string, unknown>)[filter.key]) === filter.value);
            const matchesIn = !state.inFilter || state.inFilter.values.includes(String((row as Record<string, unknown>)[state.inFilter.key]));
            return matchesEq && matchesIn;
          });
          return resolve({ data: rows });
        },
      };

      return chain;
    },
  };
}

test("loads strict user-scoped rows when user_id columns are populated", async () => {
  const supabase = createSupabaseStub({
    sessionExercises: [{
      id: "se-1",
      session_id: "session-1",
      user_id: "user-1",
      exercise_id: "exercise-a",
      position: 1,
      performed_index: 0,
      notes: null,
      is_skipped: false,
    }],
    sets: [{
      id: "set-1",
      session_exercise_id: "se-1",
      user_id: "user-1",
      set_index: 0,
      weight: 135,
      reps: 8,
      is_warmup: false,
      notes: null,
      duration_seconds: null,
      distance: null,
      distance_unit: null,
      calories: null,
      rpe: null,
      weight_unit: "lbs",
    }],
    exercises: [{
      id: "exercise-a",
      name: "Bench Press",
      slug: "bench-press",
      image_path: null,
      image_icon_path: null,
      image_howto_path: null,
      measurement_type: "reps",
      default_unit: null,
    }],
  });

  const result = await loadHistoryDetailRows({ supabase, sessionId: "session-1", userId: "user-1", sessionFound: true });
  assert.equal(result.orderedSessionExercises.length, 1);
  assert.equal(result.sets.length, 1);
  assert.equal(result.summary.fallbackPathUsed, false);
  assert.equal(result.summary.sessionExercisesCount, 1);
  assert.equal(result.summary.setsCount, 1);
  assert.equal(result.exerciseMetadataById.get("exercise-a")?.name, "Bench Press");
});

test("uses authorized session boundary when legacy rows miss user_id, preserving non-zero counts", async () => {
  const supabase = createSupabaseStub({
    sessionExercises: [{
      id: "se-legacy",
      session_id: "session-legacy",
      user_id: null,
      exercise_id: "exercise-legacy",
      position: 1,
      performed_index: 0,
      notes: null,
      is_skipped: false,
    }],
    sets: [{
      id: "set-legacy",
      session_exercise_id: "se-legacy",
      user_id: null,
      set_index: 0,
      weight: 95,
      reps: 10,
      is_warmup: false,
      notes: null,
      duration_seconds: null,
      distance: null,
      distance_unit: null,
      calories: null,
      rpe: null,
      weight_unit: "lbs",
    }],
  });

  const result = await loadHistoryDetailRows({ supabase, sessionId: "session-legacy", userId: "user-1", sessionFound: true });

  assert.equal(result.orderedSessionExercises.length, 1);
  assert.equal(result.sets.length, 1);
  assert.equal(result.summary.fallbackPathUsed, false);
  assert.equal(result.summary.sessionExercisesCount, 1);
  assert.equal(result.summary.setsCount, 1);
});

test("uses authorized session boundary when legacy ownership drift would only partially match strict user filters", async () => {
  const supabase = createSupabaseStub({
    sessionExercises: [
      {
        id: "se-owned",
        session_id: "session-partial-legacy",
        user_id: "user-1",
        exercise_id: "exercise-owned",
        position: 1,
        performed_index: 0,
        notes: null,
        is_skipped: false,
      },
      {
        id: "se-legacy",
        session_id: "session-partial-legacy",
        user_id: null,
        exercise_id: "exercise-legacy",
        position: 2,
        performed_index: 1,
        notes: null,
        is_skipped: false,
      },
    ],
    sets: [
      {
        id: "set-owned",
        session_exercise_id: "se-owned",
        user_id: "user-1",
        set_index: 0,
        weight: 135,
        reps: 8,
        is_warmup: false,
        notes: null,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        rpe: null,
        weight_unit: "lbs",
      },
      {
        id: "set-legacy",
        session_exercise_id: "se-legacy",
        user_id: null,
        set_index: 0,
        weight: 95,
        reps: 12,
        is_warmup: false,
        notes: null,
        duration_seconds: null,
        distance: null,
        distance_unit: null,
        calories: null,
        rpe: null,
        weight_unit: "lbs",
      },
    ],
  });

  const result = await loadHistoryDetailRows({ supabase, sessionId: "session-partial-legacy", userId: "user-1", sessionFound: true });

  assert.equal(result.orderedSessionExercises.length, 2);
  assert.equal(result.sets.length, 2);
  assert.equal(result.summary.strictSessionExercisesCount, 2);
  assert.equal(result.summary.relaxedSessionExercisesCount, 2);
  assert.equal(result.summary.strictSetsCount, 2);
  assert.equal(result.summary.relaxedSetsCount, 2);
  assert.equal(result.summary.fallbackPathUsed, false);
});

test("keeps unverified callers on strict user-scoped detail rows", async () => {
  const supabase = createSupabaseStub({
    sessionExercises: [{
      id: "se-legacy-unverified",
      session_id: "session-unverified",
      user_id: null,
      exercise_id: "exercise-legacy",
      position: 1,
      performed_index: 0,
      notes: null,
      is_skipped: false,
    }],
    sets: [{
      id: "set-legacy-unverified",
      session_exercise_id: "se-legacy-unverified",
      user_id: null,
      set_index: 0,
      weight: 95,
      reps: 10,
      is_warmup: false,
      notes: null,
      duration_seconds: null,
      distance: null,
      distance_unit: null,
      calories: null,
      rpe: null,
      weight_unit: "lbs",
    }],
  });

  const result = await loadHistoryDetailRows({ supabase, sessionId: "session-unverified", userId: "user-1", sessionFound: false });

  assert.equal(result.orderedSessionExercises.length, 0);
  assert.equal(result.sets.length, 0);
  assert.equal(result.summary.fallbackPathUsed, false);
});

test("keeps non-zero detail rows even when exercise metadata is absent", async () => {
  const supabase = createSupabaseStub({
    sessionExercises: [{
      id: "se-no-meta",
      session_id: "session-no-meta",
      user_id: "user-1",
      exercise_id: "exercise-missing",
      position: 1,
      performed_index: 0,
      notes: null,
      is_skipped: false,
      measurement_type: "reps",
      default_unit: null,
    }],
    sets: [],
    exercises: [],
  });

  const result = await loadHistoryDetailRows({ supabase, sessionId: "session-no-meta", userId: "user-1", sessionFound: true });

  assert.equal(result.orderedSessionExercises.length, 1);
  assert.equal(result.summary.sessionExercisesCount, 1);
  assert.equal(result.exerciseMetadataById.size, 0);
});

test("suppresses routine-plan notes that were inherited into session exercise notes", async () => {
  const supabase = createSupabaseStub({
    sessionExercises: [
      {
        id: "se-inherited",
        session_id: "session-notes",
        user_id: "user-1",
        exercise_id: "exercise-a",
        routine_day_exercise_id: "rde-1",
        routine_day_exercise: { notes: "Three-minute warm-up." },
        position: 1,
        performed_index: 0,
        notes: " Three-minute warm-up. ",
        is_skipped: false,
      },
      {
        id: "se-manual",
        session_id: "session-notes",
        user_id: "user-1",
        exercise_id: "exercise-b",
        routine_day_exercise_id: "rde-2",
        routine_day_exercise: { notes: "Plan cue." },
        position: 2,
        performed_index: 1,
        notes: "Felt strong after warm-up.",
        is_skipped: false,
      },
    ],
    sets: [],
  });

  const result = await loadHistoryDetailRows({ supabase, sessionId: "session-notes", userId: "user-1", sessionFound: true });

  assert.equal(result.orderedSessionExercises[0]?.notes, null);
  assert.equal(result.orderedSessionExercises[1]?.notes, "Felt strong after warm-up.");
});

test("preserves saved copilot feedback notes on session exercise rows", async () => {
  const supabase = createSupabaseStub({
    sessionExercises: [{
      id: "se-feedback",
      session_id: "session-feedback",
      user_id: "user-1",
      exercise_id: "exercise-a",
      position: 1,
      performed_index: 0,
      notes: null,
      copilot_feedback_note: "Too hard after the second interval.",
      is_skipped: false,
    }],
    sets: [],
  });

  const result = await loadHistoryDetailRows({ supabase, sessionId: "session-feedback", userId: "user-1", sessionFound: true });

  assert.equal(result.orderedSessionExercises[0]?.copilot_feedback_note, "Too hard after the second interval.");
});

test("does not zero out exercises when only some exercise metadata resolves", async () => {
  const supabase = createSupabaseStub({
    sessionExercises: [
      {
        id: "se-1",
        session_id: "session-partial-meta",
        user_id: "user-1",
        exercise_id: "exercise-resolved",
        position: 1,
        performed_index: 0,
        notes: null,
        is_skipped: false,
      },
      {
        id: "se-2",
        session_id: "session-partial-meta",
        user_id: "user-1",
        exercise_id: "exercise-missing",
        position: 2,
        performed_index: 1,
        notes: null,
        is_skipped: false,
      },
    ],
    sets: [],
    exercises: [{
      id: "exercise-resolved",
      name: "Row",
      slug: "row",
      image_path: null,
      image_icon_path: null,
      image_howto_path: null,
      measurement_type: "reps",
      default_unit: null,
    }],
  });

  const result = await loadHistoryDetailRows({ supabase, sessionId: "session-partial-meta", userId: "user-1", sessionFound: true });

  assert.equal(result.orderedSessionExercises.length, 2);
  assert.equal(result.summary.sessionExercisesCount, 2);
  assert.equal(result.exerciseMetadataById.size, 1);
  assert.equal(result.exerciseMetadataById.has("exercise-missing"), false);
});

test("resolves history exercise name from metadata first", () => {
  assert.equal(resolveHistoryExerciseName({
    metadataName: "Bench Press",
    rowExerciseName: "Legacy Bench",
    rowName: "Bench",
    mapExerciseName: "Bench Alt",
  }), "Bench Press");
});

test("resolves history exercise name from fallback row label when metadata is missing", () => {
  assert.equal(resolveHistoryExerciseName({
    metadataName: null,
    rowExerciseName: "Legacy Incline Press",
    rowName: "Incline Press",
    mapExerciseName: "Incline Press Map",
  }), "Legacy Incline Press");
});

test("resolves history exercise name to safe fallback when no labels exist", () => {
  assert.equal(resolveHistoryExerciseName({
    metadataName: null,
    rowExerciseName: null,
    rowName: null,
    mapExerciseName: null,
  }), "Exercise");
});

test("normalizes exercise metadata map keys and preserves full row count with missing metadata", async () => {
  const supabase = createSupabaseStub({
    sessionExercises: [
      {
        id: "se-1",
        session_id: "session-key-normalization",
        user_id: "user-1",
        exercise_id: "101",
        position: 1,
        performed_index: 0,
        notes: null,
        is_skipped: false,
      },
      {
        id: "se-2",
        session_id: "session-key-normalization",
        user_id: "user-1",
        exercise_id: "102",
        position: 2,
        performed_index: 1,
        notes: null,
        is_skipped: false,
      },
    ],
    sets: [],
    exercises: [{
      id: "101",
      name: "Resolved Name",
      slug: "resolved-name",
      image_path: null,
      image_icon_path: null,
      image_howto_path: null,
      measurement_type: "reps",
      default_unit: null,
    }],
  });

  const result = await loadHistoryDetailRows({ supabase, sessionId: "session-key-normalization", userId: "user-1", sessionFound: true });

  assert.equal(result.orderedSessionExercises.length, 2);
  assert.equal(result.summary.sessionExercisesCount, 2);
  assert.equal(result.exerciseMetadataById.get("101")?.name, "Resolved Name");
  assert.equal(result.exerciseMetadataById.has("102"), false);
});
