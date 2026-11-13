import { normalizeDecoratedText } from "@/lib/text-separator-normalization";

/**
 * Plain-text formatting shared by every screen that renders `ExerciseRowCard` (day editor, Today, view-day):
 * one place decides what a stored goal line becomes, so a target never reads differently between screens.
 */

/** A stored goal line without the "Goal:" prefix; `null` when it is empty or the "goal missing" placeholder. */
export function normalizeExerciseTargetSummary(summary: string | null | undefined) {
  if (!summary) {
    return null;
  }

  const normalized = normalizeDecoratedText(summary)
    .replace(/^goal\s*:\s*/i, "")
    .trim();

  if (!normalized || normalized.toLowerCase() === "goal missing") {
    return null;
  }

  return normalized;
}

/** "4 sets • 5 reps | 225 lbs" -> ["4 sets", "5 reps", "225 lbs"] (the card joins them with a middle dot). */
export function splitExerciseTargetValues(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return normalizeDecoratedText(value)
    .split(/\s+[•|·]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Progression state line ("AUTO | SESSION | SET") with the card's middle-dot separator; `null` when blank. */
export function formatExerciseProgressionLabel(label: string | null | undefined) {
  if (!label?.trim()) {
    return null;
  }

  return normalizeDecoratedText(label).replace(/\s+[•|]\s+/g, " · ");
}
