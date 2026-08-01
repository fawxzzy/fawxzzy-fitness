import test from "node:test";
import assert from "node:assert/strict";

import { shouldAnchorExpandedSessionExercise } from "./session-expand-anchor.ts";

test("anchors when opening an exercise from a fully-collapsed state", () => {
  assert.equal(shouldAnchorExpandedSessionExercise(null, "ex-1"), true);
});

test("anchors when switching directly from one expanded exercise to another", () => {
  assert.equal(shouldAnchorExpandedSessionExercise("ex-1", "ex-2"), true);
});

test("does not anchor on collapse", () => {
  assert.equal(shouldAnchorExpandedSessionExercise("ex-1", null), false);
});

test("does not anchor when nothing is expanded before or after", () => {
  assert.equal(shouldAnchorExpandedSessionExercise(null, null), false);
});

test("does not anchor on an unrelated rerender that reports the same expanded id (e.g. a sibling timer tick or the skip-reconcile effect)", () => {
  assert.equal(shouldAnchorExpandedSessionExercise("ex-1", "ex-1"), false);
});
