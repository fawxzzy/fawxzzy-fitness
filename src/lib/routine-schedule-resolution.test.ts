import assert from "node:assert/strict";
import test from "node:test";

import { resolveRoutineSchedule } from "./routine-schedule-resolution.ts";

test("weekday-anchored 5-day Monday-start maps Monday through Friday", () => {
  assert.deepEqual(
    resolveRoutineSchedule({
      scheduleMode: "weekday_anchored",
      cycleLengthDays: 5,
      anchorWeekday: 1,
      anchorDate: "2026-05-11",
      today: "2026-05-11",
    }),
    {
      status: "scheduled",
      scheduleMode: "weekday_anchored",
      cycleDayIndex: 0,
      cycleDayNumber: 1,
      repeatTier: "weekly",
      effectiveCycleLengthDays: 5,
    },
  );

  assert.deepEqual(
    resolveRoutineSchedule({
      scheduleMode: "weekday_anchored",
      cycleLengthDays: 5,
      anchorWeekday: 1,
      anchorDate: "2026-05-11",
      today: "2026-05-15",
    }),
    {
      status: "scheduled",
      scheduleMode: "weekday_anchored",
      cycleDayIndex: 4,
      cycleDayNumber: 5,
      repeatTier: "weekly",
      effectiveCycleLengthDays: 5,
    },
  );
});

test("weekday-anchored Sunday outside a 5-day Monday-start cycle is unscheduled", () => {
  const resolution = resolveRoutineSchedule({
    scheduleMode: "weekday_anchored",
    cycleLengthDays: 5,
    anchorWeekday: 1,
    anchorDate: "2026-05-11",
    today: "2026-05-17",
  });

  assert.equal(resolution.status, "unscheduled");
  assert.equal(resolution.reason, "outside_active_weekdays");
  assert.equal(resolution.repeatTier, "weekly");
});

test("weekday-anchored schedules between 8 and 14 days resolve as biweekly", () => {
  const resolution = resolveRoutineSchedule({
    scheduleMode: "weekday_anchored",
    cycleLengthDays: 10,
    anchorWeekday: 1,
    anchorDate: "2026-05-11",
    today: "2026-05-20",
  });

  assert.equal(resolution.status, "scheduled");
  assert.equal(resolution.repeatTier, "biweekly");
  assert.equal(resolution.cycleDayNumber, 10);
});

test("weekday-anchored biweekly schedules do not fallback after the active span", () => {
  const resolution = resolveRoutineSchedule({
    scheduleMode: "weekday_anchored",
    cycleLengthDays: 10,
    anchorWeekday: 1,
    anchorDate: "2026-05-11",
    today: "2026-05-23",
  });

  assert.equal(resolution.status, "unscheduled");
  assert.equal(resolution.reason, "outside_cycle");
  assert.equal(resolution.repeatTier, "biweekly");
});

test("weekday-anchored schedules above two weeks resolve as monthly and cap above one month", () => {
  const scheduled = resolveRoutineSchedule({
    scheduleMode: "weekday_anchored",
    cycleLengthDays: 20,
    anchorWeekday: 5,
    anchorDate: "2026-05-01",
    today: "2026-05-20",
  });

  assert.equal(scheduled.status, "scheduled");
  assert.equal(scheduled.repeatTier, "monthly");
  assert.equal(scheduled.cycleDayNumber, 20);
  assert.equal(scheduled.effectiveCycleLengthDays, 20);

  const capped = resolveRoutineSchedule({
    scheduleMode: "weekday_anchored",
    cycleLengthDays: 40,
    anchorWeekday: 5,
    anchorDate: "2026-05-01",
    today: "2026-05-31",
  });

  assert.equal(capped.status, "scheduled");
  assert.equal(capped.repeatTier, "monthly");
  assert.equal(capped.effectiveCycleLengthDays, 31);
  assert.equal(capped.cycleDayNumber, 31);
});

test("weekday-anchored invalid weekday and invalid cycle length fail safely", () => {
  const invalidWeekday = resolveRoutineSchedule({
    scheduleMode: "weekday_anchored",
    cycleLengthDays: 5,
    anchorWeekday: 8,
    today: "2026-05-11",
  });
  const invalidCycleLength = resolveRoutineSchedule({
    scheduleMode: "weekday_anchored",
    cycleLengthDays: 0,
    anchorWeekday: 1,
    today: "2026-05-11",
  });

  assert.equal(invalidWeekday.status, "unscheduled");
  assert.equal(invalidWeekday.reason, "invalid_config");
  assert.equal(invalidCycleLength.status, "unscheduled");
  assert.equal(invalidCycleLength.reason, "invalid_config");
});

test("rolling 2-day cycle repeats every two days from anchor date", () => {
  const dayOne = resolveRoutineSchedule({
    scheduleMode: "rolling_n_day",
    cycleLengthDays: 2,
    anchorDate: "2026-05-11",
    today: "2026-05-11",
  });
  const dayTwo = resolveRoutineSchedule({
    scheduleMode: "rolling_n_day",
    cycleLengthDays: 2,
    anchorDate: "2026-05-11",
    today: "2026-05-12",
  });
  const wraps = resolveRoutineSchedule({
    scheduleMode: "rolling_n_day",
    cycleLengthDays: 2,
    anchorDate: "2026-05-11",
    today: "2026-05-13",
  });

  assert.equal(dayOne.status, "scheduled");
  assert.equal(dayOne.cycleDayNumber, 1);
  assert.equal(dayTwo.status, "scheduled");
  assert.equal(dayTwo.cycleDayNumber, 2);
  assert.equal(wraps.status, "scheduled");
  assert.equal(wraps.cycleDayNumber, 1);
});

test("rolling 5-day cycle ignores weekday alignment and uses modulo from the anchor date", () => {
  const resolution = resolveRoutineSchedule({
    scheduleMode: "rolling_n_day",
    cycleLengthDays: 5,
    anchorDate: "2026-05-11",
    today: "2026-05-16",
  });

  assert.equal(resolution.status, "scheduled");
  assert.equal(resolution.cycleDayNumber, 1);
});

test("rolling schedules with invalid anchor date or cycle length fail safely", () => {
  const invalidAnchor = resolveRoutineSchedule({
    scheduleMode: "rolling_n_day",
    cycleLengthDays: 5,
    anchorDate: "not-a-date",
    today: "2026-05-16",
  });
  const invalidCycleLength = resolveRoutineSchedule({
    scheduleMode: "rolling_n_day",
    cycleLengthDays: -2,
    anchorDate: "2026-05-11",
    today: "2026-05-16",
  });

  assert.equal(invalidAnchor.status, "unscheduled");
  assert.equal(invalidAnchor.reason, "invalid_config");
  assert.equal(invalidCycleLength.status, "unscheduled");
  assert.equal(invalidCycleLength.reason, "invalid_config");
});

test("legacy missing schedule mode defaults to weekday-anchored", () => {
  const resolution = resolveRoutineSchedule({
    cycleLengthDays: 5,
    anchorWeekday: 1,
    anchorDate: "2026-05-11",
    today: "2026-05-15",
  });

  assert.equal(resolution.status, "scheduled");
  assert.equal(resolution.scheduleMode, "weekday_anchored");
});

test("resolver input objects are not mutated", () => {
  const input = {
    scheduleMode: "weekday_anchored" as const,
    cycleLengthDays: 5,
    anchorWeekday: 1,
    anchorDate: "2026-05-11",
    today: "2026-05-17",
  };
  const snapshot = JSON.stringify(input);

  resolveRoutineSchedule(input);

  assert.equal(JSON.stringify(input), snapshot);
});
