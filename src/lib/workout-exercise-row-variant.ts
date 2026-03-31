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
  chips: Array<"skipped" | "addedToday">;
  skipActionLabel: "Skip" | "Unskip";
  actionRowClassName: string;
  quickLogActionClassName: string;
  skipActionClassName: string;
};

export function deriveWorkoutExerciseCardVariant(input: DeriveWorkoutExerciseCardVariantInput): WorkoutExerciseCardVariantState {
  const progressState = deriveSessionExerciseProgressState(input);
  const variant: WorkoutExerciseCardVariant = input.isPending
    ? "pending"
    : input.isSkipped
      ? "skipped"
      : "logged";
  const variantStyles: Record<WorkoutExerciseCardVariant, Pick<WorkoutExerciseCardVariantState, "skipActionLabel" | "actionRowClassName" | "quickLogActionClassName" | "skipActionClassName">> = {
    pending: {
      skipActionLabel: "Skip",
      actionRowClassName: "opacity-85",
      quickLogActionClassName: "text-[rgb(var(--text)/0.62)]",
      skipActionClassName: "text-[rgb(var(--text)/0.62)]",
    },
    logged: {
      skipActionLabel: "Skip",
      actionRowClassName: "opacity-100",
      quickLogActionClassName: "text-[rgb(var(--text)/0.74)]",
      skipActionClassName: "text-[rgb(var(--text)/0.74)]",
    },
    skipped: {
      skipActionLabel: "Unskip",
      actionRowClassName: "opacity-100",
      quickLogActionClassName: "text-[rgb(var(--text)/0.74)]",
      skipActionClassName: "text-amber-100",
    },
  };

  return {
    variant,
    cardState: progressState.cardState,
    badgeText: progressState.badgeText,
    chips: variant === "skipped" ? ["skipped"] : [],
    ...variantStyles[variant],
  };
}
