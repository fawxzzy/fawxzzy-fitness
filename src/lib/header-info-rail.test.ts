import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCurrentSessionHeaderInfoRailItems,
  buildCurrentRoutineInfoRailItems,
  buildRoutineWorkoutPlanEditorInfoRailItems,
  buildRoutineBrowseInfoRailItems,
  buildRoutineTrainingRestInfoRailItems,
  buildTodayHeaderInfoRailItems,
} from "@/lib/header-info-rail";

test("routine training/rest rail items keep stable routine-level ordering", () => {
  assert.deepEqual(buildRoutineTrainingRestInfoRailItems({
    trainingDays: 5,
    restDays: 2,
  }), [
    {
      id: "training-days",
      label: "training",
      value: 5,
      tone: "accent",
      title: "Training days in this routine cycle",
    },
    {
      id: "rest-days",
      label: "rest",
      value: 2,
      tone: "muted",
      title: "Rest days in this routine cycle",
    },
  ]);
});

test("routine training/rest rail items do not depend on taxonomy totals", () => {
  const items = buildRoutineTrainingRestInfoRailItems({
    trainingDays: 5,
    restDays: 2,
  });

  assert.equal(items.map((item) => `${item.value} ${item.label}`).join(" | "), "5 training | 2 rest");
});

test("browse rail items render the active routine first when present", () => {
  assert.deepEqual(buildRoutineBrowseInfoRailItems({
    activeRoutineName: "Pull Day",
    routineCount: 3,
  }), [
    {
      id: "active-routine",
      label: "Active",
      value: "Pull Day",
      tone: "accent",
      title: "Current active routine",
      valuePosition: "after",
    },
    {
      id: "routine-count",
      label: "routines total",
      value: 3,
      tone: "default",
      title: "Total available routines",
    },
  ]);
});

test("browse rail items still render routine totals when no active routine is selected", () => {
  assert.deepEqual(buildRoutineBrowseInfoRailItems({
    activeRoutineName: null,
    routineCount: 1,
  }), [
    {
      id: "routine-count",
      label: "routine total",
      value: 1,
      tone: "default",
      title: "Total available routines",
    },
  ]);
});

test("current routine rail items are derived from live current routine day info", () => {
  assert.deepEqual(buildCurrentRoutineInfoRailItems({
    trainingDays: 5,
    restDays: 2,
    days: [
      {
        dayIndex: 1,
        isRest: false,
        isToday: false,
        isCompleted: true,
        isInSession: false,
        splitSummary: { total: 6 },
      },
      {
        dayIndex: 2,
        isRest: false,
        isToday: true,
        isCompleted: false,
        isSkipped: false,
        isInSession: true,
        splitSummary: { total: 5 },
      },
      {
        dayIndex: 3,
        isRest: true,
        isToday: false,
        isCompleted: false,
        isSkipped: true,
        isInSession: false,
        splitSummary: { total: 0 },
      },
    ],
  }), [
    {
      id: "live-session",
      label: "In Session",
      value: "Day 2",
      tone: "accent",
      title: "Current active session day",
      valuePosition: "after",
    },
    {
      id: "cycle-progress",
      label: "Cycle Progress",
      value: "Day 2 of 7",
      tone: "default",
      title: "Current day position inside this routine cycle",
      valuePosition: "after",
    },
    {
      id: "cycle-status",
      label: "Cycle Status",
      value: "1 done · 1 skipped",
      tone: "warning",
      title: "Completion and skip status across the current routine cycle",
      valuePosition: "after",
    },
    {
      id: "structure",
      label: "Structure",
      value: "5 training · 2 rest",
      tone: "default",
      title: "Training and rest day split in this routine cycle",
      valuePosition: "after",
    },
  ]);
});

