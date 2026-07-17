import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import { formatSessionCopilotFeedbackLabel, type SessionCopilotFeedbackSignal } from "@/lib/session-copilot-feedback";
import type { SessionTargetHintSource } from "@/lib/session-target-hints";

export const SESSION_FEEDBACK_SUMMARY_SEPARATOR = " | ";

export function isSessionExerciseFeedbackComplete(args: {
  signal: SessionCopilotFeedbackSignal | null;
  effortValue: number | null;
}) {
  return args.signal !== null
    && args.effortValue !== null
    && Number.isFinite(args.effortValue)
    && args.effortValue >= 1
    && args.effortValue <= 10;
}

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
  notes: string | null;
  weightUnit: "lbs" | "kg";
} | null;

export type ComparableSessionLoggerDraftFormState = {
  weight: string;
  reps: string;
  durationInput: string;
  distance: string;
  calories: string;
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
  copilotFeedbackEffort: number | null;
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

export function buildSessionCopilotActionLabel(args: {
  targetSource?: SessionTargetHintSource | null;
  isEditedFromCurrentTarget?: boolean | null;
  didApplyLastTarget?: boolean | null;
}) {
  if (args.isEditedFromCurrentTarget) {
    return "Override";
  }

  if (args.didApplyLastTarget) {
    return "Last Setup";
  }

  switch (args.targetSource ?? null) {
    case "playbook_derived_target":
      return "Auto Target";
    case "playbook_seed_target":
      return "Seed Target";
    case "manual_target":
      return "Planned Target";
    case "fallback_last_successful_set":
      return "Repeat Last";
    case "recent_best":
      return "Recent Best";
    case "invalid_playbook_fallback":
    case "unsupported_playbook_fallback":
      return "Fallback Target";
    case "no_history":
      return "No Target Yet";
    default:
      return null;
  }
}

export function buildSessionCopilotRecapTagLabel(signal: SessionCopilotFeedbackSignal) {
  switch (signal) {
    case "completed_as_planned":
      return "PLANNED";
    case "too_easy":
      return "EASY";
    case "too_hard":
      return "HARD";
    case "form_breakdown":
      return "FORM";
    case "pain_flag":
      return "PAIN";
    case "bad_day":
      return "BAD DAY";
    case "override_used":
      return "OVERRIDE";
    default:
      return formatSessionCopilotFeedbackLabel(signal).toUpperCase();
  }
}

export function buildSessionCopilotReceiptLabel(args: {
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

export function buildSessionEffortContextLabel(args: {
  signal: SessionCopilotFeedbackSignal | null;
  effortValue: number | null;
}) {
  return buildSessionCopilotReceiptLabel(args);
}

export function buildSessionEffortNotePlaceholder(args: {
  signal: SessionCopilotFeedbackSignal | null;
  effortValue: number | null;
}) {
  const contextLabel = buildSessionEffortContextLabel(args);
  return contextLabel
    ? `Optional context for ${contextLabel.toLowerCase()}`
    : "Optional context for this exercise";
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
    && left.quickLogPayload?.notes === right.quickLogPayload?.notes
    && left.quickLogPayload?.weightUnit === right.quickLogPayload?.weightUnit
    && left.isEditedFromCurrentTarget === right.isEditedFromCurrentTarget
    && left.didApplyLastTarget === right.didApplyLastTarget
    && left.copilotFeedbackSignal === right.copilotFeedbackSignal
    && left.copilotFeedbackNote === right.copilotFeedbackNote
    && left.copilotFeedbackEffort === right.copilotFeedbackEffort
    && left.formState.weight === right.formState.weight
    && left.formState.reps === right.formState.reps
    && left.formState.durationInput === right.formState.durationInput
    && left.formState.distance === right.formState.distance
    && left.formState.calories === right.formState.calories
    && left.formState.weightUnit === right.formState.weightUnit
    && left.formState.distanceUnit === right.formState.distanceUnit
    && left.formState.isWarmup === right.formState.isWarmup
    && left.formState.isFailure === right.formState.isFailure;
}
