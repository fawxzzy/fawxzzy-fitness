import test from "node:test";
import assert from "node:assert/strict";

import {
  buildTodayRoutinePayloadState,
  deriveTodayScreenMode,
  formatTodayHeaderTitle,
  getTodayGlobalErrorMessage,
  getTodayDaySummary,
  getTodayDaySummaryTone,
  resolveTodayDisplayDay,
} from "./today-page-state.ts";

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
    hasScheduledDayToday: true,
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
    hasScheduledDayToday: true,
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
    hasScheduledDayToday: true,
    source: "session",
  });
});

test("resolveTodayDisplayDay prefers the current routine day name over a stale session snapshot label", () => {
  const result = resolveTodayDisplayDay({
    calendarDayIndex: 2,
    todayRoutineDay: { id: "day-2", day_index: 2, name: "Push", is_rest: false },
    routineDays: [
      { id: "day-2", day_index: 2, name: "Push", is_rest: false },
      { id: "day-4", day_index: 4, name: "Hunt", is_rest: false },
    ],
    inProgressSession: { routine_day_index: 4, routine_day_name: "Mon | Hunt" },
  });

  assert.deepEqual(result, {
    dayIndex: 4,
    routineDay: { id: "day-4", day_index: 4, name: "Hunt", is_rest: false },
    dayName: "Hunt",
    hasScheduledDayToday: true,
    source: "session",
  });
});

test("resolveTodayDisplayDay falls back to a template day when today is unscheduled", () => {
  const result = resolveTodayDisplayDay({
    calendarDayIndex: null,
    todayRoutineDay: null,
    fallbackRoutineDay: { id: "day-1", day_index: 1, name: "Push", is_rest: false },
    routineDays: [
      { id: "day-1", day_index: 1, name: "Push", is_rest: false },
      { id: "day-2", day_index: 2, name: "Pull", is_rest: false },
    ],
    inProgressSession: null,
  });

  assert.deepEqual(result, {
    dayIndex: 1,
    routineDay: { id: "day-1", day_index: 1, name: "Push", is_rest: false },
    dayName: "Push",
    hasScheduledDayToday: false,
    source: "template",
  });
});

test("buildTodayRoutinePayloadState preserves an active routine when downstream day loading fails", () => {
  const payload = buildTodayRoutinePayloadState({
    activeRoutine: { id: "routine-1", name: "Strength Base" },
    effectiveDayIndex: null,
    routineDayName: null,
    routineDayWeekday: null,
    isRest: false,
    state: "empty",
    routineDayId: null,
    fallbackDayIndex: 3,
  });

  assert.deepEqual(payload, {
    id: "routine-1",
    name: "Strength Base",
    dayIndex: 3,
    dayName: "Day 3",
    dayWeekday: null,
    isRest: false,
    state: "empty",
    routineId: "routine-1",
    routineDayId: null,
  });
});

test("buildTodayRoutinePayloadState reserves no-routine state for a genuinely missing active routine", () => {
  const payload = buildTodayRoutinePayloadState({
    activeRoutine: null,
    effectiveDayIndex: null,
    routineDayName: null,
    isRest: false,
    state: "empty",
    routineDayId: null,
    fallbackDayIndex: 1,
  });

  assert.equal(payload, null);
});

test("deriveTodayScreenMode returns start dock for runnable day", () => {
  const mode = deriveTodayScreenMode({
    days: [{
      id: "day-1",
      dayIndex: 1,
      name: "Push",
      isRest: false,
      state: "runnable",
      invalidExerciseCount: 0,
      exercises: [{ id: "ex-1", name: "Bench" }],
    }],
    selectedDayIndex: 1,
    currentDayIndex: 1,
    dayPickerOpen: false,
  });

  assert.equal(mode.runnableSelection, true);
  assert.equal(mode.dayRowsVisible, true);
  assert.equal(mode.cta.primaryLabel, "Start Workout");
  assert.equal(mode.cta.secondaryLabel, "Switch Day");
});

