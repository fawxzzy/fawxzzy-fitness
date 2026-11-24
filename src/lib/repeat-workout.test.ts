import assert from "node:assert/strict";
import test from "node:test";
import {
  getRepeatWorkoutAvailability,
  pickMostLinkedDayId,
  planRepeatWorkout,
  REPEAT_WORKOUT_DAY_GONE_MESSAGE,
  REPEAT_WORKOUT_FAILED_MESSAGE,
  REPEAT_WORKOUT_IN_PROGRESS_MESSAGE,
  REPEAT_WORKOUT_NO_DAY_MESSAGE,
  REPEAT_WORKOUT_NOT_FOUND_MESSAGE,
  REPEAT_WORKOUT_ROUTINE_GONE_MESSAGE,
  REPEAT_WORKOUT_ROUTINE_INACTIVE_MESSAGE,
  RepeatWorkoutLoadError,
  type RepeatWorkoutDay,
  type RepeatWorkoutDeps,
  type RepeatWorkoutSource,
} from "./repeat-workout.ts";

const SOURCE: RepeatWorkoutSource = {
  id: "s-old",
  status: "completed",
  routine_id: "r1",
  routine_day_index: 2,
};

function day(overrides: Partial<RepeatWorkoutDay> = {}): RepeatWorkoutDay {
  return { id: "d2", day_index: 2, ...overrides };
}

function makeDeps(overrides: Partial<RepeatWorkoutDeps> & { calls?: string[] } = {}): RepeatWorkoutDeps {
  const calls = overrides.calls ?? [];
  const deps: RepeatWorkoutDeps = {
    loadSourceSession: async () => SOURCE,
    loadActiveRoutineId: async () => "r1",
    loadInProgressSessionId: async () => null,
    routineExists: async () => true,
    loadLinkedDayIds: async () => [],
    loadDayById: async () => null,
    loadDayAtIndex: async () => day(),
  };
  const merged = { ...deps, ...overrides } as RepeatWorkoutDeps;
  // Record which loaders ran so a test can prove nothing past a decision was read.
  return new Proxy(merged, {
    get(target, prop: string) {
      const value = target[prop as keyof RepeatWorkoutDeps];
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        calls.push(prop);
        return (value as (...a: unknown[]) => unknown)(...args);
      };
    },
  });
}

test("availability: only a routine-day session from the ACTIVE routine can be repeated (with a plain reason otherwise)", () => {
  assert.deepEqual(getRepeatWorkoutAvailability({ routine_id: "r1", routine_day_index: 3 }, "r1"), { available: true });
  assert.deepEqual(getRepeatWorkoutAvailability({ routine_id: "r1", routine_day_index: 0 }, "r1"), { available: true });
  assert.deepEqual(getRepeatWorkoutAvailability({ routine_id: null, routine_day_index: 3 }, "r1"), { available: false, reason: REPEAT_WORKOUT_NO_DAY_MESSAGE });
  assert.deepEqual(getRepeatWorkoutAvailability({ routine_id: "r1", routine_day_index: null }, "r1"), { available: false, reason: REPEAT_WORKOUT_NO_DAY_MESSAGE });
  assert.equal(getRepeatWorkoutAvailability(null, "r1").available, false);
});

test("availability: a routine that is not the active one is disabled with the plain switch-routine reason", () => {
  const expected = { available: false, reason: "This workout belongs to a routine that isn't active. Switch to it in Routines to repeat it." };
  assert.deepEqual(getRepeatWorkoutAvailability({ routine_id: "r1", routine_day_index: 3 }, "r2"), expected);
  assert.deepEqual(getRepeatWorkoutAvailability({ routine_id: "r1", routine_day_index: 3 }, null), expected);
  assert.deepEqual(getRepeatWorkoutAvailability({ routine_id: "r1", routine_day_index: 3 }, undefined), expected);
  assert.equal(REPEAT_WORKOUT_ROUTINE_INACTIVE_MESSAGE, expected.reason);
});

test("copy never uses the word Target and always reads as a sentence", () => {
  for (const message of [
    REPEAT_WORKOUT_NO_DAY_MESSAGE,
    REPEAT_WORKOUT_NOT_FOUND_MESSAGE,
    REPEAT_WORKOUT_ROUTINE_INACTIVE_MESSAGE,
    REPEAT_WORKOUT_ROUTINE_GONE_MESSAGE,
    REPEAT_WORKOUT_DAY_GONE_MESSAGE,
    REPEAT_WORKOUT_IN_PROGRESS_MESSAGE,
    REPEAT_WORKOUT_FAILED_MESSAGE,
  ]) {
    assert.doesNotMatch(message, /target/i);
    assert.match(message, /\.$/);
  }
});

test("most linked day wins, first seen breaks ties, empty gives null", () => {
  assert.equal(pickMostLinkedDayId(["a", "b", "b"]), "b");
  assert.equal(pickMostLinkedDayId(["a", "b"]), "a");
  assert.equal(pickMostLinkedDayId([]), null);
});

test("a missing or unfinished source session is refused as not found", async () => {
  const missing = await planRepeatWorkout(makeDeps({ loadSourceSession: async () => null }), "s-old");
  assert.deepEqual(missing, { kind: "refuse", code: "not_found", message: REPEAT_WORKOUT_NOT_FOUND_MESSAGE });
  const unfinished = await planRepeatWorkout(makeDeps({ loadSourceSession: async () => ({ ...SOURCE, status: "in_progress" }) }), "s-old");
  assert.equal(unfinished.kind === "refuse" && unfinished.code, "not_found");
});

