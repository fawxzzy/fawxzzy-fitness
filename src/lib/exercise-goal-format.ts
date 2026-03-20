import type { RoutineDayExerciseRow } from "@/types/db";
import { formatGoalSummaryText } from "./measurement-display";

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

export function formatExerciseGoal(goal: GoalFields) {
  return formatGoalSummaryText({
    sets: goal.target_sets,
    reps: goal.target_reps_min ?? goal.target_reps,
    repsMax: goal.target_reps_max ?? goal.target_reps,
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
