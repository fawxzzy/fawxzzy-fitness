import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import { formatSessionCopilotFeedbackLabel, type SessionCopilotFeedbackSignal } from "@/lib/session-copilot-feedback";

export const SESSION_FEEDBACK_SUMMARY_SEPARATOR = " | ";

export type SessionProgressionStateSummaryInput = {
  progressionPlaybookId?: string | null;
  progressionSessionSettingsEnabled?: boolean | null;
  progressionSetSettingsEnabled?: boolean | null;
};

export type ComparableSessionLoggerDraftQuickLogPayload = {
  weight: number;
  reps: number;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: FitnessDistanceUnit | null;
  calories: number | null;
  isWarmup: boolean;
  rpe: number | null;
  notes: string | null;
  weightUnit: "lbs" | "kg";
} | null;

export type ComparableSessionLoggerDraftFormState = {
  weight: string;
  reps: string;
  durationInput: string;
  distance: string;
  calories: string;
  rpe: string;
  weightUnit: "lbs" | "kg";
  distanceUnit: FitnessDistanceUnit;
  isWarmup: boolean;
  isFailure: boolean;
};

export type ComparableSessionLoggerDraftState = {
  goalLabel: string | null;
  quickLogLabel: string;
  quickLogPayload: ComparableSessionLoggerDraftQuickLogPayload;
  isEditedFromCurrentTarget: boolean;
  didApplyLastTarget: boolean;
  copilotFeedbackSignal: SessionCopilotFeedbackSignal | null;
  copilotFeedbackNote: string | null;
  formState: ComparableSessionLoggerDraftFormState;
};

export function buildSessionProgressionStateLabel(formState?: SessionProgressionStateSummaryInput | null) {
  const hasAutoProgression = Boolean(formState?.progressionPlaybookId);
  const labels = [hasAutoProgression ? "AUTO" : "MANUAL"];

  if (hasAutoProgression) {
    if (formState?.progressionSessionSettingsEnabled !== false) {
      labels.push("SESSION");
    }
    if (formState?.progressionSetSettingsEnabled !== false) {
      labels.push("SET");
    }
  }

  return labels.join(SESSION_FEEDBACK_SUMMARY_SEPARATOR);
}

export function buildSessionProgressionFeedbackSummaryLabel(args: {
  progressionFormState?: SessionProgressionStateSummaryInput | null;
  copilotFeedbackSignal?: SessionCopilotFeedbackSignal | null;
}) {
  const labels = [
    buildSessionProgressionStateLabel(args.progressionFormState ?? null),
    args.copilotFeedbackSignal ? formatSessionCopilotFeedbackLabel(args.copilotFeedbackSignal) : null,
  ].filter(Boolean);

  return labels.join(SESSION_FEEDBACK_SUMMARY_SEPARATOR);
}

export function buildSessionEffortContextLabel(args: {
  signal: SessionCopilotFeedbackSignal | null;
  effortValue: number | null;
}) {
  const parts: string[] = [];

  if (args.signal) {
    parts.push(formatSessionCopilotFeedbackLabel(args.signal));
  }

  if (args.effortValue !== null && Number.isFinite(args.effortValue)) {
    parts.push(`Effort ${args.effortValue}/10`);
  }

  return parts.length > 0 ? parts.join(SESSION_FEEDBACK_SUMMARY_SEPARATOR) : null;
}

export function buildSessionEffortNotePlaceholder(args: {
  signal: SessionCopilotFeedbackSignal | null;
  effortValue: number | null;
}) {
  const contextLabel = buildSessionEffortContextLabel(args);
  return contextLabel
    ? `Optional context for ${contextLabel.toLowerCase()}`
    : "Optional context for this set or exercise";
}

export function areSessionLoggerDraftStatesEqual(
  left: ComparableSessionLoggerDraftState | null | undefined,
  right: ComparableSessionLoggerDraftState,
) {
  if (!left) {
    return false;
  }

  return left.goalLabel === right.goalLabel
    && left.quickLogLabel === right.quickLogLabel
    && left.quickLogPayload?.weight === right.quickLogPayload?.weight
    && left.quickLogPayload?.reps === right.quickLogPayload?.reps
    && left.quickLogPayload?.durationSeconds === right.quickLogPayload?.durationSeconds
    && left.quickLogPayload?.distance === right.quickLogPayload?.distance
    && left.quickLogPayload?.distanceUnit === right.quickLogPayload?.distanceUnit
    && left.quickLogPayload?.calories === right.quickLogPayload?.calories
    && left.quickLogPayload?.isWarmup === right.quickLogPayload?.isWarmup
    && left.quickLogPayload?.rpe === right.quickLogPayload?.rpe
    && left.quickLogPayload?.notes === right.quickLogPayload?.notes
    && left.quickLogPayload?.weightUnit === right.quickLogPayload?.weightUnit
    && left.isEditedFromCurrentTarget === right.isEditedFromCurrentTarget
    && left.didApplyLastTarget === right.didApplyLastTarget
    && left.copilotFeedbackSignal === right.copilotFeedbackSignal
    && left.copilotFeedbackNote === right.copilotFeedbackNote
    && left.formState.weight === right.formState.weight
    && left.formState.reps === right.formState.reps
    && left.formState.durationInput === right.formState.durationInput
    && left.formState.distance === right.formState.distance
    && left.formState.calories === right.formState.calories
    && left.formState.rpe === right.formState.rpe
    && left.formState.weightUnit === right.formState.weightUnit
    && left.formState.distanceUnit === right.formState.distanceUnit
    && left.formState.isWarmup === right.formState.isWarmup
    && left.formState.isFailure === right.formState.isFailure;
}
