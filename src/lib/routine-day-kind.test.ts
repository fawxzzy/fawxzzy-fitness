import assert from "node:assert/strict";
import test from "node:test";
import {
  getNextRoutineDayKind,
  getRoutineDayKind,
  getRoutineDayKindLabel,
  isRequiredRoutineDay,
} from "@/lib/routine-day-kind";

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

test("routine-day kind cycles active, optional, and rest in a predictable order", () => {
  assert.equal(getRoutineDayKindLabel("required"), "Active");
  assert.equal(getNextRoutineDayKind("required"), "optional");
  assert.equal(getNextRoutineDayKind("optional"), "rest");
  assert.equal(getNextRoutineDayKind("rest"), "required");
});
