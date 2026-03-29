import assert from "node:assert/strict";
import test from "node:test";
import { loadHistoryDetailRows } from "./history-session-detail-loader.ts";

type SessionExerciseSeed = {
  id: string;
  session_id: string;
  user_id: string | null;
  exercise_id: string;
  position: number;
  performed_index: number | null;
  notes: string | null;
  is_skipped: boolean;
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

function createSupabaseStub(seed: { sessionExercises: SessionExerciseSeed[]; sets: SetSeed[] }) {
  return {
    from(table: "session_exercises" | "sets") {
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

          const rows = seed.sets.filter((row) => {
            const matchesEq = state.filters.every((filter) => String((row as Record<string, unknown>)[filter.key]) === filter.value);
            const matchesIn = !state.inFilter || state.inFilter.values.includes(String((row as Record<string, unknown>)[state.inFilter.key]));
            return matchesEq && matchesIn;
          });
          return { data: rows };
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
  });

  const result = await loadHistoryDetailRows({ supabase, sessionId: "session-1", userId: "user-1", sessionFound: true });
  assert.equal(result.orderedSessionExercises.length, 1);
  assert.equal(result.sets.length, 1);
  assert.equal(result.summary.fallbackPathUsed, false);
  assert.equal(result.summary.sessionExercisesCount, 1);
  assert.equal(result.summary.setsCount, 1);
});

test("falls back to session-id boundary when legacy rows miss user_id, preserving non-zero counts", async () => {
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
  assert.equal(result.summary.fallbackPathUsed, true);
  assert.equal(result.summary.sessionExercisesCount, 1);
  assert.equal(result.summary.setsCount, 1);
});
