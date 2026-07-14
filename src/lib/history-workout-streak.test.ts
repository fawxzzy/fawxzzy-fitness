import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSummary } from "../app/history/session-summary.ts";
import { buildHistoryWorkoutStreak } from "./history-workout-streak.ts";

function session(id: string, startedAt: string): SessionSummary {
  return {
    id,
    startedAt,
    routineTitle: "Atlas",
    exerciseCount: 1,
    setCount: 1,
    repCount: 5,
    prCounts: { total: 0, weight: 0, reps: 0 },
    prLabel: "",
    totalVolume: 0,
    hasNote: false,
    hasSetData: true,
  };
}

test("workout streak counts consecutive active weeks without penalizing rest days", () => {
  const summary = buildHistoryWorkoutStreak({
    sessions: [
      session("one", "2026-06-23T14:00:00.000Z"),
      session("two", "2026-07-02T14:00:00.000Z"),
      session("three", "2026-07-07T14:00:00.000Z"),
    ],
    timezone: "America/New_York",
    now: "2026-07-09T12:00:00.000Z",
  });

  assert.equal(summary.currentWeekCount, 3);
  assert.equal(summary.bestWeekCount, 3);
  assert.equal(summary.activeWeekCount, 3);
});

test("workout streak carries the previous streak through an unfinished current week", () => {
  const summary = buildHistoryWorkoutStreak({
    sessions: [
      session("one", "2026-06-25T14:00:00.000Z"),
      session("two", "2026-07-02T14:00:00.000Z"),
    ],
    timezone: "America/New_York",
    now: "2026-07-07T12:00:00.000Z",
  });

  assert.equal(summary.currentWeekCount, 2);
  assert.match(summary.ruleDescription, /partial week/);
});

test("workout streak resets after a fully missed week and respects timezone boundaries", () => {
  const summary = buildHistoryWorkoutStreak({
    sessions: [
      session("old", "2026-06-16T14:00:00.000Z"),
      session("boundary", "2026-07-06T02:00:00.000Z"),
    ],
    timezone: "America/New_York",
    now: "2026-07-12T12:00:00.000Z",
  });

  assert.equal(summary.currentWeekCount, 1);
  assert.equal(summary.bestWeekCount, 1);
  assert.equal(summary.lastCompletedDayKey, "2026-07-05");
});
