import type { RoutineDayExerciseRow } from "@/types/db";
import { formatGoalSummaryItems } from "./measurement-display";
import { isFailureGoalSelection } from "./exercise-goal-validation";

type GoalFields = Pick<
  RoutineDayExerciseRow,
  | "target_sets"
  | "target_reps"
  | "target_reps_min"
  | "target_reps_max"
  | "target_weight"
  | "target_weight_unit"
  | "target_duration_seconds"
  | "target_distance"
  | "target_distance_unit"
  | "target_calories"
> & {
  enabledMeasurements?: {
    reps?: boolean;
    weight?: boolean;
    time?: boolean;
    distance?: boolean;
    calories?: boolean;
  } | null;
};

export type ExerciseGoalSummaryFields = {
  sets?: number | null;
  reps?: number | null;
  repsMax?: number | null;
  failure?: boolean;
  weight?: number | null;
  weightUnit?: string | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: string | null;
  calories?: number | null;
  enabledMeasurements?: GoalFields["enabledMeasurements"];
  emptyLabel?: string;
};

export function resolveExerciseGoalCurrentReps(goal: Pick<GoalFields, "target_reps" | "target_reps_min" | "target_reps_max">) {
  return goal.target_reps ?? goal.target_reps_min ?? goal.target_reps_max ?? null;
}

export function formatExerciseGoalSummary(goal: ExerciseGoalSummaryFields) {
  const items = formatGoalSummaryItems({
    sets: goal.sets,
    reps: goal.reps,
    repsMax: goal.repsMax,
    failure: goal.failure,
    weight: goal.weight,
    weightUnit: goal.weightUnit ?? "lbs",
    durationSeconds: goal.durationSeconds,
    distance: goal.distance,
    distanceUnit: goal.distanceUnit ?? "mi",
    calories: goal.calories,
    enabledMeasurements: goal.enabledMeasurements ?? null,
    emptyLabel: goal.emptyLabel ?? "Goal missing",
  });

  const labels = items.map((item) => item.label);
  if (labels.length <= 1) {
    return labels[0] ?? (goal.emptyLabel ?? "Goal missing");
  }

  const [first, second, ...rest] = labels;
  return [`${first} | ${second}`, ...rest].join(" \u2022 ");
}

export function formatExerciseGoal(goal: GoalFields) {
  const currentReps = resolveExerciseGoalCurrentReps(goal);

  return formatExerciseGoalSummary({
    sets: goal.target_sets,
    reps: currentReps,
    repsMax: currentReps,
    failure: isFailureGoalSelection({
      repsMin: currentReps,
      repsMax: currentReps,
    }),
    weight: goal.target_weight,
    weightUnit: goal.target_weight_unit ?? "lbs",
    durationSeconds: goal.target_duration_seconds,
    distance: goal.target_distance,
    distanceUnit: goal.target_distance_unit ?? "mi",
    calories: goal.target_calories,
    enabledMeasurements: goal.enabledMeasurements ?? null,
    emptyLabel: "Goal missing",
  });
}
