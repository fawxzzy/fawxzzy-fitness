import { normalizeDecoratedText } from "@/lib/text-separator-normalization";

export type ExerciseGoalSummaryValue = string | null | undefined;

function normalizeExerciseGoalSummaryText(summary: string) {
  return normalizeDecoratedText(summary);
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
