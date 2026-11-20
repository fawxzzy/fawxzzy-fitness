// Manual Promote against the REAL Supabase-backed repository and the REAL Today loader, driven by a
// small in-memory query-builder fake that records every call and applies filters the way
// PostgREST does (.eq for values, .is for nulls, .in, dotted embedded columns, user scoping).
// Covers: post-promotion bar reset (beat-the-target), revert, a newer workout re-qualifying, a
// failed promotion_applied insert (undo + distinct error), and the conditional-update guards.
import assert from "node:assert/strict";
import test from "node:test";

import { canShowProgressionCardAction } from "@/lib/progression-card-action";
import { deriveExerciseCardProgressFill } from "@/lib/exercise-card-progress-fill";
import {
  filterHistoryAfterPromotionHold,
  resolvePromotionHoldCutoffMs,
  resolveStandingPromotion,
  runManualPromotion,
  type ManualPromotionEventRow,
} from "@/lib/progression-manual-promotion";
import { createManualPromotionRepository } from "@/lib/progression-manual-promotion-repository";
import { loadProgressionUpdatesDisplayData } from "@/lib/progression-review-loader";
import type { ProgressionHistorySetRow, ProgressionTargetPlan } from "@/lib/progression-playbooks";
import type { RoutineDayExerciseRow } from "@/types/db";

// --- Recording query-builder fake ------------------------------------------------------------

type Row = Record<string, unknown>;
type Filter = { method: "eq" | "is" | "in"; column: string; value: unknown };
type Call = {
  table: string;
  op: "select" | "update" | "insert";
  columns?: string;
  options?: { count?: string; head?: boolean };
  payload?: Row;
  returning?: string;
  filters: Filter[];
  order?: { column: string; ascending: boolean };
  limit?: number;
};
type FakeHooks = {
  /** Return true to make this call fail with a Supabase-style error. */
  fail?: (call: Call, db: Record<string, Row[]>) => boolean;
  /** Runs before an update applies (simulates another writer racing us). */
  beforeUpdate?: (call: Call, db: Record<string, Row[]>) => void;
};

function readPath(row: Row, column: string): unknown {
  return column.split(".").reduce<unknown>((value, key) => {
    const target = Array.isArray(value) ? value[0] : value;
    return target && typeof target === "object" ? (target as Row)[key] : undefined;
  }, row);
}

function matches(row: Row, filters: Filter[]) {
  return filters.every(({ method, column, value }) => {
    const actual = readPath(row, column) ?? null;
    if (method === "is") return actual === value;
    if (method === "in") return (value as unknown[]).includes(actual);
    // SQL semantics: col = NULL is never true, which is why the guard must use .is for nulls.
    return value !== null && actual === value;
  });
}

function createSupabaseFake(db: Record<string, Row[]>, hooks: FakeHooks = {}) {
  const calls: Call[] = [];
  let clock = 0;

  const execute = (call: Call, single: boolean) => {
    if (hooks.fail?.(call, db)) {
      return { data: null, error: { message: `fake ${call.op} failure on ${call.table}` }, count: null };
    }

    const table = (db[call.table] ??= []);
    if (call.op === "insert") {
      clock += 1;
      table.push({ id: `${call.table}-${table.length + 1}`, created_at: `2026-11-19T10:00:${String(clock).padStart(2, "0")}.000Z`, ...call.payload });
      return { data: null, error: null, count: null };
    }

    if (call.op === "update") {
      hooks.beforeUpdate?.(call, db);
      const hit = table.filter((row) => matches(row, call.filters));
      hit.forEach((row) => Object.assign(row, call.payload));
      return { data: call.returning ? hit.map((row) => ({ id: row.id })) : null, error: null, count: null };
    }

    let rows = table.filter((row) => matches(row, call.filters)).map((row) => structuredClone(row));
    if (call.order) {
      const { column, ascending } = call.order;
      rows.sort((left, right) => String(left[column]).localeCompare(String(right[column])) * (ascending ? 1 : -1));
    }
    if (call.limit !== undefined) rows = rows.slice(0, call.limit);
    if (call.options?.head) return { data: null, error: null, count: rows.length };
    if (single) return { data: rows[0] ?? null, error: null, count: null };
    return { data: rows, error: null, count: null };
  };

  const supabase = {
    from(table: string) {
      const call: Call = { table, op: "select", filters: [] };
      calls.push(call);
      const builder = {
        select(columns?: string, options?: Call["options"]) {
          if (call.op === "select") {
            call.columns = columns;
            call.options = options;
          } else {
            call.returning = columns ?? "*";
          }
          return builder;
        },
        update(payload: Row) { call.op = "update"; call.payload = payload; return builder; },
        insert(payload: Row) { call.op = "insert"; call.payload = payload; return builder; },
        eq(column: string, value: unknown) { call.filters.push({ method: "eq", column, value }); return builder; },
        is(column: string, value: unknown) { call.filters.push({ method: "is", column, value }); return builder; },
        in(column: string, value: unknown[]) { call.filters.push({ method: "in", column, value }); return builder; },
        order(column: string, options?: { ascending?: boolean }) { call.order = { column, ascending: options?.ascending ?? true }; return builder; },
        limit(count: number) { call.limit = count; return builder; },
        maybeSingle() { return Promise.resolve(execute(call, true)); },
        then<A, B>(onFulfilled?: (value: ReturnType<typeof execute>) => A, onRejected?: (reason: unknown) => B) {
          return Promise.resolve(execute(call, false)).then(onFulfilled, onRejected);
        },
      };
      return builder;
    },
  };

  return { supabase: supabase as never, calls, db };
}

