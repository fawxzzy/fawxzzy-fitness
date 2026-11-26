import assert from "node:assert/strict";
import test from "node:test";
import {
  describeStarterAddOnly,
  pickStarterRaceWinner,
  resolveStarterActivation,
  resolveTodayNoRoutineState,
  STARTER_ADDED_NOT_ACTIVE_MESSAGE,
  STARTER_ADDED_WORKOUT_OPEN_MESSAGE,
  TODAY_PICK_ROUTINE_LIMIT,
} from "./start-fast-guards";
import {
  clearActiveRoutineIfMatches,
  findStarterRaceWinner,
  loadTodayNoRoutineState,
  readStarterActivationInput,
} from "./start-fast-state.server";

// PR #324 review guards: starter plans only on a true first run, a starter never replaces an active routine or moves
// the pointer under an open workout, a rollback clears a pointer it left behind, and two racing taps keep one routine.

const routines = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `r-${index + 1}`, name: `Routine ${index + 1}` }));

test("Today with no active routine: starter plans only when there are no routines and no finished workouts", () => {
  assert.deepEqual(resolveTodayNoRoutineState({ liveRoutines: [], archivedRoutineCount: 0, completedWorkoutCount: 0 }), { kind: "starters" });
});

test("live routines but none active (Build my own, or the active one was archived): pick one of yours, never plans", () => {
  assert.deepEqual(resolveTodayNoRoutineState({ liveRoutines: routines(1), archivedRoutineCount: 0, completedWorkoutCount: 0 }), {
    kind: "pick-routine",
    routines: [{ id: "r-1", name: "Routine 1" }],
    moreCount: 0,
  });
  const many = resolveTodayNoRoutineState({ liveRoutines: routines(5), archivedRoutineCount: 2, completedWorkoutCount: 9 });
  assert.equal(many.kind, "pick-routine");
  if (many.kind === "pick-routine") {
    assert.equal(many.routines.length, TODAY_PICK_ROUTINE_LIMIT);
    assert.equal(many.moreCount, 5 - TODAY_PICK_ROUTINE_LIMIT);
  }
});

test("every routine archived: plans with Restore a routine, even with workouts logged", () => {
  assert.deepEqual(resolveTodayNoRoutineState({ liveRoutines: [], archivedRoutineCount: 2, completedWorkoutCount: 0 }), { kind: "starters-with-restore" });
  assert.deepEqual(resolveTodayNoRoutineState({ liveRoutines: [], archivedRoutineCount: 1, completedWorkoutCount: 4 }), { kind: "starters-with-restore" });
});

test("workouts logged but no routines left, or any unreadable count: the plain Choose a routine card", () => {
  assert.deepEqual(resolveTodayNoRoutineState({ liveRoutines: [], archivedRoutineCount: 0, completedWorkoutCount: 3 }), { kind: "choose" });
  assert.deepEqual(resolveTodayNoRoutineState({ liveRoutines: null, archivedRoutineCount: 0, completedWorkoutCount: 0 }), { kind: "choose" });
  assert.deepEqual(resolveTodayNoRoutineState({ liveRoutines: [], archivedRoutineCount: null, completedWorkoutCount: 0 }), { kind: "choose" });
  assert.deepEqual(resolveTodayNoRoutineState({ liveRoutines: [], archivedRoutineCount: 0, completedWorkoutCount: null }), { kind: "choose" });
});

