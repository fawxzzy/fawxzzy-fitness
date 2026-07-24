import assert from "node:assert/strict";
import test from "node:test";

import type { SessionSummary } from "@/app/history/session-summary";
import { buildHistorySkippedWorkoutDays } from "./history-planned-days.ts";

function session(id: string, startedAt: string): SessionSummary {
  return {
    id,
    startedAt,
    routineId: "routine-1",
    routineTitle: "Atlas",
    exerciseCount: 1,
    setCount: 1,
    repCount: 5,
    prCounts: { reps: 0, weight: 0, total: 0 },
    prLabel: "No PRs",
    totalVolume: 0,
    hasNote: false,
    hasSetData: true,
  };
}

test("history planned days identify past missed workout dates without marking today", () => {
  const result = buildHistorySkippedWorkoutDays({
    routines: [{
      id: "routine-1",
      startDate: "2026-04-06",
      cycleLengthDays: 3,
      timeZone: "America/New_York",
      isActive: true,
    }],
    routineDays: [
      { routineId: "routine-1", dayIndex: 1, isRest: false },
      { routineId: "routine-1", dayIndex: 2, isRest: true },
      { routineId: "routine-1", dayIndex: 3, isRest: false },
    ],
    sessions: [
      session("session-1", "2026-04-06T14:00:00.000Z"),
      session("session-2", "2026-04-11T14:00:00.000Z"),
    ],
    now: "2026-04-15T14:00:00.000Z",
  });

  assert.deepEqual(result, [
    { dayKey: "2026-04-08", routineId: "routine-1" },
    { dayKey: "2026-04-09", routineId: "routine-1" },
    { dayKey: "2026-04-12", routineId: "routine-1" },
    { dayKey: "2026-04-14", routineId: "routine-1" },
  ]);
});

test("inactive routines stop accumulating missed dates after their last completed session", () => {
  const result = buildHistorySkippedWorkoutDays({
    routines: [{
      id: "routine-1",
      startDate: "2026-04-06",
      cycleLengthDays: 2,
      timeZone: "America/New_York",
      isActive: false,
    }],
    routineDays: [{ routineId: "routine-1", dayIndex: 1, isRest: false }],
    sessions: [
      session("session-1", "2026-04-06T14:00:00.000Z"),
      session("session-2", "2026-04-10T14:00:00.000Z"),
    ],
    now: "2026-04-20T14:00:00.000Z",
  });

  assert.deepEqual(result, [{ dayKey: "2026-04-08", routineId: "routine-1" }]);
});
