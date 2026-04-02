import { deriveSessionExerciseProgressState, type SessionExercisePresentationSurface, type SessionExerciseProgressChip } from "./session-exercise-progress";
import { formatQuickLogPreviewLabel, type SessionQuickLogTarget } from "./session-quick-log";

export type SessionRowVisualVariant = "pending" | "active";

export type DeriveSessionRowStateInput = {
  loggedSetCount: number;
  isSkipped: boolean;
  isPending?: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  surface?: SessionExercisePresentationSurface;
  quickLogTarget?: SessionQuickLogTarget;
  fallbackWeightUnit: "lbs" | "kg";
};

export type SessionRowState = {
  variant: SessionRowVisualVariant;
  cardState: "default" | "completed";
  badgeText?: string;
  progressLabel?: string;
  chips: SessionExerciseProgressChip[];
  skipActionLabel: "Skip" | "Unskip";
  actionRowClassName: string;
  quickLogActionClassName: string;
  skipActionClassName: string;
  isQuickLogDisabled: boolean;
  quickLogDisabledMessage: string;
  quickLogLabel: string;
};

export function deriveSessionRowState(input: DeriveSessionRowStateInput): SessionRowState {
  const progressState = deriveSessionExerciseProgressState(input);
  const variant: SessionRowVisualVariant = input.isPending ? "pending" : "active";
  const variantStyles: Record<SessionRowVisualVariant, Pick<SessionRowState, "actionRowClassName" | "quickLogActionClassName" | "skipActionClassName">> = {
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
    progressLabel: progressState.progressLabel,
    chips: progressState.chips,
    skipActionLabel: progressState.skipActionLabel,
    isQuickLogDisabled: !progressState.allowQuickLog,
    quickLogDisabledMessage: "Unavailable while skipped",
    quickLogLabel: `Quick Log: ${formatQuickLogPreviewLabel({
      target: input.quickLogTarget,
      loggedSetCount: progressState.loggedSetCount,
      targetSetsMin: input.targetSetsMin,
      targetSetsMax: input.targetSetsMax,
      fallbackWeightUnit: input.fallbackWeightUnit,
    })}`,
    ...variantStyles[variant],
  };
}
