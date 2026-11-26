import assert from "node:assert/strict";
import test from "node:test";
import { buildHistorySessionDetailTitle, formatHistoryDayTitle, formatSetCountAgainstPlan } from "./history-session-copy";

test("a bare day number reads as Day N (F-021)", () => {
  assert.equal(formatHistoryDayTitle("1"), "Day 1");
  assert.equal(formatHistoryDayTitle(" 12 "), "Day 12");
  assert.equal(formatHistoryDayTitle("Push A"), "Push A");
  assert.equal(formatHistoryDayTitle("  "), null);
  assert.equal(formatHistoryDayTitle(null), null);
});

test("session detail title is Day · Routine (DESIGN #7)", () => {
  assert.equal(buildHistorySessionDetailTitle({ dayTitle: "Push A", routineTitle: "Atlas" }), "Push A · Atlas");
  assert.equal(buildHistorySessionDetailTitle({ dayTitle: "1", routineTitle: "Atlas" }), "Day 1 · Atlas");
  assert.equal(buildHistorySessionDetailTitle({ dayTitle: "Legs", routineTitle: "Unknown routine" }), "Legs");
  assert.equal(buildHistorySessionDetailTitle({ dayTitle: null, routineTitle: "Atlas" }), "Atlas");
  assert.equal(buildHistorySessionDetailTitle({}), "Workout");
});

test("set counts explain logging more than planned instead of '3 of 2'", () => {
  assert.equal(formatSetCountAgainstPlan(3, 2), "3 sets (2 planned)");
  assert.equal(formatSetCountAgainstPlan(2, 4), "2 of 4 sets");
  assert.equal(formatSetCountAgainstPlan(3, 3), "3 sets");
  assert.equal(formatSetCountAgainstPlan(1, 0), "1 set");
  assert.equal(formatSetCountAgainstPlan(2, 4, "logged"), "2 of 4 sets logged");
  assert.equal(formatSetCountAgainstPlan(3, 2, "logged"), "3 sets logged (2 planned)");
  assert.equal(formatSetCountAgainstPlan(1, 1, "logged"), "1 set logged");
});
