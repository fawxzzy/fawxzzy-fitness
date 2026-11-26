import test from "node:test";
import assert from "node:assert/strict";

import { resolveTodayNextUp } from "./todayNextUp";

const week = [
  { dayIndex: 1, name: "Push A", isRest: false, exerciseCount: 5, occurrenceWeekday: "Mon" },
  { dayIndex: 2, name: "Rest", isRest: true, exerciseCount: 0, occurrenceWeekday: "Tue" },
  { dayIndex: 3, name: "Day 3", isRest: false, exerciseCount: 0, occurrenceWeekday: "Wed" },
  { dayIndex: 4, name: "Pull A", isRest: false, exerciseCount: 6, occurrenceWeekday: "Thu" },
];

test("a rest day points at the next day with exercises, skipping rest and empty days", () => {
  assert.deepEqual(resolveTodayNextUp(week, 2), { dayIndex: 4, label: "Next up: Pull A · Thu", actionLabel: "Show Pull A" });
});

test("the cycle wraps around to the first day", () => {
  assert.equal(resolveTodayNextUp(week, 4)?.dayIndex, 1);
});

test("an empty day also gets a next up", () => {
  assert.equal(resolveTodayNextUp(week, 3)?.label, "Next up: Pull A · Thu");
});

test("nothing to point at: no next up", () => {
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
  assert.equal(resolveTodayNextUp(days, 1)?.label, "Next up: Day 2");
  assert.equal(resolveTodayNextUp(days, 2)?.label, "Next up: Sun");
});
