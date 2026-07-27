import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSummary } from "../app/history/session-summary.ts";
import {
  buildHistoryWorkoutStreak,
  filterHistorySkippedDayKeysForTimeline,
  shouldShowHistoryWorkoutStreak,
} from "./history-workout-streak.ts";

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

test("session streak follows completed planned sessions instead of calendar weeks", () => {
  const summary = buildHistoryWorkoutStreak({
    sessions: [
      session("one", "2026-07-01T14:00:00.000Z"),
      session("two", "2026-07-05T14:00:00.000Z"),
      session("three", "2026-07-09T14:00:00.000Z"),
    ],
    skippedDayKeys: ["2026-07-03"],
    timezone: "America/New_York",
  });

  assert.equal(summary.currentSessionCount, 2);
  assert.equal(summary.bestSessionCount, 2);
  assert.equal(summary.completedPlannedSessionCount, 3);
  assert.equal(summary.missedPlannedSessionCount, 1);
  assert.equal(summary.currentStartDayKey, "2026-07-05");
  assert.equal(summary.currentEndDayKey, "2026-07-09");
});

test("a latest skipped planned session resets the current streak", () => {
  const summary = buildHistoryWorkoutStreak({
    sessions: [
      session("one", "2026-07-01T14:00:00.000Z"),
      session("two", "2026-07-05T14:00:00.000Z"),
    ],
    skippedDayKeys: ["2026-07-09"],
    timezone: "America/New_York",
  });

  assert.equal(summary.currentSessionCount, 0);
  assert.equal(summary.bestSessionCount, 2);
  assert.equal(summary.currentStartDayKey, null);
  assert.equal(summary.currentEndDayKey, null);
});

test("session streak respects the profile timezone at day boundaries", () => {
  const summary = buildHistoryWorkoutStreak({
    sessions: [
      session("one", "2026-07-06T02:00:00.000Z"),
      session("two", "2026-07-07T02:00:00.000Z"),
    ],
    timezone: "America/New_York",
  });

  assert.equal(summary.currentSessionCount, 2);
  assert.equal(summary.currentStartDayKey, "2026-07-05");
  assert.equal(summary.currentEndDayKey, "2026-07-06");
  assert.equal(summary.lastCompletedDayKey, "2026-07-06");
});

test("timeline streak scopes skipped planned days to the selected day or month", () => {
  const skippedDayKeys = ["2026-06-30", "2026-07-03", "2026-07-08", "2026-08-01"];

  assert.deepEqual(filterHistorySkippedDayKeysForTimeline({
    skippedDayKeys,
    selectedMonthKey: "2026-07",
  }), ["2026-07-03", "2026-07-08"]);
  assert.deepEqual(filterHistorySkippedDayKeysForTimeline({
    skippedDayKeys,
    selectedDayKey: "2026-07-08",
    selectedMonthKey: "2026-07",
  }), ["2026-07-08"]);
  assert.equal(filterHistorySkippedDayKeysForTimeline({ skippedDayKeys }), skippedDayKeys);
});

test("specific timelines show Session Streak only when multiple sessions remain visible", () => {
  assert.equal(shouldShowHistoryWorkoutStreak({ hasSpecificTimelineFilter: false, visibleSessionCount: 0 }), true);
  assert.equal(shouldShowHistoryWorkoutStreak({ hasSpecificTimelineFilter: true, visibleSessionCount: 0 }), false);
  assert.equal(shouldShowHistoryWorkoutStreak({ hasSpecificTimelineFilter: true, visibleSessionCount: 1 }), false);
  assert.equal(shouldShowHistoryWorkoutStreak({ hasSpecificTimelineFilter: true, visibleSessionCount: 2 }), true);
});
