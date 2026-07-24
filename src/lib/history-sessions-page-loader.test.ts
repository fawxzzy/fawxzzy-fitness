import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeHistoryCursor,
  encodeHistoryCursor,
  loadHistorySessionsPageData,
  resolveHistorySessionsRouteState,
} from "./history-sessions-page-loader.ts";

type QueryState = {
  filters: Array<{ key: string; value: unknown }>;
  inFilters: Array<{ key: string; values: unknown[] }>;
  orderBy: Array<{ key: string; ascending: boolean }>;
  limitValue: number | null;
  orValue: string | null;
};

type QueryHandler = (state: QueryState) => Promise<{ data: unknown[] | null; error?: { message?: string | null } | null }>;

function createSupabaseStub(handlers: Record<string, QueryHandler>) {
  return {
    from(table: string) {
      const state: QueryState = {
        filters: [],
        inFilters: [],
        orderBy: [],
        limitValue: null,
        orValue: null,
      };

      const chain = {
        select() {
          return chain;
        },
        eq(key: string, value: unknown) {
          state.filters.push({ key, value });
          return chain;
        },
        in(key: string, values: unknown[]) {
          state.inFilters.push({ key, values });
          return chain;
        },
        order(key: string, options?: { ascending?: boolean }) {
          state.orderBy.push({ key, ascending: options?.ascending ?? true });
          return chain;
        },
        limit(value: number) {
          state.limitValue = value;
          return chain;
        },
        or(value: string) {
          state.orValue = value;
          return chain;
        },
        then(resolve: (value: { data: unknown[] | null; error?: { message?: string | null } | null }) => unknown, reject?: (reason: unknown) => unknown) {
          const handler = handlers[table];
          if (!handler) {
            return Promise.resolve({ data: [] }).then(resolve, reject);
          }

          return handler(state).then(resolve, reject);
        },
      };

      return chain;
    },
  };
}

test("history sessions loader returns session content on the happy path", async () => {
  const supabase = createSupabaseStub({
    sessions: async () => ({
      data: [{
        id: "session-1",
        user_id: "user-1",
        performed_at: "2026-04-20T12:00:00.000Z",
        notes: "Strong day",
        routine_id: "routine-1",
        routine_day_index: 1,
        name: "Lower Rotation",
        routine_day_name: null,
        day_name_override: null,
        duration_seconds: 1860,
        status: "completed",
      }],
    }),
    profiles: async () => ({ data: [{ timezone: "America/New_York", active_routine_id: "routine-1" }] }),
    routines: async () => ({ data: [{ id: "routine-1", name: "Lower Rotation", start_date: "2026-04-20", cycle_length_days: 1, timezone: "America/New_York" }] }),
    routine_days: async () => ({ data: [{ routine_id: "routine-1", day_index: 1, name: "Primer", is_rest: false }] }),
    session_exercises: async () => ({
      data: [{
        id: "session-exercise-1",
        session_id: "session-1",
        exercise_id: "exercise-1",
        is_skipped: false,
        copilot_feedback_signal: "too_hard",
        copilot_feedback_note: "Felt heavy after the third set.",
        copilot_feedback_effort: 8,
      }],
    }),
    progression_events: async () => ({
      data: [
        {
          id: "event-1",
          user_id: "user-1",
          routine_id: "routine-1",
          routine_day_exercise_id: "rde-1",
          exercise_id: "exercise-1",
          event_type: "promotion_applied",
          from_target: {},
          to_target: {},
          method: "double_progression",
          vector: "reps",
          step: null,
          reason: "",
          source_session_id: null,
          created_at: "2026-04-20T12:30:00.000Z",
        },
        {
          id: "event-2",
          user_id: "user-1",
          routine_id: "routine-1",
          routine_day_exercise_id: "rde-1",
          exercise_id: "exercise-1",
          event_type: "manual_target_change",
          from_target: {},
          to_target: {},
          method: "manual",
          vector: "none",
          step: null,
          reason: "",
          source_session_id: null,
          created_at: "2026-04-20T12:35:00.000Z",
        },
        {
          id: "event-3",
          user_id: "user-1",
          routine_id: "routine-1",
          routine_day_exercise_id: "rde-1",
          exercise_id: "exercise-1",
          event_type: "deload_applied",
          from_target: {},
          to_target: {},
          method: "double_progression",
          vector: "reps",
          step: null,
          reason: "",
          source_session_id: null,
          created_at: "2026-04-20T12:40:00.000Z",
        },
      ],
    }),
    sets: async (state) => {
      if (state.inFilters.some((entry) => entry.key === "session_exercise_id")) {
        return {
          data: [{
            session_exercise_id: "session-exercise-1",
            weight: 225,
            reps: 5,
            weight_unit: "lbs",
          }],
        };
      }

      return {
        data: [{
          set_index: 0,
          weight: 225,
          reps: 5,
          session_exercise: {
            session_id: "session-1",
            exercise_id: "exercise-1",
            session: { performed_at: "2026-04-20T12:00:00.000Z", status: "completed" },
          },
        }],
      };
    },
    exercises: async () => ({ data: [{ id: "exercise-1", name: "Back Squat" }] }),
  });

  const result = await loadHistorySessionsPageData({
    supabase,
    userId: "user-1",
    now: "2026-04-22T16:00:00.000Z",
    searchParams: { selected: "session-1" },
    logger: { warn() {} },
  });

  assert.equal(result.subtitle, "1 completed sessions");
  assert.equal(result.selectedSessionId, "session-1");
  assert.equal(result.sessionItems.length, 1);
  assert.equal(result.sessionItems[0]?.dayTitle, "Primer");
  assert.equal(result.sessionItems[0]?.exerciseCount, 1);
  assert.equal(result.sessionItems[0]?.setCount, 1);
  assert.equal(result.scopeSummary.completedWorkoutCount, 1);
  assert.equal(result.scopeSummary.progressionSummary.promotionCount, 1);
  assert.equal(result.sessionItems[0]?.progressionSummary?.promotionCount, 1);
  assert.equal(result.sessionItems[0]?.progressionSummary?.manualChangeCount, 1);
  assert.equal(result.sessionItems[0]?.progressionSummary?.deloadCount, 1);
  assert.deepEqual(result.sessionItems[0]?.recapSignals?.[0]?.signals, ["pr", "promotion", "watch", "regression"]);
  assert.deepEqual(result.sessionItems[0]?.recapSignals?.[0]?.tagLabels, ["BEST", "MANUAL", "HARD"]);
  assert.equal(result.sessionItems[0]?.recapSignals?.[0]?.meta, "Effort 8/10");
  assert.equal(result.weeklyProgress.completedWorkoutCount, 1);
  assert.equal(result.weeklyProgressByWeek.length, 1);
  assert.deepEqual(result.plannedSkippedDayKeys, ["2026-04-21"]);
});

