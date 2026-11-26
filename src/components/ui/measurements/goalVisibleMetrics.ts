import { getDefaultMeasurementsForGoalModality, getGoalMeasurementOrder, type GoalModality } from "@/lib/exercise-goal-validation";
import type { MeasurementMetrics } from "@/components/ui/measurements/ModifyMeasurements";

type GoalMetricKey = keyof MeasurementMetrics;

export type GoalVisibleMetricValues = {
  repsMin: string;
  repsMax: string;
  weight: string;
  duration: string;
  distance: string;
  calories: string;
};

function hasText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * The goal fields a person sees for an exercise (docs/goal-schema-matrix.md): only what the exercise's kind asks for.
 * Strength shows reps + weight, bodyweight shows reps, cardio shows its time and/or distance. Calories are an opt-in
 * extra (More options). A metric that already holds a value always stays visible so an existing goal is never hidden.
 *
 * Pass the exercise's BASE modality, not the one inferred from the filled values: a time-and-distance cardio goal with
 * only a time typed in must keep its distance field.
 */
export function resolveGoalVisibleMetrics(
  baseModality: GoalModality,
  values: GoalVisibleMetricValues,
  options: { includeCalories?: boolean } = {},
): GoalMetricKey[] {
  const visible = new Set<GoalMetricKey>(getDefaultMeasurementsForGoalModality(baseModality));
  if (hasText(values.repsMin) || hasText(values.repsMax)) visible.add("reps");
  if (hasText(values.weight)) visible.add("weight");
  if (hasText(values.duration)) visible.add("time");
  if (hasText(values.distance)) visible.add("distance");
  if (hasText(values.calories) || options.includeCalories) visible.add("calories");
  return getGoalMeasurementOrder(baseModality).filter((metric) => visible.has(metric));
}

/**
 * What the plain ("set it up") goal form submits. A closed Calories option means "no calorie goal", so an auto-estimate
 * kept in state is dropped. Summaries must read this, not the raw state, so they never show a value that is not saved.
 */
export function resolveSubmittedGoalState<T extends { calories: string }>(
  state: T,
  options: { simpleLayout: boolean; caloriesShown: boolean },
): T {
  return options.simpleLayout && !options.caloriesShown && state.calories ? { ...state, calories: "" } : state;
}

export function isCardioGoalModality(modality: GoalModality) {
  return modality === "cardio_time" || modality === "cardio_distance" || modality === "cardio_time_distance";
}
