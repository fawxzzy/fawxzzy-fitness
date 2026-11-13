import assert from "node:assert/strict";
import test from "node:test";
import {
  getCurrentCycleOccurrenceContext,
  formatRoutineDayDisplayName,
  formatRoutineDayOccurrenceDisplayName,
  formatRoutineDayStableDisplayName,
  getRoutineCycleOccurrence,
  getRoutineDayEditableName,
  getRoutineDayHeading,
  getRoutineDayResolvedWeekdayLabel,
  isRoutineDayDefaultName,
  isRoutineDayGeneratedPlaceholderName,
  resolveCompletedRoutineDayIndexesForOccurrence,
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

test("getCurrentCycleOccurrenceContext maps day indexes to the current cycle occurrence dates", () => {
  const context = getCurrentCycleOccurrenceContext({
    cycleLengthDays: 7,
    startDate: "2026-05-25",
    profileTimeZone: "America/New_York",
    referenceDate: "2026-06-03",
    dayIndexes: [1, 2, 3, 4, 5, 6, 7],
  });

  assert.equal(context.currentCycleStartDate, "2026-06-01");
  assert.equal(context.occurrenceDateByDayIndex.get(1), "2026-06-01");
  assert.equal(context.occurrenceDateByDayIndex.get(3), "2026-06-03");
  assert.equal(context.occurrenceDateByDayIndex.get(7), "2026-06-07");
});

test("resolveCompletedRoutineDayIndexesForOccurrence keeps only sessions from the matching cycle occurrence", () => {
  const occurrenceDateByDayIndex = new Map<number, string>([
    [1, "2026-06-01"],
    [2, "2026-06-02"],
    [3, "2026-06-03"],
  ]);

  const completedDayIndexes = resolveCompletedRoutineDayIndexesForOccurrence({
    occurrenceDateByDayIndex,
    timeZone: "America/New_York",
    sessions: [
      { routine_day_index: 1, performed_at: "2026-06-01T14:00:00.000Z" },
      { routine_day_index: 1, performed_at: "2026-05-25T14:00:00.000Z" },
      { routine_day_index: 2, performed_at: "2026-06-02T14:00:00.000Z" },
      { routine_day_index: 3, performed_at: "2026-06-04T12:00:00.000Z" },
    ],
  });

  assert.deepEqual(completedDayIndexes, [1, 2]);
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

test("getRoutineDayResolvedWeekdayLabel keeps anchored routines on the stored weekday slot", () => {
  assert.equal(
    getRoutineDayResolvedWeekdayLabel({
      dayIndex: 2,
      startDate: "2026-05-11",
      cycleLengthDays: 3,
      scheduleMode: "weekday_anchored",
      profileTimeZone: "America/New_York",
      referenceDate: "2026-05-14",
      weekday: "short",
    }),
    "Tue",
  );
});

test("getRoutineDayWeekdayLabel accepts ISO timestamp start dates", () => {
  assert.equal(
    getRoutineDayResolvedWeekdayLabel({
      dayIndex: 4,
      startDate: "2026-04-20T04:00:00.000Z",
      cycleLengthDays: 9,
      scheduleMode: "weekday_anchored",
      profileTimeZone: "America/New_York",
      referenceDate: "2026-06-25",
      weekday: "short",
    }),
    "Thu",
  );
});

test("getRoutineDayResolvedWeekdayLabel rolls weekday labels forward for rolling cycles", () => {
  assert.equal(
    getRoutineDayResolvedWeekdayLabel({
      dayIndex: 2,
      startDate: "2026-05-11",
      cycleLengthDays: 3,
      scheduleMode: "rolling_n_day",
      profileTimeZone: "America/New_York",
      referenceDate: "2026-05-14",
      weekday: "short",
    }),
    "Fri",
  );
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
      scheduleMode: "weekday_anchored",
      startWeekday: "monday",
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

test("resolveRoutineScheduleForToday honors rolling day-based mode", () => {
  const RealDate = Date;

  class MockDate extends Date {
    constructor(value?: string | number | Date) {
      super(value ?? "2026-05-16T12:00:00.000Z");
    }

    static now() {
      return new RealDate("2026-05-16T12:00:00.000Z").getTime();
    }
  }

  // @ts-expect-error test-only global date override
  globalThis.Date = MockDate;

  try {
    const result = resolveRoutineScheduleForToday({
      cycleLengthDays: 5,
      scheduleMode: "rolling_n_day",
      startDate: "2026-05-11",
      profileTimeZone: "America/New_York",
    });

    assert.equal(result.dayIndex, 1);
    assert.equal(result.resolution.status, "scheduled");
    assert.equal(result.resolution.scheduleMode, "rolling_n_day");
  } finally {
    globalThis.Date = RealDate;
  }
});

test("resolveRoutineScheduleForToday accepts ISO timestamp start dates from persisted routines", () => {
  const RealDate = Date;

  class MockDate extends Date {
    constructor(value?: string | number | Date) {
      super(value ?? "2026-06-22T12:00:00.000Z");
    }

    static now() {
      return new RealDate("2026-06-22T12:00:00.000Z").getTime();
    }
  }

  // @ts-expect-error test-only global date override
  globalThis.Date = MockDate;

  try {
    const result = resolveRoutineScheduleForToday({
      cycleLengthDays: 9,
      scheduleMode: "weekday_anchored",
      startWeekday: "monday",
      startDate: "2026-04-20T04:00:00.000Z",
      profileTimeZone: "America/New_York",
    });

    assert.equal(result.todayDate, "2026-06-22");
    assert.equal(result.dayIndex, 8);
    assert.equal(result.resolution.status, "scheduled");
  } finally {
    globalThis.Date = RealDate;
  }
});

test("a reordered default-named day reads as its position, not as a custom title (\"7 Tue\" regression)", () => {
  // Seeds store name = String(index + 1). After day 7 is dragged to position 6 the stored name is still "7".
  const args = { name: "7", dayIndex: 6, startDate: "2026-04-27" };

  assert.equal(isRoutineDayDefaultName(args), true);
  assert.equal(getRoutineDayEditableName(args), "");
  assert.equal(formatRoutineDayStableDisplayName(args), "Day 6");
});

test("generated placeholder names are bare numbers, Day N and weekday names; anything else is a user title", () => {
  for (const placeholder of ["", "  ", "7", "07", "Day 7", "day7", "Tue", "tuesday", "SUNDAY"]) {
    assert.equal(isRoutineDayGeneratedPlaceholderName(placeholder), true, `expected placeholder: ${JSON.stringify(placeholder)}`);
  }
  for (const title of ["Push", "Lower A", "Rest", "Day 7 Heavy", "5K Run", "Tue Forge", "Tues"]) {
    assert.equal(isRoutineDayGeneratedPlaceholderName(title), false, `expected user title: ${JSON.stringify(title)}`);
  }
  assert.equal(isRoutineDayGeneratedPlaceholderName(null), true);
  assert.equal(isRoutineDayGeneratedPlaceholderName(undefined), true);
});

test("a stale weekday prefix from an earlier position or start date is stripped from custom titles", () => {
  assert.equal(
    getRoutineDayEditableName({ name: "Mon | Forge", dayIndex: 3, startDate: "2026-04-27" }),
    "Forge",
  );
});

test("getRoutineDayHeading: default-named day headlines with Day N and keeps the weekday as meta", () => {
  assert.deepEqual(
    getRoutineDayHeading({ name: "3", dayIndex: 6, startDate: "2026-04-27", weekdayLabel: "Sat" }),
    {
      positionLabel: "Day 6",
      customTitle: null,
      title: "Day 6",
      weekday: "Sat",
      metaParts: ["Sat"],
    },
  );
});

test("getRoutineDayHeading: a custom title takes the headline and Day N moves to meta", () => {
  assert.deepEqual(
    getRoutineDayHeading({ name: "Push", dayIndex: 2, startDate: "2026-04-27", weekdayLabel: "Tue" }),
    {
      positionLabel: "Day 2",
      customTitle: "Push",
      title: "Push",
      weekday: "Tue",
      metaParts: ["Day 2", "Tue"],
    },
  );
});

test("getRoutineDayHeading: rest days read Rest, an unresolved weekday is omitted, and the position label is never duplicated as a weekday", () => {
  assert.equal(getRoutineDayHeading({ name: "4", dayIndex: 4, startDate: null, isRest: true }).title, "Rest");
  assert.deepEqual(
    getRoutineDayHeading({ name: "4", dayIndex: 4, startDate: null, weekdayLabel: "Day 4" }).metaParts,
    [],
  );
  assert.deepEqual(
    getRoutineDayHeading({ name: "Rest", dayIndex: 4, startDate: null, weekdayLabel: "Thu", isRest: true }).metaParts,
    ["Day 4", "Thu"],
  );
});
