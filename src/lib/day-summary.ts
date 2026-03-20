import type { CanonicalDayExercise } from "@/lib/routine-day-loader";
import { formatExerciseCountSummary, formatRestDayExerciseCountSummary, type ExerciseCountSummary, type ExerciseCountSummaryInput } from "@/lib/exercise-count-summary";

export function toExerciseCountSummaryInput(
  exercise:
    | Pick<ExerciseCountSummaryInput, "measurement_type" | "equipment" | "movement_pattern" | "isCardio" | "kind" | "type" | "tags" | "categories">
    | null
    | undefined,
): ExerciseCountSummaryInput {
  return {
    measurement_type: exercise?.measurement_type ?? null,
    equipment: exercise?.equipment ?? null,
    movement_pattern: exercise?.movement_pattern ?? null,
    isCardio: exercise?.isCardio ?? null,
    kind: exercise?.kind ?? null,
    type: exercise?.type ?? null,
    tags: exercise?.tags ?? null,
    categories: exercise?.categories ?? null,
  };
}

export function getExerciseCountSummaryFromCanonicalExercises(
  exercises: readonly CanonicalDayExercise[],
): ExerciseCountSummary {
  return formatExerciseCountSummary(
    exercises.map((exercise) => toExerciseCountSummaryInput({
      measurement_type: exercise.details?.measurement_type ?? exercise.measurement_type ?? null,
      equipment: exercise.details?.equipment ?? null,
      movement_pattern: exercise.details?.movement_pattern ?? null,
    })),
  );
}

export function getRestDayExerciseCountSummaryFromCanonicalExercises(
  exercises: readonly CanonicalDayExercise[],
  isRest: boolean,
): ExerciseCountSummary {
  return formatRestDayExerciseCountSummary(
    exercises.map((exercise) => toExerciseCountSummaryInput({
      measurement_type: exercise.details?.measurement_type ?? exercise.measurement_type ?? null,
      equipment: exercise.details?.equipment ?? null,
      movement_pattern: exercise.details?.movement_pattern ?? null,
    })),
    isRest,
  );
}
