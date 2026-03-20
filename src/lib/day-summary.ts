import type { CanonicalDayExercise, CanonicalDaySummary } from "@/lib/routine-day-loader";
import { formatExerciseCountSummary, formatRestDayExerciseCountSummary, type ExerciseCountSummary, type ExerciseCountSummaryInput } from "@/lib/exercise-count-summary";
import { isCardioExercise } from "@/lib/exercise-metadata";

type ExerciseCountSummaryInputSource =
  | Pick<ExerciseCountSummaryInput, "measurement_type" | "equipment" | "movement_pattern" | "isCardio" | "kind" | "type" | "tags" | "categories">
  | null
  | undefined;

export function toExerciseCountSummaryInput(
  exercise: ExerciseCountSummaryInputSource,
): ExerciseCountSummaryInput {
  const input: ExerciseCountSummaryInput = {
    measurement_type: exercise?.measurement_type ?? null,
    equipment: exercise?.equipment ?? null,
    movement_pattern: exercise?.movement_pattern ?? null,
    isCardio: exercise?.isCardio ?? null,
    kind: exercise?.kind ?? null,
    type: exercise?.type ?? null,
    tags: exercise?.tags ?? null,
    categories: exercise?.categories ?? null,
  };

  return {
    ...input,
    isCardio: input.isCardio ?? isCardioExercise(input),
  };
}

export function getExerciseCountSummaryFromInputs(
  exercises: readonly ExerciseCountSummaryInputSource[],
): ExerciseCountSummary {
  return formatExerciseCountSummary(exercises.map((exercise) => toExerciseCountSummaryInput(exercise)));
}

export function getRestDayExerciseCountSummaryFromInputs(
  exercises: readonly ExerciseCountSummaryInputSource[],
  isRest: boolean,
): ExerciseCountSummary {
  return formatRestDayExerciseCountSummary(exercises.map((exercise) => toExerciseCountSummaryInput(exercise)), isRest);
}

function toCanonicalExerciseCountSummaryInput(exercise: CanonicalDayExercise): ExerciseCountSummaryInputSource {
  return {
    measurement_type: exercise.details?.measurement_type ?? exercise.measurement_type ?? null,
    equipment: exercise.details?.equipment ?? null,
    movement_pattern: exercise.details?.movement_pattern ?? null,
    kind: exercise.details?.kind ?? null,
    type: exercise.details?.type ?? null,
    tags: exercise.details?.tags ?? null,
    categories: exercise.details?.categories ?? null,
    isCardio: exercise.details ? isCardioExercise(exercise.details) : null,
  };
}

export function getExerciseCountSummaryFromCanonicalExercises(
  exercises: readonly CanonicalDayExercise[],
): ExerciseCountSummary {
  return getExerciseCountSummaryFromInputs(exercises.map((exercise) => toCanonicalExerciseCountSummaryInput(exercise)));
}

export function getRestDayExerciseCountSummaryFromCanonicalExercises(
  exercises: readonly CanonicalDayExercise[],
  isRest: boolean,
): ExerciseCountSummary {
  return getRestDayExerciseCountSummaryFromInputs(exercises.map((exercise) => toCanonicalExerciseCountSummaryInput(exercise)), isRest);
}

export function getRestDayExerciseCountSummaryFromCanonicalDay(
  day: Pick<CanonicalDaySummary, "runnableExercises"> & { day: Pick<CanonicalDaySummary["day"], "is_rest"> },
): ExerciseCountSummary {
  return getRestDayExerciseCountSummaryFromCanonicalExercises(day.runnableExercises, day.day.is_rest);
}
