import assert from "node:assert/strict";
import test from "node:test";
import { buildCuratedRoutineSchedule, generateCuratedWorkoutPlan } from "@/features/curated-onboarding/engine";
import { clearSafetyResponses } from "@/features/curated-onboarding/test-fixtures";
import {
  doesRoutineMatchCuratedPlan,
  type ExistingCuratedRoutineDay,
  type ExistingCuratedRoutineExercise,
} from "./replay";

const plan = generateCuratedWorkoutPlan({
  intakeResponses: clearSafetyResponses(),
  trainingGoal: "build-muscle",
  experience: "beginner",
  daysPerWeek: 3,
  sessionLengthMinutes: 45,
  equipment: ["full-gym"],
  preferredStyle: "full-body",
  cardioPreference: "balanced",
  limitations: "",
  exerciseLikes: [],
  exerciseDislikes: [],
  targetAreas: [],
});
const schedule = buildCuratedRoutineSchedule(plan);

function storedRoutine() {
  const days: ExistingCuratedRoutineDay[] = schedule.map((day) => ({
    id: `day-${day.dayIndex}`,
    day_index: day.dayIndex,
    name: day.planDay ? day.planDay.name : "Rest Day",
    is_rest: day.planDay === null,
  }));
  const exercises: ExistingCuratedRoutineExercise[] = schedule.flatMap((day) =>
    (day.planDay?.exercises ?? []).map((exercise, position) => ({
      routine_day_id: `day-${day.dayIndex}`,
      position,
      exercise_name: exercise.name,
    })),
  );
  return { days, exercises };
}

test("a routine a previous attempt created is recognized exactly", () => {
  const { days, exercises } = storedRoutine();
  assert.equal(doesRoutineMatchCuratedPlan({ schedule, days, exercises: [...exercises].reverse() }), true);
});

test("any difference in cycle, rest days, day names or exercises is not a replay", () => {
  const { days, exercises } = storedRoutine();

  assert.equal(doesRoutineMatchCuratedPlan({ schedule, days: days.slice(1), exercises }), false);
  assert.equal(
    doesRoutineMatchCuratedPlan({ schedule, days: days.map((day, index) => (index === 0 ? { ...day, name: "Other" } : day)), exercises }),
    false,
  );
  assert.equal(
    doesRoutineMatchCuratedPlan({ schedule, days: days.map((day) => (day.is_rest ? { ...day, is_rest: false } : day)), exercises }),
    false,
  );
  assert.equal(doesRoutineMatchCuratedPlan({ schedule, days, exercises: exercises.slice(1) }), false);
  assert.equal(
    doesRoutineMatchCuratedPlan({
      schedule,
      days,
      exercises: exercises.map((exercise, index) => (index === 0 ? { ...exercise, exercise_name: "Something Else" } : exercise)),
    }),
    false,
  );
  const restDay = days.find((day) => day.is_rest)!;
  assert.equal(
    doesRoutineMatchCuratedPlan({
      schedule,
      days,
      exercises: [...exercises, { routine_day_id: restDay.id, position: 0, exercise_name: "Plank" }],
    }),
    false,
  );
});
