import test from "node:test";
import assert from "node:assert/strict";
import { getNextPublishedSetCount, mergeLoggedSetCountState } from "./setCountSync.ts";

test("mergeLoggedSetCountState preserves higher in-progress counts without re-encoding unchanged state", () => {
  const current = { a: 4, b: 1 };
  const exercises = [
    { id: "a", loggedSetCount: 2 },
    { id: "b", loggedSetCount: 1 },
  ];

  const merged = mergeLoggedSetCountState(current, exercises);

  assert.deepEqual(merged, { a: 4, b: 1 });
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

test("getNextPublishedSetCount only publishes when the primitive count changes", () => {
  assert.equal(getNextPublishedSetCount(3, 3), null);
  assert.equal(getNextPublishedSetCount(3, 4), 4);
  assert.equal(getNextPublishedSetCount(null, 0), 0);
});
