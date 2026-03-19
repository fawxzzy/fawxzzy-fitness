import { isExerciseDisplayArtifact } from "@/lib/exercise-display";
import { resolveCanonicalExerciseId } from "@/lib/exercise-id-aliases";
import { logDebugSummary } from "@/lib/observability";

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

export type RunnableDayState = "rest" | "empty" | "partial" | "runnable";

export function isRunnableDayState(state: RunnableDayState) {
  return state === "runnable" || state === "partial";
}
export type RunnableDayInvalidReason = "sentinel" | "missing_canonical" | "missing_identity" | "invalid_data";

type NormalizeRunnableDayExercisesOptions<T extends RunnableDayExercise> = {
  getExerciseName?: (exercise: T) => string | null | undefined;
  logSource?: string;
};

function hasRunnableExerciseGoalData(exercise: RunnableDayExercise) {
  return Boolean(
    exercise.measurement_type
      || exercise.default_unit
      || exercise.target_sets != null
      || exercise.target_reps != null
      || exercise.target_reps_min != null
      || exercise.target_reps_max != null
      || exercise.target_weight != null
      || exercise.target_weight_unit != null
      || exercise.target_duration_seconds != null
      || exercise.target_distance != null
      || exercise.target_distance_unit != null
      || exercise.target_calories != null,
  );
}

function normalizeRunnableExerciseName(name: string | null | undefined) {
  const normalized = typeof name === "string" ? name.trim().replace(/\s+/g, " ") : "";
  if (!normalized || isExerciseDisplayArtifact(normalized)) return "";
  return normalized;
}

export function normalizeRunnableDayExercises<T extends RunnableDayExercise>(
  exercises: readonly T[],
  canonicalExerciseIds: ReadonlySet<string>,
  options: NormalizeRunnableDayExercisesOptions<T> = {},
): {
  runnableExercises: Array<T & { exercise_id: string }>;
  invalidExercises: Array<{ id: string; exerciseId: string; reason: RunnableDayInvalidReason }>;
} {
  const runnableExercises: Array<T & { exercise_id: string }> = [];
  const invalidExercises: Array<{ id: string; exerciseId: string; reason: RunnableDayInvalidReason }> = [];
  let canonicalMatches = 0;
  let fallbackValidExercises = 0;

  for (const exercise of exercises) {
    const rawExerciseId = typeof exercise.exercise_id === "string" ? exercise.exercise_id.trim() : "";
    const resolvedExerciseId = rawExerciseId ? resolveCanonicalExerciseId(rawExerciseId) : "";
    const canonicalMatch = Boolean(resolvedExerciseId) && canonicalExerciseIds.has(resolvedExerciseId);
    const normalizedExerciseName = normalizeRunnableExerciseName(options.getExerciseName?.(exercise) ?? null);
    const hasValidName = normalizedExerciseName.length > 0;
    const hasGoalData = hasRunnableExerciseGoalData(exercise);

    if (!rawExerciseId || rawExerciseId === SENTINEL_EXERCISE_ID) {
      invalidExercises.push({ id: exercise.id, exerciseId: rawExerciseId, reason: "sentinel" });
      continue;
    }

    if (canonicalMatch) {
      canonicalMatches += 1;
      runnableExercises.push({ ...exercise, exercise_id: resolvedExerciseId });
      continue;
    }

    if (hasValidName && hasGoalData) {
      fallbackValidExercises += 1;
      runnableExercises.push({ ...exercise, exercise_id: resolvedExerciseId || rawExerciseId });
      continue;
    }

    if (!rawExerciseId && !hasValidName) {
      invalidExercises.push({ id: exercise.id, exerciseId: rawExerciseId, reason: "missing_identity" });
      continue;
    }

    invalidExercises.push({ id: exercise.id, exerciseId: rawExerciseId, reason: hasValidName ? "invalid_data" : "missing_canonical" });
  }

  logDebugSummary("runnable-day", "normalized exercises", {
    source: options.logSource ?? "unknown",
    totalExercises: exercises.length,
    runnableCount: runnableExercises.length,
    invalidCount: invalidExercises.length,
    canonicalMatches,
    fallbackValidExercises,
    invalidReasons: invalidExercises.reduce<Record<string, number>>((counts, exercise) => {
      counts[exercise.reason] = (counts[exercise.reason] ?? 0) + 1;
      return counts;
    }, {}),
  });

  return { runnableExercises, invalidExercises };
}

export function getRunnableDayState(args: {
  isRest: boolean;
  runnableExerciseCount: number;
  invalidExerciseCount?: number;
}): RunnableDayState {
  if (args.isRest) return "rest";
  if (args.runnableExerciseCount > 0 && (args.invalidExerciseCount ?? 0) > 0) return "partial";
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

  return null;
}
