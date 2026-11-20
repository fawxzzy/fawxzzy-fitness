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
  MANUAL_PROMOTION_LINKED_FAILED_WARNING,
  MANUAL_PROMOTION_REFUSAL_MESSAGES,
  PROGRESSION_REVERT_MESSAGES,
  resolveRevertEventType,
  resolveStandingPromotion,
  runManualPromotion,
  runProgressionRevert,
  type ManualPromotionEventRow,
} from "@/lib/progression-manual-promotion";
import { readPromotionHoldEvents } from "@/lib/progression-promotion-events-read";
import { shouldDropProgressionPinAfterRevert } from "@/lib/progression-revert-messages";
import { PROMOTED_AWAITING_WORKOUT_DETAIL } from "@/lib/progression-status-display";
import { createManualPromotionRepository, ProgressionMutationReadError } from "@/lib/progression-manual-promotion-repository";
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
  orders: Array<{ column: string; ascending: boolean }>;
  limit?: number;
  range?: { from: number; to: number };
};
type FakeHooks = {
  /** Return true to make this call fail with a Supabase-style error. */
  fail?: (call: Call, db: Record<string, Row[]>) => boolean;
  /** Runs before an update applies (simulates another writer racing us). */
  beforeUpdate?: (call: Call, db: Record<string, Row[]>) => void;
  /** PostgREST max-rows: caps every select page below the requested range. */
  maxRows?: number;
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
    if (call.orders.length > 0) {
      rows.sort((left, right) => {
        for (const { column, ascending } of call.orders) {
          const diff = String(left[column]).localeCompare(String(right[column])) * (ascending ? 1 : -1);
          if (diff !== 0) return diff;
        }
        return 0;
      });
    }
    if (call.range) rows = rows.slice(call.range.from, call.range.to + 1);
    if (call.limit !== undefined) rows = rows.slice(0, call.limit);
    if (hooks.maxRows !== undefined) rows = rows.slice(0, hooks.maxRows);
    if (call.options?.head) return { data: null, error: null, count: rows.length };
    if (single) return { data: rows[0] ?? null, error: null, count: null };
    return { data: rows, error: null, count: null };
  };

  const supabase = {
    from(table: string) {
      const call: Call = { table, op: "select", filters: [], orders: [] };
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
        order(column: string, options?: { ascending?: boolean }) { call.orders.push({ column, ascending: options?.ascending ?? true }); return builder; },
        limit(count: number) { call.limit = count; return builder; },
        range(from: number, to: number) { call.range = { from, to }; return builder; },
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

function workout(db: Record<string, Row[]>, args: { session: string; performedAt: string; reps: number; rde?: string | null; routineId?: string }) {
  const rde = args.rde === undefined ? "rde-1" : args.rde;
  const sessionExerciseId = `se-${args.session}-${rde ?? "adhoc"}`;
  (db.session_exercises ??= []).push({
    id: sessionExerciseId,
    user_id: USER,
    exercise_id: "ex-bench",
    routine_day_exercise_id: rde,
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

async function promote(db: Record<string, Row[]>, hooks: FakeHooks = {}, linkedIds?: string[], id = "rde-1") {
  const fake = createSupabaseFake(db, hooks);
  const result = await runManualPromotion(
    createManualPromotionRepository({ supabase: fake.supabase, userId: USER, routineId: ROUTINE }),
    { routineDayExerciseId: id, expectedFromTarget: planFor(db, id), linkedIds },
  );
  return { result, calls: fake.calls };
}

/** The real Revert path (runProgressionRevert + the Supabase repository). */
type RevertPin = { routineDayExerciseId: string; previousTarget: ProgressionTargetPlan; appliedTarget: ProgressionTargetPlan };
async function revert(db: Record<string, Row[]>, targets: RevertPin[], hooks: FakeHooks = {}) {
  const fake = createSupabaseFake(db, hooks);
  const result = await runProgressionRevert(
    createManualPromotionRepository({ supabase: fake.supabase, userId: USER, routineId: ROUTINE }),
    targets,
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
    status: data.statusSurfaceItems.find((item) => item.id === id) ?? null,
    statusItem: data.statusItems.find((item) => item.id === id) ?? null,
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
    { method: "in", column: "event_type", value: ["promotion_applied", "promotion_reverted", "deload_applied"] },
  ]);
  assert.deepEqual(eventsRead.orders, [{ column: "created_at", ascending: false }, { column: "id", ascending: false }]);
  assert.deepEqual(eventsRead.range, { from: 0, to: 999 });
});

test("hold rules: revert pops the latest promotion; the cutoff is always the promotion time", () => {
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
  const history = [rows("2026-11-18T12:00:00.000Z", "w1"), rows("2026-11-18T12:30:00+00:00", "w1b"), rows("2026-11-21T12:00:00.000Z", "w3")];
  // One rule: the cutoff is the promotion's appliedAt, whatever rows the caller can see.
  const cutoff = resolvePromotionHoldCutoffMs({ events: events.slice(0, 1), routineDayExerciseId: "rde-1" });
  assert.equal(cutoff, Date.parse("2026-11-18T13:00:00.000Z"));
  // w1b came after the source workout but before Promote: it was at the old target, so it is consumed too.
  assert.deepEqual(filterHistoryAfterPromotionHold(history, cutoff).map((row) => row.sessionRecordId), ["w3"]);
  assert.equal(filterHistoryAfterPromotionHold(history, null).length, 3);
  assert.equal(resolvePromotionHoldCutoffMs({ events: [{ ...events[0], created_at: "garbage" }], routineDayExerciseId: "rde-1" }), Number.POSITIVE_INFINITY);
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
  // The source day IS promoted and recorded: an ok result (so Today refreshes and Revert is
  // pinned) that carries the linked-day problem as a warning.
  assert.equal(loud.result.ok, true);
  assert.equal(loud.result.ok && loud.result.data.warning, MANUAL_PROMOTION_REFUSAL_MESSAGES.linked_audit_failed_unrestored);
  assert.equal(loud.result.ok && loud.result.data.appliedTarget.repsTarget, 11);
  assert.equal(target(db2, "rde-1"), 11);
});

test("linked day: a thrown linked write after the source day was promoted still returns ok with a warning", async () => {
  const db = seed([exerciseRow("rde-2", { routine_day_id: "day-2", position: 1 })]);
  let updates = 0;
  const { result } = await promote(db, {
    fail: (call) => call.table === "routine_day_exercises" && call.op === "update" && ++updates === 2,
  }, ["rde-2"]);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.data.warning, MANUAL_PROMOTION_LINKED_FAILED_WARNING);
  assert.equal(result.ok && result.data.linkedTargets, undefined);
  assert.deepEqual([target(db, "rde-1"), target(db, "rde-2")], [11, 10]);
  assert.deepEqual(db.progression_events.map((event) => event.routine_day_exercise_id), ["rde-1"]);

  // A clean promotion carries no warning.
  const clean = await promote(seed());
  assert.equal(clean.result.ok && "warning" in clean.result.data, false);
});

// --- Review round 2 (P1): one cutoff rule for a promotion linked across days --------------------

test("linked Promote across two days: both days reset, the server agrees, and a newer workout re-enables it", async () => {
  // Reviewer probe: w1 on day A (12 reps), wB on day B (12 reps), Promote on A with B linked.
  const db = seed([exerciseRow("rde-2", { routine_day_id: "day-2", position: 1 })]);
  workout(db, { session: "wB", performedAt: "2026-11-18T18:00:00.000Z", reps: 12, rde: "rde-2" });
  assert.equal((await todayCard(db, "rde-1")).canPromote, true);
  assert.equal((await todayCard(db, "rde-2")).canPromote, true);

  const linked = await promote(db, {}, ["rde-2"]);
  assert.equal(linked.result.ok, true);
  assert.deepEqual([target(db, "rde-1"), target(db, "rde-2")], [11, 11]);

  // Both days: below full, no Promote. Day A must not be filled from day B's (consumed) workout,
  // and day B's own pre-promotion workout must not keep its bar full.
  for (const id of ["rde-1", "rde-2"]) {
    const card = await todayCard(db, id);
    assert.ok(card.percent < 100, `${id} bar must reset (got ${card.percent})`);
    assert.equal(card.percent, 0, `${id} has no workout at the new target`);
    assert.equal(card.canPromote, false, `${id} must not offer Promote`);
  }
  // The server uses the same cutoff: nothing to promote on either day.
  const serverB = await promote(db, {}, undefined, "rde-2");
  assert.equal(!serverB.result.ok && serverB.result.code, "bar_not_full");
  const serverA = await promote(db, {}, undefined, "rde-1");
  assert.equal(serverA.result.ok, false);
  assert.deepEqual([target(db, "rde-1"), target(db, "rde-2")], [11, 11]);

  // A newer workout on day B that meets the new target fills B's bar and Promote works again.
  workout(db, { session: "wC", performedAt: "2026-11-20T12:00:00.000Z", reps: 11, rde: "rde-2" });
  assert.deepEqual(await todayCard(db, "rde-2").then(({ percent, canPromote }) => ({ percent, canPromote })), { percent: 100, canPromote: true });
  const again = await promote(db, {}, undefined, "rde-2");
  assert.equal(again.result.ok, true);
  assert.equal(target(db, "rde-2"), 12);
});

// --- Review round 2 (P3d): wording while a promotion stands --------------------------------------

test("while a promotion stands with no newer workout, Today says Promoted instead of insufficient evidence", async () => {
  const db = seed();
  assert.equal((await promote(db)).result.ok, true);
  const { status, statusItem } = await todayCard(db);
  assert.ok(status, "status surface item exists");
  assert.equal(status.readinessLabel, "Promoted");
  assert.equal(status.readinessState, "not_ready");
  assert.equal(status.detailLine, PROMOTED_AWAITING_WORKOUT_DETAIL);
  assert.equal(PROMOTED_AWAITING_WORKOUT_DETAIL, "Promoted. Log a workout at the new target.");
  assert.doesNotMatch(`${status.readinessLabel} ${status.detailLine}`, /insufficient evidence|no completed work/i);
  assert.equal(statusItem?.label, "Promoted");

  // Once a workout at the new target is logged, normal progress wording returns.
  workout(db, { session: "w2", performedAt: "2026-11-20T12:00:00.000Z", reps: 10 });
  const after = await todayCard(db);
  assert.notEqual(after.status?.readinessLabel, "Promoted");
  assert.notEqual(after.status?.detailLine, PROMOTED_AWAITING_WORKOUT_DETAIL);
});

// --- Review round 2 (P3a): Revert and the hold always agree ---------------------------------------

test("revert writes promotion_reverted, lifts the hold, and the same workout can promote again", async () => {
  const db = seed();
  const first = await promote(db);
  assert.equal(first.result.ok, true);
  const previousTarget = first.result.ok ? first.result.data.previousTarget : planFor(db);
  const appliedTarget = first.result.ok ? first.result.data.appliedTarget : planFor(db);
  const undone = await revert(db, [{ routineDayExerciseId: "rde-1", previousTarget, appliedTarget }]);
  assert.deepEqual(undone.result, { ok: true });
  assert.equal(target(db), 10);
  assert.deepEqual(db.progression_events.map((event) => event.event_type), ["promotion_applied", "promotion_reverted"]);
  // Each fake has its own clock, so both rows share one created_at: an equal-timestamp revert
  // must still lift the promotion (newest-first read order must not pop before push).
  assert.equal(db.progression_events[0].created_at, db.progression_events[1].created_at);
  assert.equal((await todayCard(db)).canPromote, true);
});

test("revert of a deload records manual_target_change and leaves a standing promotion in place", async () => {
  const db = seed();
  assert.equal((await promote(db)).result.ok, true);
  const promotedPlan = planFor(db);
  // A deload applied after the promotion (what applyProgressionReviewCandidateAction writes).
  (db.routine_day_exercises[0] as Row).target_reps = 9;
  db.progression_events.push({ id: "deload-1", user_id: USER, routine_day_exercise_id: "rde-1", event_type: "deload_applied", source_session_id: null, created_at: "2026-11-19T10:00:01.500Z" });

  const undone = await revert(db, [{ routineDayExerciseId: "rde-1", previousTarget: promotedPlan, appliedTarget: planFor(db) }]);
  assert.deepEqual(undone.result, { ok: true });
  assert.equal(target(db), 11);
  assert.equal(db.progression_events.at(-1)?.event_type, "manual_target_change");
  // The promotion still stands, so its consumed workout cannot fill the bar again.
  const card = await todayCard(db);
  assert.equal(card.percent, 0);
  assert.equal(card.canPromote, false);
});

test("revert event insert fails: the promoted target is put back so the hold and target agree", async () => {
  const db = seed();
  const first = await promote(db);
  const previousTarget = first.result.ok ? first.result.data.previousTarget : planFor(db);
  const appliedTarget = first.result.ok ? first.result.data.appliedTarget : planFor(db);
  const failed = await revert(db, [{ routineDayExerciseId: "rde-1", previousTarget, appliedTarget }], { fail: failEventInsert });
  assert.deepEqual(failed.result, { ok: false, error: PROGRESSION_REVERT_MESSAGES.audit_failed });
  assert.equal(shouldDropProgressionPinAfterRevert(failed.result), false, "a retryable failure keeps the pin");
  assert.equal(target(db), 11);
  assert.deepEqual(db.progression_events.map((event) => event.event_type), ["promotion_applied"]);
  assert.equal((await todayCard(db)).canPromote, false);

  // The undo is conditional on the reverted values; if it fails too the error says so.
  let updates = 0;
  const loud = await revert(db, [{ routineDayExerciseId: "rde-1", previousTarget, appliedTarget }], {
    fail: (call) => failEventInsert(call, db) || (call.table === "routine_day_exercises" && call.op === "update" && ++updates === 2),
  });
  assert.deepEqual(loud.result, { ok: false, error: PROGRESSION_REVERT_MESSAGES.audit_failed_unrestored });
  const restore = loud.calls.filter((call) => call.table === "routine_day_exercises" && call.op === "update")[1];
  assert.equal(restore.payload?.target_reps, 11);
  assert.ok(restore.filters.some((filter) => filter.method === "eq" && filter.column === "target_reps" && filter.value === 10));
});

test("revert loses the race when the target changed since it was read: nothing written", async () => {
  const db = seed();
  const first = await promote(db);
  const previousTarget = first.result.ok ? first.result.data.previousTarget : planFor(db);
  const appliedTarget = first.result.ok ? first.result.data.appliedTarget : planFor(db);
  const raced = await revert(db, [{ routineDayExerciseId: "rde-1", previousTarget, appliedTarget }], {
    beforeUpdate: (_call, tables) => { (tables.routine_day_exercises[0] as Row).target_weight = 105; },
  });
  assert.deepEqual(raced.result, { ok: false, error: PROGRESSION_REVERT_MESSAGES.lost_race });
  assert.equal(target(db), 11);
  assert.equal(db.progression_events.length, 1);
});

test("revert event type: only undoing a standing promotion writes promotion_reverted", () => {
  const applied = (at: string): ManualPromotionEventRow => ({ event_type: "promotion_applied", routine_day_exercise_id: "rde-1", source_session_id: "w1", created_at: at });
  const deload = (at: string): ManualPromotionEventRow => ({ event_type: "deload_applied", routine_day_exercise_id: "rde-1", source_session_id: null, created_at: at });
  const reverted = (at: string): ManualPromotionEventRow => ({ event_type: "promotion_reverted", routine_day_exercise_id: "rde-1", source_session_id: null, created_at: at });
  const type = (events: ManualPromotionEventRow[]) => resolveRevertEventType({ events, routineDayExerciseId: "rde-1" });
  assert.equal(type([applied("2026-11-19T10:00:00Z")]), "promotion_reverted");
  assert.equal(type([applied("2026-11-19T10:00:00Z"), deload("2026-11-19T11:00:00Z")]), "manual_target_change");
  assert.equal(type([deload("2026-11-19T09:00:00Z"), applied("2026-11-19T10:00:00Z")]), "promotion_reverted");
  assert.equal(type([applied("2026-11-19T10:00:00Z"), reverted("2026-11-19T11:00:00Z")]), "manual_target_change");
  assert.equal(type([]), "manual_target_change");
});

// --- Review round 2 (P3b): Today and the server read the same complete event list ----------------

test("an old standing promotion behind many later promote/revert pairs holds on Today and the server alike", async () => {
  const db = seed();
  (db.routine_day_exercises[0] as Row).target_reps = 11;
  const event = (id: string, eventType: string, createdAt: string, source: string | null) => ({ id, user_id: USER, routine_day_exercise_id: "rde-1", event_type: eventType, source_session_id: source, created_at: createdAt });
  db.progression_events.push(event("e-000", "promotion_applied", "2026-11-18T13:00:00.000Z", "w1"));
  for (let index = 1; index <= 30; index += 1) {
    const minute = String(index).padStart(2, "0");
    db.progression_events.push(event(`e-${minute}a`, "promotion_applied", `2026-11-18T14:${minute}:00.000Z`, "w1"));
    db.progression_events.push(event(`e-${minute}b`, "promotion_reverted", `2026-11-18T14:${minute}:30.000Z`, null));
  }
  // 61 events: a 50-row window would drop the standing one on the server only.
  assert.equal((await todayCard(db)).canPromote, false);
  const refused = await promote(db);
  assert.equal(refused.result.ok, false);
  assert.equal(target(db), 11);

  // Paging returns the same complete list as one big page, in a stable order.
  const fake = createSupabaseFake(db);
  const small = await readPromotionHoldEvents({ supabase: fake.supabase, userId: USER, routineDayExerciseIds: ["rde-1"], pageSize: 7 });
  const large = await readPromotionHoldEvents({ supabase: fake.supabase, userId: USER, routineDayExerciseIds: ["rde-1"] });
  assert.equal(small.length, 61);
  assert.deepEqual(small, large);
  // 7-row pages: 8 full + a 5-row tail (shorter than a page already seen, so the end). One
  // 1000-row request returning 61 cannot tell a max-rows cap from the end: one empty read confirms.
  assert.equal(fake.calls.filter((call) => call.table === "progression_events").length, 9 + 2);
  assert.deepEqual(await readPromotionHoldEvents({ supabase: fake.supabase, userId: USER, routineDayExerciseIds: [] }), []);
});

// --- Review round 3 (P1): Today and the server pick the same evidence rows ------------------------

function dropSeedWorkout(db: Record<string, Row[]>) {
  db.session_exercises = db.session_exercises.filter((row) => row.id !== "se-w1-rde-1");
  db.sets = db.sets.filter((row) => row.session_exercise_id !== "se-w1-rde-1");
  return db;
}

test("ad hoc add after a direct Promote: Today does not offer Promote, matching the server", async () => {
  // Reviewer repro: Promote from the planned workout, then bench added ad hoc (no
  // routine_day_exercise_id) to a later workout in the same routine at 12 reps.
  const db = seed();
  assert.equal((await promote(db)).result.ok, true);
  workout(db, { session: "wAdHoc", performedAt: "2026-11-20T12:00:00.000Z", reps: 12, rde: null });

  // The old direct workout still selects "direct" (then the hold empties it): the ad hoc row is
  // not this exercise's evidence on either side, so Promote is never a dead end.
  const card = await todayCard(db);
  assert.equal(card.percent, 0);
  assert.equal(card.canPromote, false);
  const server = await promote(db);
  assert.equal(server.result.ok, false);
  assert.equal(target(db), 11);

  // A planned (direct) workout at the new target re-enables it on both sides.
  workout(db, { session: "wNext", performedAt: "2026-11-21T12:00:00.000Z", reps: 11 });
  assert.equal((await todayCard(db)).canPromote, true);
  assert.equal((await promote(db)).result.ok, true);
  assert.equal(target(db), 12);
});

test("property: over many history shapes, Today offers Promote exactly when the server applies it", async () => {
  type Shape = { name: string; noDirectSeed?: boolean; duplicate?: boolean | "untargeted"; promoteFirst: boolean; later: Array<{ reps: number; rde: string | null }>; expected: boolean };
  const shapes: Shape[] = [
    { name: "direct only, no promotion", promoteFirst: false, later: [], expected: true },
    { name: "direct promoted, nothing newer", promoteFirst: true, later: [], expected: false },
    { name: "direct promoted, ad hoc newer", promoteFirst: true, later: [{ reps: 12, rde: null }], expected: false },
    { name: "direct promoted, direct newer at target", promoteFirst: true, later: [{ reps: 11, rde: "rde-1" }], expected: true },
    { name: "direct promoted, direct newer below target", promoteFirst: true, later: [{ reps: 9, rde: "rde-1" }], expected: false },
    { name: "direct promoted, ad hoc and direct newer", promoteFirst: true, later: [{ reps: 12, rde: null }, { reps: 11, rde: "rde-1" }], expected: true },
    { name: "ad hoc only, no promotion", noDirectSeed: true, promoteFirst: false, later: [{ reps: 12, rde: null }], expected: true },
    { name: "ad hoc promoted, ad hoc newer at target", noDirectSeed: true, promoteFirst: true, later: [{ reps: 12, rde: null }, { reps: 11, rde: null }], expected: true },
    { name: "ad hoc promoted, direct newer at target", noDirectSeed: true, promoteFirst: true, later: [{ reps: 12, rde: null }, { reps: 11, rde: "rde-1" }], expected: true },
    { name: "ad hoc promoted, nothing newer", noDirectSeed: true, promoteFirst: true, later: [{ reps: 12, rde: null }], expected: false },
    { name: "no history at all", noDirectSeed: true, promoteFirst: false, later: [], expected: false },
    // The catalog fallback needs the exercise to be unique in the routine.
    { name: "ad hoc only, exercise twice in the routine", noDirectSeed: true, duplicate: true, promoteFirst: false, later: [{ reps: 12, rde: null }], expected: false },
    // Round 4: the second slot has no targets (not a progression exercise on Today) but the server
    // still counts it, so Today must count it too and not offer a Promote the server refuses.
    { name: "ad hoc only, duplicate slot with no targets", noDirectSeed: true, duplicate: "untargeted", promoteFirst: false, later: [{ reps: 12, rde: null }], expected: false },
    // Rows linked to another (e.g. removed) routine slot are never this exercise's evidence.
    { name: "only rows from a removed routine slot", noDirectSeed: true, promoteFirst: false, later: [{ reps: 12, rde: "rde-gone" }], expected: false },
  ];

  for (const shape of shapes) {
    const extra = shape.duplicate === "untargeted"
      ? [exerciseRow("rde-2", {
        routine_day_id: "day-2",
        position: 1,
        target_sets: null,
        target_reps: null,
        target_reps_min: null,
        target_reps_max: null,
        target_weight: null,
        progression_playbook_id: null,
        progression_playbook_config: null,
      })]
      : shape.duplicate ? [exerciseRow("rde-2", { routine_day_id: "day-2", position: 1, target_weight: 135 })] : [];
    const db = shape.noDirectSeed ? dropSeedWorkout(seed(extra)) : seed(extra);
    let laterIndex = 0;
    const addLater = (entry: { reps: number; rde: string | null }) => {
      laterIndex += 1;
      workout(db, { session: `wL${laterIndex}`, performedAt: `2026-11-2${laterIndex}T12:00:00.000Z`, reps: entry.reps, rde: entry.rde });
    };
    if (shape.promoteFirst) {
      // An ad hoc-only shape promotes from its first ad hoc workout (performed before the promotion).
      const [first, ...rest] = shape.noDirectSeed ? shape.later : [undefined, ...shape.later];
      if (first) {
        workout(db, { session: "wFirst", performedAt: "2026-11-18T12:00:00.000Z", reps: first.reps, rde: first.rde });
      }
      assert.equal((await promote(db)).result.ok, true, `${shape.name}: setup promotion`);
      rest.forEach((entry) => entry && addLater(entry));
    } else {
      shape.later.forEach(addLater);
    }

    const before = target(db);
    const card = await todayCard(db);
    const server = await promote(db);
    assert.equal(card.canPromote, shape.expected, `${shape.name}: Today canPromote`);
    assert.equal(server.result.ok, card.canPromote, `${shape.name}: server agrees with Today (${server.result.ok ? "ok" : server.result.code})`);
    assert.equal(target(db), server.result.ok ? before + 1 : before, `${shape.name}: target`);
  }
});

// --- Review round 3 (P3): Revert only undoes the target its pin applied --------------------------

test("an old pin cannot revert a target that changed after the promotion: lost_race, nothing written", async () => {
  const db = seed();
  const first = await promote(db);
  assert.equal(first.result.ok, true);
  const pin = first.result.ok
    ? { routineDayExerciseId: "rde-1", previousTarget: first.result.data.previousTarget, appliedTarget: first.result.data.appliedTarget }
    : null;
  assert.ok(pin);
  // A newer target since (an edit or a later promotion): the old pin must not put back 10.
  (db.routine_day_exercises[0] as Row).target_reps = 12;

  const stale = await revert(db, [pin]);
  assert.deepEqual(stale.result, { ok: false, error: PROGRESSION_REVERT_MESSAGES.lost_race });
  // Round 4: the pin can never work again, so the client drops it and the copy says so (and never
  // says "promoted": the pin may be undoing a deload).
  assert.match(PROGRESSION_REVERT_MESSAGES.lost_race, /Revert is no longer available/);
  assert.doesNotMatch(PROGRESSION_REVERT_MESSAGES.lost_race, /promot|refresh and try again/i);
  assert.equal(shouldDropProgressionPinAfterRevert(stale.result), true);
  assert.equal(target(db), 12);
  assert.equal(stale.calls.filter((call) => call.op !== "select").length, 0);
  assert.deepEqual(db.progression_events.map((event) => event.event_type), ["promotion_applied"]);
});

test("linked revert with one stale day refuses before writing any day", async () => {
  const db = seed([exerciseRow("rde-2", { routine_day_id: "day-2", position: 1 })]);
  workout(db, { session: "wB", performedAt: "2026-11-18T18:00:00.000Z", reps: 12, rde: "rde-2" });
  const linked = await promote(db, {}, ["rde-2"]);
  assert.equal(linked.result.ok, true);
  const pins = linked.result.ok ? (linked.result.data.linkedTargets ?? []) : [];
  assert.deepEqual(pins.map((pin) => pin.routineDayExerciseId).sort(), ["rde-1", "rde-2"]);
  (db.routine_day_exercises.find((row) => row.id === "rde-2") as Row).target_weight = 105;

  const stale = await revert(db, pins);
  assert.deepEqual(stale.result, { ok: false, error: PROGRESSION_REVERT_MESSAGES.lost_race });
  assert.deepEqual([target(db, "rde-1"), target(db, "rde-2")], [11, 11]);
  assert.equal(stale.calls.filter((call) => call.op !== "select").length, 0);
});

// --- Review round 3 (P3): event paging never assumes the server returns 1000 rows -----------------

test("event paging under a PostgREST max-rows cap below the page size still reads every event", async () => {
  const db = seed();
  (db.routine_day_exercises[0] as Row).target_reps = 11;
  const event = (id: string, eventType: string, createdAt: string, source: string | null) => ({ id, user_id: USER, routine_day_exercise_id: "rde-1", event_type: eventType, source_session_id: source, created_at: createdAt });
  db.progression_events.push(event("e-000", "promotion_applied", "2026-11-18T13:00:00.000Z", "w1"));
  for (let index = 1; index <= 30; index += 1) {
    const minute = String(index).padStart(2, "0");
    db.progression_events.push(event(`e-${minute}a`, "promotion_applied", `2026-11-18T14:${minute}:00.000Z`, "w1"));
    db.progression_events.push(event(`e-${minute}b`, "promotion_reverted", `2026-11-18T14:${minute}:30.000Z`, null));
  }

  const capped = createSupabaseFake(db, { maxRows: 5 });
  const rows = await readPromotionHoldEvents({ supabase: capped.supabase, userId: USER, routineDayExerciseIds: ["rde-1"] });
  const full = await readPromotionHoldEvents({ supabase: createSupabaseFake(db).supabase, userId: USER, routineDayExerciseIds: ["rde-1"] });
  assert.equal(rows.length, 61);
  assert.deepEqual(rows, full);
  // 12 capped pages of 5 and a 1-row tail; each page starts where the last one actually ended.
  const reads = capped.calls.filter((call) => call.table === "progression_events");
  assert.equal(reads.length, 13);
  assert.deepEqual(reads.slice(0, 3).map((call) => call.range?.from), [0, 5, 10]);

  // An exact multiple of the cap ends on an empty page.
  db.progression_events = db.progression_events.slice(0, 60);
  const exact = createSupabaseFake(db, { maxRows: 5 });
  assert.equal((await readPromotionHoldEvents({ supabase: exact.supabase, userId: USER, routineDayExerciseIds: ["rde-1"] })).length, 60);
  assert.equal(exact.calls.filter((call) => call.table === "progression_events").length, 13);
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

// --- Review round 5 (P2): a database read error is never "missing" ----------------------------------
// not_available is final (the client drops the pin), so a transient read error must throw instead; the
// action catches it and returns PROGRESSION_REVERT_MESSAGES.failed, which keeps the pin.

/** The revert action's error handling around the real repository (actions.ts catches a throw). */
async function revertLikeAction(db: Record<string, Row[]>, targets: RevertPin[], hooks: FakeHooks = {}) {
  const fake = createSupabaseFake(db, hooks);
  let thrown: unknown = null;
  let result: { ok: true } | { ok: false; error: string };
  try {
    result = await runProgressionRevert(
      createManualPromotionRepository({ supabase: fake.supabase, userId: USER, routineId: ROUTINE }),
      targets,
    );
  } catch (error) {
    thrown = error;
    result = { ok: false, error: PROGRESSION_REVERT_MESSAGES.failed };
  }
  return { result, thrown, calls: fake.calls };
}

for (const table of ["routine_day_exercises", "routine_days"]) {
  test(`revert: a ${table} read that fails once keeps the pin with a retryable error, writes nothing, and a retry works`, async () => {
    const db = seed();
    const first = await promote(db);
    assert.equal(first.result.ok, true);
    const pin = first.result.ok
      ? { routineDayExerciseId: "rde-1", previousTarget: first.result.data.previousTarget, appliedTarget: first.result.data.appliedTarget }
      : null;
    assert.ok(pin);

    let failures = 0;
    const flaky = await revertLikeAction(db, [pin], {
      fail: (call) => call.table === table && call.op === "select" && failures++ === 0,
    });
    assert.ok(flaky.thrown instanceof ProgressionMutationReadError, "a read error throws instead of reading as missing");
    assert.deepEqual(flaky.result, { ok: false, error: PROGRESSION_REVERT_MESSAGES.failed });
    assert.equal(shouldDropProgressionPinAfterRevert(flaky.result), false, "the pin is kept");
    assert.equal(flaky.calls.filter((call) => call.op !== "select").length, 0, "nothing written");
    assert.equal(target(db), 11);

    const retry = await revertLikeAction(db, [pin]);
    assert.deepEqual(retry.result, { ok: true });
    assert.equal(target(db), 10);
  });
}

test("revert: a routine slot that is really gone is not_available and drops the pin", async () => {
  const db = seed();
  const first = await promote(db);
  const pin = first.result.ok
    ? { routineDayExerciseId: "rde-1", previousTarget: first.result.data.previousTarget, appliedTarget: first.result.data.appliedTarget }
    : null;
  assert.ok(pin);
  db.routine_day_exercises = db.routine_day_exercises.filter((row) => row.id !== "rde-1");

  const gone = await revertLikeAction(db, [pin]);
  assert.equal(gone.thrown, null);
  assert.deepEqual(gone.result, { ok: false, error: PROGRESSION_REVERT_MESSAGES.not_available });
  assert.equal(shouldDropProgressionPinAfterRevert(gone.result), true);
  assert.equal(gone.calls.filter((call) => call.op !== "select").length, 0);
});

test("promote: a read error throws (retryable) instead of refusing as not_owned; nothing written", async () => {
  for (const table of ["routine_day_exercises", "routine_days", "routines", "exercises"]) {
    const db = seed();
    const fake = createSupabaseFake(db, { fail: (call) => call.table === table && call.op === "select" });
    await assert.rejects(
      runManualPromotion(
        createManualPromotionRepository({ supabase: fake.supabase, userId: USER, routineId: ROUTINE }),
        { routineDayExerciseId: "rde-1", expectedFromTarget: planFor(db) },
      ),
      ProgressionMutationReadError,
      `${table} read error`,
    );
    assert.equal(fake.calls.filter((call) => call.op !== "select").length, 0, `${table}: nothing written`);
    assert.equal(target(db), 10);
  }
});
