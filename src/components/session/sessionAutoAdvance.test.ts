import assert from "node:assert/strict";
import test from "node:test";
import { findNextUnfinishedExerciseId, isLastPlannedSet } from "./sessionAutoAdvance.ts";

const row = (id: string, state: "open" | "done" | "skipped" = "open") => ({
  id,
  isSkipped: state === "skipped",
  isGoalCompleted: state === "done",
});

test("only the set that reaches the plan moves on", () => {
  assert.equal(isLastPlannedSet(3, 3), true);
  assert.equal(isLastPlannedSet(2, 3), false);
  assert.equal(isLastPlannedSet(4, 3), false, "a set past the plan stays on the card");
  assert.equal(isLastPlannedSet(1, null), false, "no plan, no auto-advance");
  assert.equal(isLastPlannedSet(0, 0), false);
});

test("next exercise is the first unfinished one after the current card", () => {
  const rows = [row("a"), row("b", "done"), row("c", "skipped"), row("d"), row("e")];
  assert.equal(findNextUnfinishedExerciseId(rows, "a"), "d");
  assert.equal(findNextUnfinishedExerciseId(rows, "d"), "e");
});

test("next exercise wraps to the top of the list", () => {
  const rows = [row("a"), row("b", "done"), row("c")];
  assert.equal(findNextUnfinishedExerciseId(rows, "c"), "a");
});

test("no next exercise when everything else is done or skipped", () => {
  const rows = [row("a", "done"), row("b"), row("c", "skipped")];
  assert.equal(findNextUnfinishedExerciseId(rows, "b"), null);
  assert.equal(findNextUnfinishedExerciseId([row("a")], "a"), null);
  assert.equal(findNextUnfinishedExerciseId(rows, "missing"), null);
});
