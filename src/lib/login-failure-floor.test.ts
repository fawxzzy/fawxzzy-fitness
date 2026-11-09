import assert from "node:assert/strict";
import test from "node:test";

import { enforceLoginFailureFloor, LOGIN_FAILURE_JITTER_MS, LOGIN_FAILURE_MIN_MS } from "./login-failure-floor.ts";

function clock(startAt = 1_000) {
  let current = startAt;
  const sleeps: number[] = [];
  return {
    sleeps,
    advance(ms: number) { current += ms; },
    now: () => current,
    sleep: async (ms: number) => { sleeps.push(ms); current += ms; },
  };
}

test("pads a fast failure up to the floor plus jitter", async () => {
  const c = clock();
  const waited = await enforceLoginFailureFloor(1_000, { ...c, random: () => 0 });
  assert.equal(waited, LOGIN_FAILURE_MIN_MS);
  assert.deepEqual(c.sleeps, [LOGIN_FAILURE_MIN_MS]);
  assert.equal(
    await enforceLoginFailureFloor(1_000, { ...clock(), random: () => 1 }),
    LOGIN_FAILURE_MIN_MS + LOGIN_FAILURE_JITTER_MS,
  );
});

test("only waits for the remaining time when the failure was already slow", async () => {
  const c = clock();
  c.advance(500);
  assert.equal(await enforceLoginFailureFloor(1_000, { ...c, random: () => 0 }), 200);
  const slow = clock();
  slow.advance(5_000);
  assert.equal(await enforceLoginFailureFloor(1_000, { ...slow, random: () => 1 }), 0);
  assert.deepEqual(slow.sleeps, []);
});

test("jitter varies the total and out-of-range random values are clamped", async () => {
  const totals = new Set<number>();
  for (const random of [0, 0.25, 0.5, 0.75, 1]) {
    totals.add(await enforceLoginFailureFloor(1_000, { ...clock(), random: () => random }));
  }
  assert.equal(totals.size, 5);
  assert.equal(
    await enforceLoginFailureFloor(1_000, { ...clock(), random: () => 9 }),
    LOGIN_FAILURE_MIN_MS + LOGIN_FAILURE_JITTER_MS,
  );
  assert.equal(await enforceLoginFailureFloor(1_000, { ...clock(), random: () => -3 }), LOGIN_FAILURE_MIN_MS);
});

test("default timer path really waits the remaining time", async () => {
  const started = Date.now();
  let calls = 0;
  const waited = await enforceLoginFailureFloor(started, {
    now: () => (calls++ === 0 ? started + LOGIN_FAILURE_MIN_MS + LOGIN_FAILURE_JITTER_MS - 5 : Date.now()),
    random: () => 1,
  });
  assert.ok(waited >= 1 && waited <= 5);
});
