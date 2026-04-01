import { deriveSessionExerciseProgressState } from "./session-exercise-progress";

export type WorkoutExerciseCardVariant = "pending" | "active";

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
  chips: Array<"skipped" | "partialSkipped" | "addedToday">;
  skipActionLabel: "Skip" | "Unskip";
  actionRowClassName: string;
  quickLogActionClassName: string;
  skipActionClassName: string;
  isQuickLogDisabled: boolean;
};

export function deriveWorkoutExerciseCardVariant(input: DeriveWorkoutExerciseCardVariantInput): WorkoutExerciseCardVariantState {
  const progressState = deriveSessionExerciseProgressState(input);
  const variant: WorkoutExerciseCardVariant = input.isPending ? "pending" : "active";
  const variantStyles: Record<WorkoutExerciseCardVariant, Pick<WorkoutExerciseCardVariantState, "actionRowClassName" | "quickLogActionClassName" | "skipActionClassName">> = {
    pending: {
      actionRowClassName: "opacity-85",
      quickLogActionClassName: "text-[rgb(var(--text)/0.62)]",
      skipActionClassName: "text-[rgb(var(--text)/0.62)]",
    },
    active: {
      actionRowClassName: "opacity-100",
      quickLogActionClassName: "text-[rgb(var(--text)/0.74)]",
      skipActionClassName: progressState.skipActionLabel === "Unskip" ? "text-amber-100" : "text-[rgb(var(--text)/0.74)]",
    },
  };

  return {
    variant,
    cardState: progressState.cardState,
    badgeText: progressState.badgeText,
    chips: progressState.chips,
    skipActionLabel: progressState.skipActionLabel,
    isQuickLogDisabled: !progressState.allowQuickLog,
    ...variantStyles[variant],
  };
}