test("history sessions loader renders empty history without crashing", async () => {
  const supabase = createSupabaseStub({
    sessions: async () => ({ data: [] }),
  });

  const result = await loadHistorySessionsPageData({
    supabase,
    userId: "user-1",
    now: "2026-04-20T16:00:00.000Z",
    logger: { warn() {} },
  });

  assert.equal(result.subtitle, "0 completed sessions");
  assert.equal(result.sessionItems.length, 0);
  assert.equal(result.nextCursor, null);
  assert.equal(result.scopeSummary.completedWorkoutCount, 0);
  assert.equal(result.scopeSummary.progressionSummary.totalEventCount, 0);
  assert.equal(result.weeklyProgress.completedWorkoutCount, 0);
  assert.equal(result.weeklyProgressByWeek.length, 0);
});

test("history sessions route state falls back when a secondary load crashes", async () => {
  const fallback = {
    subtitle: "Session history unavailable",
    errorTitle: "Unable to load session history right now.",
    errorCaption: "Please try again in a moment.",
  };
  const loggedErrors: unknown[] = [];
  const state = await resolveHistorySessionsRouteState({
    fallback,
    load: async () => {
      throw new Error("secondary query exploded");
    },
    onError: (error) => {
      loggedErrors.push(error);
    },
  });

  assert.equal(state.kind, "fallback");
  if (state.kind === "fallback") {
    assert.deepEqual(state.fallback, fallback);
  }
  assert.equal(loggedErrors.length, 1);
});

test("history sessions loader degrades when enrichment queries fail", async () => {
  const warnings: string[] = [];
  const supabase = createSupabaseStub({
    sessions: async () => ({
      data: [{
        id: "session-1",
        user_id: "user-1",
        performed_at: "2026-04-20T12:00:00.000Z",
        notes: null,
        routine_id: "routine-1",
        routine_day_index: 2,
        name: "Fallback Routine",
        routine_day_name: null,
        day_name_override: null,
        duration_seconds: null,
        status: "completed",
      }],
    }),
    routines: async () => ({ data: null, error: { message: "routines unavailable" } }),
    routine_days: async () => ({ data: null, error: { message: "routine_days unavailable" } }),
    session_exercises: async () => {
      throw new Error("session_exercises unavailable");
    },
  });

  const result = await loadHistorySessionsPageData({
    supabase,
    userId: "user-1",
    now: "2026-04-20T16:00:00.000Z",
    logger: {
      warn(message) {
        warnings.push(String(message));
      },
    },
  });

  assert.equal(result.sessionItems.length, 1);
  assert.equal(result.sessionItems[0]?.routineTitle, "Fallback Routine");
  assert.equal(result.sessionItems[0]?.dayTitle, "Day 2");
  assert.equal(result.sessionItems[0]?.exerciseCount, 0);
  assert.equal(result.scopeSummary.completedWorkoutCount, 1);
  assert.equal(result.weeklyProgress.completedWorkoutCount, 1);
  assert.equal(result.weeklyProgressByWeek.length, 1);
  assert.equal(warnings.length, 3);
});

test("history cursor round-trips and rejects invalid payloads", () => {
  const cursor = { performedAt: "2026-04-20T12:00:00.000Z", id: "session-1" };
  assert.deepEqual(decodeHistoryCursor(encodeHistoryCursor(cursor)), cursor);
  assert.equal(decodeHistoryCursor("not-base64"), null);
});
