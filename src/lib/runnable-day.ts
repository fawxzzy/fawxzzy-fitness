import { resolveCanonicalExerciseId } from "@/lib/exercise-id-aliases";

const SENTINEL_EXERCISE_ID = "66666666-6666-6666-6666-666666666666";

export type RunnableDayExercise = {
  id: string;
  exercise_id: string;
  position: number;
  notes: string | null;
  target_sets?: number | null;
  target_reps?: number | null;
  target_reps_min?: number | null;
  target_reps_max?: number | null;
  target_weight?: number | null;
  target_weight_unit?: "lbs" | "kg" | null;
  target_duration_seconds?: number | null;
  target_distance?: number | null;
  target_distance_unit?: "mi" | "km" | "m" | null;
  target_calories?: number | null;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | null;
  default_unit?: string | null;
};

export type RunnableDayState = "rest" | "empty" | "runnable";

export function normalizeRunnableDayExercises<T extends RunnableDayExercise>(
  exercises: readonly T[],
  canonicalExerciseIds: ReadonlySet<string>,
): {
  runnableExercises: Array<T & { exercise_id: string }>;
  invalidExercises: Array<{ id: string; exerciseId: string; reason: "sentinel" | "missing_canonical" }>;
} {
  const runnableExercises: Array<T & { exercise_id: string }> = [];
  const invalidExercises: Array<{ id: string; exerciseId: string; reason: "sentinel" | "missing_canonical" }> = [];

  for (const exercise of exercises) {
    const rawExerciseId = typeof exercise.exercise_id === "string" ? exercise.exercise_id.trim() : "";
    const canonicalExerciseId = rawExerciseId ? resolveCanonicalExerciseId(rawExerciseId) : "";

    if (!rawExerciseId || rawExerciseId === SENTINEL_EXERCISE_ID) {
      invalidExercises.push({ id: exercise.id, exerciseId: rawExerciseId, reason: "sentinel" });
      continue;
    }

    if (!canonicalExerciseId || !canonicalExerciseIds.has(canonicalExerciseId)) {
      invalidExercises.push({ id: exercise.id, exerciseId: rawExerciseId, reason: "missing_canonical" });
      continue;
    }

    runnableExercises.push({ ...exercise, exercise_id: canonicalExerciseId });
  }

  return { runnableExercises, invalidExercises };
}

export function getRunnableDayState(args: {
  isRest: boolean;
  runnableExerciseCount: number;
}): RunnableDayState {
  if (args.isRest) return "rest";
  if (args.runnableExerciseCount > 0) return "runnable";
  return "empty";
}

export function getSessionStartErrorMessage(args: {
  isRest: boolean;
  runnableExerciseCount: number;
  invalidExerciseCount: number;
}): string | null {
  if (args.isRest) {
    return "Rest days cannot start a workout.";
  }

  if (args.runnableExerciseCount === 0) {
    if (args.invalidExerciseCount > 0) {
      return "This day has invalid exercises. Edit the day before starting a workout.";
    }

    return "Add at least one exercise to this day before starting a workout.";
  }

  if (args.invalidExerciseCount > 0) {
    return "This day contains invalid exercises. Edit the day before starting a workout.";
  }

  return null;
}