// --- Seed data -------------------------------------------------------------------------------

const USER = "user-a";
const OTHER_USER = "user-b";
const ROUTINE = "routine-1";

function exerciseRow(id: string, overrides: Row = {}): Row {
  return {
    id,
    user_id: USER,
    routine_day_id: "day-1",
    exercise_id: "ex-bench",
    position: 1,
    target_sets: 3,
    target_reps: 10,
    target_reps_min: 8,
    target_reps_max: 12,
    target_weight: 100,
    target_weight_unit: "lbs",
    target_duration_seconds: null,
    target_distance: null,
    target_distance_unit: null,
    target_calories: null,
    measurement_type: "reps",
    default_unit: null,
    notes: null,
    progression_playbook_id: "double_progression",
    progression_playbook_config: { version: 1, loadIncrement: 5 },
    ...overrides,
  };
}

function workout(db: Record<string, Row[]>, args: { session: string; performedAt: string; reps: number; rde?: string; routineId?: string }) {
  const sessionExerciseId = `se-${args.session}-${args.rde ?? "rde-1"}`;
  (db.session_exercises ??= []).push({
    id: sessionExerciseId,
    user_id: USER,
    exercise_id: "ex-bench",
    routine_day_exercise_id: args.rde ?? "rde-1",
    session: { id: args.session, performed_at: args.performedAt, status: "completed", routine_id: args.routineId ?? ROUTINE, routine_day_index: 1 },
  });
  for (const setIndex of [1, 2, 3]) {
    (db.sets ??= []).push({
      session_exercise_id: sessionExerciseId,
      user_id: USER,
      set_index: setIndex,
      weight: 100,
      reps: args.reps,
      weight_unit: "lbs",
      duration_seconds: null,
      distance: null,
      distance_unit: null,
      calories: null,
      is_warmup: false,
    });
  }
}

function seed(extraExercises: Row[] = []): Record<string, Row[]> {
  const db: Record<string, Row[]> = {
    routines: [{ id: ROUTINE, user_id: USER, weight_unit: "lbs" }],
    routine_days: [
      { id: "day-1", user_id: USER, routine_id: ROUTINE, day_index: 1, name: "Push" },
      { id: "day-2", user_id: USER, routine_id: ROUTINE, day_index: 2, name: "Push B" },
      { id: "day-x", user_id: USER, routine_id: "routine-other", day_index: 1, name: "Other" },
    ],
    routine_day_exercises: [exerciseRow("rde-1"), ...extraExercises],
    exercises: [{ id: "ex-bench", equipment: null, movement_pattern: null }],
    sessions: [],
    session_exercises: [],
    sets: [],
    progression_events: [],
  };
  // Target 10, did 12: beats the target by two reps.
  workout(db, { session: "w1", performedAt: "2026-11-18T12:00:00.000Z", reps: 12 });
  return db;
}

function target(db: Record<string, Row[]>, id = "rde-1") {
  const row = db.routine_day_exercises.find((entry) => entry.id === id) as Row;
  return row.target_reps as number;
}

