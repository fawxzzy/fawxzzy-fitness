import type { SetRow } from "@/types/db";
import { type SetLogQueueItem } from "@/lib/offline/set-log-queue";
import { mergeByStableSetId, resolveStableSetId, sortSetsByIndex } from "@/lib/offline/set-log-reconciliation";
import { type LiveSetMetricFlags } from "@/lib/live-set-input-order";
import { formatMeasurementSummaryItems } from "@/lib/measurement-display";
import { type SessionQuickLogActionPayload, type SessionQuickLogTarget } from "@/lib/session-quick-log";
import type { ActionResult } from "@/lib/action-result";
import { type FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import { getSessionCopilotFeedbackTone, type SessionCopilotFeedbackSignal } from "@/lib/session-copilot-feedback";

export type AddSetPayload = {
  sessionId: string;
  sessionExerciseId: string;
  weight: number;
  reps: number;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: FitnessDistanceUnit | null;
  calories: number | null;
  isWarmup: boolean;
  notes: string | null;
  weightUnit: "lbs" | "kg";
  clientLogId: string;
};

export type AddSetActionResult = ActionResult<{ set: SetRow }>;

export const FAILURE_NOTE_SENTINEL = "__session_failure__";

const SESSION_EFFORT_SCALE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export type SessionLoggerDraftQuickLogPayload = SessionQuickLogActionPayload;

export type SessionLoggerDraftFormState = {
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

export type SessionLoggerDraftState = {
  goalLabel: string | null;
  quickLogLabel: string;
  quickLogPayload: SessionLoggerDraftQuickLogPayload | null;
  isEditedFromCurrentTarget: boolean;
  didApplyLastTarget: boolean;
  copilotFeedbackSignal: SessionCopilotFeedbackSignal | null;
  copilotFeedbackNote: string | null;
  copilotFeedbackEffort: number | null;
  formState: SessionLoggerDraftFormState;
};

export type SessionLoggerFormState = SessionLoggerDraftFormState;

export function areLoggerFormStatesEqual(left: SessionLoggerFormState, right: SessionLoggerFormState) {
  return left.weight === right.weight
    && left.reps === right.reps
    && left.durationInput === right.durationInput
    && left.distance === right.distance
    && left.calories === right.calories
    && left.weightUnit === right.weightUnit
    && left.distanceUnit === right.distanceUnit
    && left.isWarmup === right.isWarmup
    && left.isFailure === right.isFailure;
}

export function parseDurationInput(rawValue: string): number | null {
  const value = rawValue.trim();
  if (!value) return null;

  if (value.includes(":")) {
    const [minutesRaw, secondsRaw] = value.split(":");
    if (secondsRaw === undefined) return null;
    const minutes = Number(minutesRaw);
    const seconds = Number(secondsRaw);
    if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || seconds < 0 || seconds > 59) {
      return null;
    }
    return minutes * 60 + seconds;
  }

  const totalSeconds = Number(value);
  if (!Number.isInteger(totalSeconds) || totalSeconds < 0) {
    return null;
  }

  return totalSeconds;
}

export function formatDurationInput(durationSeconds: number | null) {
  if (durationSeconds === null || durationSeconds < 0) return "";
  const safeSeconds = Math.floor(durationSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export type DisplaySet = SetRow & {
  stableId: string;
  queueItemId?: string;
  pending?: boolean;
  queueStatus?: SetLogQueueItem["status"];
};

export type AnimatedDisplaySet = DisplaySet & { isLeaving?: boolean };

export type SetLoggerSeedSet = SetRow & {
  stableId?: string;
  queueItemId?: string;
  pending?: boolean;
  queueStatus?: SetLogQueueItem["status"];
};

export function mergeDisplaySets(baseSets: DisplaySet[], incomingSets: DisplaySet[]) {
  return sortSetsByIndex(mergeByStableSetId(incomingSets, baseSets));
}

export function toDisplaySet(set: SetRow): DisplaySet {
  return {
    ...set,
    stableId: resolveStableSetId(set),
    pending: false,
    queueItemId: undefined,
    queueStatus: undefined,
  };
}

export function formatHistorySummary(summary: string | null, performedAtLabel: string | null) {
  if (!summary) {
    return {
      items: [] as string[],
      dateLabel: null as string | null,
    };
  }

  const weightAndRepsMatch = summary.match(/^(.+?)\s+x\s+(\d+(?:\.\d+)?)$/i);
  if (weightAndRepsMatch) {
    const [, weightLabel, repsLabel] = weightAndRepsMatch;
    return {
      items: [
        `${repsLabel} reps`,
        weightLabel.trim(),
      ],
      dateLabel: performedAtLabel,
    };
  }

  return {
    items: [summary],
    dateLabel: performedAtLabel,
  };
}

export function formatLoggedSetRowLabel({
  index,
  isWarmup,
  useIntervalLanguage,
}: {
  index: number;
  isWarmup: boolean;
  useIntervalLanguage: boolean;
}) {
  if (isWarmup) {
    return <span className="text-[rgb(var(--warning-rgb)/0.98)]">Warm-Up</span>;
  }

  return (
    <>
      {useIntervalLanguage ? "Interval" : "Set"}{" "}
      <span className="text-[rgb(var(--accent)/0.98)]">{index + 1}</span>
    </>
  );
}

export function getSessionSummaryItems({
  reps,
  weight,
  weightUnit,
  durationSeconds,
  distance,
  distanceUnit,
  calories,
  failure,
  isWarmup,
  queueStatus,
  pending,
  emptyLabel,
  includeWarmupTag = true,
}: {
  reps: number | null | undefined;
  weight: number | null | undefined;
  weightUnit: string | null | undefined;
  durationSeconds: number | null | undefined;
  distance: number | null | undefined;
  distanceUnit: FitnessDistanceUnit | null | undefined;
  calories: number | null | undefined;
  failure?: boolean;
  isWarmup?: boolean;
  queueStatus?: string;
  pending?: boolean;
  emptyLabel: string;
  includeWarmupTag?: boolean;
}) {
  const hasCardioSignal = [durationSeconds, distance, calories].some((value) => Number.isFinite(value ?? null) && (value ?? 0) > 0);
  const resolvedFailure = Boolean(failure);
  const normalizedReps = hasCardioSignal && (reps ?? 0) <= 0 ? null : reps;
  const normalizedWeight = hasCardioSignal && (weight ?? 0) <= 0 ? null : weight;
  const normalizedDistance = (distance ?? 0) > 0 ? distance : null;
  const normalizedCalories = (calories ?? 0) > 0 ? calories : null;
  const parts = [
    ...(resolvedFailure ? ["Failure"] : []),
    ...formatMeasurementSummaryItems({
      reps: normalizedReps,
      weight: normalizedWeight,
      weightUnit,
      durationSeconds,
      distance: normalizedDistance,
      distanceUnit,
      calories: normalizedCalories,
      emptyLabel,
    }).map((item) => item.label),
  ];

  if (isWarmup && includeWarmupTag) {
    parts.push("Warm-Up");
  }

  return parts;
}

export function deriveLiveTargetMetrics(
  target: SessionQuickLogTarget | null | undefined,
  fallback: LiveSetMetricFlags,
): LiveSetMetricFlags {
  if (!target) {
    return fallback;
  }

  const metrics: LiveSetMetricFlags = {
    reps: typeof target.repsMin === "number" || typeof target.repsMax === "number",
    weight: typeof target.weightMin === "number" || typeof target.weightMax === "number",
    time: typeof target.durationSeconds === "number",
    distance: typeof target.distance === "number",
    calories: typeof target.calories === "number",
  };

  return Object.values(metrics).some(Boolean) ? metrics : fallback;
}

export function deriveDraftMetricPresence(draftValues: {
  reps: string;
  weight: string;
  duration: string;
  distance: string;
  calories: string;
}): LiveSetMetricFlags {
  return {
    reps: draftValues.reps.trim().length > 0,
    weight: draftValues.weight.trim().length > 0,
    time: draftValues.duration.trim().length > 0,
    distance: draftValues.distance.trim().length > 0,
    calories: draftValues.calories.trim().length > 0,
  };
}

function getCopilotFeedbackSelectedClassName(signal: SessionCopilotFeedbackSignal) {
  switch (getSessionCopilotFeedbackTone(signal)) {
    case "success":
      return "border-[rgb(var(--success-rgb)/0.62)] bg-[linear-gradient(180deg,rgb(var(--success-rgb)/0.28),rgb(var(--success-rgb)/0.18))] text-[rgb(var(--text-primary)/0.99)] shadow-[0_0_0_1px_rgb(var(--success-rgb)/0.18),0_0_18px_rgb(var(--success-rgb)/0.14)]";
    case "warning":
      return "border-[rgb(var(--warning-rgb)/0.68)] bg-[linear-gradient(180deg,rgb(var(--warning-rgb)/0.26),rgb(var(--warning-rgb)/0.16))] text-[rgb(255_244_225)] shadow-[0_0_0_1px_rgb(var(--warning-rgb)/0.14),0_0_16px_rgb(var(--warning-rgb)/0.12)]";
    case "destructive":
      return "border-[rgb(var(--danger-rgb)/0.56)] bg-[linear-gradient(180deg,rgb(var(--danger-rgb)/0.24),rgb(var(--danger-rgb)/0.14))] text-[rgb(255_236_236)] shadow-[0_0_0_1px_rgb(var(--danger-rgb)/0.12),0_0_16px_rgb(var(--danger-rgb)/0.12)]";
    case "default":
    default:
      return "border-[rgb(var(--accent)/0.52)] bg-[linear-gradient(180deg,rgb(var(--accent)/0.2),rgb(var(--accent)/0.12))] text-[rgb(var(--text-primary)/0.99)] shadow-[0_0_0_1px_rgb(var(--accent)/0.14),0_0_18px_rgb(var(--accent)/0.12)]";
  }
}

function getEffortScaleSelectedClassName(value: number) {
  if (value >= 9) {
    return "border-[rgb(var(--danger-rgb)/0.62)] bg-[linear-gradient(180deg,rgb(var(--danger-rgb)/0.32),rgb(var(--danger-rgb)/0.18))] text-[rgb(255_238_238)] shadow-[0_0_0_1px_rgb(var(--danger-rgb)/0.16),0_0_18px_rgb(var(--danger-rgb)/0.14)]";
  }

  if (value >= 7) {
    return "border-[rgb(var(--warning-rgb)/0.68)] bg-[linear-gradient(180deg,rgb(var(--warning-rgb)/0.3),rgb(var(--warning-rgb)/0.18))] text-[rgb(255_245_228)] shadow-[0_0_0_1px_rgb(var(--warning-rgb)/0.16),0_0_18px_rgb(var(--warning-rgb)/0.12)]";
  }

  if (value >= 4) {
    return "border-[rgb(var(--accent)/0.68)] bg-[linear-gradient(180deg,rgb(var(--accent)/0.34),rgb(var(--accent)/0.2))] text-[rgb(var(--surface-0-rgb)/0.99)] shadow-[0_0_0_1px_rgb(var(--accent)/0.2),0_0_18px_rgb(var(--accent)/0.16)]";
  }

  return "border-[rgb(var(--success-rgb)/0.62)] bg-[linear-gradient(180deg,rgb(var(--success-rgb)/0.3),rgb(var(--success-rgb)/0.18))] text-[rgb(var(--surface-0-rgb)/0.99)] shadow-[0_0_0_1px_rgb(var(--success-rgb)/0.18),0_0_18px_rgb(var(--success-rgb)/0.14)]";
}
