import assert from "node:assert/strict";
import test from "node:test";

import { dedupeWorkoutPlanSourceItemsByTitle, selectCanonicalWorkoutPlanSourceDays } from "@/lib/workout-plan-source-list-utils";

test("selectCanonicalWorkoutPlanSourceDays keeps one reusable source for duplicated workout plans", () => {
  const selectedDays = selectCanonicalWorkoutPlanSourceDays({
    routineDays: [
      {
        id: "source-day",
        routine_id: "routine-a",
        day_index: 2,
        name: "Push A",
        is_rest: false,
        notes: null,
        duplicate_source_routine_day_id: null,
        workout_plan_template_id: null,
      },
      {
        id: "duplicate-day",
        routine_id: "routine-b",
        day_index: 4,
        name: "Push A copy",
        is_rest: false,
        notes: null,
        duplicate_source_routine_day_id: "source-day",
        workout_plan_template_id: null,
      },
    ],
    currentRoutineId: "routine-b",
    runnableExerciseCountByDayId: new Map([
      ["source-day", 5],
      ["duplicate-day", 5],
    ]),
  });

  assert.equal(selectedDays.length, 1);
  assert.equal(selectedDays[0]?.id, "duplicate-day");
});

test("selectCanonicalWorkoutPlanSourceDays filters out empty and rest placeholders", () => {
  const selectedDays = selectCanonicalWorkoutPlanSourceDays({
    routineDays: [
      {
        id: "rest-day",
        routine_id: "routine-a",
        day_index: 1,
        name: "Rest Day",
        is_rest: true,
        notes: null,
        duplicate_source_routine_day_id: null,
        workout_plan_template_id: null,
      },
      {
        id: "empty-day",
        routine_id: "routine-a",
        day_index: 2,
        name: "Day 2",
        is_rest: false,
        notes: null,
        duplicate_source_routine_day_id: null,
        workout_plan_template_id: null,
      },
      {
        id: "full-day",
        routine_id: "routine-a",
        day_index: 3,
        name: "Pull",
        is_rest: false,
        notes: null,
        duplicate_source_routine_day_id: null,
        workout_plan_template_id: null,
      },
    ],
    currentRoutineId: "routine-a",
    runnableExerciseCountByDayId: new Map([
      ["rest-day", 0],
      ["empty-day", 0],
      ["full-day", 4],
    ]),
  });

  assert.deepEqual(selectedDays.map((day) => day.id), ["full-day"]);
});

test("selectCanonicalWorkoutPlanSourceDays prefers template linkage over duplicate source ids", () => {
  const selectedDays = selectCanonicalWorkoutPlanSourceDays({
    routineDays: [
      {
        id: "source-day",
        routine_id: "routine-a",
        day_index: 1,
        name: "Upper",
        is_rest: false,
        notes: null,
        duplicate_source_routine_day_id: null,
        workout_plan_template_id: "template-1",
      },
      {
        id: "other-day",
        routine_id: "routine-b",
        day_index: 2,
        name: "Upper Duplicate",
        is_rest: false,
        notes: null,
        duplicate_source_routine_day_id: "source-day",
        workout_plan_template_id: "template-1",
      },
    ],
    currentRoutineId: "routine-a",
    runnableExerciseCountByDayId: new Map([
      ["source-day", 4],
      ["other-day", 4],
    ]),
  });

  assert.equal(selectedDays.length, 1);
  assert.equal(selectedDays[0]?.id, "source-day");
});

test("dedupeWorkoutPlanSourceItemsByTitle keeps the first matching title and preserves distinct plans", () => {
  const deduped = dedupeWorkoutPlanSourceItemsByTitle([
    {
      id: "template-hunt",
      workoutPlanTemplateId: "template-hunt",
      sourceRoutineDayId: "day-hunt-template",
      sourceRoutineId: "routine-current",
      sourceRoutineName: "Atlas",
      isCurrentRoutine: true,
      dayIndex: 1,
      title: "Hunt",
      weekdayLabel: "Mon",
      isRest: false,
      recapExercises: [],
    },
    {
      id: "legacy-hunt",
      workoutPlanTemplateId: null,
      sourceRoutineDayId: "day-hunt-legacy",
      sourceRoutineId: "routine-other",
      sourceRoutineName: "Duplicate",
      isCurrentRoutine: false,
      dayIndex: 1,
      title: "Hunt",
      weekdayLabel: "Mon",
      isRest: false,
      recapExercises: [],
    },
    {
      id: "legacy-forge",
      workoutPlanTemplateId: null,
      sourceRoutineDayId: "day-forge",
      sourceRoutineId: "routine-current",
      sourceRoutineName: "Atlas",
      isCurrentRoutine: true,
      dayIndex: 2,
      title: "Forge",
      weekdayLabel: "Tue",
      isRest: false,
      recapExercises: [],
    },
  ]);

  assert.deepEqual(deduped.map((item) => item.id), ["template-hunt", "legacy-forge"]);
});

test("selectCanonicalWorkoutPlanSourceDays keeps distinct workout plans across routines while removing duplicate copies", () => {
  const selectedDays = selectCanonicalWorkoutPlanSourceDays({
    routineDays: [
      {
        id: "hunt-source",
        routine_id: "routine-a",
        day_index: 1,
        name: "Hunt",
        is_rest: false,
        notes: null,
        duplicate_source_routine_day_id: null,
        workout_plan_template_id: "template-hunt",
      },
      {
        id: "hunt-copy",
        routine_id: "routine-b",
        day_index: 3,
        name: "Hunt",
        is_rest: false,
        notes: null,
        duplicate_source_routine_day_id: "hunt-source",
        workout_plan_template_id: "template-hunt",
      },
      {
        id: "forge-source",
        routine_id: "routine-c",
        day_index: 2,
        name: "Forge",
        is_rest: false,
        notes: null,
        duplicate_source_routine_day_id: null,
        workout_plan_template_id: null,
      },
      {
        id: "shade-source",
        routine_id: "routine-d",
        day_index: 4,
        name: "Shade",
        is_rest: false,
        notes: null,
        duplicate_source_routine_day_id: null,
        workout_plan_template_id: null,
      },
    ],
    currentRoutineId: "routine-b",
    runnableExerciseCountByDayId: new Map([
      ["hunt-source", 6],
      ["hunt-copy", 6],
      ["forge-source", 5],
      ["shade-source", 4],
    ]),
  });

  assert.deepEqual(selectedDays.map((day) => day.id), ["hunt-copy", "forge-source", "shade-source"]);
});