function planFor(db: Record<string, Row[]>, id = "rde-1"): ProgressionTargetPlan {
  const row = db.routine_day_exercises.find((entry) => entry.id === id) as Row;
  return {
    measurementType: "reps",
    setsMin: row.target_sets as number,
    setsMax: row.target_sets as number,
    repsTarget: row.target_reps as number,
    repsMin: row.target_reps_min as number,
    repsMax: row.target_reps_max as number,
    weightMin: row.target_weight as number,
    weightMax: row.target_weight as number,
    weightUnit: "lbs",
    durationSeconds: null,
    distance: null,
    distanceUnit: null,
    calories: null,
  };
}

async function promote(db: Record<string, Row[]>, hooks: FakeHooks = {}, linkedIds?: string[]) {
  const fake = createSupabaseFake(db, hooks);
  const result = await runManualPromotion(
    createManualPromotionRepository({ supabase: fake.supabase, userId: USER, routineId: ROUTINE }),
    { routineDayExerciseId: "rde-1", expectedFromTarget: planFor(db), linkedIds },
  );
  return { result, calls: fake.calls };
}

/** What the Today card shows for rde-1: bar percent and whether Promote is offered. */
async function todayCard(db: Record<string, Row[]>, id = "rde-1") {
  const fake = createSupabaseFake(db);
  const exercises = db.routine_day_exercises.filter((row) => row.user_id === USER) as unknown as RoutineDayExerciseRow[];
  const data = await loadProgressionUpdatesDisplayData({
    supabase: fake.supabase,
    userId: USER,
    routineId: ROUTINE,
    fallbackWeightUnit: "lbs",
    exercises,
    exerciseNameByRoutineExerciseId: new Map(exercises.map((row) => [row.id, "Bench Press"])),
    routineDayNameById: new Map([["day-1", "Push"], ["day-2", "Push B"]]),
    routineDayIndexById: new Map([["day-1", 1], ["day-2", 2]]),
  });
  const readyItem = data.readyItems.find((item) => item.id === id || item.linkedUpdate?.routineDayExerciseIds.includes(id)) ?? null;
  const progress = readyItem?.progress ?? data.statusSurfaceItems.find((item) => item.id === id)?.progress ?? null;
  const fill = deriveExerciseCardProgressFill({ progressFill: progress, candidateType: readyItem?.type ?? null });
  return {
    percent: fill.progressPercent,
    canPromote: canShowProgressionCardAction({ candidateType: readyItem?.type, progressPercent: fill.progressPercent }),
    calls: fake.calls,
  };
}

function revertLatest(db: Record<string, Row[]>, id = "rde-1", previousReps = 10) {
  // What revertProgressionReviewCandidateAction writes: the previous target and a promotion_reverted row.
  (db.routine_day_exercises.find((row) => row.id === id) as Row).target_reps = previousReps;
  db.progression_events.push({
    id: `revert-${db.progression_events.length}`,
    user_id: USER,
    routine_day_exercise_id: id,
    event_type: "promotion_reverted",
    source_session_id: null,
    created_at: "2026-11-19T11:00:00.000Z",
  });
}

const failEventInsert: FakeHooks["fail"] = (call) => call.table === "progression_events" && call.op === "insert";

// --- P1-1: the bar resets after Promote --------------------------------------------------------

test("beat the target: after Promote the bar resets and Promote hides until a newer workout", async () => {
  const db = seed();
  assert.deepEqual(await todayCard(db).then(({ percent, canPromote }) => ({ percent, canPromote })), { percent: 100, canPromote: true });

  const first = await promote(db);
  assert.equal(first.result.ok, true);
  assert.equal(target(db), 11);
  assert.deepEqual(db.progression_events.map((event) => [event.event_type, event.source_session_id]), [["promotion_applied", "w1"]]);

  // At target 11 the same 12-rep workout would still qualify; the standing promotion consumes it.
  const after = await todayCard(db);
  assert.equal(after.percent, 0);
  assert.equal(after.canPromote, false);

  const again = await promote(db);
  assert.equal(!again.result.ok && again.result.code, "already_applied");
  assert.equal(target(db), 11);
  assert.equal(db.progression_events.length, 1);
});

