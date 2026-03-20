export type ExerciseGoalSummaryValue = string | null | undefined;

export function hasMeaningfulExerciseGoalSummary(summary: ExerciseGoalSummaryValue) {
  const normalized = summary?.trim().toLowerCase() ?? "";
  return normalized.length > 0 && normalized !== "goal missing";
}

export function getExerciseGoalSummaryText(summary: ExerciseGoalSummaryValue, emptyLabel = "Goal missing") {
  return hasMeaningfulExerciseGoalSummary(summary) ? summary!.trim() : emptyLabel;
}

export function getExerciseGoalSummaryState(summary: ExerciseGoalSummaryValue) {
  return hasMeaningfulExerciseGoalSummary(summary) ? "default" : "empty";
}
