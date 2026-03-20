import test from "node:test";
import assert from "node:assert/strict";

import { getTodayGlobalErrorMessage, resolveTodayDisplayDay } from "./today-page-state.ts";

test("getTodayGlobalErrorMessage hides stale redirect errors during normal browsing", () => {
  assert.equal(
    getTodayGlobalErrorMessage({ searchParamError: "Unable to discard", hasInProgressSession: false, fetchFailed: false }),
    null,
  );
  assert.equal(
    getTodayGlobalErrorMessage({ searchParamError: "Unable to discard", hasInProgressSession: true, fetchFailed: true }),
    null,
  );
});

test("getTodayGlobalErrorMessage keeps active in-progress flow errors visible", () => {
  assert.equal(
    getTodayGlobalErrorMessage({ searchParamError: "Unable to discard", hasInProgressSession: true, fetchFailed: false }),
    "Unable to discard",
  );
});

test("resolveTodayDisplayDay falls back to the calendar day when no active session exists", () => {
  const result = resolveTodayDisplayDay({
    calendarDayIndex: 2,
    todayRoutineDay: { id: "day-2", day_index: 2, name: "Push", is_rest: false },
    routineDays: [
      { id: "day-1", day_index: 1, name: "Pull", is_rest: false },
      { id: "day-2", day_index: 2, name: "Push", is_rest: false },
    ],
    inProgressSession: null,
  });

  assert.deepEqual(result, {
    dayIndex: 2,
    routineDay: { id: "day-2", day_index: 2, name: "Push", is_rest: false },
    dayName: "Push",
    source: "calendar",
  });
});

test("resolveTodayDisplayDay restores the manually selected session day instead of recalculating today", () => {
  const result = resolveTodayDisplayDay({
    calendarDayIndex: 2,
    todayRoutineDay: { id: "day-2", day_index: 2, name: "Push", is_rest: false },
    routineDays: [
      { id: "day-2", day_index: 2, name: "Push", is_rest: false },
      { id: "day-4", day_index: 4, name: "Legs", is_rest: false },
    ],
    inProgressSession: { routine_day_index: 4, routine_day_name: "Legs" },
  });

  assert.deepEqual(result, {
    dayIndex: 4,
    routineDay: { id: "day-4", day_index: 4, name: "Legs", is_rest: false },
    dayName: "Legs",
    source: "session",
  });
});

test("resolveTodayDisplayDay keeps the session snapshot label even if the routine day list has changed", () => {
  const result = resolveTodayDisplayDay({
    calendarDayIndex: 2,
    todayRoutineDay: { id: "day-2", day_index: 2, name: "Push", is_rest: false },
    routineDays: [{ id: "day-2", day_index: 2, name: "Push", is_rest: false }],
    inProgressSession: { routine_day_index: 5, routine_day_name: "Travel Day" },
  });

  assert.deepEqual(result, {
    dayIndex: 5,
    routineDay: null,
    dayName: "Travel Day",
    source: "session",
  });
});
