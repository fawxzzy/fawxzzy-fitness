import test from "node:test";
import assert from "node:assert/strict";

import {
  REST_TIMER_DEFAULT_SECONDS,
  REST_TIMER_DONE_LINGER_MS,
  REST_TIMER_MAX_SECONDS,
  adjustRestTimer,
  describeDuration,
  didLogNewSet,
  formatElapsedClock,
  getRestProgress,
  getRestRemainingSeconds,
  getRestTimerStorageKey,
  isRestTimerExpired,
  readStoredRestTimer,
  startRestTimer,
  writeStoredRestTimer,
} from "./restTimerModel";

const T0 = 1_800_000_000_000;

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

test("a rest starts at 90 seconds and counts down from the wall clock", () => {
  const state = startRestTimer(T0);
  assert.equal(REST_TIMER_DEFAULT_SECONDS, 90);
  assert.equal(getRestRemainingSeconds(state, T0), 90);
  assert.equal(getRestRemainingSeconds(state, T0 + 30_400), 60, "partial seconds round up, so 0:00 only shows at the end");
  assert.equal(getRestRemainingSeconds(state, T0 + 95_000), 0);
  assert.equal(getRestProgress(state, T0 + 45_000), 0.5);
});

test("+15 adds time and grows the bar; -15 takes time off; -15 past zero ends the rest", () => {
  const state = startRestTimer(T0);
  const plus = adjustRestTimer(state, 15, T0 + 10_000);
  assert.ok(plus);
  assert.equal(getRestRemainingSeconds(plus, T0 + 10_000), 95);
  assert.equal(plus.totalSeconds, 105);

  const minus = adjustRestTimer(state, -15, T0 + 10_000);
  assert.ok(minus);
  assert.equal(getRestRemainingSeconds(minus, T0 + 10_000), 65);
  assert.equal(minus.totalSeconds, 90);

  assert.equal(adjustRestTimer(state, -15, T0 + 80_000), null, "10s left minus 15 is a skip");
  assert.equal(adjustRestTimer(null, -15, T0), null);
});

test("the rest never goes past 10 minutes", () => {
  let state = startRestTimer(T0, 590);
  state = adjustRestTimer(state, 15, T0)!;
  assert.equal(getRestRemainingSeconds(state, T0), REST_TIMER_MAX_SECONDS);
  assert.equal(startRestTimer(T0, 9999).totalSeconds, REST_TIMER_MAX_SECONDS);
});

test("the done state lingers briefly, then the timer hides", () => {
  const state = startRestTimer(T0);
  assert.equal(isRestTimerExpired(state, T0 + 90_000), false);
  assert.equal(isRestTimerExpired(state, T0 + 90_000 + REST_TIMER_DONE_LINGER_MS), true);
  assert.equal(isRestTimerExpired(null, T0), true);
});

test("the countdown survives a reload through sessionStorage, per session, and expired or broken entries are ignored", () => {
  const storage = memoryStorage();
  const state = startRestTimer(T0);
  writeStoredRestTimer(storage, "s1", state);
  assert.deepEqual(readStoredRestTimer(storage, "s1", T0 + 5_000), state);
  assert.equal(readStoredRestTimer(storage, "s2", T0), null, "another workout never inherits it");
  assert.equal(readStoredRestTimer(storage, "s1", T0 + 200_000), null);

  storage.setItem(getRestTimerStorageKey("s1"), "{not json");
  assert.equal(readStoredRestTimer(storage, "s1", T0), null);
  storage.setItem(getRestTimerStorageKey("s1"), JSON.stringify({ endsAt: "soon" }));
  assert.equal(readStoredRestTimer(storage, "s1", T0), null);

  writeStoredRestTimer(storage, "s1", null);
  assert.equal(storage.map.size, 0);
  assert.equal(readStoredRestTimer(null, "s1", T0), null);
});

test("storage that throws (private mode) never breaks the timer", () => {
  const throwing = {
    getItem: () => { throw new Error("denied"); },
    setItem: () => { throw new Error("denied"); },
    removeItem: () => { throw new Error("denied"); },
  };
  assert.doesNotThrow(() => writeStoredRestTimer(throwing, "s1", startRestTimer(T0)));
  assert.equal(readStoredRestTimer(throwing, "s1", T0), null);
});

test("workout clock reads m:ss, then h:mm:ss past an hour", () => {
  assert.equal(formatElapsedClock(0), "0:00");
  assert.equal(formatElapsedClock(65), "1:05");
  assert.equal(formatElapsedClock(3599), "59:59");
  assert.equal(formatElapsedClock(3723), "1:02:03");
  assert.equal(formatElapsedClock(-4), "0:00");
  assert.equal(formatElapsedClock(Number.NaN), "0:00");
});

test("durations in words for screen readers", () => {
  assert.equal(describeDuration(45), "45 seconds");
  assert.equal(describeDuration(60), "1 minute");
  assert.equal(describeDuration(754), "12 minutes");
  assert.equal(describeDuration(3900), "1 hour 5 minutes");
  assert.equal(describeDuration(90, true), "1 minute 30 seconds");
  assert.equal(describeDuration(3901, true), "1 hour 5 minutes", "no seconds past an hour");
});

test("a rest starts only when the logged set total goes up, never on the first render", () => {
  assert.equal(didLogNewSet(null, 3), false);
  assert.equal(didLogNewSet(3, 3), false);
  assert.equal(didLogNewSet(3, 2), false, "deleting a set is not a log");
  assert.equal(didLogNewSet(3, 5), true, "Log all counts once");
});
