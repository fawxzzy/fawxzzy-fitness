import assert from "node:assert/strict";
import test from "node:test";

import type { SessionSummary } from "@/app/history/session-summary";
import { buildHistoryCalendarView } from "./history-calendar.ts";

function createSession(id: string, startedAt: string): SessionSummary {
  return {
    id,
    startedAt,
    routineTitle: "Strength",
    exerciseCount: 1,
    setCount: 3,
    repCount: 15,
    prCounts: { reps: 0, weight: 0, total: 0 },
    prLabel: "No PRs",
    totalVolume: 0,
    hasNote: false,
    hasSetData: true,
  };
}

function findCalendarDay(view: ReturnType<typeof buildHistoryCalendarView>, dayKey: string) {
  for (const month of view.months) {
    for (const week of month.weeks) {
      for (const day of week) {
        if (day.dayKey === dayKey) {
          return day;
        }
      }
    }
  }

  return null;
}

test("history calendar groups sessions by local day and preserves day selection", () => {
  const view = buildHistoryCalendarView({
    sessions: [
      createSession("session-1", "2026-05-02T01:30:00.000Z"),
      createSession("session-2", "2026-05-02T03:30:00.000Z"),
      createSession("session-3", "2026-05-03T14:00:00.000Z"),
    ],
    timezone: "America/New_York",
    selectedDayKey: "2026-05-01",
    now: "2026-05-03T16:00:00.000Z",
    maxMonths: 2,
  });

  assert.equal(view.selectedDay?.dayKey, "2026-05-01");
  assert.equal(view.selectedDay?.sessionCount, 2);

  const mayMonth = view.months.find((month) => month.monthKey === "2026-05-01");
  assert.ok(mayMonth);
  assert.equal(mayMonth?.activeDayCount, 2);
  assert.equal(mayMonth?.sessionCount, 3);

  const selectedDay = findCalendarDay(view, "2026-05-01");
  assert.ok(selectedDay);
  assert.equal(selectedDay?.isSelected, true);
  assert.equal(selectedDay?.activityTone, "medium");

  const todayDay = findCalendarDay(view, "2026-05-03");
  assert.ok(todayDay);
  assert.equal(todayDay?.isToday, true);
  assert.equal(todayDay?.sessionCount, 1);
});

test("history calendar keeps the selected month visible when it falls outside the recent window", () => {
  const view = buildHistoryCalendarView({
    sessions: [
      createSession("session-1", "2026-06-14T14:00:00.000Z"),
      createSession("session-2", "2026-07-09T14:00:00.000Z"),
    ],
    timezone: "America/New_York",
    selectedDayKey: "2026-04-02",
    now: "2026-07-10T14:00:00.000Z",
    maxMonths: 2,
  });

  assert.deepEqual(
    view.months.map((month) => month.monthKey),
    ["2026-07-01", "2026-04-01"],
  );
});

test("history calendar still renders the current month when no sessions exist", () => {
  const view = buildHistoryCalendarView({
    sessions: [],
    timezone: "America/New_York",
    now: "2026-07-10T14:00:00.000Z",
  });

  assert.equal(view.months.length, 1);
  assert.equal(view.months[0]?.monthKey, "2026-07-01");
  assert.equal(view.selectedDay, null);
});

test("history calendar renders only the explicitly selected month", () => {
  const view = buildHistoryCalendarView({
    sessions: [
      createSession("session-1", "2026-05-02T14:00:00.000Z"),
      createSession("session-2", "2026-07-09T14:00:00.000Z"),
    ],
    timezone: "America/New_York",
    selectedMonthKey: "2026-05",
    now: "2026-07-10T14:00:00.000Z",
  });

  assert.deepEqual(view.months.map((month) => month.monthKey), ["2026-05-01"]);
  assert.equal(view.months[0]?.sessionCount, 1);
});

test("history calendar marks planned misses while completed sessions retain training truth", () => {
  const view = buildHistoryCalendarView({
    sessions: [createSession("session-1", "2026-07-08T14:00:00.000Z")],
    timezone: "America/New_York",
    skippedDayKeys: ["2026-07-07", "2026-07-08"],
    now: "2026-07-10T14:00:00.000Z",
  });

  assert.equal(findCalendarDay(view, "2026-07-07")?.isSkipped, true);
  assert.equal(findCalendarDay(view, "2026-07-07")?.activityTone, "none");
  assert.equal(findCalendarDay(view, "2026-07-08")?.isSkipped, false);
  assert.equal(findCalendarDay(view, "2026-07-08")?.activityTone, "low");
});
