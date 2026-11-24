import assert from "node:assert/strict";
import test from "node:test";
import {
  getRepeatWorkoutAvailability,
  pickMostLinkedDayId,
  planRepeatWorkout,
  readCustomTitleFromSessionDayName,
  REPEAT_WORKOUT_DAY_CHANGED_MESSAGE,
  REPEAT_WORKOUT_DAY_GONE_MESSAGE,
  REPEAT_WORKOUT_IN_PROGRESS_MESSAGE,
  REPEAT_WORKOUT_NO_DAY_MESSAGE,
  REPEAT_WORKOUT_NOT_FOUND_MESSAGE,
  REPEAT_WORKOUT_ROUTINE_GONE_MESSAGE,
  type RepeatWorkoutDay,
  type RepeatWorkoutDeps,
  type RepeatWorkoutSource,
} from "./repeat-workout.ts";

const SOURCE: RepeatWorkoutSource = {
  id: "s-old",
  status: "completed",
  routine_id: "r1",
  routine_day_index: 2,
  routine_day_name: "Tue | Push",
};

function day(overrides: Partial<RepeatWorkoutDay> = {}): RepeatWorkoutDay {
  return { id: "d2", name: "Push", day_index: 2, start_date: null, ...overrides };
}

function makeDeps(overrides: Partial<RepeatWorkoutDeps> & { calls?: string[] } = {}): RepeatWorkoutDeps {
  const calls = overrides.calls ?? [];
  const deps: RepeatWorkoutDeps = {
    loadSourceSession: async () => SOURCE,
    loadInProgressSessionId: async () => null,
    routineExists: async () => true,
    loadLinkedDayIds: async () => [],
    loadDayById: async () => null,
    loadDayAtIndex: async () => day(),
    readCustomDayName: (candidate) => candidate.name ?? "",
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

test("availability: a session from a routine day can be repeated, an ad-hoc one cannot (with a plain reason)", () => {
  assert.deepEqual(getRepeatWorkoutAvailability({ routine_id: "r1", routine_day_index: 3 }), { available: true });
  assert.deepEqual(getRepeatWorkoutAvailability({ routine_id: "r1", routine_day_index: 0 }), { available: true });
  assert.deepEqual(getRepeatWorkoutAvailability({ routine_id: null, routine_day_index: 3 }), { available: false, reason: REPEAT_WORKOUT_NO_DAY_MESSAGE });
  assert.deepEqual(getRepeatWorkoutAvailability({ routine_id: "r1", routine_day_index: null }), { available: false, reason: REPEAT_WORKOUT_NO_DAY_MESSAGE });
  assert.equal(getRepeatWorkoutAvailability(null).available, false);
});

test("copy never uses the word Target and never reads as an error code", () => {
  for (const message of [
    REPEAT_WORKOUT_NO_DAY_MESSAGE,
    REPEAT_WORKOUT_NOT_FOUND_MESSAGE,
    REPEAT_WORKOUT_ROUTINE_GONE_MESSAGE,
    REPEAT_WORKOUT_DAY_GONE_MESSAGE,
    REPEAT_WORKOUT_DAY_CHANGED_MESSAGE,
    REPEAT_WORKOUT_IN_PROGRESS_MESSAGE,
  ]) {
    assert.doesNotMatch(message, /target/i);
    assert.match(message, /\.$/);
  }
});

test("title parsing: weekday-only names have no custom title", () => {
  assert.equal(readCustomTitleFromSessionDayName("Tue | Push"), "Push");
  assert.equal(readCustomTitleFromSessionDayName("Tue | Upper | Heavy"), "Upper | Heavy");
  assert.equal(readCustomTitleFromSessionDayName("Tue"), null);
  assert.equal(readCustomTitleFromSessionDayName(null), null);
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
      loadDayAtIndex: async () => day({ id: "other", name: "Legs" }),
    }),
    "s-old",
  );
  assert.deepEqual(plan, { kind: "start", routineId: "r1", dayId: "d7" });
});

test("with no usable exercise link the day at the same position is used when its title still matches", async () => {
  const plan = await planRepeatWorkout(makeDeps({ readCustomDayName: () => "push" }), "s-old");
  assert.deepEqual(plan, { kind: "start", routineId: "r1", dayId: "d2" });
});

test("a day that moved away from that position is refused, not guessed", async () => {
  const plan = await planRepeatWorkout(makeDeps({ loadDayAtIndex: async () => null }), "s-old");
  assert.deepEqual(plan, { kind: "refuse", code: "day_gone", message: REPEAT_WORKOUT_DAY_GONE_MESSAGE });
});

test("a different day now sits at that position: refused as changed", async () => {
  const plan = await planRepeatWorkout(
    makeDeps({ loadDayAtIndex: async () => day({ id: "d-legs", name: "Legs" }) }),
    "s-old",
  );
  assert.deepEqual(plan, { kind: "refuse", code: "day_changed", message: REPEAT_WORKOUT_DAY_CHANGED_MESSAGE });
});

test("a session that only had a weekday name has no title to compare, so the position match is accepted", async () => {
  const plan = await planRepeatWorkout(
    makeDeps({
      loadSourceSession: async () => ({ ...SOURCE, routine_day_name: "Tue" }),
      loadDayAtIndex: async () => day({ id: "d-any", name: "Anything" }),
    }),
    "s-old",
  );
  assert.deepEqual(plan, { kind: "start", routineId: "r1", dayId: "d-any" });
});

test("the plan only ever reads: no loader writes and the old session id is never part of a start", async () => {
  const plan = await planRepeatWorkout(makeDeps(), "s-old");
  assert.equal(plan.kind, "start");
  assert.deepEqual(Object.keys(plan).sort(), ["dayId", "kind", "routineId"]);
});
