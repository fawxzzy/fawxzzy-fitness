import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSummary } from "../app/history/session-summary.ts";
import { buildHistoryConsistencyHeatmap } from "./history-consistency-heatmap.ts";

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

test("consistency heatmap creates a bounded week grid with count intensity", () => {
  const heatmap = buildHistoryConsistencyHeatmap({
    sessions: [
      session("one", "2026-07-07T14:00:00.000Z"),
      session("two", "2026-07-07T18:00:00.000Z"),
      session("three", "2026-07-08T14:00:00.000Z"),
    ],
    timezone: "America/New_York",
    now: "2026-07-09T12:00:00.000Z",
    weekCount: 8,
  });

  assert.equal(heatmap.weeks.length, 8);
  assert.ok(heatmap.weeks.every((week) => week.length === 7));
  assert.equal(heatmap.activeDayCount, 2);
  assert.equal(heatmap.sessionCount, 3);
  const cells = heatmap.weeks.flat();
  assert.equal(cells.find((cell) => cell.dayKey === "2026-07-07")?.tone, "medium");
  assert.equal(cells.find((cell) => cell.dayKey === "2026-07-08")?.tone, "low");
});

test("consistency heatmap uses local dates and marks future cells", () => {
  const heatmap = buildHistoryConsistencyHeatmap({
    sessions: [session("boundary", "2026-07-06T02:00:00.000Z")],
    timezone: "America/New_York",
    now: "2026-07-06T12:00:00.000Z",
    weekCount: 4,
  });

  const cells = heatmap.weeks.flat();
  assert.equal(cells.find((cell) => cell.dayKey === "2026-07-05")?.sessionCount, 1);
  assert.equal(cells.find((cell) => cell.dayKey === "2026-07-07")?.isFuture, true);
});
