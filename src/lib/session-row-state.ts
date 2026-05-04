import type { ActionChromeIntent } from "@/components/ui/actionChrome";
import { deriveSessionExerciseProgressState, type SessionExercisePresentationSurface, type SessionExerciseProgressChip } from "./session-exercise-progress";
import { formatQuickLogPreviewLabelForResolvedTarget, resolveEffectiveQuickLogTarget, type SessionQuickLogTarget } from "./session-quick-log";

export type SessionRowVisualVariant = "pending" | "active";

export type DeriveSessionRowStateInput = {
  loggedSetCount: number;
  isSkipped: boolean;
  isPending?: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  surface?: SessionExercisePresentationSurface;
  quickLogTarget?: SessionQuickLogTarget;
  quickLogNextTarget?: SessionQuickLogTarget;
  quickLogLastTarget?: SessionQuickLogTarget;
  quickLogBestTarget?: SessionQuickLogTarget;
  fallbackWeightUnit: "lbs" | "kg";
};

export type SessionRowState = {
  variant: SessionRowVisualVariant;
  cardState: "default" | "completed";
  badgeText?: string;
  progressLabel?: string;
  chips: SessionExerciseProgressChip[];
  skipActionLabel: "Skip" | "Unskip";
  quickLogActionIntent: ActionChromeIntent;
  skipActionIntent: ActionChromeIntent;
  actionRowClassName: string;
  quickLogActionClassName: string;
  skipActionClassName: string;
  isQuickLogDisabled: boolean;
  isSkipDisabled: boolean;
  quickLogDisabledMessage: string;
  quickLogLabel: string;
};

export function deriveSessionRowState(input: DeriveSessionRowStateInput): SessionRowState {
  const progressState = deriveSessionExerciseProgressState(input);
  const resolvedQuickLogTarget = resolveEffectiveQuickLogTarget({
    quickLogTarget: input.quickLogTarget,
    nextTarget: input.quickLogNextTarget,
    lastTarget: input.quickLogLastTarget,
    bestTarget: input.quickLogBestTarget,
  });
  const quickLogPreviewLabel = formatQuickLogPreviewLabelForResolvedTarget({
    resolvedTarget: resolvedQuickLogTarget,
    loggedSetCount: progressState.loggedSetCount,
    targetSetsMin: input.targetSetsMin,
    targetSetsMax: input.targetSetsMax,
    fallbackWeightUnit: input.fallbackWeightUnit,
  });
  const variant: SessionRowVisualVariant = input.isPending ? "pending" : "active";
  const variantStyles: Record<SessionRowVisualVariant, Pick<SessionRowState, "actionRowClassName" | "quickLogActionClassName" | "skipActionClassName">> = {
    pending: {
      actionRowClassName: "opacity-85",
      quickLogActionClassName: "",
      skipActionClassName: "",
    },
    active: {
      actionRowClassName: "opacity-100",
      quickLogActionClassName: "",
      skipActionClassName: "",
    },
  };

  return {
    variant,
    cardState: progressState.cardState,
    badgeText: progressState.badgeText,
    progressLabel: progressState.progressLabel,
    chips: progressState.chips,
    skipActionLabel: progressState.skipActionLabel,
    quickLogActionIntent: progressState.allowQuickLog ? "positive" : "neutral",
    skipActionIntent: "danger",
    isQuickLogDisabled: !progressState.allowQuickLog,
    isSkipDisabled: !progressState.allowSkipToggle,
    quickLogDisabledMessage: "Unskip to log",
    quickLogLabel: quickLogPreviewLabel ? `Log: ${quickLogPreviewLabel}` : "Log",
    ...variantStyles[variant],
  };
}
