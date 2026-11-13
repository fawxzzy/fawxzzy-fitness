import type { CuratedRoutineScheduleDay } from "@/features/curated-onboarding/engine";

/** How long after a create a retry may adopt the routine it already made (lost response, double tap). */
export const CURATED_REPLAY_WINDOW_MS = 15 * 60 * 1000;

export type ExistingCuratedRoutineDay = {
  id: string;
  day_index: number;
  name: string | null;
  is_rest: boolean;
};

export type ExistingCuratedRoutineExercise = {
  routine_day_id: string;
  position: number;
  exercise_name: string | null;
};

/**
 * True only when the stored routine is exactly the one the plan would create: same cycle length, same rest
 * days, same workout day names and the same exercises in the same order. Used to adopt a routine a previous
 * attempt already created instead of creating a duplicate, without any database marker.
 */
export function doesRoutineMatchCuratedPlan(args: {
  schedule: CuratedRoutineScheduleDay[];
  days: ExistingCuratedRoutineDay[];
  exercises: ExistingCuratedRoutineExercise[];
}): boolean {
  if (args.days.length !== args.schedule.length) return false;

  const dayByIndex = new Map(args.days.map((day) => [day.day_index, day]));
  for (const scheduleDay of args.schedule) {
    const stored = dayByIndex.get(scheduleDay.dayIndex);
    if (!stored) return false;
    const storedExercises = args.exercises
      .filter((exercise) => exercise.routine_day_id === stored.id)
      .sort((left, right) => left.position - right.position)
      .map((exercise) => exercise.exercise_name);

    if (!scheduleDay.planDay) {
      if (!stored.is_rest || storedExercises.length > 0) return false;
      continue;
    }

    if (stored.is_rest || stored.name !== scheduleDay.planDay.name) return false;
    const expectedExercises = scheduleDay.planDay.exercises.map((exercise) => exercise.name);
    if (
      storedExercises.length !== expectedExercises.length
      || storedExercises.some((name, index) => name !== expectedExercises[index])
    ) {
      return false;
    }
  }

  return true;
}