test("current routine rail falls back to today state when no live session exists", () => {
  assert.deepEqual(buildCurrentRoutineInfoRailItems({
    trainingDays: 4,
    restDays: 1,
    days: [
      {
        dayIndex: 4,
        isRest: true,
        isToday: true,
        isCompleted: false,
        isInSession: false,
        splitSummary: { total: 0 },
      },
      {
        dayIndex: 5,
        isRest: false,
        isToday: false,
        isCompleted: false,
        isInSession: false,
        splitSummary: { total: 3 },
      },
    ],
  }), [
    {
      id: "today-state",
      label: "Today",
      value: "Rest Day",
      tone: "muted",
      title: "Today resolves to a routine rest day",
      valuePosition: "after",
    },
    {
      id: "cycle-progress",
      label: "Cycle Progress",
      value: "Day 4 of 5",
      tone: "default",
      title: "Current day position inside this routine cycle",
      valuePosition: "after",
    },
    {
      id: "structure",
      label: "Structure",
      value: "4 training · 1 rest",
      tone: "default",
      title: "Training and rest day split in this routine cycle",
      valuePosition: "after",
    },
    {
      id: "exercise-count",
      label: "Exercises",
      value: 3,
      tone: "default",
      title: "Total exercises currently configured in this routine",
      valuePosition: "after",
    },
  ]);
});

test("routine workout-plan editor rail keeps the screen focused on structure and current slot context", () => {
  assert.deepEqual(buildRoutineWorkoutPlanEditorInfoRailItems({
    trainingDays: 5,
    restDays: 2,
    days: [
      {
        dayIndex: 1,
        isRest: false,
        isToday: false,
        isCompleted: true,
        isInSession: false,
        splitSummary: { total: 6 },
      },
      {
        dayIndex: 2,
        isRest: false,
        isToday: true,
        isCompleted: false,
        isSkipped: true,
        isInSession: false,
        splitSummary: { total: 5 },
      },
      {
        dayIndex: 3,
        isRest: true,
        isToday: false,
        isCompleted: false,
        isInSession: false,
        splitSummary: { total: 0 },
      },
    ],
  }), [
    {
      id: "today-state",
      label: "Today",
      value: "Workout Day",
      tone: "accent",
      title: "Today resolves to a routine workout day",
      valuePosition: "after",
    },
    {
      id: "cycle-progress",
      label: "Cycle Slot",
      value: "Day 2 of 7",
      tone: "default",
      title: "Current day position inside this routine cycle",
      valuePosition: "after",
    },
    {
      id: "workout-plan-count",
      label: "workout plans",
      value: 5,
      tone: "accent",
      title: "Configured workout plans in this routine",
    },
    {
      id: "rest-count",
      label: "rest days",
      value: 2,
      tone: "muted",
      title: "Configured rest days in this routine",
    },
  ]);
});

test("today rail items prioritize the selected day context before routine structure", () => {
  assert.deepEqual(buildTodayHeaderInfoRailItems({
    trainingDays: 5,
    restDays: 2,
    daysLength: 7,
    selectedDay: {
      dayIndex: 3,
      isRest: false,
      isToday: true,
      isInSession: false,
      state: "runnable",
      invalidExerciseCount: 0,
      splitSummary: {
        total: 6,
        strength: 5,
        cardio: 1,
        bodyweight: 0,
        unknown: 0,
      },
    },
  }), [
    {
      id: "day-state",
      label: "Today",
      value: "Workout Day",
      tone: "accent",
      title: "Current routine day state",
      valuePosition: "after",
    },
    {
      id: "cycle-position",
      label: "Cycle",
      value: "Day 3 of 7",
      tone: "default",
      title: "Selected day position inside the current routine cycle",
      valuePosition: "after",
    },
    {
      id: "day-load",
      label: "Day Load",
      value: "6 exercises",
      tone: "default",
      title: "Configured exercise count for this day",
      valuePosition: "after",
    },
    {
      id: "day-focus",
      label: "Focus",
      value: "Strength-heavy",
      tone: "default",
      title: "Overall exercise mix for this day",
      valuePosition: "after",
    },
  ]);
});

test("today rail items show status and structure for a selected rest day", () => {
  assert.deepEqual(buildTodayHeaderInfoRailItems({
    trainingDays: 4,
    restDays: 1,
    daysLength: 5,
    selectedDay: {
      dayIndex: 4,
      isRest: true,
      isToday: true,
      isInSession: false,
      state: "rest",
      invalidExerciseCount: 0,
      splitSummary: {
        total: 0,
        strength: 0,
        cardio: 0,
        bodyweight: 0,
        unknown: 0,
      },
    },
  }), [
    {
      id: "day-state",
      label: "Today",
      value: "Rest Day",
      tone: "muted",
      title: "Current routine day state",
      valuePosition: "after",
    },
    {
      id: "cycle-position",
      label: "Cycle",
      value: "Day 4 of 5",
      tone: "default",
      title: "Selected day position inside the current routine cycle",
      valuePosition: "after",
    },
    {
      id: "routine-structure",
      label: "Structure",
      value: "4 training · 1 rest",
      tone: "default",
      title: "Training and rest day split across this routine",
      valuePosition: "after",
    },
  ]);
});

