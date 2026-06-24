import assert from "node:assert/strict";
import test from "node:test";

import { selectCanonicalWorkoutPlanSourceDays } from "@/lib/workout-plan-source-list-utils";

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
      },
      {
        id: "duplicate-day",
        routine_id: "routine-b",
        day_index: 4,
        name: "Push A copy",
        is_rest: false,
        notes: null,
        duplicate_source_routine_day_id: "source-day",
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
      },
      {
        id: "empty-day",
        routine_id: "routine-a",
        day_index: 2,
        name: "Day 2",
        is_rest: false,
        notes: null,
        duplicate_source_routine_day_id: null,
      },
      {
        id: "full-day",
        routine_id: "routine-a",
        day_index: 3,
        name: "Pull",
        is_rest: false,
        notes: null,
        duplicate_source_routine_day_id: null,
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