test("revert restores the previous behaviour: full bar, Promote, and a second promotion works", async () => {
  const db = seed();
  assert.equal((await promote(db)).result.ok, true);
  revertLatest(db);

  assert.deepEqual(await todayCard(db).then(({ percent, canPromote }) => ({ percent, canPromote })), { percent: 100, canPromote: true });
  const redo = await promote(db);
  assert.equal(redo.result.ok, true);
  assert.equal(target(db), 11);
  assert.equal((await todayCard(db)).canPromote, false);
});

test("a newer workout that qualifies at the new target fills the bar and promotes again", async () => {
  const db = seed();
  assert.equal((await promote(db)).result.ok, true);

  workout(db, { session: "w2", performedAt: "2026-11-20T12:00:00.000Z", reps: 10 });
  const short = await todayCard(db);
  assert.ok(short.percent < 100, `10 reps at target 11 is not full (got ${short.percent})`);
  assert.equal(short.canPromote, false);

  workout(db, { session: "w3", performedAt: "2026-11-21T12:00:00.000Z", reps: 11 });
  assert.deepEqual(await todayCard(db).then(({ percent, canPromote }) => ({ percent, canPromote })), { percent: 100, canPromote: true });
  const second = await promote(db);
  assert.equal(second.result.ok, true);
  assert.equal(target(db), 12);
  assert.deepEqual(db.progression_events.map((event) => event.source_session_id), ["w1", "w3"]);
});

test("a standing promotion with no recorded source workout still holds both Today and the server", async () => {
  // Older promotion_applied rows (and any insert without a source) carry source_session_id null,
  // so only the hold, cut at the promotion time, stops the same workout promoting again.
  const db = seed();
  (db.routine_day_exercises[0] as Row).target_reps = 11;
  db.progression_events.push({
    id: "legacy-1",
    user_id: USER,
    routine_day_exercise_id: "rde-1",
    event_type: "promotion_applied",
    source_session_id: null,
    created_at: "2026-11-18T13:00:00.000Z",
  });

  assert.equal((await todayCard(db)).canPromote, false);
  const refused = await promote(db);
  assert.equal(!refused.result.ok && refused.result.code, "bar_not_full");
  assert.equal(target(db), 11);
});

test("Today loader reads promotion events scoped to the user and the routine's exercises", async () => {
  const db = seed();
  const { calls } = await todayCard(db);
  const eventsRead = calls.find((call) => call.table === "progression_events");
  assert.ok(eventsRead, "loader must read progression_events");
  assert.deepEqual(eventsRead.filters, [
    { method: "eq", column: "user_id", value: USER },
    { method: "in", column: "routine_day_exercise_id", value: ["rde-1"] },
    { method: "in", column: "event_type", value: ["promotion_applied", "promotion_reverted"] },
  ]);
});

test("hold rules: revert pops the latest promotion; cutoff falls back to the event time", () => {
  const events: ManualPromotionEventRow[] = [
    { event_type: "promotion_applied", routine_day_exercise_id: "rde-1", source_session_id: "w1", created_at: "2026-11-18T13:00:00.000Z" },
    { event_type: "promotion_applied", routine_day_exercise_id: "rde-1", source_session_id: "w2", created_at: "2026-11-19T13:00:00.000Z" },
    { event_type: "promotion_reverted", routine_day_exercise_id: "rde-1", source_session_id: null, created_at: "2026-11-19T14:00:00.000Z" },
    { event_type: "promotion_applied", routine_day_exercise_id: "rde-9", source_session_id: "w9", created_at: "2026-11-20T13:00:00.000Z" },
  ];
  // Newest-first input (as the DB returns it) must not change the result.
  assert.deepEqual(resolveStandingPromotion({ events: [...events].reverse(), routineDayExerciseId: "rde-1" }), { sourceSessionId: "w1", appliedAt: "2026-11-18T13:00:00.000Z" });
  assert.equal(resolveStandingPromotion({ events: events.slice(0, 1).concat({ ...events[2], created_at: "2026-11-18T14:00:00.000Z" }), routineDayExerciseId: "rde-1" }), null);
  assert.equal(resolveStandingPromotion({ events: [], routineDayExerciseId: "rde-1" }), null);

  const rows = (performedAt: string, sessionRecordId: string): ProgressionHistorySetRow => ({ sessionId: `se-${sessionRecordId}`, sessionRecordId, performedAt, setIndex: 1, reps: 10, weight: 100, weightUnit: "lbs", isWarmup: false });
  const history = [rows("2026-11-18T12:00:00.000Z", "w1"), rows("2026-11-18T18:00:00+00:00", "w1b"), rows("2026-11-21T12:00:00.000Z", "w3")];
  const located = resolvePromotionHoldCutoffMs({ events: events.slice(0, 1), routineDayExerciseId: "rde-1", locateRows: history });
  assert.equal(located, Date.parse("2026-11-18T12:00:00.000Z"));
  assert.deepEqual(filterHistoryAfterPromotionHold(history, located).map((row) => row.sessionRecordId), ["w1b", "w3"]);
  // Source workout not in the rows (e.g. a linked day): cut at the promotion time instead.
  const fallback = resolvePromotionHoldCutoffMs({ events: events.slice(0, 1), routineDayExerciseId: "rde-1", locateRows: [] });
  assert.equal(fallback, Date.parse("2026-11-18T13:00:00.000Z"));
  assert.deepEqual(filterHistoryAfterPromotionHold(history, fallback).map((row) => row.sessionRecordId), ["w1b", "w3"]);
  assert.equal(filterHistoryAfterPromotionHold(history, null).length, 3);
});

