import test from "node:test";
import assert from "node:assert/strict";

import { formatTodayNextUpDate, resolveTodayNextUp } from "./todayNextUp";

const week = [
  { dayIndex: 1, name: "Push A", isRest: false, exerciseCount: 5, occurrenceWeekday: "Mon" },
  { dayIndex: 2, name: "Rest", isRest: true, exerciseCount: 0, occurrenceWeekday: "Tue" },
  { dayIndex: 3, name: "Day 3", isRest: false, exerciseCount: 0, occurrenceWeekday: "Wed" },
  { dayIndex: 4, name: "Pull A", isRest: false, exerciseCount: 6, occurrenceWeekday: "Thu" },
];

test("a rest day points at the next day with exercises, skipping rest and empty days", () => {
  assert.deepEqual(resolveTodayNextUp(week, 2), { dayIndex: 4, label: "Next: Pull A · Thu", actionLabel: "Show Pull A", stepsAhead: 2 });
});

test("when the rest day is calendar today, the line names the date", () => {
  assert.equal(resolveTodayNextUp(week, 2, { todayDate: "2026-11-25" })?.label, "Next: Pull A on Fri, Nov 27");
  assert.equal(resolveTodayNextUp(week, 4, { todayDate: "2026-12-31" })?.label, "Next: Push A on Fri, Jan 1", "wraps the cycle and the year");
  assert.equal(resolveTodayNextUp(week, 2, { todayDate: "not-a-date" })?.label, "Next: Pull A · Thu", "a bad date falls back to the weekday");
});

test("formatTodayNextUpDate adds whole days without zone drift", () => {
  assert.equal(formatTodayNextUpDate("2026-11-26", 1), "Fri, Nov 27");
  assert.equal(formatTodayNextUpDate("2026-02-28", 1), "Sun, Mar 1");
  assert.equal(formatTodayNextUpDate("2026-11-26", 0), "Thu, Nov 26");
  assert.equal(formatTodayNextUpDate("11/26/2026", 1), null);
});

test("the cycle wraps around to the first day", () => {
  assert.equal(resolveTodayNextUp(week, 4)?.dayIndex, 1);
  assert.equal(resolveTodayNextUp(week, 4)?.stepsAhead, 1);
});

test("an empty day also gets a next", () => {
  assert.equal(resolveTodayNextUp(week, 3)?.label, "Next: Pull A · Thu");
});

test("nothing to point at: no next", () => {
  assert.equal(resolveTodayNextUp([week[1], week[2]], 2), null);
  assert.equal(resolveTodayNextUp([week[0]], 1), null, "a one-day routine never points at itself");
  assert.equal(resolveTodayNextUp(week, 9), null);
});

test("a blank name falls back to Day N and a weekday that repeats the name is dropped", () => {
  const days = [
    { dayIndex: 1, name: "Rest", isRest: true, exerciseCount: 0 },
    { dayIndex: 2, name: " ", isRest: false, exerciseCount: 3, occurrenceWeekday: null },
    { dayIndex: 3, name: "Sun", isRest: false, exerciseCount: 3, occurrenceWeekday: "Sun" },
  ];
  assert.equal(resolveTodayNextUp(days, 1)?.label, "Next: Day 2");
  assert.equal(resolveTodayNextUp(days, 2)?.label, "Next: Sun");
});
