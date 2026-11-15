import assert from "node:assert/strict";
import test from "node:test";

import { buildSessionFinishCheck } from "./session-finish.ts";

const planned = (sets: number, logged: number, isSkipped = false) => ({
  targetSetsMin: sets,
  targetSetsMax: sets,
  loggedSetCount: logged,
  isSkipped,
});

test("finish needs no confirm when every planned set is logged", () => {
  const check = buildSessionFinishCheck({ exercises: [planned(3, 3), planned(2, 2)] });
  assert.equal(check.needsConfirm, false);
  assert.equal(check.message, "");
});

test("finish asks for confirmation when planned sets are unfinished", () => {
  const check = buildSessionFinishCheck({ exercises: [planned(3, 3), planned(2, 0)] });
  assert.equal(check.needsConfirm, true);
  assert.equal(check.loggedSets, 3);
  assert.equal(check.plannedSets, 5);
  assert.equal(check.message, "3 of 5 sets logged.");
});

test("skipped exercises do not count as unfinished", () => {
  const check = buildSessionFinishCheck({ exercises: [planned(3, 3), planned(2, 0, true)] });
  assert.equal(check.needsConfirm, false);
});

test("logging more than planned is fine", () => {
  assert.equal(buildSessionFinishCheck({ exercises: [planned(2, 4)] }).needsConfirm, false);
});

test("an empty session finishes in one tap", () => {
  assert.equal(buildSessionFinishCheck({ exercises: [] }).needsConfirm, false);
});

test("the live snapshot (queued sets, new skips) wins over server counts", () => {
  const exercises = [planned(3, 0), planned(2, 0)];
  assert.equal(buildSessionFinishCheck({ exercises }).needsConfirm, true);
  const live = [{ loggedSetCount: 3, isSkipped: false }, { loggedSetCount: 0, isSkipped: true }];
  assert.equal(buildSessionFinishCheck({ exercises, live }).needsConfirm, false);
});

test("an exercise without a planned count is expected to have at least one set", () => {
  const unplanned = { loggedSetCount: 0, isSkipped: false };
  const check = buildSessionFinishCheck({ exercises: [planned(2, 2), unplanned] });
  assert.equal(check.needsConfirm, true);
  assert.equal(check.message, "2 of 3 sets logged.");
});
