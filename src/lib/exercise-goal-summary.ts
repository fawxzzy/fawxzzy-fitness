export type ExerciseGoalSummaryValue = string | null | undefined;

function normalizeExerciseGoalSummaryText(summary: string) {
  return summary
    .replaceAll("â€¢", "\u2022")
    .replaceAll("Â·", "\u2022")
    .replaceAll("â€“", "\u2013")
    .trim();
}

export function hasMeaningfulExerciseGoalSummary(summary: ExerciseGoalSummaryValue) {
  const normalized = summary ? normalizeExerciseGoalSummaryText(summary).toLowerCase() : "";
  return normalized.length > 0 && normalized !== "goal missing";
}

export function getExerciseGoalSummaryText(summary: ExerciseGoalSummaryValue, emptyLabel = "Goal missing") {
  return hasMeaningfulExerciseGoalSummary(summary) ? normalizeExerciseGoalSummaryText(summary!) : emptyLabel;
}

export function getExerciseGoalSummaryState(summary: ExerciseGoalSummaryValue) {
  return hasMeaningfulExerciseGoalSummary(summary) ? "default" : "empty";
}