// --- P1-2: a failed audit insert never reports success ------------------------------------------

test("event insert fails: the target is put back, the action fails, and a retry promotes once", async () => {
  const db = seed();
  const failed = await promote(db, { fail: failEventInsert });
  assert.equal(failed.result.ok, false);
  assert.equal(!failed.result.ok && failed.result.code, "audit_failed");
  assert.match(!failed.result.ok ? failed.result.error : "", /target was left unchanged/);
  assert.equal(target(db), 10);
  assert.equal(db.progression_events.length, 0);

  // The undo is conditional on the values the promotion wrote.
  const restore = failed.calls.filter((call) => call.table === "routine_day_exercises" && call.op === "update")[1];
  assert.equal(restore.payload?.target_reps, 10);
  assert.ok(restore.filters.some((filter) => filter.method === "eq" && filter.column === "target_reps" && filter.value === 11));
  assert.ok(restore.filters.some((filter) => filter.method === "is" && filter.column === "target_calories" && filter.value === null));
  assert.ok(restore.filters.some((filter) => filter.method === "eq" && filter.column === "user_id" && filter.value === USER));

  // Today still offers Promote (nothing changed), Revert has nothing to undo, and a retry works once.
  assert.equal((await todayCard(db)).canPromote, true);
  assert.equal((await promote(db)).result.ok, true);
  assert.equal(target(db), 11);
  assert.equal(db.progression_events.length, 1);
  assert.equal(!(await promote(db)).result.ok, true);
});

test("event insert fails and the undo fails too: a distinct error, never ok", async () => {
  const db = seed();
  let updates = 0;
  const failed = await promote(db, {
    fail: (call) => failEventInsert(call, db) || (call.table === "routine_day_exercises" && call.op === "update" && ++updates === 2),
  });
  assert.equal(!failed.result.ok && failed.result.code, "audit_failed_unrestored");
  assert.match(!failed.result.ok ? failed.result.error : "", /could not be put back/);
  assert.equal(target(db), 11);
});

test("event insert fails and another writer changed the target first: the undo leaves the newer value", async () => {
  const db = seed();
  let updates = 0;
  const failed = await promote(db, {
    fail: failEventInsert,
    beforeUpdate: (call, tables) => {
      updates += 1;
      if (updates === 2) (tables.routine_day_exercises[0] as Row).target_reps = 15;
    },
  });
  assert.equal(!failed.result.ok && failed.result.code, "audit_failed_unrestored");
  assert.equal(target(db), 15);
});

test("linked day: a failed linked event insert undoes that day only; an unrecoverable one fails loudly", async () => {
  const db = seed([exerciseRow("rde-2", { routine_day_id: "day-2", position: 1 })]);
  let inserts = 0;
  const partial = await promote(db, { fail: (call) => call.table === "progression_events" && call.op === "insert" && ++inserts === 2 }, ["rde-2"]);
  assert.equal(partial.result.ok, true);
  assert.deepEqual(partial.result.ok && partial.result.data.linkedTargets, undefined);
  assert.deepEqual([target(db, "rde-1"), target(db, "rde-2")], [11, 10]);

  const db2 = seed([exerciseRow("rde-2", { routine_day_id: "day-2", position: 1 })]);
  let inserts2 = 0;
  let updates2 = 0;
  const loud = await promote(db2, {
    fail: (call) => (call.table === "progression_events" && call.op === "insert" && ++inserts2 === 2)
      || (call.table === "routine_day_exercises" && call.op === "update" && ++updates2 === 3),
  }, ["rde-2"]);
  assert.equal(!loud.result.ok && loud.result.code, "linked_audit_failed_unrestored");
});

