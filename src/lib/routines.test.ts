import assert from "node:assert/strict";
import test from "node:test";
import {
  formatRoutineDayDisplayName,
  formatRoutineDayOccurrenceDisplayName,
  formatRoutineDayStableDisplayName,
  getRoutineCycleOccurrence,
  getRoutineDayEditableName,
  resolveRoutineScheduleForToday,
} from "./routines.ts";

test("getRoutineDayEditableName strips a stored weekday prefix from custom names", () => {
  assert.equal(
    getRoutineDayEditableName({
      name: "Tue \u00C2\u00B7 Forge",
      dayIndex: 2,
      startDate: "2026-04-27",
    }),
    "Forge",
  );
});

test("formatRoutineDayDisplayName does not duplicate weekday when the stored name is already formatted", () => {
  assert.equal(
    formatRoutineDayDisplayName({
      name: "Tue \u00C2\u00B7 Forge",
      dayIndex: 2,
      startDate: "2026-04-27",
    }),
    "Tue | Forge",
  );
});

test("formatRoutineDayStableDisplayName keeps only the program day name", () => {
  assert.equal(
    formatRoutineDayStableDisplayName({
      name: "Rest",
      dayIndex: 3,
      startDate: "2026-05-04",
    }),
    "Rest",
  );
});

test("getRoutineCycleOccurrence advances labels for non-week cycles", () => {
  const occurrence = getRoutineCycleOccurrence({
    cycleLengthDays: 3,
    startDate: "2026-05-11",
    profileTimeZone: "America/New_York",
    referenceDate: "2026-05-14",
    dayIndex: 1,
  });

  assert.equal(occurrence.currentDayIndex, 1);
  assert.equal(occurrence.occurrenceDate, "2026-05-14");
  assert.equal(occurrence.occurrenceLabel, "Thu, May 14");
  assert.equal(occurrence.cycleRotationIndex, 1);
});

test("getRoutineCycleOccurrence returns next occurrence for previous cycle days", () => {
  const occurrence = getRoutineCycleOccurrence({
    cycleLengthDays: 3,
    startDate: "2026-05-11",
    profileTimeZone: "America/New_York",
    referenceDate: "2026-05-13",
    dayIndex: 1,
  });

  assert.equal(occurrence.currentDayIndex, 3);
  assert.equal(occurrence.occurrenceDate, "2026-05-14");
  assert.equal(occurrence.occurrenceLabel, "Thu, May 14");
});

test("formatRoutineDayOccurrenceDisplayName preserves routine day name and appends occurrence date", () => {
  assert.equal(
    formatRoutineDayOccurrenceDisplayName({
      name: "Push",
      dayIndex: 1,
      startDate: "2026-05-11",
      occurrenceLabel: "Thu, May 14",
    }),
    "Push | Thu, May 14",
  );
});

test("resolveRoutineScheduleForToday does not fallback to Friday for a Monday-start 5-day routine on Sunday", () => {
  const RealDate = Date;

  class MockDate extends Date {
    constructor(value?: string | number | Date) {
      super(value ?? "2026-05-17T12:00:00.000Z");
    }

    static now() {
      return new RealDate("2026-05-17T12:00:00.000Z").getTime();
    }
  }

  // @ts-expect-error test-only global date override
  globalThis.Date = MockDate;

  try {
    const result = resolveRoutineScheduleForToday({
      cycleLengthDays: 5,
      startDate: "2026-05-11",
      profileTimeZone: "America/New_York",
    });

    assert.equal(result.todayDate, "2026-05-17");
    assert.equal(result.dayIndex, null);
    assert.equal(result.resolution.status, "unscheduled");
  } finally {
    globalThis.Date = RealDate;
  }
});

test("resolveRoutineScheduleForToday respects rolling schedules and repeats by modulo from the anchor date", () => {
  const RealDate = Date;

  class MockDate extends Date {
    constructor(value?: string | number | Date) {
      super(value ?? "2026-05-13T12:00:00.000Z");
    }

    static now() {
      return new RealDate("2026-05-13T12:00:00.000Z").getTime();
    }
  }

  // @ts-expect-error test-only global date override
  globalThis.Date = MockDate;

  try {
    const result = resolveRoutineScheduleForToday({
      scheduleMode: "rolling_n_day",
      cycleLengthDays: 2,
      startDate: "2026-05-11",
      profileTimeZone: "America/New_York",
    });

    assert.equal(result.todayDate, "2026-05-13");
    assert.equal(result.dayIndex, 1);
    assert.equal(result.resolution.status, "scheduled");
    assert.equal(result.resolution.scheduleMode, "rolling_n_day");
  } finally {
    globalThis.Date = RealDate;
  }
});
