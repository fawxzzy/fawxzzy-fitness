import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSummary } from "../app/history/session-summary.ts";
import { buildHistoryConsistencyHeatmap } from "./history-consistency-heatmap.ts";
import { buildHistoryMonthlyProgress } from "./history-monthly-progress.ts";
import { getWeeklyProgressDayKey } from "./history-weekly-progress.ts";
import { buildHistoryWorkoutStreak } from "./history-workout-streak.ts";

function session(id: string, startedAt: string): SessionSummary {
  return {
    id,
    startedAt,
    routineTitle: "QA Routine",
    exerciseCount: 1,
    setCount: 2,
    repCount: 10,
    prCounts: { total: 0, weight: 0, reps: 0 },
    prLabel: "",
    totalVolume: 0,
    hasNote: false,
    hasSetData: true,
  };
}

// 2026-11-06T02:35:00Z is the QA session: Nov 5 21:35 in US Eastern (EST, UTC-5) but Nov 6 in UTC.
const AFTER_UTC_MIDNIGHT = "2026-11-06T02:35:00.000Z";

test("a day key follows the requested timezone across the UTC midnight boundary", () => {
  assert.equal(getWeeklyProgressDayKey("2026-11-06T04:59:59.000Z", "America/New_York"), "2026-11-05");
  assert.equal(getWeeklyProgressDayKey("2026-11-06T05:00:00.000Z", "America/New_York"), "2026-11-06");
  assert.equal(getWeeklyProgressDayKey("2026-11-06T04:59:59.000Z", "UTC"), "2026-11-06");
  // DST ended 2026-11-01 (EDT UTC-4 -> EST UTC-5): the local-midnight offset changes from 04:00Z to 05:00Z.
  assert.equal(getWeeklyProgressDayKey("2026-11-01T03:59:59.000Z", "America/New_York"), "2026-10-31");
  assert.equal(getWeeklyProgressDayKey("2026-11-01T04:00:00.000Z", "America/New_York"), "2026-11-01");
  // A zone ahead of UTC buckets the other way.
  assert.equal(getWeeklyProgressDayKey("2026-11-05T15:30:00.000Z", "Asia/Tokyo"), "2026-11-06");
  assert.equal(getWeeklyProgressDayKey("2026-11-05T15:30:00.000Z", "America/Los_Angeles"), "2026-11-05");
});

test("session streak buckets a Nov 5 evening Eastern session on Nov 5, not the UTC date", () => {
  const eastern = buildHistoryWorkoutStreak({ sessions: [session("qa", AFTER_UTC_MIDNIGHT)], timezone: "America/New_York" });
  assert.equal(eastern.lastCompletedDayKey, "2026-11-05");
  assert.equal(eastern.currentStartDayKey, "2026-11-05");
  assert.equal(eastern.currentEndDayKey, "2026-11-05");

  const utc = buildHistoryWorkoutStreak({ sessions: [session("qa", AFTER_UTC_MIDNIGHT)], timezone: "UTC" });
  assert.equal(utc.lastCompletedDayKey, "2026-11-06");
});

test("sessions straddling UTC midnight form one Eastern day and do not break a streak across it", () => {
  const summary = buildHistoryWorkoutStreak({
    sessions: [
      session("evening", "2026-11-06T02:35:00.000Z"),
      session("later-same-local-day", "2026-11-06T04:30:00.000Z"),
      session("next-local-day", "2026-11-07T15:00:00.000Z"),
    ],
    timezone: "America/New_York",
  });
  assert.equal(summary.completedPlannedSessionCount, 2);
  assert.equal(summary.currentSessionCount, 2);
  assert.equal(summary.currentStartDayKey, "2026-11-05");
  assert.equal(summary.currentEndDayKey, "2026-11-07");
});

test("heatmap and monthly progress count the Eastern evening session on the local day", () => {
  const heatmap = buildHistoryConsistencyHeatmap({
    sessions: [session("qa", AFTER_UTC_MIDNIGHT)],
    timezone: "America/New_York",
    now: "2026-11-06T03:00:00.000Z",
    weekCount: 4,
  });
  const cells = heatmap.weeks.flat();
  assert.equal(cells.find((cell) => cell.dayKey === "2026-11-05")?.sessionCount, 1);
  assert.equal(cells.find((cell) => cell.dayKey === "2026-11-06")?.sessionCount ?? 0, 0);

  const monthly = buildHistoryMonthlyProgress({
    sessions: [session("qa", "2026-12-01T03:30:00.000Z")],
    timezone: "America/New_York",
    monthKey: "2026-11",
    now: "2026-12-01T04:00:00.000Z",
  });
  assert.equal(monthly.completedWorkoutCount, 1, "Nov 30 22:30 Eastern belongs to November, not December");
});