test("an ad-hoc session (no routine day) is refused before anything else is read", async () => {
  const calls: string[] = [];
  const plan = await planRepeatWorkout(
    makeDeps({ calls, loadSourceSession: async () => ({ ...SOURCE, routine_id: null }) }),
    "s-old",
  );
  assert.deepEqual(plan, { kind: "refuse", code: "no_day", message: REPEAT_WORKOUT_NO_DAY_MESSAGE });
  assert.deepEqual(calls, ["loadSourceSession"]);
});

test("a session from an inactive routine is refused and nothing past the active-routine check is read or started", async () => {
  const calls: string[] = [];
  const plan = await planRepeatWorkout(makeDeps({ calls, loadActiveRoutineId: async () => "r-other" }), "s-old");
  assert.deepEqual(plan, { kind: "refuse", code: "routine_inactive", message: REPEAT_WORKOUT_ROUTINE_INACTIVE_MESSAGE });
  assert.deepEqual(calls, ["loadSourceSession", "loadActiveRoutineId"]);

  const none = await planRepeatWorkout(makeDeps({ loadActiveRoutineId: async () => null }), "s-old");
  assert.equal(none.kind === "refuse" && none.code, "routine_inactive");
});

test("an inactive routine is refused even when a workout is in progress (never opened through a hand-made request)", async () => {
  const plan = await planRepeatWorkout(
    makeDeps({ loadActiveRoutineId: async () => "r-other", loadInProgressSessionId: async () => "s-live" }),
    "s-old",
  );
  assert.equal(plan.kind, "refuse");
});

test("a workout already in progress is opened, never a second one started", async () => {
  const calls: string[] = [];
  const plan = await planRepeatWorkout(makeDeps({ calls, loadInProgressSessionId: async () => "s-live" }), "s-old");
  assert.deepEqual(plan, { kind: "open_existing", sessionId: "s-live", message: REPEAT_WORKOUT_IN_PROGRESS_MESSAGE });
  assert.ok(!calls.includes("loadDayAtIndex") && !calls.includes("loadDayById"), "no day is resolved when a session is live");
});

test("a deleted routine is refused with a plain reason", async () => {
  const plan = await planRepeatWorkout(makeDeps({ routineExists: async () => false }), "s-old");
  assert.deepEqual(plan, { kind: "refuse", code: "routine_gone", message: REPEAT_WORKOUT_ROUTINE_GONE_MESSAGE });
});

test("the day is found through its exercises, so a reordered routine still repeats the same day", async () => {
  const plan = await planRepeatWorkout(
    makeDeps({
      loadLinkedDayIds: async () => ["d7", "d7", "d9"],
      loadDayById: async (_routineId, dayId) => day({ id: dayId, day_index: 5 }),
      loadDayAtIndex: async () => day({ id: "other" }),
    }),
    "s-old",
  );
  assert.deepEqual(plan, { kind: "start", routineId: "r1", dayId: "d7" });
});

test("a renamed day still repeats: the exercise link wins and the title is never consulted", async () => {
  const calls: string[] = [];
  const plan = await planRepeatWorkout(
    makeDeps({
      calls,
      loadLinkedDayIds: async () => ["d2"],
      loadDayById: async () => day({ id: "d2" }),
    }),
    "s-old",
  );
  assert.deepEqual(plan, { kind: "start", routineId: "r1", dayId: "d2" });
  assert.ok(!calls.includes("loadDayAtIndex"), "position is only a fallback");
});

test("with no usable exercise link the day at the same position is used, whatever it is now called", async () => {
  const plan = await planRepeatWorkout(makeDeps({ loadDayAtIndex: async () => day({ id: "d-any" }) }), "s-old");
  assert.deepEqual(plan, { kind: "start", routineId: "r1", dayId: "d-any" });
});

test("a linked day that no longer loads falls back to the position", async () => {
  const plan = await planRepeatWorkout(
    makeDeps({ loadLinkedDayIds: async () => ["d-deleted"], loadDayById: async () => null, loadDayAtIndex: async () => day({ id: "d-pos" }) }),
    "s-old",
  );
  assert.deepEqual(plan, { kind: "start", routineId: "r1", dayId: "d-pos" });
});

test("with nothing linked and nothing at that position the day is gone", async () => {
  const plan = await planRepeatWorkout(makeDeps({ loadDayAtIndex: async () => null }), "s-old");
  assert.deepEqual(plan, { kind: "refuse", code: "day_gone", message: REPEAT_WORKOUT_DAY_GONE_MESSAGE });
});

test("a loader that fails refuses with the failure message, never as 'nothing found'", async () => {
  const failing = () => {
    throw new RepeatWorkoutLoadError();
  };
  const cases: Array<Partial<RepeatWorkoutDeps>> = [
    { loadSourceSession: failing },
    { loadActiveRoutineId: failing },
    { loadInProgressSessionId: failing },
    { routineExists: failing },
    { loadLinkedDayIds: failing },
    { loadLinkedDayIds: async () => ["d1"], loadDayById: failing },
    { loadDayAtIndex: failing },
  ];
  for (const overrides of cases) {
    const plan = await planRepeatWorkout(makeDeps(overrides), "s-old");
    assert.deepEqual(plan, { kind: "refuse", code: "failed", message: REPEAT_WORKOUT_FAILED_MESSAGE }, JSON.stringify(Object.keys(overrides)));
  }
});

test("an unexpected error (for example the sign-in redirect) is not swallowed as a refusal", async () => {
  await assert.rejects(
    planRepeatWorkout(makeDeps({ loadSourceSession: async () => Promise.reject(new Error("boom")) }), "s-old"),
    /boom/,
  );
});

test("the plan only ever reads: no loader writes and the old session id is never part of a start", async () => {
  const plan = await planRepeatWorkout(makeDeps(), "s-old");
  assert.equal(plan.kind, "start");
  assert.deepEqual(Object.keys(plan).sort(), ["dayId", "kind", "routineId"]);
});
