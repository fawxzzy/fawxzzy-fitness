import { isBodyweightExercise, isCardioExercise, normalizeExerciseMeasurementType, type ExerciseMetadataInput } from "./exercise-metadata";
import {
  formatDaySummaryRestLabel,
  formatDaySummaryTaxonomyLabel,
  formatDaySummaryTotalLabel,
} from "@/features/day-summary/taxonomy";

export type ExerciseCountKind = "strength" | "cardio" | "bodyweight" | "unknown";

export type ExerciseCountSummaryInput = ExerciseMetadataInput;

export type ExerciseCountSummary = {
  total: number;
  strength: number;
  cardio: number;
  bodyweight: number;
  unknown: number;
  label: string;
};

export const EMPTY_EXERCISE_SUMMARY_LABEL = "No exercises yet";

export function resolveExerciseCountKind(exercise: ExerciseCountSummaryInput | null | undefined): ExerciseCountKind {
  if (!exercise) return "unknown";
  const normalizedMeasurementType = normalizeExerciseMeasurementType(exercise);
  if (isBodyweightExercise(exercise)) return "bodyweight";
  if (exercise.isCardio === false && normalizedMeasurementType == null) return "strength";
  if (isCardioExercise(exercise)) return "cardio";
  if (normalizedMeasurementType === "reps") return "strength";
  return "unknown";
}

export function formatExerciseCountSummary(exercises: readonly ExerciseCountSummaryInput[]): ExerciseCountSummary {
  let strength = 0;
  let cardio = 0;
  let bodyweight = 0;
  let unknown = 0;

  for (const exercise of exercises) {
    const kind = resolveExerciseCountKind(exercise);
    if (kind === "strength") strength += 1;
    else if (kind === "cardio") cardio += 1;
    else if (kind === "bodyweight") bodyweight += 1;
    else unknown += 1;
  }

  const total = exercises.length;
  if (total === 0) return { total, strength, cardio, bodyweight, unknown, label: EMPTY_EXERCISE_SUMMARY_LABEL };
  if (cardio === 0 && bodyweight === 0 && strength > 0 && unknown === 0) {
    return { total, strength, cardio, bodyweight, unknown, label: formatDaySummaryTaxonomyLabel("strength", strength) };
  }
  if (strength === 0 && bodyweight === 0 && cardio > 0 && unknown === 0) {
    return { total, strength, cardio, bodyweight, unknown, label: formatDaySummaryTaxonomyLabel("cardio", cardio) };
  }
  if (strength === 0 && cardio === 0 && bodyweight > 0 && unknown === 0) {
    return { total, strength, cardio, bodyweight, unknown, label: formatDaySummaryTaxonomyLabel("bodyweight", bodyweight) };
  }
  if (strength === 0 && cardio === 0 && bodyweight === 0) {
    return { total, strength, cardio, bodyweight, unknown, label: `${total} exercises` };
  }

  const parts = [formatDaySummaryTotalLabel(total)];
  if (strength > 0) parts.push(formatDaySummaryTaxonomyLabel("strength", strength));
  if (cardio > 0) parts.push(formatDaySummaryTaxonomyLabel("cardio", cardio));
  if (bodyweight > 0) parts.push(formatDaySummaryTaxonomyLabel("bodyweight", bodyweight));
  if (unknown > 0) parts.push(formatDaySummaryTaxonomyLabel("unknown", unknown));

  return { total, strength, cardio, bodyweight, unknown, label: parts.join(" \u2022 ") };
}

export function formatRestDayExerciseCountSummary(exercises: readonly ExerciseCountSummaryInput[], isRest: boolean): ExerciseCountSummary {
  if (isRest) {
    return { total: exercises.length, strength: 0, cardio: 0, bodyweight: 0, unknown: 0, label: formatDaySummaryRestLabel() };
  }

  return formatExerciseCountSummary(exercises);
}
