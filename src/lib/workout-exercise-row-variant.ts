import { deriveSessionRowState } from "./session-row-state";
import type { SessionExercisePresentationSurface, SessionExerciseProgressChip } from "./session-exercise-progress";

export type WorkoutExerciseCardVariant = "pending" | "active";

export type DeriveWorkoutExerciseCardVariantInput = {
  loggedSetCount: number;
  isSkipped: boolean;
  isPending?: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  surface?: SessionExercisePresentationSurface;
};

export type WorkoutExerciseCardVariantState = {
  variant: WorkoutExerciseCardVariant;
  cardState: "default" | "completed";
  badgeText?: string;
  progressLabel?: string;
  chips: Array<SessionExerciseProgressChip | "addedToday">;
  skipActionLabel: "Skip" | "Unskip";
  actionRowClassName: string;
  quickLogActionClassName: string;
  skipActionClassName: string;
  isQuickLogDisabled: boolean;
};

export function deriveWorkoutExerciseCardVariant(input: DeriveWorkoutExerciseCardVariantInput): WorkoutExerciseCardVariantState {
  const rowState = deriveSessionRowState({
    ...input,
    fallbackWeightUnit: "lbs",
  });

  return {
    variant: rowState.variant,
    cardState: rowState.cardState,
    badgeText: rowState.badgeText,
    progressLabel: rowState.progressLabel,
    chips: rowState.chips,
    skipActionLabel: rowState.skipActionLabel,
    actionRowClassName: rowState.actionRowClassName,
    quickLogActionClassName: rowState.quickLogActionClassName,
    skipActionClassName: rowState.skipActionClassName,
    isQuickLogDisabled: rowState.isQuickLogDisabled,
  };
}
