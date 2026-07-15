import assert from "node:assert/strict";
import test from "node:test";
import { getRoutineDayKind, isRequiredRoutineDay } from "@/lib/routine-day-kind";

test("routine-day kind preserves required days by default", () => {
  assert.equal(getRoutineDayKind({ is_rest: false }), "required");
  assert.equal(isRequiredRoutineDay({ is_rest: false }), true);
});

test("routine-day kind treats optional and rest days as non-required", () => {
  assert.equal(getRoutineDayKind({ is_optional: true }), "optional");
  assert.equal(isRequiredRoutineDay({ is_optional: true }), false);
  assert.equal(getRoutineDayKind({ is_rest: true, is_optional: true }), "rest");
  assert.equal(isRequiredRoutineDay({ is_rest: true }), false);
});