test("deriveTodayScreenMode hides rows and switches secondary CTA when picker is open", () => {
  const mode = deriveTodayScreenMode({
    days: [{
      id: "day-1",
      dayIndex: 1,
      name: "Push",
      isRest: false,
      state: "runnable",
      invalidExerciseCount: 0,
      exercises: [{ id: "ex-1", name: "Bench" }],
    }],
    selectedDayIndex: 1,
    currentDayIndex: 1,
    dayPickerOpen: true,
  });

  assert.equal(mode.dayListVisible, true);
  assert.equal(mode.dayRowsVisible, false);
  assert.equal(mode.cta.secondaryLabel, "Hide");
});

test("deriveTodayScreenMode keeps resume CTA available for closed picker empty states", () => {
  const mode = deriveTodayScreenMode({
    days: [{
      id: "day-3",
      dayIndex: 3,
      name: "Travel",
      isRest: false,
      state: "empty",
      invalidExerciseCount: 0,
      exercises: [],
    }],
    selectedDayIndex: 3,
    currentDayIndex: 3,
    dayPickerOpen: false,
    inProgressSessionId: "session-1",
  });

  assert.equal(mode.dayPickerOpen, false);
  assert.equal(mode.dayRowsVisible, false);
  assert.equal(mode.summaryVisible, false);
  assert.equal(mode.contentShellVisible, true);
  assert.equal(mode.emptyTrainingDay, true);
  assert.equal(mode.cta.showPrimary, true);
  assert.equal(mode.cta.primaryLabel, "Resume Workout");
  assert.equal(mode.cta.secondaryLabel, "Switch Day");
});

test("deriveTodayScreenMode keeps rest-day detail content visible when the picker is closed", () => {
  const mode = deriveTodayScreenMode({
    days: [{
      id: "day-4",
      dayIndex: 4,
      name: "Recovery",
      isRest: true,
      state: "rest",
      invalidExerciseCount: 0,
      exercises: [],
    }],
    selectedDayIndex: 4,
    currentDayIndex: 4,
    dayPickerOpen: false,
  });

  assert.equal(mode.restDay, true);
  assert.equal(mode.summaryVisible, true);
  assert.equal(mode.dayRowsVisible, false);
  assert.equal(mode.contentShellVisible, true);
  assert.equal(mode.cta.showPrimary, false);
});

test("deriveTodayScreenMode falls back to the first template day when no calendar day is scheduled", () => {
  const mode = deriveTodayScreenMode({
    days: [{
      id: "day-4",
      dayIndex: 4,
      name: "Travel Reset",
      isRest: false,
      state: "runnable",
      invalidExerciseCount: 0,
      exercises: [{ id: "ex-1", name: "Carry" }],
    }],
    selectedDayIndex: null,
    currentDayIndex: null,
    dayPickerOpen: false,
  });

  assert.equal(mode.selectedDay?.dayIndex, 4);
  assert.equal(mode.runnableSelection, true);
  assert.equal(mode.cta.primaryLabel, "Start Workout");
});

test("rest and invalid-empty summaries resolve from pure summary selectors", () => {
  const restSummary = getTodayDaySummary({
    id: "day-1",
    dayIndex: 1,
    name: "Recovery",
    isRest: true,
    state: "rest",
    invalidExerciseCount: 0,
    exercises: [],
  });
  const invalidEmptyTone = getTodayDaySummaryTone({
    id: "day-2",
    dayIndex: 2,
    name: "Broken day",
    isRest: false,
    state: "empty",
    invalidExerciseCount: 2,
    exercises: [],
  });
  const neutralEmptySummary = getTodayDaySummary({
    id: "day-3",
    dayIndex: 3,
    name: "Travel",
    isRest: false,
    state: "empty",
    invalidExerciseCount: 0,
    exercises: [],
  });

  assert.equal(restSummary, "Rest day.");
  assert.equal(invalidEmptyTone, "blocking");
  assert.equal(neutralEmptySummary, null);
});

test("formatTodayHeaderTitle joins routine and day names", () => {
  assert.equal(formatTodayHeaderTitle("4Dayz", "Chest"), "4Dayz | Chest");
  assert.equal(formatTodayHeaderTitle("4Dayz", ""), "4Dayz");
});
