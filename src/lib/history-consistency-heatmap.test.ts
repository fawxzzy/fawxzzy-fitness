import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSummary } from "../app/history/session-summary.ts";
import { buildHistoryConsistencyHeatmap, describeHistoryConsistencyHeatmap } from "./history-consistency-heatmap.ts";

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

test("consistency heatmap marks today and reports the local current day", () => {
  const heatmap = buildHistoryConsistencyHeatmap({
    sessions: [],
    timezone: "America/New_York",
    // 03:00Z on Nov 12 is still Nov 11 in US Eastern.
    now: "2026-11-12T03:00:00.000Z",
    weekCount: 8,
  });

  const cells = heatmap.weeks.flat();
  assert.equal(heatmap.currentDayKey, "2026-11-11");
  assert.deepEqual(cells.filter((cell) => cell.isToday).map((cell) => cell.dayKey), ["2026-11-11"]);
  assert.deepEqual(cells.filter((cell) => cell.isFuture).map((cell) => cell.dayKey), ["2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
  assert.equal(cells.find((cell) => cell.dayKey === "2026-11-11")?.isFuture, false);
});

test("consistency heatmap weeks are Monday-first, contiguous and end on the current ISO week", () => {
  const heatmap = buildHistoryConsistencyHeatmap({
    sessions: [],
    timezone: "America/New_York",
    now: "2026-11-12T15:00:00.000Z",
    weekCount: 16,
  });

  const cells = heatmap.weeks.flat();
  assert.equal(cells.length, 16 * 7);
  assert.equal(heatmap.startDayKey, "2026-07-27");
  assert.equal(heatmap.endDayKey, "2026-11-15");
  assert.equal(cells[0]?.dayKey, "2026-07-27");
  assert.equal(new Date(`${cells[0]?.dayKey}T00:00:00.000Z`).getUTCDay(), 1);
  for (let index = 1; index < cells.length; index += 1) {
    const previous = new Date(`${cells[index - 1]?.dayKey}T00:00:00.000Z`).getTime();
    const current = new Date(`${cells[index]?.dayKey}T00:00:00.000Z`).getTime();
    assert.equal(current - previous, 24 * 60 * 60 * 1000, `day ${index} follows the previous day`);
  }
});

test("consistency heatmap keeps out-of-window and undated sessions out of the grid but counts dated history", () => {
  const heatmap = buildHistoryConsistencyHeatmap({
    sessions: [
      session("recent", "2026-11-10T15:00:00.000Z"),
      session("old", "2026-01-05T15:00:00.000Z"),
      session("undated", "not-a-date"),
    ],
    timezone: "America/New_York",
    now: "2026-11-12T15:00:00.000Z",
    weekCount: 16,
  });

  assert.equal(heatmap.sessionCount, 1);
  assert.equal(heatmap.activeDayCount, 1);
  assert.equal(heatmap.totalSessionCount, 2);
});

test("consistency heatmap buckets by the requested timezone, not by the UTC date", () => {
  const sessions = [session("late", "2026-11-05T15:30:00.000Z")];
  const tokyo = buildHistoryConsistencyHeatmap({ sessions, timezone: "Asia/Tokyo", now: "2026-11-12T03:00:00.000Z", weekCount: 4 });
  const losAngeles = buildHistoryConsistencyHeatmap({ sessions, timezone: "America/Los_Angeles", now: "2026-11-12T03:00:00.000Z", weekCount: 4 });

  assert.equal(tokyo.weeks.flat().find((cell) => cell.sessionCount > 0)?.dayKey, "2026-11-06");
  assert.equal(losAngeles.weeks.flat().find((cell) => cell.sessionCount > 0)?.dayKey, "2026-11-05");
});

test("consistency heatmap tone and count follow the session count per local day", () => {
  const heatmap = buildHistoryConsistencyHeatmap({
    sessions: [
      session("a1", "2026-11-09T14:00:00.000Z"),
      session("b1", "2026-11-10T14:00:00.000Z"),
      session("b2", "2026-11-10T18:00:00.000Z"),
      session("c1", "2026-11-11T13:00:00.000Z"),
      session("c2", "2026-11-11T16:00:00.000Z"),
      session("c3", "2026-11-11T19:00:00.000Z"),
      session("c4", "2026-11-11T21:00:00.000Z"),
    ],
    timezone: "America/New_York",
    now: "2026-11-12T15:00:00.000Z",
    weekCount: 4,
  });

  const cells = heatmap.weeks.flat();
  const byDay = (dayKey: string) => cells.find((cell) => cell.dayKey === dayKey);
  assert.deepEqual(
    [byDay("2026-11-08")?.tone, byDay("2026-11-09")?.tone, byDay("2026-11-10")?.tone, byDay("2026-11-11")?.tone],
    ["none", "low", "medium", "high"],
  );
  assert.equal(byDay("2026-11-11")?.sessionCount, 4);
  assert.equal(heatmap.activeDayCount, 3);
  assert.equal(heatmap.sessionCount, 7);
});

test("consistency heatmap is deterministic for the same input", () => {
  const input = {
    sessions: [session("a", "2026-11-09T14:00:00.000Z"), session("b", "2026-10-02T14:00:00.000Z")],
    timezone: "America/New_York",
    now: "2026-11-12T15:00:00.000Z",
  };
  assert.deepEqual(buildHistoryConsistencyHeatmap(input), buildHistoryConsistencyHeatmap(input));
});

test("consistency heatmap puts month markers on the weeks that contain a month start, away from the right edge", () => {
  const heatmap = buildHistoryConsistencyHeatmap({
    sessions: [],
    timezone: "America/New_York",
    now: "2026-11-12T15:00:00.000Z",
    weekCount: 16,
  });

  assert.deepEqual(heatmap.monthMarkers, [
    { weekIndex: 0, monthKey: "2026-08" },
    { weekIndex: 5, monthKey: "2026-09" },
    { weekIndex: 9, monthKey: "2026-10" },
    { weekIndex: 13, monthKey: "2026-11" },
  ]);
  for (const marker of heatmap.monthMarkers) {
    assert.ok(marker.weekIndex <= heatmap.weeks.length - 2, "no label in the last column");
  }
});

test("consistency heatmap labels the first column with its own month when no month starts nearby", () => {
  const heatmap = buildHistoryConsistencyHeatmap({
    sessions: [],
    timezone: "America/New_York",
    now: "2026-10-28T15:00:00.000Z",
    weekCount: 8,
  });

  assert.equal(heatmap.startDayKey, "2026-09-07");
  // Nov 1 starts in the last week (index 7), which has no room to carry a label.
  assert.deepEqual(heatmap.monthMarkers, [
    { weekIndex: 0, monthKey: "2026-09" },
    { weekIndex: 3, monthKey: "2026-10" },
  ]);
});

test("consistency heatmap skips the first-column month label when a month start sits right beside it", () => {
  const heatmap = buildHistoryConsistencyHeatmap({
    sessions: [],
    timezone: "America/New_York",
    now: "2026-11-12T15:00:00.000Z",
    weekCount: 8,
  });

  assert.equal(heatmap.startDayKey, "2026-09-21");
  assert.deepEqual(heatmap.monthMarkers.map((marker) => marker.weekIndex), [1, 5]);
});

test("consistency heatmap copy separates never-trained, quiet-stretch and active states", () => {
  const empty = buildHistoryConsistencyHeatmap({ sessions: [], timezone: "America/New_York", now: "2026-11-12T15:00:00.000Z" });
  const never = describeHistoryConsistencyHeatmap(empty);
  assert.match(never.emptyMessage ?? "", /first workout/);
  assert.deepEqual(never.compactSummaryItems, ["Start your map"]);

  const quiet = describeHistoryConsistencyHeatmap(buildHistoryConsistencyHeatmap({
    sessions: [session("old", "2026-01-05T15:00:00.000Z")],
    timezone: "America/New_York",
    now: "2026-11-12T15:00:00.000Z",
  }));
  assert.match(quiet.emptyMessage ?? "", /next workout/);
  assert.equal(quiet.description, "No sessions in the last 16 weeks.");

  const one = describeHistoryConsistencyHeatmap(buildHistoryConsistencyHeatmap({
    sessions: [session("one", "2026-11-10T15:00:00.000Z")],
    timezone: "America/New_York",
    now: "2026-11-12T15:00:00.000Z",
  }));
  assert.equal(one.emptyMessage, null);
  assert.equal(one.description, "1 session on 1 active day in the last 16 weeks.");
  assert.deepEqual(one.compactSummaryItems, ["1 session", "1 active day"]);

  const many = describeHistoryConsistencyHeatmap(buildHistoryConsistencyHeatmap({
    sessions: [
      session("a", "2026-11-10T15:00:00.000Z"),
      session("b", "2026-11-10T19:00:00.000Z"),
      session("c", "2026-11-09T15:00:00.000Z"),
    ],
    timezone: "America/New_York",
    now: "2026-11-12T15:00:00.000Z",
  }));
  assert.equal(many.description, "3 sessions on 2 active days in the last 16 weeks.");
});

test("consistency heatmap keeps a month label in the second-to-last column but not the last", () => {
  // Apr 1 2026 sits in the week of Mar 30 (index 14 of 16 when "now" is Apr 10).
  const second = buildHistoryConsistencyHeatmap({ sessions: [], timezone: "America/New_York", now: "2026-04-10T15:00:00.000Z", weekCount: 16 });
  assert.deepEqual(second.monthMarkers.at(-1), { weekIndex: 14, monthKey: "2026-04" });

  // May 1 2026 sits in the week of Apr 27 (the last column when "now" is Apr 30): no room for a label.
  const last = buildHistoryConsistencyHeatmap({ sessions: [], timezone: "America/New_York", now: "2026-05-02T15:00:00.000Z", weekCount: 16 });
  assert.ok(last.monthMarkers.every((marker) => marker.weekIndex <= 14));
});
