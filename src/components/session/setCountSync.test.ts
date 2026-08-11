import test from "node:test";
import assert from "node:assert/strict";
import { getNextPublishedSetCount, mergeLoggedSetCountState } from "./setCountSync.ts";

test("mergeLoggedSetCountState accepts a legitimate server-side decrease", () => {
  const current = { a: 4, b: 1 };
  const exercises = [
    { id: "a", loggedSetCount: 2 },
    { id: "b", loggedSetCount: 1 },
  ];

  const merged = mergeLoggedSetCountState(current, exercises);

  assert.deepEqual(merged, { a: 2, b: 1 });
  assert.equal(merged.b, current.b);
});

test("mergeLoggedSetCountState returns the same object when logical counts do not change", () => {
  const current = { a: 2, b: 0 };
  const exercises = [
    { id: "a", loggedSetCount: 2 },
    { id: "b", loggedSetCount: 0 },
  ];

  const merged = mergeLoggedSetCountState(current, exercises);

  assert.equal(merged, current);
});

test("mergeLoggedSetCountState projects each server count independently", () => {
  const current = { a: 4, b: 1 };
  const exercises = [
    { id: "a", loggedSetCount: 2 },
    { id: "b", loggedSetCount: 1 },
  ];

  const merged = mergeLoggedSetCountState(current, exercises);

  assert.equal(merged.a, 2);
  assert.equal(merged.b, current.b);
});

test("mergeLoggedSetCountState accepts a higher server count for a key", () => {
  const current = { a: 2 };
  const exercises = [{ id: "a", loggedSetCount: 5 }];

  const merged = mergeLoggedSetCountState(current, exercises);

  assert.deepEqual(merged, { a: 5 });
});

test("mergeLoggedSetCountState resolves a mixed map to the exact server snapshot", () => {
  const current = { a: 5, b: 1, c: 3 };
  const exercises = [
    { id: "a", loggedSetCount: 2 },
    { id: "b", loggedSetCount: 9 },
    { id: "c", loggedSetCount: 3 },
  ];

  const merged = mergeLoggedSetCountState(current, exercises);

  assert.deepEqual(merged, { a: 2, b: 9, c: 3 });
});

test("mergeLoggedSetCountState adds a new exercise id that was not present in current", () => {
  const current = { a: 1 };
  const exercises = [
    { id: "a", loggedSetCount: 1 },
    { id: "b", loggedSetCount: 0 },
  ];

  const merged = mergeLoggedSetCountState(current, exercises);

  assert.deepEqual(merged, { a: 1, b: 0 });
});

test("mergeLoggedSetCountState drops an exercise id that is no longer present in exercises", () => {
  const current = { a: 1, b: 2 };
  const exercises = [{ id: "a", loggedSetCount: 1 }];

  const merged = mergeLoggedSetCountState(current, exercises);

  assert.deepEqual(merged, { a: 1 });
  assert.equal("b" in merged, false);
});

test("mergeLoggedSetCountState returns the original current object reference when logically unchanged", () => {
  const current = { a: 2, b: 0, c: 7 };
  const exercises = [
    { id: "a", loggedSetCount: 2 },
    { id: "b", loggedSetCount: 0 },
    { id: "c", loggedSetCount: 7 },
  ];

  const merged = mergeLoggedSetCountState(current, exercises);

  assert.equal(merged, current);
});

test("mergeLoggedSetCountState returns a new object (not the same reference as either input) when logically changed", () => {
  const current = { a: 1 };
  const exercises = [{ id: "a", loggedSetCount: 9 }];

  const merged = mergeLoggedSetCountState(current, exercises);

  assert.notEqual(merged, current);
  assert.notEqual(merged, exercises);
});

test("mergeLoggedSetCountState does not mutate the current input object", () => {
  const current = { a: 4, b: 1 };
  const currentSnapshot = { ...current };
  const exercises = [
    { id: "a", loggedSetCount: 2 },
    { id: "b", loggedSetCount: 1 },
  ];

  mergeLoggedSetCountState(current, exercises);

  assert.deepEqual(current, currentSnapshot);
});

test("mergeLoggedSetCountState does not mutate the exercises input array or its elements", () => {
  const current = { a: 4, b: 1 };
  const exercises = [
    { id: "a", loggedSetCount: 2 },
    { id: "b", loggedSetCount: 1 },
  ];
  const exercisesSnapshot = exercises.map((exercise) => ({ ...exercise }));

  mergeLoggedSetCountState(current, exercises);

  assert.equal(exercises.length, exercisesSnapshot.length);
  exercises.forEach((exercise, index) => {
    assert.deepEqual(exercise, exercisesSnapshot[index]);
  });
});

test("mergeLoggedSetCountState handles empty current map and empty exercises list", () => {
  const current = {};
  const exercises: { id: string; loggedSetCount: number }[] = [];

  const merged = mergeLoggedSetCountState(current, exercises);

  assert.deepEqual(merged, {});
  assert.equal(merged, current);
});

test("mergeLoggedSetCountState is deterministic across repeated calls with the same inputs", () => {
  const current = { a: 4, b: 1, c: 9 };
  const exercises = [
    { id: "a", loggedSetCount: 2 },
    { id: "b", loggedSetCount: 1 },
    { id: "c", loggedSetCount: 12 },
  ];

  const first = mergeLoggedSetCountState(current, exercises);
  const second = mergeLoggedSetCountState(current, exercises);

  assert.deepEqual(first, second);
});

test("getNextPublishedSetCount only publishes when the primitive count changes", () => {
  assert.equal(getNextPublishedSetCount(3, 3), null);
  assert.equal(getNextPublishedSetCount(3, 4), 4);
  assert.equal(getNextPublishedSetCount(null, 0), 0);
});

test("getNextPublishedSetCount publishes a genuine decrease too (not just increases), matching the per-key merge accepting a legitimate server-side change", () => {
  assert.equal(getNextPublishedSetCount(4, 2), 2);
});