test("today rail items surface partial-day warnings before lower-priority summaries", () => {
  assert.deepEqual(buildTodayHeaderInfoRailItems({
    trainingDays: 3,
    restDays: 1,
    daysLength: 4,
    selectedDay: {
      dayIndex: 2,
      isRest: false,
      isToday: false,
      isInSession: true,
      state: "partial",
      invalidExerciseCount: 0,
      splitSummary: {
        total: 3,
        strength: 1,
        cardio: 1,
        bodyweight: 1,
        unknown: 0,
      },
    },
  }), [
    {
      id: "live-session",
      label: "In Session",
      value: "Day 2",
      tone: "accent",
      title: "Current active routine day session",
      valuePosition: "after",
    },
    {
      id: "cycle-position",
      label: "Cycle",
      value: "Day 2 of 4",
      tone: "default",
      title: "Selected day position inside the current routine cycle",
      valuePosition: "after",
    },
    {
      id: "day-status",
      label: "Status",
      value: "Some exercises skipped",
      tone: "warning",
      title: "Some exercises on this day are unavailable and will be skipped",
      valuePosition: "after",
    },
    {
      id: "day-load",
      label: "Day Load",
      value: "3 exercises",
      tone: "default",
      title: "Configured exercise count for this day",
      valuePosition: "after",
    },
  ]);
});

test("current session rail items prioritize live session progress before lower-priority day summaries", () => {
  assert.deepEqual(buildCurrentSessionHeaderInfoRailItems({
    sessionDayIndex: 3,
    cycleLengthDays: 7,
    isRestDay: false,
    trainingDays: 5,
    restDays: 2,
    sessionExerciseCount: 6,
    loggedExerciseCount: 2,
    skippedExerciseCount: 1,
    splitSummary: {
      total: 6,
      strength: 5,
      cardio: 1,
      bodyweight: 0,
      unknown: 0,
    },
  }), [
    {
      id: "live-session",
      label: "Session",
      value: "In Progress",
      tone: "accent",
      title: "Current workout session is active",
      valuePosition: "after",
    },
    {
      id: "cycle-position",
      label: "Cycle",
      value: "Day 3 of 7",
      tone: "default",
      title: "Current day position inside this routine cycle",
      valuePosition: "after",
    },
    {
      id: "session-status",
      label: "Progress",
      value: "2 logged Â· 1 skipped",
      tone: "warning",
      title: "Logged and skipped exercise status in this session",
      valuePosition: "after",
    },
    {
      id: "day-load",
      label: "Day Load",
      value: "6 exercises",
      tone: "default",
      title: "Configured exercise count for this session day",
      valuePosition: "after",
    },
  ]);
});

test("current session rail falls back to focus and structure when no progress counts exist yet", () => {
  assert.deepEqual(buildCurrentSessionHeaderInfoRailItems({
    sessionDayIndex: 1,
    cycleLengthDays: 5,
    isRestDay: false,
    trainingDays: 4,
    restDays: 1,
    sessionExerciseCount: 3,
    loggedExerciseCount: 0,
    skippedExerciseCount: 0,
    splitSummary: {
      total: 3,
      strength: 0,
      cardio: 0,
      bodyweight: 3,
      unknown: 0,
    },
  }), [
    {
      id: "live-session",
      label: "Session",
      value: "In Progress",
      tone: "accent",
      title: "Current workout session is active",
      valuePosition: "after",
    },
    {
      id: "cycle-position",
      label: "Cycle",
      value: "Day 1 of 5",
      tone: "default",
      title: "Current day position inside this routine cycle",
      valuePosition: "after",
    },
    {
      id: "day-load",
      label: "Day Load",
      value: "3 exercises",
      tone: "default",
      title: "Configured exercise count for this session day",
      valuePosition: "after",
    },
    {
      id: "day-focus",
      label: "Focus",
      value: "Bodyweight-focused",
      tone: "default",
      title: "Overall exercise mix for this session day",
      valuePosition: "after",
    },
  ]);
});