test("a starter plan activates only when nothing live is active and no workout is open", () => {
  const base = { routineId: "new", activeRoutineId: null, hasLiveActiveRoutine: false, hasOpenWorkout: false };
  assert.deepEqual(resolveStarterActivation(base), { kind: "activate" });
  assert.deepEqual(resolveStarterActivation({ ...base, activeRoutineId: "old", hasLiveActiveRoutine: true }), { kind: "add-only", reason: "has-active-routine" });
  assert.deepEqual(resolveStarterActivation({ ...base, hasOpenWorkout: true }), { kind: "add-only", reason: "open-workout" });
  assert.deepEqual(
    resolveStarterActivation({ ...base, activeRoutineId: "old", hasLiveActiveRoutine: true, hasOpenWorkout: true }),
    { kind: "add-only", reason: "open-workout" },
    "an open workout wins: the pointer never moves under it",
  );
  assert.deepEqual(resolveStarterActivation({ ...base, activeRoutineId: "archived", hasLiveActiveRoutine: false }), { kind: "activate" }, "a pointer to an archived routine counts as none");
  assert.deepEqual(resolveStarterActivation({ ...base, hasOpenWorkout: null }), { kind: "add-only", reason: "unknown" });
  assert.deepEqual(resolveStarterActivation({ ...base, hasLiveActiveRoutine: null }), { kind: "add-only", reason: "unknown" });
  assert.deepEqual(
    resolveStarterActivation({ ...base, activeRoutineId: "new", hasLiveActiveRoutine: true, hasOpenWorkout: true }),
    { kind: "already-active" },
    "a replay or race whose routine is already active needs no write",
  );
});

test("the add-only notice tells people how to switch", () => {
  assert.equal(describeStarterAddOnly("has-active-routine"), STARTER_ADDED_NOT_ACTIVE_MESSAGE);
  assert.equal(describeStarterAddOnly("unknown"), STARTER_ADDED_NOT_ACTIVE_MESSAGE);
  assert.equal(describeStarterAddOnly("open-workout"), STARTER_ADDED_WORKOUT_OPEN_MESSAGE);
  assert.equal(STARTER_ADDED_NOT_ACTIVE_MESSAGE, "Added. Switch to it from Routines.");
});

test("racing taps: every racer picks the same survivor (earliest created_at, then smallest id)", () => {
  assert.equal(pickStarterRaceWinner([]), null);
  const rows = [
    { id: "b", created_at: "2026-11-26T10:00:00.200Z" },
    { id: "a", created_at: "2026-11-26T10:00:00.500Z" },
  ];
  assert.equal(pickStarterRaceWinner(rows), "b");
  assert.equal(pickStarterRaceWinner([...rows].reverse()), "b", "order does not matter");
  assert.equal(pickStarterRaceWinner([{ id: "z", created_at: "2026-11-26T10:00:00Z" }, { id: "y", created_at: "2026-11-26T10:00:00Z" }]), "y");
  assert.equal(pickStarterRaceWinner([{ id: "a", created_at: null }, { id: "b", created_at: "2026-11-26T10:00:00Z" }]), "b", "an unreadable time never wins over a real one");
});

// ---- server readers, against a recording fake client ------------------------------------------------------------

type Call = [method: string, ...args: unknown[]];
type Result = { data: unknown; error: { message: string } | null; status?: number };

function fakeSupabase(respond: (table: string, calls: Call[]) => Result) {
  const log: Array<{ table: string; calls: Call[] }> = [];
  const client = {
    from(table: string) {
      const calls: Call[] = [];
      log.push({ table, calls });
      const builder: Record<string, unknown> = {};
      for (const method of ["select", "update", "delete", "insert", "eq", "gte", "in", "order", "limit", "maybeSingle", "single", "returns"]) {
        builder[method] = (...args: unknown[]) => {
          calls.push([method, ...args]);
          return builder;
        };
      }
      builder.then = (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) => {
        try {
          return Promise.resolve(respond(table, calls)).then(resolve, reject);
        } catch (error) {
          return Promise.reject(error).then(resolve, reject);
        }
      };
      return builder;
    },
  };
  return { client: client as never, log };
}

const hasCall = (calls: Call[], method: string, ...args: unknown[]) => calls.some((call) => call[0] === method && args.every((arg, index) => call[index + 1] === arg));

test("rollback clears the active pointer only while it still names that routine", async () => {
  const { client, log } = fakeSupabase(() => ({ data: null, error: null }));
  assert.equal(await clearActiveRoutineIfMatches(client, "user-1", "routine-9"), true);
  assert.equal(log.length, 1);
  assert.equal(log[0].table, "profiles");
  assert.deepEqual(log[0].calls.find((call) => call[0] === "update"), ["update", { active_routine_id: null }]);
  assert.ok(hasCall(log[0].calls, "eq", "id", "user-1"));
  assert.ok(hasCall(log[0].calls, "eq", "active_routine_id", "routine-9"), "conditional: a newer choice is never undone");

  const failing = fakeSupabase(() => ({ data: null, error: { message: "boom" } }));
  assert.equal(await clearActiveRoutineIfMatches(failing.client, "user-1", "routine-9"), false);
});