// --- P2: the repository's real queries ------------------------------------------------------

test("conditional write: every target column is guarded (.eq values, .is nulls) and scoped to the user", async () => {
  const db = seed();
  const { result, calls } = await promote(db);
  assert.equal(result.ok, true);
  const write = calls.find((call) => call.table === "routine_day_exercises" && call.op === "update");
  assert.ok(write);
  assert.deepEqual(write.filters.slice(0, 2), [
    { method: "eq", column: "id", value: "rde-1" },
    { method: "eq", column: "user_id", value: USER },
  ]);
  assert.deepEqual(write.filters.slice(2).map((filter) => `${filter.method}:${filter.column}:${String(filter.value)}`), [
    "eq:target_sets:3",
    "eq:target_reps:10",
    "eq:target_reps_min:8",
    "eq:target_reps_max:12",
    "eq:target_weight:100",
    "eq:target_weight_unit:lbs",
    "is:target_duration_seconds:null",
    "is:target_distance:null",
    "is:target_distance_unit:null",
    "is:target_calories:null",
  ]);
  assert.equal(write.returning, "id");

  const userScoped = calls.filter((call) => ["routine_day_exercises", "routine_days", "routines", "sessions", "session_exercises", "sets", "progression_events"].includes(call.table) && call.op !== "insert");
  for (const call of userScoped) {
    assert.ok(call.filters.some((filter) => filter.column === "user_id" && filter.value === USER), `${call.op} ${call.table} must filter user_id`);
  }
  const live = calls.find((call) => call.table === "sessions");
  assert.deepEqual(live?.filters, [
    { method: "eq", column: "user_id", value: USER },
    { method: "eq", column: "status", value: "in_progress" },
  ]);
});

test("conditional write loses the race when a guarded column changed: nothing written, no event", async () => {
  const db = seed();
  const { result } = await promote(db, {
    beforeUpdate: (_call, tables) => { (tables.routine_day_exercises[0] as Row).target_weight = 105; },
  });
  assert.equal(!result.ok && result.code, "lost_race");
  assert.equal(target(db), 10);
  assert.equal(db.progression_events.length, 0);
});

test("another user's exercise and any live workout are refused before any write", async () => {
  const foreign = seed();
  (foreign.routine_day_exercises[0] as Row).user_id = OTHER_USER;
  const notOwned = await promote(foreign);
  assert.equal(!notOwned.result.ok && notOwned.result.code, "not_owned");
  assert.equal(notOwned.calls.filter((call) => call.op !== "select").length, 0);

  const busy = seed();
  busy.sessions.push({ id: "live", user_id: USER, status: "in_progress", routine_id: "routine-other" });
  const refused = await promote(busy);
  assert.equal(!refused.result.ok && refused.result.code, "workout_in_progress");
  assert.equal(refused.calls.filter((call) => call.op !== "select").length, 0);
});

test("linked days must be the user's, in the same routine, with the same target", async () => {
  const cases: Array<[string, Row]> = [
    ["other routine", exerciseRow("rde-2", { routine_day_id: "day-x" })],
    ["other user", exerciseRow("rde-2", { routine_day_id: "day-2", user_id: OTHER_USER })],
    ["different target", exerciseRow("rde-2", { routine_day_id: "day-2", target_weight: 95 })],
  ];
  for (const [label, linked] of cases) {
    const db = seed([linked]);
    const { result, calls } = await promote(db, {}, ["rde-2"]);
    assert.equal(!result.ok && result.code, "linked_mismatch", label);
    assert.equal(calls.filter((call) => call.op !== "select").length, 0, label);
    assert.equal(target(db), 10, label);
  }

  const db = seed([exerciseRow("rde-2", { routine_day_id: "day-2" })]);
  const { result } = await promote(db, {}, ["rde-2"]);
  assert.equal(result.ok, true);
  assert.deepEqual([target(db, "rde-1"), target(db, "rde-2")], [11, 11]);
  assert.deepEqual(db.progression_events.map((event) => event.routine_day_exercise_id), ["rde-1", "rde-2"]);
});
