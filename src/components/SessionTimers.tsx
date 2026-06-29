"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { SetRow } from "@/types/db";
import { ChipButton } from "@/components/ui/Chip";
import {
  enqueueSetLog,
  readQueuedSetLogsBySessionExerciseIdForUser,
  removeSetLogQueueItem,
  type SetLogQueueItem,
} from "@/lib/offline/set-log-queue";
import { createSetLogSyncEngine } from "@/lib/offline/sync-engine";
import {
  areSetListsEquivalent,
  createStableSetId,
  mergeByStableSetId,
  resolveStableSetId,
  sortSetsByIndex,
  toRestorableQueueSet,
} from "@/lib/offline/set-log-reconciliation";
import { buildSessionDraftStorageKey, isOfflineSnapshotStale } from "@/lib/offline/client-storage";
import { useToast } from "@/components/ui/ToastProvider";
import { getBottomActionButtonClassName } from "@/components/layout/bottomActionIntents";
import {
  GlowSwitch,
  GLOW_SWITCH_MEASUREMENT_ROW_WRAPPER_CLASS_NAME,
  GLOW_SWITCH_STANDARD_CLASS_NAME,
  GLOW_SWITCH_STANDARD_STATE_CLASS_NAME,
} from "@/components/ui/GlowSwitch";
import { appTokens } from "@/components/ui/app/tokens";
import type { ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { MeasurementPanelV2, type MeasurementPanelAuxiliaryField } from "@/components/ui/measurements/MeasurementPanelV2";
import { WorkoutEntrySection } from "@/components/ui/workout-entry/EntrySection";
import { LoggedSetSummaryRow } from "@/components/ui/workout-entry/LoggedSetSummaryRow";
import { VerticalScrollHint } from "@/components/ui/VerticalScrollHint";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import { formatDurationClock } from "@/lib/duration";
import {
  resolveGoalModality,
} from "@/lib/exercise-goal-validation";
import { getLiveSetInputOrder, type LiveSetMetricFlags } from "@/lib/live-set-input-order";
import { formatMeasurementSummaryItems, formatSetPositionLabel } from "@/lib/measurement-display";
import { deriveMeasurementPresenceFromValues, sanitizeEnabledMeasurementValues } from "@/lib/measurement-sanitization";
import {
  addDeletedSetIdentityKeys,
  filterDeletedDisplaySets,
  removeDeletedSetIdentityKeys,
} from "@/lib/session-deleted-set-identities";
import { deriveSimpleSessionPrToast } from "@/lib/session-set-entry";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import type { SessionTargetHint } from "@/lib/session-target-hints";
import { toQuickLogTargetFromSuggestedValues, type SessionQuickLogTarget } from "@/lib/session-quick-log";
import { type ProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";
import { estimateCaloriesFromExerciseMetrics, resolveCaloriesEstimationMethod, type CalorieEstimationExerciseInput } from "@/lib/calorie-estimation";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import { type PromotionStepFieldId } from "@/lib/session-progression-display";
import type { ActionResult } from "@/lib/action-result";
import { getNextPublishedSetCount } from "@/components/session/setCountSync";
import { cn } from "@/lib/cn";
import { isFitnessDistanceUnit, normalizeFitnessDistanceUnit, type FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import {
  formatSessionCopilotFeedbackLabel,
  getSessionCopilotFeedbackTone,
  normalizeSessionCopilotFeedbackNote,
  normalizeSessionCopilotFeedbackSignal,
  SESSION_COPILOT_FEEDBACK_NOTE_MAX_LENGTH,
  SESSION_COPILOT_FEEDBACK_SIGNALS,
  type SessionCopilotFeedbackSignal,
} from "@/lib/session-copilot-feedback";

type AddSetPayload = {
  sessionId: string;
  sessionExerciseId: string;
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
  clientLogId: string;
};

type AddSetActionResult = ActionResult<{ set: SetRow }>;

export const FAILURE_NOTE_SENTINEL = "__session_failure__";

export type SessionLoggerDraftQuickLogPayload = {
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
};

export type SessionLoggerDraftFormState = {
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

export type SessionLoggerDraftState = {
  goalLabel: string | null;
  quickLogLabel: string;
  quickLogPayload: SessionLoggerDraftQuickLogPayload | null;
  isEditedFromCurrentTarget: boolean;
  didApplyLastTarget: boolean;
  copilotFeedbackSignal: SessionCopilotFeedbackSignal | null;
  copilotFeedbackNote: string | null;
  formState: SessionLoggerDraftFormState;
};

type SessionLoggerFormState = SessionLoggerDraftFormState;

function areLoggerFormStatesEqual(left: SessionLoggerFormState, right: SessionLoggerFormState) {
  return left.weight === right.weight
    && left.reps === right.reps
    && left.durationInput === right.durationInput
    && left.distance === right.distance
    && left.calories === right.calories
    && left.rpe === right.rpe
    && left.weightUnit === right.weightUnit
    && left.distanceUnit === right.distanceUnit
    && left.isWarmup === right.isWarmup
    && left.isFailure === right.isFailure;
}
function parseDurationInput(rawValue: string): number | null {
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

function formatDurationInput(durationSeconds: number | null) {
  if (durationSeconds === null || durationSeconds < 0) return "";
  const safeSeconds = Math.floor(durationSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

type DisplaySet = SetRow & {
  stableId: string;
  queueItemId?: string;
  pending?: boolean;
  queueStatus?: SetLogQueueItem["status"];
};
type AnimatedDisplaySet = DisplaySet & { isLeaving?: boolean };
export type SetLoggerSeedSet = SetRow & {
  stableId?: string;
  queueItemId?: string;
  pending?: boolean;
  queueStatus?: SetLogQueueItem["status"];
};

function mergeDisplaySets(baseSets: DisplaySet[], incomingSets: DisplaySet[]) {
  return sortSetsByIndex(mergeByStableSetId(incomingSets, baseSets));
}

function toDisplaySet(set: SetRow): DisplaySet {
  return {
    ...set,
    stableId: resolveStableSetId(set),
    pending: false,
    queueItemId: undefined,
    queueStatus: undefined,
  };
}

function formatHistorySummary(summary: string | null, performedAtLabel: string | null) {
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

function formatLoggedSetRowLabel({
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

function getSessionSummaryItems({
  reps,
  weight,
  weightUnit,
  durationSeconds,
  distance,
  distanceUnit,
  calories,
  failure,
  rpe,
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
  rpe?: number | null;
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

  if (rpe !== null && rpe !== undefined) {
    parts.push(`Effort ${rpe}`);
  }

  if (isWarmup && includeWarmupTag) {
    parts.push("Warm-Up");
  }

  return parts;
}

function deriveLiveTargetMetrics(
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

function deriveDraftMetricPresence(draftValues: {
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

export function SetLoggerCard({
  userId,
  sessionId,
  sessionExerciseId,
  addSetAction,
  syncQueuedSetLogsAction,
  unitLabel,
  initialSets,
  onSetsChange,
  onSetCountChange,
  prefill,
  setFlowQuickLogTargets,
  defaultDistanceUnit,
  isCardio,
  targetHint,
  useIntervalLanguage = false,
  initialEnabledMetrics,
  routineDayExerciseId,
  planTargetsHash,
  deleteSetAction,
  copilotFeedbackSignal,
  copilotFeedbackNote,
  copilotFeedbackUpdatedAt: _copilotFeedbackUpdatedAt,
  updateCopilotFeedbackAction,
  secondaryActionLabel: _secondaryActionLabel,
  onSecondaryAction: _onSecondaryAction,
  progressionFormState,
  progressionStepPolicy: _progressionStepPolicy,
  visiblePromotionStepFields: _visiblePromotionStepFields,
  progressionSelectedMetrics,
  calorieEstimationExercise,
  exerciseMeasurementType,
  exerciseEquipment,
  exerciseMovementPattern,
  exerciseName,
  targetSetsMin,
  targetSetsMax,
  cycleLengthDays: _cycleLengthDays,
  progressionExampleDayNumber: _progressionExampleDayNumber,
  showAllMeasurementInputs = false,
  showWarmupToggle = true,
  showFailureToggle = false,
  showProgressionControls: _showProgressionControls = true,
  updateProgressionAction: _updateProgressionAction,
  bottomDockCenter: _bottomDockCenter,
  fallbackGoalLabel,
  onDraftStateChange,
  reportDraftState = true,
  draftFormState,
}: {
  userId: string;
  sessionId: string;
  sessionExerciseId: string;
  addSetAction: (payload: AddSetPayload) => Promise<AddSetActionResult>;
  syncQueuedSetLogsAction: (payload: {
    items: SetLogQueueItem[];
  }) => Promise<ActionResult<{ results: Array<{ queueItemId: string; ok: boolean; serverSetId?: string; error?: string }> }>>;
  unitLabel: string;
  initialSets: SetLoggerSeedSet[];
  onSetsChange?: (sets: DisplaySet[]) => void;
  onSetCountChange?: (count: number) => void;
  prefill?: {
    weight?: number;
    reps?: number;
    durationSeconds?: number;
    weightUnit?: "lbs" | "kg";
  };
  setFlowQuickLogTargets?: SessionQuickLogTarget[];
  defaultDistanceUnit: FitnessDistanceUnit | null;
  isCardio: boolean;
  targetHint: SessionTargetHint;
  useIntervalLanguage?: boolean;
  initialEnabledMetrics: {
    reps: boolean;
    weight: boolean;
    time: boolean;
    distance: boolean;
    calories: boolean;
  };
  routineDayExerciseId?: string | null;
  planTargetsHash?: string | null;
  deleteSetAction: (payload: { sessionId: string; sessionExerciseId: string; setId: string }) => Promise<ActionResult>;
  copilotFeedbackSignal?: SessionCopilotFeedbackSignal | null;
  copilotFeedbackNote?: string | null;
  copilotFeedbackUpdatedAt?: string | null;
  updateCopilotFeedbackAction?: (payload: {
    sessionId: string;
    sessionExerciseId: string;
    signal: SessionCopilotFeedbackSignal | null;
    note: string | null;
  }) => Promise<ActionResult<{ signal: SessionCopilotFeedbackSignal | null; note: string | null; updatedAt: string | null }>>;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => Promise<void> | void;
  progressionFormState?: ProgressionPlaybookFormState | null;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  visiblePromotionStepFields?: PromotionStepFieldId[] | null;
  progressionSelectedMetrics?: Array<"reps" | "weight" | "time" | "distance" | "calories">;
  calorieEstimationExercise?: CalorieEstimationExerciseInput | null;
  exerciseMeasurementType?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  exerciseEquipment?: string | null;
  exerciseMovementPattern?: string | null;
  exerciseName?: string | null;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  cycleLengthDays?: number | null;
  progressionExampleDayNumber?: number | null;
  showAllMeasurementInputs?: boolean;
  showWarmupToggle?: boolean;
  showFailureToggle?: boolean;
  showProgressionControls?: boolean;
  updateProgressionAction?: (formData: FormData) => Promise<ActionResult>;
  bottomDockCenter?: ReactNode;
  fallbackGoalLabel?: string | null;
  onDraftStateChange?: (draftState: SessionLoggerDraftState) => void;
  reportDraftState?: boolean;
  draftFormState?: SessionLoggerDraftFormState | null;
}) {
  // Manual QA checklist (Step 2 session logging contract)
  // - Routine cardio with time target: logger defaults to duration input and saves duration_seconds.
  // - Routine cardio with distance target: logger defaults to distance + unit and saves distance fields.
  // - Routine cardio with time + distance targets: both show and both are required to save.
  // - Open cardio exercise: defaults to time input and can add distance/reps/weight/calories via + Modify Metrics.
  // - Strength exercise defaults remain reps + weight.
  // - History view behavior is out of scope for this step.
  const [weight, setWeight] = useState(prefill?.weight !== undefined ? String(prefill.weight) : "");
  const [selectedWeightUnit, setSelectedWeightUnit] = useState<"lbs" | "kg">(prefill?.weightUnit ?? (unitLabel === "kg" ? "kg" : "lbs"));
  const [reps, setReps] = useState(prefill?.reps !== undefined ? String(prefill.reps) : "");
  const [durationInput, setDurationInput] = useState(prefill?.durationSeconds !== undefined ? formatDurationClock(prefill.durationSeconds) : "");
  const [distance, setDistance] = useState("");
  const [distanceUnit, setDistanceUnit] = useState<FitnessDistanceUnit>(normalizeFitnessDistanceUnit(defaultDistanceUnit, "mi"));
  const [calories, setCalories] = useState("");
  const lastAutoEstimatedCaloriesRef = useRef<string | null>(null);
  const didDismissAutoEstimatedCaloriesRef = useRef(false);
  const lastCaloriesAutoResetKeyRef = useRef<string | null>(null);
  const [rpe, setRpe] = useState("");
  const [isWarmup, setIsWarmup] = useState(false);
  const [isFailure, setIsFailure] = useState(false);
  const [didApplyLastTarget, setDidApplyLastTarget] = useState(false);
  const resolvedIsWarmup = isWarmup;
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogRequestPending, setIsLogRequestPending] = useState(false);
  const lastInitializedSessionExerciseIdRef = useRef<string | null>(null);
  const [sets, setSets] = useState<DisplaySet[]>(() => initialSets.map(toDisplaySet));
  const [animatedSets, setAnimatedSets] = useState<AnimatedDisplaySet[]>(() => initialSets.map(toDisplaySet));
  const [deletingSetIds, setDeletingSetIds] = useState<string[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);
  const [copilotSignalState, setCopilotSignalState] = useState<SessionCopilotFeedbackSignal | null>(
    normalizeSessionCopilotFeedbackSignal(copilotFeedbackSignal),
  );
  const [copilotNoteState, setCopilotNoteState] = useState(() => normalizeSessionCopilotFeedbackNote(copilotFeedbackNote) ?? "");
  const [isSavingCopilotFeedback, setIsSavingCopilotFeedback] = useState(false);
  const lastPublishedSetCountRef = useRef<number | null>(initialSets.length);
  const latestSetsRef = useRef<DisplaySet[]>(initialSets.map(toDisplaySet));
  const draftStorageWriteTimeoutRef = useRef<number | null>(null);
  const draftStorageIdleCallbackRef = useRef<number | null>(null);
  const draftStorageSnapshotRef = useRef<{ key: string; payload: string } | null>(null);
  const lastQueueStatusByStableIdRef = useRef<Record<string, SetLogQueueItem["status"] | undefined>>({});
  const locallyDeletedSetIdentityKeysRef = useRef<Set<string>>(new Set());
  const logRequestInFlightRef = useRef(false);
  const committedCopilotSignalRef = useRef<SessionCopilotFeedbackSignal | null>(
    normalizeSessionCopilotFeedbackSignal(copilotFeedbackSignal),
  );
  const committedCopilotNoteRef = useRef(normalizeSessionCopilotFeedbackNote(copilotFeedbackNote));
  const prefillWeight = prefill?.weight;
  const prefillReps = prefill?.reps;
  const prefillDurationSeconds = prefill?.durationSeconds;
  const prefillWeightUnit = prefill?.weightUnit;

  const toast = useToast();
  useEffect(() => {
    const normalizedSignal = normalizeSessionCopilotFeedbackSignal(copilotFeedbackSignal);
    const normalizedNote = normalizeSessionCopilotFeedbackNote(copilotFeedbackNote);
    committedCopilotSignalRef.current = normalizedSignal;
    committedCopilotNoteRef.current = normalizedNote;
    setCopilotSignalState(normalizedSignal);
    setCopilotNoteState(normalizedNote ?? "");
  }, [copilotFeedbackNote, copilotFeedbackSignal]);
  const currentLiveQuickLogTarget = useMemo(
    () => setFlowQuickLogTargets?.[sets.length] ?? toQuickLogTargetFromSuggestedValues(targetHint.suggestedValues),
    [setFlowQuickLogTargets, sets.length, targetHint.suggestedValues],
  );
  const canonicalFormState = useMemo<SessionLoggerFormState>(() => {
    const nextWeight = currentLiveQuickLogTarget?.weightMax ?? currentLiveQuickLogTarget?.weightMin;
    const nextReps = currentLiveQuickLogTarget?.repsMax ?? currentLiveQuickLogTarget?.repsMin;
    const fallbackDistanceUnit = normalizeFitnessDistanceUnit(defaultDistanceUnit, "mi");

    return {
      weight: nextWeight !== undefined
        ? String(nextWeight)
        : (prefillWeight !== undefined ? String(prefillWeight) : ""),
      reps: nextReps !== undefined
        ? String(nextReps)
        : (prefillReps !== undefined ? String(prefillReps) : ""),
      durationInput: currentLiveQuickLogTarget?.durationSeconds !== undefined
        ? formatDurationClock(currentLiveQuickLogTarget.durationSeconds)
        : (prefillDurationSeconds !== undefined ? formatDurationClock(prefillDurationSeconds) : ""),
      distance: currentLiveQuickLogTarget?.distance !== undefined ? String(currentLiveQuickLogTarget.distance) : "",
      calories: currentLiveQuickLogTarget?.calories !== undefined ? String(currentLiveQuickLogTarget.calories) : "",
      rpe: "",
      weightUnit: currentLiveQuickLogTarget?.weightUnit === "kg" || currentLiveQuickLogTarget?.weightUnit === "lbs"
        ? currentLiveQuickLogTarget.weightUnit
        : (prefillWeightUnit ?? (unitLabel === "kg" ? "kg" : "lbs")),
      distanceUnit: isFitnessDistanceUnit(currentLiveQuickLogTarget?.distanceUnit)
        ? currentLiveQuickLogTarget.distanceUnit
        : fallbackDistanceUnit,
      isWarmup: false,
      isFailure: false,
    };
  }, [
    currentLiveQuickLogTarget,
    defaultDistanceUnit,
    prefillDurationSeconds,
    prefillReps,
    prefillWeight,
    prefillWeightUnit,
    unitLabel,
  ]);
  const currentLiveTargetMetrics = useMemo(
    () => deriveLiveTargetMetrics(currentLiveQuickLogTarget, initialEnabledMetrics),
    [currentLiveQuickLogTarget, initialEnabledMetrics],
  );
  const draftMetricPresence = useMemo(
    () => deriveDraftMetricPresence({
      reps,
      weight,
      duration: durationInput,
      distance,
      calories,
    }),
    [calories, distance, durationInput, reps, weight],
  );
  const liveSetInputOrder = useMemo(() => getLiveSetInputOrder({
    requiredMetrics: currentLiveTargetMetrics,
    configuredMetrics: initialEnabledMetrics,
    draftValues: {
      reps,
      weight,
      time: durationInput,
      distance,
      calories,
    },
    isCardio,
    showAllMetrics: showAllMeasurementInputs,
  }), [calories, currentLiveTargetMetrics, distance, durationInput, initialEnabledMetrics, isCardio, reps, showAllMeasurementInputs, weight]);
  const liveMeasurementMetrics = useMemo<LiveSetMetricFlags>(() => ({
    reps: showAllMeasurementInputs ? liveSetInputOrder.visibleMetrics.includes("reps") : (liveSetInputOrder.visibleMetrics.includes("reps") || draftMetricPresence.reps),
    weight: showAllMeasurementInputs ? liveSetInputOrder.visibleMetrics.includes("weight") : (liveSetInputOrder.visibleMetrics.includes("weight") || draftMetricPresence.weight),
    time: showAllMeasurementInputs ? liveSetInputOrder.visibleMetrics.includes("time") : (liveSetInputOrder.visibleMetrics.includes("time") || draftMetricPresence.time),
    distance: showAllMeasurementInputs ? liveSetInputOrder.visibleMetrics.includes("distance") : (liveSetInputOrder.visibleMetrics.includes("distance") || draftMetricPresence.distance),
    calories: showAllMeasurementInputs ? liveSetInputOrder.visibleMetrics.includes("calories") : (liveSetInputOrder.visibleMetrics.includes("calories") || draftMetricPresence.calories),
  }), [draftMetricPresence, liveSetInputOrder.visibleMetrics, showAllMeasurementInputs]);
  const parsedDurationSeconds = useMemo(
    () => parseDurationInput(durationInput),
    [durationInput],
  );
  const parsedDistance = useMemo(() => {
    const trimmedDistance = distance.trim();
    if (!trimmedDistance) {
      return null;
    }

    const parsedValue = Number(trimmedDistance);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
  }, [distance]);
  const resolvedCaloriesEstimationMethod = useMemo(
    () => calorieEstimationExercise ? resolveCaloriesEstimationMethod(calorieEstimationExercise) : null,
    [calorieEstimationExercise],
  );
  const caloriesAutoResetKey = useMemo(
    () => JSON.stringify({
      sessionExerciseId,
      method: resolvedCaloriesEstimationMethod,
    }),
    [resolvedCaloriesEstimationMethod, sessionExerciseId],
  );
  const estimatedCalories = useMemo(
    () => estimateCaloriesFromExerciseMetrics({
      method: resolvedCaloriesEstimationMethod,
      durationSeconds: parsedDurationSeconds,
      distance: parsedDistance,
      distanceUnit,
      context: {
        userProfile: {
          bodyWeightKg: null,
          bodyWeightLbs: null,
        },
      },
    }),
    [distanceUnit, parsedDistance, parsedDurationSeconds, resolvedCaloriesEstimationMethod],
  );

  useEffect(() => {
    setIsMetricsExpanded(false);
  }, [sessionExerciseId]);

  const applyLoggerFormState = useCallback((nextFormState: SessionLoggerDraftFormState) => {
    setWeight(nextFormState.weight);
    setSelectedWeightUnit(nextFormState.weightUnit);
    setReps(nextFormState.reps);
    setDurationInput(nextFormState.durationInput);
    setDistance(nextFormState.distance);
    setDistanceUnit(nextFormState.distanceUnit);
    setCalories(nextFormState.calories);
    setRpe(nextFormState.rpe);
    setIsWarmup(nextFormState.isWarmup);
    setIsFailure(nextFormState.isFailure);
  }, []);

  const resetLoggerMeasurementInputs = useCallback(() => {
    applyLoggerFormState(canonicalFormState);
  }, [applyLoggerFormState, canonicalFormState]);

  useEffect(() => {
    if (lastInitializedSessionExerciseIdRef.current === sessionExerciseId) {
      return;
    }

    lastInitializedSessionExerciseIdRef.current = sessionExerciseId;
    applyLoggerFormState(draftFormState ?? canonicalFormState);
    setDidApplyLastTarget(false);
    setError(null);
    locallyDeletedSetIdentityKeysRef.current = new Set();
    const nextDisplaySets = filterDeletedDisplaySets(initialSets.map(toDisplaySet), locallyDeletedSetIdentityKeysRef.current);
    latestSetsRef.current = nextDisplaySets;
    setSets(nextDisplaySets);
    setAnimatedSets(nextDisplaySets);
    lastPublishedSetCountRef.current = nextDisplaySets.length;
  }, [applyLoggerFormState, canonicalFormState, draftFormState, initialSets, sessionExerciseId]);

  useEffect(() => {
    if (lastCaloriesAutoResetKeyRef.current === caloriesAutoResetKey) {
      return;
    }

    lastCaloriesAutoResetKeyRef.current = caloriesAutoResetKey;
    didDismissAutoEstimatedCaloriesRef.current = false;
  }, [caloriesAutoResetKey]);

  useEffect(() => {
    setCalories((current) => {
      const currentCalories = current.trim();
      const lastAutoEstimatedCalories = lastAutoEstimatedCaloriesRef.current;

      if (estimatedCalories === null) {
        if (currentCalories.length > 0 && currentCalories === lastAutoEstimatedCalories) {
          lastAutoEstimatedCaloriesRef.current = null;
          return "";
        }

        lastAutoEstimatedCaloriesRef.current = null;
        return current;
      }

      const nextCalories = String(estimatedCalories);
      const isAutoControlled = currentCalories.length === 0 || currentCalories === lastAutoEstimatedCalories;

      lastAutoEstimatedCaloriesRef.current = nextCalories;
      if (didDismissAutoEstimatedCaloriesRef.current || !isAutoControlled || currentCalories === nextCalories) {
        return current;
      }

      return nextCalories;
    });
  }, [estimatedCalories]);

  useEffect(() => {
    if (!showWarmupToggle) {
      setIsWarmup(false);
    }
  }, [showWarmupToggle]);

  useEffect(() => {
    const nextDisplaySets = filterDeletedDisplaySets(initialSets.map(toDisplaySet), locallyDeletedSetIdentityKeysRef.current);
    setSets((current) => {
      const next = mergeDisplaySets(current, nextDisplaySets);
      latestSetsRef.current = next;
      return areSetListsEquivalent(current, next) ? current : next;
    });
  }, [initialSets, sessionExerciseId]);

  useEffect(() => {
    onSetsChange?.(sets);
  }, [onSetsChange, sets]);

  useEffect(() => {
    if (!onSetCountChange) {
      return;
    }

    const nextPublishedCount = getNextPublishedSetCount(lastPublishedSetCountRef.current, sets.length);
    if (nextPublishedCount === null) {
      return;
    }

    lastPublishedSetCountRef.current = nextPublishedCount;
    onSetCountChange(nextPublishedCount);
  }, [onSetCountChange, sets.length]);

  useEffect(() => {
    if (draftFormState) {
      return;
    }

    const storageKey = buildSessionDraftStorageKey(userId, sessionId, sessionExerciseId);
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        sets?: DisplaySet[];
      form?: { weight?: string; reps?: string; durationSeconds?: string; distance?: string; distanceUnit?: FitnessDistanceUnit; calories?: string; rpe?: string; isWarmup?: boolean; isFailure?: boolean; selectedWeightUnit?: "lbs" | "kg"; didApplyLastTarget?: boolean };
      };

      if (isOfflineSnapshotStale((parsed as { updatedAt?: number | string }).updatedAt)) {
        window.localStorage.removeItem(storageKey);
        return;
      }

      if (Array.isArray(parsed.sets)) {
        const storedSets = parsed.sets.map((set) => ({
          ...set,
          stableId: resolveStableSetId(set),
        })) as DisplaySet[];
        setSets((current) => {
          const next = mergeDisplaySets(
            filterDeletedDisplaySets(initialSets.map(toDisplaySet), locallyDeletedSetIdentityKeysRef.current),
            filterDeletedDisplaySets(storedSets, locallyDeletedSetIdentityKeysRef.current),
          );
          return areSetListsEquivalent(current, next) ? current : next;
        });
      }

      if (parsed.form) {
        const sanitizedForm = sanitizeEnabledMeasurementValues(deriveMeasurementPresenceFromValues({
          reps: parsed.form.reps,
          weight: parsed.form.weight,
          duration: parsed.form.durationSeconds,
          distance: parsed.form.distance,
          calories: parsed.form.calories,
        }), {
          weight: parsed.form.weight,
          reps: parsed.form.reps,
          duration: parsed.form.durationSeconds,
          distance: parsed.form.distance,
          calories: parsed.form.calories,
        });

        if (typeof sanitizedForm.weight === "string") setWeight(sanitizedForm.weight);
        if (typeof sanitizedForm.reps === "string") setReps(sanitizedForm.reps);
        if (typeof sanitizedForm.duration === "string") setDurationInput(sanitizedForm.duration);
        if (typeof sanitizedForm.distance === "string") setDistance(sanitizedForm.distance);
        if (isFitnessDistanceUnit(parsed.form.distanceUnit)) setDistanceUnit(parsed.form.distanceUnit);
        if (typeof sanitizedForm.calories === "string") setCalories(sanitizedForm.calories);
        if (typeof parsed.form.rpe === "string") setRpe(parsed.form.rpe);
        if (typeof parsed.form.isWarmup === "boolean") setIsWarmup(parsed.form.isWarmup);
        if (typeof parsed.form.isFailure === "boolean") setIsFailure(parsed.form.isFailure);
        if (parsed.form.selectedWeightUnit === "kg" || parsed.form.selectedWeightUnit === "lbs") {
          setSelectedWeightUnit(parsed.form.selectedWeightUnit);
        }
        if (typeof parsed.form.didApplyLastTarget === "boolean") {
          setDidApplyLastTarget(parsed.form.didApplyLastTarget);
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [draftFormState, initialSets, sessionExerciseId, sessionId, userId]);

  useEffect(() => {
    const storageKey = buildSessionDraftStorageKey(userId, sessionId, sessionExerciseId);
    const sanitizedForm = sanitizeEnabledMeasurementValues(deriveMeasurementPresenceFromValues({
      reps,
      weight,
      duration: durationInput,
      distance,
      calories,
    }), {
      weight,
      reps,
      duration: durationInput,
      distance,
      calories,
    });
    const payload = JSON.stringify({
      sets,
      form: {
        weight: sanitizedForm.weight,
        reps: sanitizedForm.reps,
        durationSeconds: sanitizedForm.duration,
        distance: sanitizedForm.distance,
        distanceUnit,
        calories: sanitizedForm.calories,
        rpe,
        isWarmup: resolvedIsWarmup,
        isFailure,
        selectedWeightUnit,
        didApplyLastTarget,
      },
      updatedAt: Date.now(),
    });

    draftStorageSnapshotRef.current = { key: storageKey, payload };
    if (draftStorageWriteTimeoutRef.current !== null) {
      window.clearTimeout(draftStorageWriteTimeoutRef.current);
    }
    if (draftStorageIdleCallbackRef.current !== null && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(draftStorageIdleCallbackRef.current);
      draftStorageIdleCallbackRef.current = null;
    }
    draftStorageWriteTimeoutRef.current = window.setTimeout(() => {
      const pendingWrite = draftStorageSnapshotRef.current;
      if (!pendingWrite) {
        return;
      }

      const writePendingSnapshot = () => {
        window.localStorage.setItem(pendingWrite.key, pendingWrite.payload);
        if (draftStorageSnapshotRef.current?.key === pendingWrite.key && draftStorageSnapshotRef.current?.payload === pendingWrite.payload) {
          draftStorageSnapshotRef.current = null;
        }
        draftStorageIdleCallbackRef.current = null;
      };

      if ("requestIdleCallback" in window) {
        draftStorageIdleCallbackRef.current = window.requestIdleCallback(() => {
          writePendingSnapshot();
        }, { timeout: 320 });
      } else {
        writePendingSnapshot();
      }

      draftStorageWriteTimeoutRef.current = null;
    }, 260);

    return () => {
      if (draftStorageWriteTimeoutRef.current !== null) {
        window.clearTimeout(draftStorageWriteTimeoutRef.current);
      }
      if (draftStorageIdleCallbackRef.current !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(draftStorageIdleCallbackRef.current);
        draftStorageIdleCallbackRef.current = null;
      }
    };
  }, [calories, didApplyLastTarget, distance, distanceUnit, durationInput, isFailure, reps, resolvedIsWarmup, rpe, selectedWeightUnit, sessionExerciseId, sessionId, sets, userId, weight]);

  useEffect(() => () => {
    if (draftStorageWriteTimeoutRef.current !== null) {
      window.clearTimeout(draftStorageWriteTimeoutRef.current);
    }
    if (draftStorageIdleCallbackRef.current !== null && "cancelIdleCallback" in window) {
      window.cancelIdleCallback(draftStorageIdleCallbackRef.current);
      draftStorageIdleCallbackRef.current = null;
    }
    const pendingWrite = draftStorageSnapshotRef.current;
    if (pendingWrite) {
      window.localStorage.setItem(pendingWrite.key, pendingWrite.payload);
      draftStorageSnapshotRef.current = null;
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    setAnimatedSets(sets);
    latestSetsRef.current = sets;
  }, [sets]);

  useEffect(() => {
    const engine = createSetLogSyncEngine({
      userId,
      syncSetLogsAction: syncQueuedSetLogsAction,
      onItemSynced: ({ item, serverSetId }) => {
        setSets((current) =>
          current.map((set) => (
            set.stableId === item.clientLogId
              ? {
                  ...set,
                  id: serverSetId ?? set.id,
                  client_log_id: item.clientLogId,
                  pending: false,
                  queueItemId: undefined,
                  queueStatus: undefined,
                  user_id: userId,
                }
              : set
          )),
        );
        delete lastQueueStatusByStableIdRef.current[item.clientLogId];
        toast.success("Saved set synced.");
      },
      onQueueUpdate: () => {
        void readQueuedSetLogsBySessionExerciseIdForUser(userId, sessionExerciseId).then((queued) => {
          const previousQueueStatusByStableId = lastQueueStatusByStableIdRef.current;
          const nextQueueStatusByStableId = Object.fromEntries(
            queued.map((item) => [item.clientLogId, item.status] as const),
          );
          for (const item of queued) {
            const previousStatus = previousQueueStatusByStableId[item.clientLogId];
            if (item.status === "syncing" && previousStatus !== "syncing") {
              toast.success("Syncing saved sets...");
              break;
            }
            if (item.status === "failed" && previousStatus !== "failed") {
              toast.error("Could not sync a saved set.");
              break;
            }
          }
          lastQueueStatusByStableIdRef.current = nextQueueStatusByStableId;
          setSets((current) =>
            current.map((set) => {
              const queuedMatch = queued.find((item) => item.clientLogId === set.stableId);
              if (!queuedMatch) {
                return set.queueStatus || set.pending
                  ? {
                      ...set,
                      pending: false,
                      queueStatus: undefined,
                    }
                  : set;
              }
              return {
                ...set,
                queueItemId: queuedMatch.id,
                pending: true,
                queueStatus: queuedMatch.status,
              };
            }),
          );
        });
      },
    });

    engine.start();
    return () => engine.stop();
  }, [sessionExerciseId, syncQueuedSetLogsAction, userId]);

  useEffect(() => {
    let isCancelled = false;

    async function restoreQueuedSets() {
      try {
        const queued = await readQueuedSetLogsBySessionExerciseIdForUser(userId, sessionExerciseId);
        if (isCancelled || queued.length === 0) {
          return;
        }

        setSets((current) => {
          const existingIds = new Set(current.map((set) => set.stableId));
          const nextSetIndex = current.reduce((max, set) => Math.max(max, set.set_index), -1) + 1;
          const restored = queued
            .map(toRestorableQueueSet)
            .filter((item): item is NonNullable<ReturnType<typeof toRestorableQueueSet>> => Boolean(item))
            .filter((item) => !existingIds.has(item.stableId))
            .map((item, index): DisplaySet => ({
              id: item.stableId,
              client_log_id: item.stableId,
              stableId: item.stableId,
              queueItemId: item.queueItemId,
              session_exercise_id: item.sessionExerciseId,
              user_id: "queued",
              set_index: nextSetIndex + index,
              weight: item.payload.weight,
              reps: item.payload.reps,
              duration_seconds: item.payload.durationSeconds,
              distance: item.payload.distance,
              distance_unit: item.payload.distanceUnit,
              calories: item.payload.calories,
              is_warmup: item.payload.isWarmup,
              notes: item.payload.notes,
              rpe: item.payload.rpe,
              weight_unit: item.payload.weightUnit,
              pending: true,
              queueStatus: item.status,
            }));

          if (restored.length === 0) {
            return current;
          }

          return [...current, ...restored];
        });
      } catch {
        // Ignore restore failures to keep logger usable.
      }
    }

    void restoreQueuedSets();

    return () => {
      isCancelled = true;
    };
  }, [sessionExerciseId, userId]);

  const resolvedIsFailure = showFailureToggle && !resolvedIsWarmup && isFailure;
  const isSaveDisabled = isSubmitting || isLogRequestPending;

  const applyQuickLogTargetToInputs = useCallback((target: SessionQuickLogTarget | null | undefined) => {
    if (!target) {
      return false;
    }

    const nextWeight = target.weightMax ?? target.weightMin;
    const nextReps = target.repsMax ?? target.repsMin;
    setWeight(nextWeight !== undefined ? String(nextWeight) : "");
    setReps(nextReps !== undefined ? String(nextReps) : "");
    setDurationInput(target.durationSeconds !== undefined ? formatDurationClock(target.durationSeconds) : "");
    setDistance(target.distance !== undefined ? String(target.distance) : "");
    if (isFitnessDistanceUnit(target.distanceUnit)) {
      setDistanceUnit(target.distanceUnit);
    } else {
      setDistanceUnit(normalizeFitnessDistanceUnit(defaultDistanceUnit, "mi"));
    }
    setCalories(target.calories !== undefined ? String(target.calories) : "");
    if (target.weightUnit === "kg" || target.weightUnit === "lbs") {
      setSelectedWeightUnit(target.weightUnit);
    } else {
      setSelectedWeightUnit(unitLabel === "kg" ? "kg" : "lbs");
    }
    setIsFailure(false);
    setError(null);
    return true;
  }, [defaultDistanceUnit, unitLabel]);

  const applyNextSetFlowTarget = useCallback((setIndex: number) => {
    return applyQuickLogTargetToInputs(setFlowQuickLogTargets?.[setIndex] ?? null);
  }, [applyQuickLogTargetToInputs, setFlowQuickLogTargets]);
  const advanceLoggerAfterOptimisticLog = useCallback((args: {
    nextSetIndex: number;
    presentMetrics: ReturnType<typeof deriveMeasurementPresenceFromValues>;
    sanitizedValues: ReturnType<typeof sanitizeEnabledMeasurementValues>;
    parsedDuration: number | null;
    parsedDistance: number | null;
    parsedCalories: number | null;
    parsedWeight: number;
    parsedReps: number;
    resolvedIsFailure: boolean;
    parsedRpe: number | null;
    resolvedIsWarmup: boolean;
  }) => {
    const appliedNextSetTarget = applyNextSetFlowTarget(args.nextSetIndex + 1);
    if (!appliedNextSetTarget) {
      setDurationInput(args.presentMetrics.time ? formatDurationInput(args.parsedDuration) : (args.sanitizedValues.duration ?? ""));
      setDistance(args.presentMetrics.distance ? (args.parsedDistance === null ? "" : String(args.parsedDistance)) : String(args.sanitizedValues.distance ?? ""));
      setCalories(args.presentMetrics.calories ? (args.parsedCalories === null ? "" : String(args.parsedCalories)) : String(args.sanitizedValues.calories ?? ""));
      setWeight(args.presentMetrics.weight ? String(args.parsedWeight) : String(args.sanitizedValues.weight ?? ""));
      setReps(args.presentMetrics.reps ? (args.resolvedIsFailure ? "" : String(args.parsedReps)) : String(args.sanitizedValues.reps ?? ""));
    }
    setRpe(args.parsedRpe === null ? "" : String(args.parsedRpe));
    setIsFailure(false);
    setIsWarmup(args.resolvedIsWarmup);
  }, [applyNextSetFlowTarget]);
  const releaseLogRequest = useCallback(() => {
    logRequestInFlightRef.current = false;
    setIsLogRequestPending(false);
  }, []);

  const handleLogSet = useCallback(async () => {
    if (logRequestInFlightRef.current) {
      return;
    }

    const presentMetrics = deriveMeasurementPresenceFromValues({
      reps,
      weight,
      duration: durationInput,
      distance,
      calories,
    });
    const sanitizedValues = sanitizeEnabledMeasurementValues(presentMetrics, {
      weight,
      reps,
      duration: durationInput,
      distance,
      calories,
    });
    const parsedWeight = sanitizedValues.weight.trim() ? Number(sanitizedValues.weight) : 0;
    const parsedReps = sanitizedValues.reps.trim() ? Number(sanitizedValues.reps) : 0;
    const parsedDuration = parseDurationInput(sanitizedValues.duration);
    const parsedDistance = sanitizedValues.distance.trim() ? Number(sanitizedValues.distance) : null;
    const parsedCalories = sanitizedValues.calories.trim() ? Number(sanitizedValues.calories) : null;
    const parsedRpe = rpe.trim() ? Number(rpe) : null;

    if (presentMetrics.weight && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) {
      const message = "Weight must be 0 or greater.";
      setError(message);
      toast.error(message);
      return;
    }

    if (presentMetrics.reps && (!Number.isFinite(parsedReps) || parsedReps < 0)) {
      const message = "Reps must be 0 or greater.";
      setError(message);
      toast.error(message);
      return;
    }

    if (parsedDuration !== null && (!Number.isInteger(parsedDuration) || parsedDuration < 0)) {
      const message = "Time must be an integer in seconds.";
      setError(message);
      toast.error(message);
      return;
    }

    if (parsedDistance !== null && (!Number.isFinite(parsedDistance) || parsedDistance < 0)) {
      const message = "Distance must be 0 or greater.";
      setError(message);
      toast.error(message);
      return;
    }

    if (parsedCalories !== null && (!Number.isFinite(parsedCalories) || parsedCalories < 0)) {
      const message = "Calories must be 0 or greater.";
      setError(message);
      toast.error(message);
      return;
    }

    if (parsedRpe !== null && (!Number.isFinite(parsedRpe) || parsedRpe < 0)) {
      const message = "RPE must be 0 or greater.";
      setError(message);
      toast.error(message);
      return;
    }

    setError(null);

    const clientLogId = createStableSetId();
    const failureNote = resolvedIsFailure ? FAILURE_NOTE_SENTINEL : null;
    const nextSetIndex = sets.reduce((max, set) => Math.max(max, set.set_index), -1) + 1;
    const optimisticSet: DisplaySet = {
      id: clientLogId,
      client_log_id: clientLogId,
      stableId: clientLogId,
      session_exercise_id: sessionExerciseId,
      user_id: "pending",
      set_index: nextSetIndex,
      weight: parsedWeight,
      reps: parsedReps,
      duration_seconds: parsedDuration,
      distance: parsedDistance,
      distance_unit: parsedDistance !== null ? distanceUnit : null,
      calories: parsedCalories,
      is_warmup: resolvedIsWarmup,
      notes: failureNote,
      rpe: parsedRpe,
      weight_unit: selectedWeightUnit,
      pending: true,
    };

    flushSync(() => {
      logRequestInFlightRef.current = true;
      setIsSubmitting(true);
      setIsLogRequestPending(true);
      setSets((current) => {
        const next = [...current, optimisticSet];
        latestSetsRef.current = next;
        return next;
      });
    });
    advanceLoggerAfterOptimisticLog({
      nextSetIndex,
      presentMetrics,
      sanitizedValues,
      parsedDuration,
      parsedDistance,
      parsedCalories,
      parsedWeight,
      parsedReps,
      resolvedIsFailure,
      parsedRpe,
      resolvedIsWarmup,
    });
    setIsSubmitting(false);

    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

    if (isOffline) {
      const queued = await enqueueSetLog({
        userId,
        sessionId,
        sessionExerciseId,
        clientLogId,
        payload: {
          weight: parsedWeight,
          reps: parsedReps,
          durationSeconds: parsedDuration,
          distance: parsedDistance,
          distanceUnit: parsedDistance !== null ? distanceUnit : null,
          calories: parsedCalories,
          isWarmup: resolvedIsWarmup,
          rpe: parsedRpe,
          notes: failureNote,
          weightUnit: selectedWeightUnit,
        },
      });

      setSets((current) => {
        const next = current.map((item) =>
          item.stableId === clientLogId
            ? {
                ...item,
                queueItemId: queued?.id ?? item.queueItemId,
                pending: true,
                queueStatus: "queued" as const,
                user_id: "queued",
              }
            : item,
        );
        latestSetsRef.current = next;
        return next;
      });
      const message = queued ? "Offline: set queued for sync." : "Offline: unable to save set locally.";
      setError(message);
      if (queued) {
        toast.success(message);
      } else {
        toast.error(message);
      }
      releaseLogRequest();
      return;
    }

    try {
      const result = await addSetAction({
        sessionId,
        sessionExerciseId,
        weight: parsedWeight,
        reps: parsedReps,
        durationSeconds: parsedDuration,
        distance: parsedDistance,
        distanceUnit: parsedDistance !== null ? distanceUnit : null,
        calories: parsedCalories,
        isWarmup: resolvedIsWarmup,
        rpe: parsedRpe,
        notes: failureNote,
        weightUnit: selectedWeightUnit,
        clientLogId,
      });

      if (!result.ok || !result.data?.set) {
        const queued = await enqueueSetLog({
          userId,
          sessionId,
          sessionExerciseId,
          clientLogId,
          payload: {
            weight: parsedWeight,
            reps: parsedReps,
            durationSeconds: parsedDuration,
            distance: parsedDistance,
            distanceUnit: parsedDistance !== null ? distanceUnit : null,
            calories: parsedCalories,
            isWarmup: resolvedIsWarmup,
            rpe: parsedRpe,
            notes: failureNote,
            weightUnit: selectedWeightUnit,
          },
        });

        setSets((current) => {
          const next = current.map((item) =>
            item.stableId === clientLogId
              ? {
                  ...item,
                  queueItemId: queued?.id ?? item.queueItemId,
                  pending: true,
                  queueStatus: "queued" as const,
                  user_id: "queued",
                }
              : item,
          );
          latestSetsRef.current = next;
          return next;
        });
        const message = queued ? "Could not reach server. Set queued for sync." : (!result.ok ? result.error : "Could not log set.");
        setError(message);
        if (queued) {
          toast.success(message);
        } else {
          toast.error(message);
        }
        releaseLogRequest();
        return;
      }

      const previousSetsBeforePersist = latestSetsRef.current;
      const savedSet = toDisplaySet(result.data!.set);
      const nextSets = previousSetsBeforePersist.some((item) => item.stableId === clientLogId)
        ? previousSetsBeforePersist.map((item) => (item.stableId === clientLogId ? savedSet : item))
        : sortSetsByIndex(mergeByStableSetId(previousSetsBeforePersist, [savedSet]));
      latestSetsRef.current = nextSets;
      setSets(nextSets);
      onSetsChange?.(nextSets);
      const prToast = deriveSimpleSessionPrToast({
        previousSets: previousSetsBeforePersist.filter((item) => item.stableId !== clientLogId),
        candidate: result.data!.set,
        fallbackWeightUnit: unitLabel === "lbs" ? "lbs" : "kg",
      });
      toast.success(prToast ? `Set logged. ${prToast}` : "Set logged.");
    } catch {
      const queued = await enqueueSetLog({
        userId,
        sessionId,
        sessionExerciseId,
        clientLogId,
        payload: {
          weight: parsedWeight,
          reps: parsedReps,
          durationSeconds: parsedDuration,
          distance: parsedDistance,
          distanceUnit: parsedDistance !== null ? distanceUnit : null,
          calories: parsedCalories,
          isWarmup: resolvedIsWarmup,
          rpe: parsedRpe,
          notes: failureNote,
          weightUnit: selectedWeightUnit,
        },
      });
      setSets((current) => {
        const next = current.map((item) =>
          item.stableId === clientLogId
            ? {
                ...item,
                queueItemId: queued?.id ?? item.queueItemId,
                pending: true,
                queueStatus: "queued" as const,
                user_id: "queued",
              }
            : item,
        );
        latestSetsRef.current = next;
        return next;
      });
      const message = queued ? "Request failed. Set queued for sync." : "Could not log set.";
      setError(message);
      if (queued) {
        toast.success(message);
      } else {
        toast.error(message);
      }
      releaseLogRequest();
      return;
    }
    releaseLogRequest();
  }, [
    advanceLoggerAfterOptimisticLog,
    calories,
    distance,
    distanceUnit,
    durationInput,
    resolvedIsFailure,
    resolvedIsWarmup,
    reps,
    rpe,
    selectedWeightUnit,
    sessionExerciseId,
    sessionId,
    setSets,
    sets,
    toast,
    unitLabel,
    userId,
    weight,
    addSetAction,
    releaseLogRequest,
  ]);

  const liveSummaryItems = useMemo(() => {
    const hasVisibleMeasurements = liveSetInputOrder.visibleMetrics.length > 0;
    return getSessionSummaryItems({
      reps: reps.trim() ? Number(reps) : null,
      weight: weight.trim() ? Number(weight) : null,
      weightUnit: selectedWeightUnit,
      durationSeconds: parseDurationInput(durationInput),
      distance: distance.trim() ? Number(distance) : null,
      distanceUnit,
      calories: calories.trim() ? Number(calories) : null,
      failure: resolvedIsFailure,
      rpe: rpe.trim() ? Number(rpe.trim()) : null,
      isWarmup: resolvedIsWarmup,
      emptyLabel: hasVisibleMeasurements ? "Add measurements" : "",
      includeWarmupTag: false,
    }).filter((item) => item.trim().length > 0);
  }, [calories, distance, distanceUnit, durationInput, liveSetInputOrder.visibleMetrics.length, reps, resolvedIsFailure, resolvedIsWarmup, rpe, selectedWeightUnit, weight]);
  const liveLogButtonPrefix = resolvedIsWarmup ? "Log Warm-Up" : (resolvedIsFailure ? "Log Failure" : "Log");
  const liveLogButtonLabel = liveSummaryItems.length > 0 ? `${liveLogButtonPrefix}: ${liveSummaryItems.join(" • ")}` : liveLogButtonPrefix;
  const currentFormState = useMemo<SessionLoggerFormState>(() => ({
    weight,
    reps,
    durationInput,
    distance,
    calories,
    rpe,
    weightUnit: selectedWeightUnit,
    distanceUnit,
    isWarmup: resolvedIsWarmup,
    isFailure,
  }), [calories, distance, distanceUnit, durationInput, isFailure, reps, resolvedIsWarmup, rpe, selectedWeightUnit, weight]);
  const isEditedFromCurrentTarget = useMemo(
    () => !areLoggerFormStatesEqual(currentFormState, canonicalFormState),
    [canonicalFormState, currentFormState],
  );
  const draftQuickLogPayload = useMemo<SessionLoggerDraftQuickLogPayload | null>(() => {
    const presentMetrics = deriveMeasurementPresenceFromValues({
      reps,
      weight,
      duration: durationInput,
      distance,
      calories,
    });
    const sanitizedValues = sanitizeEnabledMeasurementValues(presentMetrics, {
      weight,
      reps,
      duration: durationInput,
      distance,
      calories,
    });
    const parsedWeight = sanitizedValues.weight.trim() ? Number(sanitizedValues.weight) : 0;
    const parsedReps = sanitizedValues.reps.trim() ? Number(sanitizedValues.reps) : 0;
    const parsedDuration = parseDurationInput(sanitizedValues.duration);
    const parsedDistance = sanitizedValues.distance.trim() ? Number(sanitizedValues.distance) : null;
    const parsedCalories = sanitizedValues.calories.trim() ? Number(sanitizedValues.calories) : null;
    const parsedRpe = rpe.trim() ? Number(rpe) : null;

    if (presentMetrics.weight && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) return null;
    if (presentMetrics.reps && (!Number.isFinite(parsedReps) || parsedReps < 0)) return null;
    if (sanitizedValues.duration.trim() && (parsedDuration === null || !Number.isInteger(parsedDuration) || parsedDuration < 0)) return null;
    if (parsedDistance !== null && (!Number.isFinite(parsedDistance) || parsedDistance < 0)) return null;
    if (parsedCalories !== null && (!Number.isFinite(parsedCalories) || parsedCalories < 0)) return null;
    if (parsedRpe !== null && (!Number.isFinite(parsedRpe) || parsedRpe < 0)) return null;

    return {
      weight: parsedWeight,
      reps: parsedReps,
      durationSeconds: parsedDuration,
      distance: parsedDistance,
      distanceUnit: parsedDistance !== null ? distanceUnit : null,
      calories: parsedCalories,
      isWarmup: resolvedIsWarmup,
      rpe: parsedRpe,
      notes: resolvedIsFailure ? FAILURE_NOTE_SENTINEL : null,
      weightUnit: selectedWeightUnit,
    };
  }, [calories, distance, distanceUnit, durationInput, reps, resolvedIsFailure, resolvedIsWarmup, rpe, selectedWeightUnit, weight]);
  const liveGoalLabel = liveSummaryItems.length > 0
    ? liveSummaryItems.join(" • ")
    : (fallbackGoalLabel?.trim() || null);

  useEffect(() => {
    if (!onDraftStateChange || !reportDraftState) {
      return;
    }

    onDraftStateChange({
      goalLabel: liveGoalLabel,
      quickLogLabel: liveLogButtonLabel,
      quickLogPayload: draftQuickLogPayload,
      isEditedFromCurrentTarget,
      didApplyLastTarget,
      copilotFeedbackSignal: copilotSignalState,
      copilotFeedbackNote: normalizeSessionCopilotFeedbackNote(copilotNoteState),
      formState: currentFormState,
    });
  }, [copilotNoteState, copilotSignalState, currentFormState, didApplyLastTarget, draftQuickLogPayload, isEditedFromCurrentTarget, liveGoalLabel, liveLogButtonLabel, onDraftStateChange, reportDraftState]);

  const applyHintValues = useCallback((values: SessionTargetHint["suggestedValues"] | null | undefined) => {
    if (!values) return;

    setWeight(values.weight !== null ? String(values.weight) : "");
    setReps(values.reps !== null ? String(values.reps) : "");
    setDurationInput(values.durationSeconds !== null ? formatDurationClock(values.durationSeconds) : "");
    setDistance(values.distance !== null ? String(values.distance) : "");
    if (isFitnessDistanceUnit(values.distanceUnit)) {
      setDistanceUnit(values.distanceUnit);
    }
    setCalories(values.calories !== null ? String(values.calories) : "");
    if (values.weightUnit === "kg" || values.weightUnit === "lbs") {
      setSelectedWeightUnit(values.weightUnit);
    }
    setError(null);
    toast.success("Applied to current set.");
  }, [toast]);
  async function handleDeleteSet(set: DisplaySet) {
    if (deletingSetIds.includes(set.stableId)) {
      return;
    }

    setDeletingSetIds((current) => current.includes(set.stableId) ? current : [...current, set.stableId]);

    const isQueuedOnlySet = Boolean(set.pending || set.queueStatus) && (set.id === set.stableId || set.user_id === "queued");

    if (isQueuedOnlySet) {
      if (set.queueItemId) {
        await removeSetLogQueueItem(set.queueItemId);
      }
      addDeletedSetIdentityKeys(locallyDeletedSetIdentityKeysRef.current, set);
      setSets((current) => {
        const next = current.filter((item) => item.stableId !== set.stableId);
        latestSetsRef.current = next;
        return next;
      });
      toast.success("Queued set removed.");
      setDeletingSetIds((current) => current.filter((item) => item !== set.stableId));
      return;
    }

    const removalIndex = sets.findIndex((item) => item.stableId === set.stableId);
    if (removalIndex === -1) {
      setDeletingSetIds((current) => current.filter((item) => item !== set.stableId));
      return;
    }

    addDeletedSetIdentityKeys(locallyDeletedSetIdentityKeysRef.current, set);
    setSets((current) => {
      const next = current.filter((item) => item.stableId !== set.stableId);
      latestSetsRef.current = next;
      return next;
    });

    try {
      const result = await deleteSetAction({
        sessionId,
        sessionExerciseId,
        setId: set.id,
      });

      if (!result.ok) {
        removeDeletedSetIdentityKeys(locallyDeletedSetIdentityKeysRef.current, set);
        setSets((current) => {
          if (current.some((item) => item.stableId === set.stableId)) return current;
          const next = [...current];
          next.splice(removalIndex, 0, set);
          latestSetsRef.current = next;
          return next;
        });
        toast.error(result.error || "Could not remove set.");
        return;
      }

      toast.success("Set removed.");
    } finally {
      setDeletingSetIds((current) => current.filter((item) => item !== set.stableId));
    }
  }

  type HistoryRow = {
    key: string;
    label: string;
    showPipe: boolean;
    items: string[];
    dateLabel: string | null;
    applyValues: SessionTargetHint["suggestedValues"] | null;
  };

  const historyRowsSource: Array<HistoryRow | null> = [
    targetHint.lastSummary ? {
      key: "last-time",
      label: "Last",
      showPipe: true,
      applyValues: targetHint.lastSuggestedValues,
      ...formatHistorySummary(targetHint.lastSummary, targetHint.lastPerformedAtLabel),
    } : null,
    targetHint.recentBestSummary && targetHint.recentBestSummary !== targetHint.lastSummary ? {
      key: "recent-best",
      label: "Best",
      showPipe: true,
      applyValues: targetHint.recentBestSuggestedValues,
      ...formatHistorySummary(targetHint.recentBestSummary, targetHint.recentBestPerformedAtLabel),
    } : null,
  ];
  const historyRows = historyRowsSource.filter((value): value is HistoryRow => value !== null && value.items.length > 0);
  const applyLastRow = historyRows.find((row) => row.key === "last-time" && row.applyValues !== null) ?? null;
  const lastTargetButtonLabel = didApplyLastTarget
    ? "Clear Last"
    : (isEditedFromCurrentTarget ? "Resync" : (applyLastRow ? "Use Last" : "No Last Setup"));
  const isLastTargetButtonDisabled = !didApplyLastTarget && !isEditedFromCurrentTarget && !applyLastRow;
  const handleToggleLastTarget = useCallback(() => {
    if (didApplyLastTarget || isEditedFromCurrentTarget) {
      resetLoggerMeasurementInputs();
      setDidApplyLastTarget(false);
      setError(null);
      return;
    }

    if (applyLastRow?.applyValues) {
      applyHintValues(applyLastRow.applyValues);
      setDidApplyLastTarget(true);
    }
  }, [applyHintValues, applyLastRow, didApplyLastTarget, isEditedFromCurrentTarget, resetLoggerMeasurementInputs]);
  const attachedLoggerActionStrip = useMemo(
    () => (
      <AttachedCardActionStripFrame
        className="rounded-none border-x-0 border-b-0 border-t-[rgb(var(--accent-divider-rgb)/0.3)] bg-[rgb(var(--surface-1-rgb)/0.18)]"
        gridClassName="grid-cols-[minmax(108px,0.78fr)_minmax(0,1.92fr)]"
      >
        <button
          type="button"
          onClick={handleToggleLastTarget}
          disabled={isLastTargetButtonDisabled}
          data-bottom-action-intent="info"
          className={cn(
            getAttachedCardActionButtonClassName({
              intent: "info",
              className: "!h-12 rounded-bl-[var(--card-radius)] !border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)] focus-visible:ring-[rgb(var(--secondary-action-rgb)/0.2)]",
            }),
            isLastTargetButtonDisabled
              ? "border-r-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-muted)/0.92)] text-[rgb(var(--text-muted)/0.82)] shadow-none"
              : undefined,
          )}
        >
          <span className="bottom-action__label">
            {lastTargetButtonLabel}
          </span>
        </button>
        <button
          type="button"
          onClick={handleLogSet}
          disabled={isSaveDisabled}
          data-bottom-action-intent="positive"
          className={cn(
            getAttachedCardActionButtonClassName({
              intent: "positive",
              className: "!h-12 rounded-br-[var(--card-radius)] focus-visible:ring-[rgb(var(--accent)/0.24)]",
            }),
            isSaveDisabled
              ? "border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-muted)/0.92)] text-[rgb(var(--text-muted)/0.82)] shadow-none"
              : undefined,
          )}
        >
          <span className="bottom-action__label">
            {liveLogButtonLabel}
          </span>
        </button>
      </AttachedCardActionStripFrame>
    ),
    [handleLogSet, handleToggleLastTarget, isLastTargetButtonDisabled, isSaveDisabled, lastTargetButtonLabel, liveLogButtonLabel],
  );
  const measurementAuxiliaryFields = useMemo<MeasurementPanelAuxiliaryField[]>(() => {
    const warmupField: MeasurementPanelAuxiliaryField = {
      title: "Warm-Up",
      input: null,
      inlineLabel: "WARM-UP",
      useInlineFieldShell: false,
      showEmptyValue: false,
      hasValue: true,
      renderInput: () => (
        <div className={cn(GLOW_SWITCH_MEASUREMENT_ROW_WRAPPER_CLASS_NAME, "top-[6px]")}>
          <GlowSwitch
            checked={resolvedIsWarmup}
            ariaLabel={resolvedIsWarmup ? "Warm-up set enabled" : "Working set enabled"}
            onLabel="Warm-Up"
            offLabel="Working"
            onClick={() => {
              const nextWarmup = !resolvedIsWarmup;
              setIsWarmup(nextWarmup);
              if (nextWarmup) {
                setIsFailure(false);
              }
            }}
            className={GLOW_SWITCH_STANDARD_CLASS_NAME}
            stateClassName={GLOW_SWITCH_STANDARD_STATE_CLASS_NAME}
          />
        </div>
      ),
    };

    const fields: MeasurementPanelAuxiliaryField[] = showWarmupToggle ? [warmupField] : [];

    if (showFailureToggle) {
      fields.push({
        title: "Reps / Failure",
        input: null,
        inlineLabel: "REPS / FAILURE",
        useInlineFieldShell: false,
        showEmptyValue: false,
        hasValue: true,
        renderInput: () => (
          <div className={cn(GLOW_SWITCH_MEASUREMENT_ROW_WRAPPER_CLASS_NAME, "top-[6px]")}>
            <GlowSwitch
              checked={resolvedIsFailure}
              ariaLabel={resolvedIsFailure ? "Failure target enabled" : "Failure target disabled"}
              onLabel="Failure"
              offLabel="Reps"
              onClick={() => {
                setIsFailure((current) => {
                  const nextValue = !current;
                  if (nextValue) {
                    setIsWarmup(false);
                  }
                  return nextValue;
                });
                if (!resolvedIsFailure) {
                  setReps("");
                }
              }}
              className={GLOW_SWITCH_STANDARD_CLASS_NAME}
              stateClassName={GLOW_SWITCH_STANDARD_STATE_CLASS_NAME}
            />
          </div>
        ),
      });
    }

    return fields;
  }, [resolvedIsFailure, resolvedIsWarmup, showFailureToggle, showWarmupToggle]);
  const persistCopilotFeedback = useCallback(async (
    nextSignal: SessionCopilotFeedbackSignal | null,
    nextNote: string,
    revertOnError = true,
  ) => {
    if (!updateCopilotFeedbackAction) {
      return true;
    }

    const normalizedSignal = normalizeSessionCopilotFeedbackSignal(nextSignal);
    const normalizedNote = normalizeSessionCopilotFeedbackNote(nextNote);
    setIsSavingCopilotFeedback(true);

    try {
      const result = await updateCopilotFeedbackAction({
        sessionId,
        sessionExerciseId,
        signal: normalizedSignal,
        note: normalizedNote,
      });

      if (!result.ok) {
        if (revertOnError) {
          setCopilotSignalState(committedCopilotSignalRef.current);
          setCopilotNoteState(committedCopilotNoteRef.current ?? "");
        }
        toast.error(result.error || "Could not save session feedback.");
        return false;
      }

      const committedSignal = normalizeSessionCopilotFeedbackSignal(result.data?.signal ?? normalizedSignal);
      const committedNote = normalizeSessionCopilotFeedbackNote(result.data?.note ?? normalizedNote);
      committedCopilotSignalRef.current = committedSignal;
      committedCopilotNoteRef.current = committedNote;
      setCopilotSignalState(committedSignal);
      setCopilotNoteState(committedNote ?? "");
      return true;
    } catch {
      if (revertOnError) {
        setCopilotSignalState(committedCopilotSignalRef.current);
        setCopilotNoteState(committedCopilotNoteRef.current ?? "");
      }
      toast.error("Could not save session feedback.");
      return false;
    } finally {
      setIsSavingCopilotFeedback(false);
    }
  }, [sessionExerciseId, sessionId, toast, updateCopilotFeedbackAction]);
  const handleCopilotSignalPress = useCallback(async (signal: SessionCopilotFeedbackSignal) => {
    const nextSignal = copilotSignalState === signal ? null : signal;
    setCopilotSignalState(nextSignal);
    await persistCopilotFeedback(nextSignal, copilotNoteState);
  }, [copilotNoteState, copilotSignalState, persistCopilotFeedback]);
  const handleCopilotNoteCommit = useCallback(async () => {
    const normalizedNote = normalizeSessionCopilotFeedbackNote(copilotNoteState);
    const committedSignal = committedCopilotSignalRef.current;
    const committedNote = committedCopilotNoteRef.current;
    if (copilotSignalState === committedSignal && normalizedNote === committedNote) {
      return;
    }
    await persistCopilotFeedback(copilotSignalState, normalizedNote ?? "");
  }, [copilotNoteState, copilotSignalState, persistCopilotFeedback]);
  const hasCopilotNote = copilotNoteState.trim().length > 0;
  const shouldShowCopilotNoteInput = Boolean(copilotSignalState) || hasCopilotNote;
  const copilotWhyLabel = targetHint.reason.trim();
  const isCopilotFeedbackDirty = copilotSignalState !== committedCopilotSignalRef.current
    || normalizeSessionCopilotFeedbackNote(copilotNoteState) !== committedCopilotNoteRef.current;

  const loggedSetList = sets.length > 0 ? (
    <div
      className={cn(
        appTokens.currentSessionLoggerSetList,
        "relative min-h-0 overflow-hidden rounded-[0.95rem]",
      )}
      data-testid="set-logger-set-list"
    >
      <VerticalScrollHint scrollClassName="filter-scroll-viewport max-h-[10.1rem] py-1">
        <ul className={cn(appTokens.currentSessionFocusList, "text-sm")}>
          {animatedSets.map((set, index) => {
            const isDeletePending = deletingSetIds.includes(set.stableId);
            return (
            <li
              key={set.stableId}
              className={[
                "origin-top transition-all duration-75 ease-out motion-reduce:transition-none",
                set.isLeaving
                  ? "pointer-events-none max-h-0 scale-[0.98] opacity-0"
                  : "max-h-28 scale-100 opacity-100",
              ].join(" ")}
              aria-hidden={set.isLeaving ? "true" : undefined}
            >
              <LoggedSetSummaryRow
                label={formatLoggedSetRowLabel({
                  index,
                  isWarmup: set.is_warmup,
                  useIntervalLanguage,
                })}
                summary=""
                balanceActionSpace
                showBottomSeparator
                summaryItems={getSessionSummaryItems({
                  reps: set.reps,
                  weight: set.weight,
                  weightUnit: set.weight_unit ?? unitLabel,
                  durationSeconds: set.duration_seconds,
                  distance: set.distance,
                  distanceUnit: set.distance_unit,
                  calories: set.calories,
                  failure: !set.is_warmup && set.notes === FAILURE_NOTE_SENTINEL,
                  rpe: set.rpe,
                  isWarmup: set.is_warmup,
                  queueStatus: set.queueStatus,
                  pending: set.pending,
                  emptyLabel: "No measurements",
                  includeWarmupTag: false,
                })}
                actionClassName="items-center self-center bg-transparent pl-2 pr-0"
                action={(
                  <button
                    type="button"
                    onClick={() => {
                      void handleDeleteSet(set);
                    }}
                    disabled={set.isLeaving || isDeletePending}
                    aria-label={`Delete ${useIntervalLanguage ? "interval" : "set"} ${index + 1}`}
                    data-bottom-action-intent="danger"
                    className={cn(
                      getBottomActionButtonClassName({
                        intent: "danger",
                        fullWidth: false,
                        className: "!h-6 !min-h-0 rounded-full !px-4 text-[12px] font-semibold tracking-[0.04em]",
                      }),
                      "shrink-0 self-center",
                      isDeletePending ? "opacity-75" : undefined,
                      tapFeedbackClass,
                    )}
                  >
                    <span className="bottom-action__label">{isDeletePending ? "Deleting..." : "Delete"}</span>
                  </button>
                )}
              />
            </li>
            );
          })}
        </ul>
      </VerticalScrollHint>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 bottom-0 h-px rounded-full bg-[rgb(var(--accent-divider-rgb)/0.82)]"
      />
    </div>
  ) : null;

  return (
    <div
      className={cn(
        appTokens.currentSessionLoggerStack,
        "relative flex flex-col",
      )}
      data-testid="set-logger-card"
    >
      {/* Manual QA checklist:
          - Add/exercise metric hints are visible inside input boxes
          - No Set Timer UI remains; duration logging still works via mm:ss
          - RPE tooltip does not reserve blank space when closed
          - Save button remains stable while toggling measurements */}

      {loggedSetList}

      <div className="relative z-[1] mt-2 overflow-hidden rounded-[1.05rem] border border-[rgb(var(--accent-divider-rgb)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.16)]">
        <WorkoutEntrySection
          className={cn(
            appTokens.currentSessionLoggerPanel,
            "relative !space-y-0 !rounded-b-none !border-0 bg-transparent !p-0 shadow-none backdrop-blur-0",
          )}
          contentClassName="!space-y-0"
        >
          <MeasurementPanelV2
            values={{
              reps,
              weight,
              duration: durationInput,
              distance,
              calories,
              weightUnit: selectedWeightUnit,
              distanceUnit,
            }}
            activeMetrics={liveMeasurementMetrics}
            isExpanded={isMetricsExpanded}
            onExpandedChange={setIsMetricsExpanded}
            onMetricToggle={undefined}
            onChange={(patch) => {
              if (patch.reps !== undefined) setReps(patch.reps);
              if (patch.weight !== undefined) setWeight(patch.weight);
              if (patch.duration !== undefined) setDurationInput(patch.duration);
              if (patch.distance !== undefined) setDistance(patch.distance);
              if (patch.calories !== undefined) {
                const nextCaloriesValue = patch.calories;
                setCalories((current) => {
                  const currentCalories = current.trim();
                  const nextCalories = nextCaloriesValue.trim();
                  const lastAutoEstimatedCalories = lastAutoEstimatedCaloriesRef.current;

                  if (currentCalories !== nextCalories) {
                    if (nextCalories === "" && currentCalories === lastAutoEstimatedCalories) {
                      didDismissAutoEstimatedCaloriesRef.current = true;
                    } else if (nextCalories.length > 0 && nextCalories !== lastAutoEstimatedCalories) {
                      didDismissAutoEstimatedCaloriesRef.current = true;
                    } else if (nextCalories === lastAutoEstimatedCalories) {
                      didDismissAutoEstimatedCaloriesRef.current = false;
                    }
                  }

                  return nextCaloriesValue;
                });
              }
              if (patch.weightUnit !== undefined) setSelectedWeightUnit(patch.weightUnit);
              if (patch.distanceUnit !== undefined) setDistanceUnit(patch.distanceUnit);
            }}
            className={tapFeedbackClass}
            showInnerHeader={false}
            layoutMode="horizontal-scroll"
            labelTreatment="floating-border"
            metricLabelOverrides={{
              time: "Time (s)",
              distance: `Dist (${distanceUnit})`,
            }}
            visibleMetrics={liveSetInputOrder.visibleMetrics}
            metricOrder={liveSetInputOrder.metricOrder}
            dimmedMetrics={liveSetInputOrder.dimmedMetrics}
            rpe={rpe}
            onRpeChange={setRpe}
            auxiliaryFields={measurementAuxiliaryFields}
            footerContent={null}
            showInlineStepControls
          />
          <div className="border-t border-[rgb(var(--accent-divider-rgb)/0.16)] px-3 pb-2 pt-2.5">
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--accent)/0.82)]">
                  Session Copilot
                </p>
                <p className="text-[11px] leading-[1.35] text-[rgb(var(--text-muted)/0.92)]">
                  {copilotWhyLabel}
                </p>
              </div>

              <HorizontalScrollHint
                scrollClassName="hide-scrollbar -mx-0.5 overflow-x-auto overflow-y-visible px-0.5 pb-1 [touch-action:pan-x] [-webkit-overflow-scrolling:touch]"
                contentClassName="flex min-w-max items-center gap-2 pr-0.5"
              >
                {SESSION_COPILOT_FEEDBACK_SIGNALS.map((signal) => {
                  const isSelected = copilotSignalState === signal;
                  return (
                    <ChipButton
                      key={signal}
                      type="button"
                      tone={isSelected ? getSessionCopilotFeedbackTone(signal) : "default"}
                      aria-pressed={isSelected}
                      disabled={isSavingCopilotFeedback}
                      className={cn(
                        "whitespace-nowrap px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition-[border-color,background-color,box-shadow,color,transform] duration-150",
                        isSelected ? "translate-y-[-1px]" : undefined,
                        isSelected ? getCopilotFeedbackSelectedClassName(signal) : undefined,
                        !isSelected ? "text-[rgb(var(--text-muted)/0.92)]" : undefined,
                      )}
                      onClick={() => {
                        void handleCopilotSignalPress(signal);
                      }}
                    >
                      {formatSessionCopilotFeedbackLabel(signal)}
                    </ChipButton>
                  );
                })}
              </HorizontalScrollHint>

              {shouldShowCopilotNoteInput ? (
                <div className="space-y-1">
                  <label
                    htmlFor={`session-copilot-note-${sessionExerciseId}`}
                    className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgb(var(--text-muted)/0.88)]"
                  >
                    Copilot note
                  </label>
                  <input
                    id={`session-copilot-note-${sessionExerciseId}`}
                    type="text"
                    value={copilotNoteState}
                    maxLength={SESSION_COPILOT_FEEDBACK_NOTE_MAX_LENGTH}
                    disabled={isSavingCopilotFeedback}
                    placeholder="Optional context for this set or exercise"
                    className="w-full rounded-[0.85rem] border border-[rgb(var(--accent-divider-rgb)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.52)] px-3 py-2 text-[12px] leading-[1.2] text-[rgb(var(--text)/0.97)] outline-none transition focus:border-[rgb(var(--accent)/0.34)] focus:bg-[rgb(var(--surface-1-rgb)/0.66)]"
                    onChange={(event) => {
                      setCopilotNoteState(event.currentTarget.value);
                    }}
                    onBlur={() => {
                      void handleCopilotNoteCommit();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }
                    }}
                  />
                </div>
              ) : null}

              <div className="flex min-h-[14px] items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.72)]">
                <span>{isSavingCopilotFeedback ? "Saving feedback..." : (isCopilotFeedbackDirty ? "Unsaved feedback" : "Feedback saved")}</span>
                <span>{copilotNoteState.length}/{SESSION_COPILOT_FEEDBACK_NOTE_MAX_LENGTH}</span>
              </div>
            </div>
          </div>
          {error ? <p className={appTokens.routineEditorAutosaveErrorText}>{error}</p> : null}
        </WorkoutEntrySection>

        {attachedLoggerActionStrip}
      </div>
    </div>
  );
}
