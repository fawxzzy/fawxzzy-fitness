import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSummary } from "../app/history/session-summary.ts";
import { buildHistoryMonthlyProgress } from "./history-monthly-progress.ts";

function session(id: string, startedAt: string, overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    id,
    startedAt,
    routineTitle: "Atlas",
    exerciseNames: ["Bench Press"],
    exerciseCount: 1,
    setCount: 3,
    repCount: 15,
    prCounts: { total: 0, weight: 0, reps: 0 },
    prLabel: "",
    totalVolume: 1500,
    volumeUnit: "lbs",
    hasNote: false,
    hasSetData: true,
    ...overrides,
  };
}

test("monthly progress compares adjacent months and aggregates deterministic training truth", () => {
  const summary = buildHistoryMonthlyProgress({
    sessions: [
      session("current-1", "2026-07-02T14:00:00.000Z", { prCounts: { total: 1, weight: 1, reps: 0 } }),
      session("current-2", "2026-07-07T14:00:00.000Z", { exerciseNames: ["Bench Press", "Row"] }),
      session("previous", "2026-06-18T14:00:00.000Z"),
    ],
    timezone: "America/New_York",
    now: "2026-07-12T12:00:00.000Z",
  });

  assert.equal(summary.completedWorkoutCount, 2);
  assert.equal(summary.previousMonthWorkoutCount, 1);
  assert.equal(summary.activeDayCount, 2);
  assert.equal(summary.setCount, 6);
  assert.equal(summary.repCount, 30);
  assert.equal(summary.prMomentCount, 1);
  assert.deepEqual(summary.volumeByUnit, [{ unit: "lbs", value: 3000 }]);
  assert.equal(summary.topExerciseName, "Bench Press");
  assert.equal(summary.trend.direction, "up");
});

test("monthly progress groups boundary sessions in the requested timezone", () => {
  const summary = buildHistoryMonthlyProgress({
    sessions: [session("boundary", "2026-07-01T02:30:00.000Z")],
    timezone: "America/New_York",
    monthKey: "2026-06",
    now: "2026-07-12T12:00:00.000Z",
  });

  assert.equal(summary.completedWorkoutCount, 1);
  assert.equal(summary.monthKey, "2026-06");
});

test("monthly progress keeps a clear empty state", () => {
  const summary = buildHistoryMonthlyProgress({
    sessions: [],
    timezone: "UTC",
    monthKey: "2026-07",
  });

  assert.equal(summary.completedWorkoutCount, 0);
  assert.equal(summary.trend.direction, "none");
  assert.match(summary.trend.detail, /No completed workouts/);
});