test("activation input reads the open workout and whether the active pointer is live", async () => {
  const respond = (state: { open: boolean; pointer: string | null; archived: boolean }) => (table: string): Result => {
    if (table === "sessions") return { data: state.open ? [{ id: "s" }] : [], error: null };
    if (table === "profiles") return { data: { active_routine_id: state.pointer }, error: null };
    return { data: state.pointer ? { id: state.pointer, archived_at: state.archived ? "2026-11-01T00:00:00Z" : null } : null, error: null };
  };
  assert.deepEqual(
    await readStarterActivationInput(fakeSupabase(respond({ open: false, pointer: null, archived: false })).client, "u", "new"),
    { routineId: "new", activeRoutineId: null, hasLiveActiveRoutine: false, hasOpenWorkout: false },
  );
  assert.deepEqual(
    await readStarterActivationInput(fakeSupabase(respond({ open: true, pointer: "old", archived: false })).client, "u", "new"),
    { routineId: "new", activeRoutineId: "old", hasLiveActiveRoutine: true, hasOpenWorkout: true },
  );
  assert.deepEqual(
    await readStarterActivationInput(fakeSupabase(respond({ open: false, pointer: "old", archived: true })).client, "u", "new"),
    { routineId: "new", activeRoutineId: "old", hasLiveActiveRoutine: false, hasOpenWorkout: false },
  );
  const broken = await readStarterActivationInput(fakeSupabase(() => ({ data: null, error: { message: "down" } })).client, "u", "new");
  assert.equal(broken.hasOpenWorkout, null);
  assert.equal(broken.hasLiveActiveRoutine, null);
  assert.deepEqual(resolveStarterActivation(broken), { kind: "add-only", reason: "unknown" }, "unreadable state never activates");
});

test("the race check looks at this name in the last minute and skips archived rows", async () => {
  const { client, log } = fakeSupabase(() => ({
    data: [
      { id: "late", name: "Full body", created_at: "2026-11-26T10:00:01Z", archived_at: null },
      { id: "archived-early", name: "Full body", created_at: "2026-11-26T09:59:59Z", archived_at: "2026-11-26T10:00:00Z" },
      { id: "early", name: "Full body", created_at: "2026-11-26T10:00:00Z", archived_at: null },
    ],
    error: null,
  }));
  assert.equal(await findStarterRaceWinner(client, "u", "Full body"), "early");
  assert.ok(hasCall(log[0].calls, "eq", "name", "Full body"));
  assert.ok(log[0].calls.some((call) => call[0] === "gte" && call[1] === "created_at"));

  const broken = fakeSupabase(() => ({ data: null, error: { message: "down" } }));
  assert.equal(await findStarterRaceWinner(broken.client, "u", "Full body"), null, "an unreadable check keeps our routine");
});

test("Today's loader splits live and archived routines and counts finished workouts", async () => {
  const load = (routineRows: unknown[] | null, completed: unknown[] | null) => loadTodayNoRoutineState(
    fakeSupabase((table) => (table === "routines"
      ? { data: routineRows, error: routineRows ? null : { message: "down" } }
      : { data: completed, error: completed ? null : { message: "down" } })).client,
    "u",
  );
  const archived = { id: "a", name: "Old", created_at: null, archived_at: "2026-11-01T00:00:00Z" };
  const live = { id: "l", name: "  ", created_at: null, archived_at: null };

  assert.deepEqual(await load([], []), { kind: "starters" });
  assert.deepEqual(await load([archived], []), { kind: "starters-with-restore" });
  assert.deepEqual(await load([archived, live], [{ id: "s" }]), { kind: "pick-routine", routines: [{ id: "l", name: "Untitled routine" }], moreCount: 0 });
  assert.deepEqual(await load([], [{ id: "s" }]), { kind: "choose" });
  assert.deepEqual(await load(null, []), { kind: "choose" });
  assert.deepEqual(await load([], null), { kind: "choose" });
});
