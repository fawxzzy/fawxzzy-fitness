import { deriveSessionExerciseProgressState } from "./session-exercise-progress";

export type WorkoutExerciseCardVariant = "pending" | "logged" | "skipped";

export type DeriveWorkoutExerciseCardVariantInput = {
  loggedSetCount: number;
  isSkipped: boolean;
  isPending?: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
};

export type WorkoutExerciseCardVariantState = {
  variant: WorkoutExerciseCardVariant;
  cardState: "default" | "completed";
  badgeText?: string;
  showSkippedChip: boolean;
  skipActionLabel: "Skip" | "Unskip";
  actionLayoutClassName: string;
  quickLogLabelClassName: string;
};

export function deriveWorkoutExerciseCardVariant(input: DeriveWorkoutExerciseCardVariantInput): WorkoutExerciseCardVariantState {
  const progressState = deriveSessionExerciseProgressState(input);
  const variant: WorkoutExerciseCardVariant = input.isPending
    ? "pending"
    : input.isSkipped
      ? "skipped"
      : "logged";

  return {
    variant,
    cardState: progressState.cardState,
    badgeText: progressState.badgeText,
    showSkippedChip: variant === "skipped",
    skipActionLabel: variant === "skipped" ? "Unskip" : "Skip",
    actionLayoutClassName: variant === "pending" ? "opacity-85" : "opacity-100",
    quickLogLabelClassName: variant === "pending" ? "text-[rgb(var(--text)/0.62)]" : "text-[rgb(var(--text)/0.74)]",
  };
}
