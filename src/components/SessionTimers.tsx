"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { SetRow } from "@/types/db";
import {
  enqueueSetLog,
  readQueuedSetLogsBySessionExerciseIdForUser,
  removeSetLogQueueItem,
  type SetLogQueueItem,
} from "@/lib/offline/set-log-queue";
import { createSetLogSyncEngine } from "@/lib/offline/sync-engine";
import {
  createStableSetId,
  mergeByStableSetId,
  resolveStableSetId,
  sortSetsByIndex,
  toRestorableQueueSet,
} from "@/lib/offline/set-log-reconciliation";
import { buildSessionDraftStorageKey, isOfflineSnapshotStale } from "@/lib/offline/client-storage";
import { useToast } from "@/components/ui/ToastProvider";
import { BottomActionDock, DockButton } from "@/components/layout/BottomActionDock";
import { BottomActionTriad } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { getBottomActionButtonClassName } from "@/components/layout/bottomActionIntents";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { ACTION_CHROME_CONTROL_CLASS_NAME, ACTION_CHROME_SEGMENTED_CLASS_NAME } from "@/components/ui/actionChrome";
import { SignatureInlineList } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { ChevronDownIcon } from "@/components/ui/Chevrons";
import { MeasurementPanelV2 } from "@/components/ui/measurements/MeasurementPanelV2";
import { WorkoutEntrySection } from "@/components/ui/workout-entry/EntrySection";
import { LoggedSetSummaryRow } from "@/components/ui/workout-entry/LoggedSetSummaryRow";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import { formatDurationClock } from "@/lib/duration";
import { getLiveSetInputOrder, type LiveSetMetricFlags } from "@/lib/live-set-input-order";
import { formatMeasurementSummaryItems, formatSetPositionLabel } from "@/lib/measurement-display";
import { deriveMeasurementPresenceFromValues, sanitizeEnabledMeasurementValues } from "@/lib/measurement-sanitization";
import {
  addDeletedSetIdentityKeys,
  filterDeletedDisplaySets,
  removeDeletedSetIdentityKeys,
} from "@/lib/session-deleted-set-identities";
import { deriveSimpleSessionPrToast } from "@/lib/session-set-entry";
import { CurrentSessionProgressionSurface } from "@/components/session/CurrentSessionProgressionSurface";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import type { SessionTargetHint } from "@/lib/session-target-hints";
import { toQuickLogTargetFromSuggestedValues, type SessionQuickLogTarget } from "@/lib/session-quick-log";
import {
  appendProgressionPlaybookFormData,
  buildProgressionPlaybookConfigFromFormState,
  buildProgressionPlaybookFormSnapshot,
  type ProgressionPlaybookFormState,
} from "@/lib/progression-playbook-form-state";
import { estimateCaloriesFromExerciseMetrics, resolveCaloriesEstimationMethod, type CalorieEstimationExerciseInput } from "@/lib/calorie-estimation";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import { type PromotionStepFieldId } from "@/lib/session-progression-display";
import type { ActionResult } from "@/lib/action-result";
import { getNextPublishedSetCount } from "@/components/session/setCountSync";
import { cn } from "@/lib/cn";
import { isFitnessDistanceUnit, normalizeFitnessDistanceUnit, type FitnessDistanceUnit } from "@/lib/fitness-distance-units";

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

const FAILURE_NOTE_SENTINEL = "__session_failure__";

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

function mergeDisplaySets(baseSets: DisplaySet[], incomingSets: DisplaySet[]) {
  return sortSetsByIndex(mergeByStableSetId(incomingSets, baseSets));
}

function toDisplaySet(set: SetRow): DisplaySet {
  return {
    ...set,
    stableId: resolveStableSetId(set),
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

export function SetLoggerCard({
  userId,
  sessionId,
  sessionExerciseId,
  addSetAction,
  syncQueuedSetLogsAction,
  unitLabel,
  initialSets,
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
  resetSignal,
  secondaryActionLabel,
  onSecondaryAction,
  warmupValue,
  onWarmupValueChange,
  progressionFormState,
  progressionStepPolicy,
  visiblePromotionStepFields,
  progressionSelectedMetrics,
  calorieEstimationExercise,
  showAllMeasurementInputs = false,
  showFailureToggle = false,
  showProgressionControls = true,
  updateProgressionAction,
  bottomDockCenter,
}: {
  userId: string;
  sessionId: string;
  sessionExerciseId: string;
  addSetAction: (payload: AddSetPayload) => Promise<AddSetActionResult>;
  syncQueuedSetLogsAction: (payload: {
    items: SetLogQueueItem[];
  }) => Promise<ActionResult<{ results: Array<{ queueItemId: string; ok: boolean; serverSetId?: string; error?: string }> }>>;
  unitLabel: string;
  initialSets: SetRow[];
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
  resetSignal?: number;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => Promise<void> | void;
  warmupValue?: boolean;
  onWarmupValueChange?: (value: boolean) => void;
  progressionFormState?: ProgressionPlaybookFormState | null;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  visiblePromotionStepFields?: PromotionStepFieldId[] | null;
  progressionSelectedMetrics?: Array<"reps" | "weight" | "time" | "distance" | "calories">;
  calorieEstimationExercise?: CalorieEstimationExerciseInput | null;
  showAllMeasurementInputs?: boolean;
  showFailureToggle?: boolean;
  showProgressionControls?: boolean;
  updateProgressionAction?: (formData: FormData) => Promise<ActionResult>;
  bottomDockCenter?: ReactNode;
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
  const [progressionDraft, setProgressionDraft] = useState<ProgressionPlaybookFormState | null>(progressionFormState ?? null);
  const [progressionSaveError, setProgressionSaveError] = useState<string | null>(null);
  const resolvedIsWarmup = warmupValue ?? isWarmup;

  const setWarmupValue = useCallback((value: boolean) => {
    if (onWarmupValueChange) {
      onWarmupValueChange(value);
      return;
    }
    setIsWarmup(value);
  }, [onWarmupValueChange]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLogRequestPending, setIsLogRequestPending] = useState(false);
  const incomingProgressionSnapshot = useMemo(
    () => progressionFormState ? buildProgressionPlaybookFormSnapshot(progressionFormState) : null,
    [progressionFormState],
  );
  const lastSavedProgressionSnapshotRef = useRef<string | null>(incomingProgressionSnapshot);
  const lastIncomingProgressionSnapshotRef = useRef<string | null>(incomingProgressionSnapshot);
  const lastFailedProgressionSnapshotRef = useRef<string | null>(null);
  const [isSecondaryPending, setIsSecondaryPending] = useState(false);
  const [sets, setSets] = useState<DisplaySet[]>(() => initialSets.map(toDisplaySet));
  const [animatedSets, setAnimatedSets] = useState<AnimatedDisplaySet[]>(() => initialSets.map(toDisplaySet));
  const [deletingSetIds, setDeletingSetIds] = useState<string[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);
  const lastPublishedSetCountRef = useRef<number | null>(initialSets.length);
  const draftStorageWriteTimeoutRef = useRef<number | null>(null);
  const draftStorageSnapshotRef = useRef<{ key: string; payload: string } | null>(null);
  const lastQueueStatusByStableIdRef = useRef<Record<string, SetLogQueueItem["status"] | undefined>>({});
  const locallyDeletedSetIdentityKeysRef = useRef<Set<string>>(new Set());
  const logRequestInFlightRef = useRef(false);
  const prefillWeight = prefill?.weight;
  const prefillReps = prefill?.reps;
  const prefillDurationSeconds = prefill?.durationSeconds;
  const prefillWeightUnit = prefill?.weightUnit;

  const toast = useToast();
  const currentLiveQuickLogTarget = useMemo(
    () => setFlowQuickLogTargets?.[sets.length] ?? toQuickLogTargetFromSuggestedValues(targetHint.suggestedValues),
    [setFlowQuickLogTargets, sets.length, targetHint.suggestedValues],
  );
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

  const resetLoggerMeasurementInputs = useCallback(() => {
    setWeight(prefillWeight !== undefined ? String(prefillWeight) : "");
    setSelectedWeightUnit(prefillWeightUnit ?? (unitLabel === "kg" ? "kg" : "lbs"));
    setReps(prefillReps !== undefined ? String(prefillReps) : "");
    setDurationInput(prefillDurationSeconds !== undefined ? formatDurationClock(prefillDurationSeconds) : "");
    setDistance("");
    setDistanceUnit(normalizeFitnessDistanceUnit(defaultDistanceUnit, "mi"));
    setCalories("");
  }, [defaultDistanceUnit, prefillDurationSeconds, prefillReps, prefillWeight, prefillWeightUnit, unitLabel]);

  useEffect(() => {
    resetLoggerMeasurementInputs();
    setRpe("");
    setWarmupValue(false);
    setIsFailure(false);
    setDidApplyLastTarget(false);
    setError(null);
    locallyDeletedSetIdentityKeysRef.current = new Set();
    const nextDisplaySets = filterDeletedDisplaySets(initialSets.map(toDisplaySet), locallyDeletedSetIdentityKeysRef.current);
    setSets(nextDisplaySets);
    setAnimatedSets(nextDisplaySets);
    lastPublishedSetCountRef.current = nextDisplaySets.length;
  }, [initialSets, resetLoggerMeasurementInputs, sessionExerciseId, setWarmupValue]);

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
    const nextDisplaySets = filterDeletedDisplaySets(initialSets.map(toDisplaySet), locallyDeletedSetIdentityKeysRef.current);
    setSets((current) => mergeDisplaySets(current, nextDisplaySets));
  }, [initialSets, sessionExerciseId]);

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
    const storageKey = buildSessionDraftStorageKey(userId, sessionId, sessionExerciseId);
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        sets?: DisplaySet[];
  form?: { weight?: string; reps?: string; durationSeconds?: string; distance?: string; distanceUnit?: FitnessDistanceUnit; calories?: string; rpe?: string; isWarmup?: boolean; isFailure?: boolean; selectedWeightUnit?: "lbs" | "kg" };
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
        setSets(mergeDisplaySets(
          filterDeletedDisplaySets(initialSets.map(toDisplaySet), locallyDeletedSetIdentityKeysRef.current),
          filterDeletedDisplaySets(storedSets, locallyDeletedSetIdentityKeysRef.current),
        ));
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
        if (typeof parsed.form.isWarmup === "boolean") setWarmupValue(parsed.form.isWarmup);
        if (typeof parsed.form.isFailure === "boolean") setIsFailure(parsed.form.isFailure);
        if (parsed.form.selectedWeightUnit === "kg" || parsed.form.selectedWeightUnit === "lbs") {
          setSelectedWeightUnit(parsed.form.selectedWeightUnit);
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [initialSets, sessionExerciseId, sessionId, setWarmupValue, userId]);

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
      },
      updatedAt: Date.now(),
    });

    draftStorageSnapshotRef.current = { key: storageKey, payload };
    if (draftStorageWriteTimeoutRef.current !== null) {
      window.clearTimeout(draftStorageWriteTimeoutRef.current);
    }
    draftStorageWriteTimeoutRef.current = window.setTimeout(() => {
      const pendingWrite = draftStorageSnapshotRef.current;
      if (!pendingWrite) {
        return;
      }
      window.localStorage.setItem(pendingWrite.key, pendingWrite.payload);
      if (draftStorageSnapshotRef.current?.key === pendingWrite.key && draftStorageSnapshotRef.current?.payload === pendingWrite.payload) {
        draftStorageSnapshotRef.current = null;
      }
      draftStorageWriteTimeoutRef.current = null;
    }, 180);

    return () => {
      if (draftStorageWriteTimeoutRef.current !== null) {
        window.clearTimeout(draftStorageWriteTimeoutRef.current);
      }
    };
  }, [calories, distance, distanceUnit, durationInput, isFailure, reps, resolvedIsWarmup, rpe, selectedWeightUnit, sessionExerciseId, sessionId, sets, userId, weight]);

  useEffect(() => () => {
    if (draftStorageWriteTimeoutRef.current !== null) {
      window.clearTimeout(draftStorageWriteTimeoutRef.current);
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

  useEffect(() => {
    if (!incomingProgressionSnapshot || !progressionFormState) {
      return;
    }

    if (incomingProgressionSnapshot === lastIncomingProgressionSnapshotRef.current) {
      return;
    }

    lastIncomingProgressionSnapshotRef.current = incomingProgressionSnapshot;
    lastSavedProgressionSnapshotRef.current = incomingProgressionSnapshot;
    lastFailedProgressionSnapshotRef.current = null;
    setProgressionDraft(progressionFormState);
    setProgressionSaveError(null);
  }, [incomingProgressionSnapshot, progressionFormState]);

  const progressionDraftSnapshot = useMemo(
    () => progressionDraft ? buildProgressionPlaybookFormSnapshot(progressionDraft) : null,
    [progressionDraft],
  );
  const canPersistProgressionDraft = useMemo(
    () => progressionDraft ? (progressionDraft.progressionPlaybookId === "" || buildProgressionPlaybookConfigFromFormState(progressionDraft) !== null) : false,
    [progressionDraft],
  );

  useEffect(() => {
    if (!updateProgressionAction || !progressionDraft || !progressionDraftSnapshot || !routineDayExerciseId) {
      return;
    }

    if (
      !canPersistProgressionDraft
      || progressionDraftSnapshot === lastSavedProgressionSnapshotRef.current
      || progressionDraftSnapshot === lastFailedProgressionSnapshotRef.current
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("sessionExerciseId", sessionExerciseId);
      formData.set("exerciseRowId", routineDayExerciseId);
      appendProgressionPlaybookFormData(formData, progressionDraft);

      void updateProgressionAction(formData).then((result) => {
        if (!result.ok) {
          lastFailedProgressionSnapshotRef.current = progressionDraftSnapshot;
          setProgressionSaveError(result.error || "Could not save progression.");
          toast.error(result.error || "Could not save progression.");
          return;
        }

        lastSavedProgressionSnapshotRef.current = progressionDraftSnapshot;
        lastFailedProgressionSnapshotRef.current = null;
        setProgressionSaveError(null);
      });
    }, 280);

    return () => window.clearTimeout(timeout);
  }, [
    canPersistProgressionDraft,
    progressionDraft,
    progressionDraftSnapshot,
    routineDayExerciseId,
    sessionExerciseId,
    sessionId,
    toast,
    updateProgressionAction,
  ]);

  const resolvedIsFailure = showFailureToggle && !resolvedIsWarmup && isFailure;
  const isSaveDisabled = isSubmitting || isLogRequestPending;

  const resetLoggerState = useCallback(() => {
    setDurationInput("");
    if (liveSetInputOrder.visibleMetrics.includes("reps")) {
      setReps("");
    }
  }, [liveSetInputOrder.visibleMetrics]);

  useEffect(() => {
    if (!resetSignal) {
      return;
    }

    resetLoggerState();
  }, [resetLoggerState, resetSignal]);

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
    setWarmupValue(args.resolvedIsWarmup);
  }, [applyNextSetFlowTarget, setWarmupValue]);
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
      setSets((current) => [...current, optimisticSet]);
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

      setSets((current) =>
        current.map((item) =>
          item.stableId === clientLogId
            ? {
                ...item,
                queueItemId: queued?.id ?? item.queueItemId,
                pending: true,
                queueStatus: "queued",
                user_id: "queued",
              }
            : item,
        ),
      );
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

        setSets((current) =>
          current.map((item) =>
            item.stableId === clientLogId
              ? {
                  ...item,
                  queueItemId: queued?.id ?? item.queueItemId,
                  pending: true,
                  queueStatus: "queued",
                  user_id: "queued",
                }
              : item,
          ),
        );
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

      setSets((current) => current.map((item) => (item.stableId === clientLogId ? toDisplaySet(result.data!.set) : item)));
      const prToast = deriveSimpleSessionPrToast({
        previousSets: sets,
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
      setSets((current) =>
        current.map((item) =>
          item.stableId === clientLogId
            ? {
                ...item,
                queueItemId: queued?.id ?? item.queueItemId,
                pending: true,
                queueStatus: "queued",
                user_id: "queued",
              }
            : item,
        ),
      );
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
    setWarmupValue,
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
  const saveSetPrimaryActions = useMemo(
    () => bottomDockCenter ? (
      <BottomActionTriad
        className="max-w-full overflow-x-clip grid-cols-[minmax(84px,0.72fr)_minmax(6.5rem,7.8rem)_minmax(0,1.16fr)]"
        tertiaryClassName="[&>*]:max-w-[7.35rem]"
        secondary={onSecondaryAction ? (
          <BottomDockButton
            type="button"
            intent="toggleActive"
            className="!min-h-[44px]"
            disabled={isSecondaryPending}
            onClick={async () => {
              setIsSecondaryPending(true);
              try {
                await onSecondaryAction();
              } finally {
                setIsSecondaryPending(false);
              }
            }}
          >
            {isSecondaryPending ? "Opening..." : (secondaryActionLabel ?? "View")}
          </BottomDockButton>
        ) : <div aria-hidden="true" />}
        tertiary={bottomDockCenter}
        primary={(
          <BottomDockButton type="button" onClick={handleLogSet} disabled={isSaveDisabled} intent="positive" className="!min-h-[44px]">
            {liveLogButtonLabel}
          </BottomDockButton>
        )}
      />
    ) : (
      <BottomActionDock
        left={onSecondaryAction ? (
          <DockButton
            type="button"
            intent="toggleActive"
            disabled={isSecondaryPending}
            onClick={async () => {
              setIsSecondaryPending(true);
              try {
                await onSecondaryAction();
              } finally {
                setIsSecondaryPending(false);
              }
            }}
          >
            {isSecondaryPending ? "Opening..." : (secondaryActionLabel ?? "View")}
          </DockButton>
        ) : <div aria-hidden="true" />}
        right={(
          <DockButton type="button" onClick={handleLogSet} disabled={isSaveDisabled} intent="positive">
            <span className="bottom-action__label">{liveLogButtonLabel}</span>
          </DockButton>
        )}
      />
    ),
    [bottomDockCenter, handleLogSet, isSaveDisabled, isSecondaryPending, liveLogButtonLabel, onSecondaryAction, secondaryActionLabel],
  );
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

    if (set.pending || set.queueStatus) {
      if (set.queueItemId) {
        await removeSetLogQueueItem(set.queueItemId);
      }
      addDeletedSetIdentityKeys(locallyDeletedSetIdentityKeysRef.current, set);
      setSets((current) => current.filter((item) => item.stableId !== set.stableId));
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
    setSets((current) => current.filter((item) => item.stableId !== set.stableId));

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
  const progressionInlineControls = showProgressionControls && progressionDraft && routineDayExerciseId ? (
    <CurrentSessionProgressionSurface
      draft={progressionDraft}
      onChange={(nextValue) => {
        lastFailedProgressionSnapshotRef.current = null;
        setProgressionDraft(nextValue);
        setProgressionSaveError(null);
      }}
      weightUnit={unitLabel === "kg" ? "kg" : "lbs"}
      distanceUnit={distanceUnit}
      progressionStepPolicy={progressionStepPolicy}
      visiblePromotionStepFields={visiblePromotionStepFields ?? null}
    />
  ) : null;
  const sessionSecondaryToggleCardClassName = "w-[calc((100%-1.5rem)/3)] min-w-0 flex-1 basis-0 space-y-[5px] text-center";

  const lastTargetToggleRow = applyLastRow ? (
    <div className={sessionSecondaryToggleCardClassName}>
      <div className="mx-auto inline-flex max-w-full flex-col items-stretch space-y-[2px]">
        <p className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-strong)/0.94)]">
          {didApplyLastTarget ? "Clear Last" : "Use Last"}
        </p>
        <MetricAccentBar variant="thin" className="w-full opacity-80" />
      </div>
      <button
        type="button"
        className={cn(
          ACTION_CHROME_CONTROL_CLASS_NAME,
          ACTION_CHROME_SEGMENTED_CLASS_NAME,
          tapFeedbackClass,
          "inline-flex min-h-10 w-full items-center justify-center rounded-[var(--action-chrome-segment-radius-compact)] border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] px-4 text-[10.5px] font-semibold tracking-[0.04em] text-[rgb(var(--text-primary))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] shadow-[var(--action-chrome-shadow-hover)] focus-visible:ring-[rgb(var(--accent)/0.2)]",
        )}
        aria-pressed={didApplyLastTarget}
        aria-label={didApplyLastTarget ? "Clear last target" : "Apply last target"}
        onClick={() => {
          if (didApplyLastTarget) {
            resetLoggerMeasurementInputs();
            setDidApplyLastTarget(false);
            setError(null);
            return;
          }
          if (applyLastRow.applyValues) {
            applyHintValues(applyLastRow.applyValues);
            setDidApplyLastTarget(true);
          }
        }}
      >
        <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
          {didApplyLastTarget ? (
            <span className="measurement-toggle__label">Clear</span>
          ) : (
            <SignatureInlineList
              items={applyLastRow.items}
              separator="dot"
              className={cn(
                appTokens.currentSessionLoggerSummaryText,
                "measurement-toggle__label min-w-0 justify-center whitespace-normal break-words text-center text-[11px] font-semibold leading-[1.15] text-inherit",
                "[&_.signature-inline-list__item]:whitespace-nowrap",
              )}
            />
          )}
          <ChevronDownIcon className="h-3 w-3 text-[rgb(var(--accent-strong)/0.94)]" />
        </span>
      </button>
    </div>
  ) : null;
  const failureToggleRow = showFailureToggle ? (
    <div className={sessionSecondaryToggleCardClassName}>
        <div className="mx-auto inline-flex max-w-full flex-col items-stretch space-y-[2px]">
          <p className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-strong)/0.94)]">
            Reps / Failure Toggle
          </p>
          <MetricAccentBar variant="thin" className="w-full opacity-80" />
        </div>
        <button
          type="button"
          className={cn(
            ACTION_CHROME_CONTROL_CLASS_NAME,
            ACTION_CHROME_SEGMENTED_CLASS_NAME,
            tapFeedbackClass,
            "inline-flex min-h-10 w-full items-center justify-center rounded-[var(--action-chrome-segment-radius-compact)] border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] px-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-primary))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] shadow-[var(--action-chrome-shadow-hover)] focus-visible:ring-[rgb(var(--accent)/0.2)]",
          )}
          aria-pressed={resolvedIsFailure}
          aria-label={resolvedIsFailure ? "Failure target enabled" : "Failure target disabled"}
          onClick={() => {
            setIsFailure((current) => {
              const nextValue = !current;
              if (nextValue) {
                setWarmupValue(false);
              }
              return nextValue;
            });
            if (!resolvedIsFailure) {
              setReps("");
            }
          }}
        >
          <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
            <span className="measurement-toggle__label">
              {resolvedIsFailure ? "Till Failure" : "Reps-Based"}
            </span>
            <ChevronDownIcon className="h-3 w-3 text-[rgb(var(--accent-strong)/0.94)]" />
          </span>
        </button>
    </div>
  ) : null;
  const warmupToggleRow = (
    <div className={sessionSecondaryToggleCardClassName}>
        <div className="mx-auto inline-flex max-w-full flex-col items-stretch space-y-[2px]">
          <p className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-strong)/0.94)]">
            Warm-Up Toggle
          </p>
          <MetricAccentBar variant="thin" className="w-full opacity-80" />
        </div>
        <button
          type="button"
          className={cn(
            ACTION_CHROME_CONTROL_CLASS_NAME,
            ACTION_CHROME_SEGMENTED_CLASS_NAME,
            tapFeedbackClass,
            "inline-flex min-h-10 w-full items-center justify-center rounded-[var(--action-chrome-segment-radius-compact)] border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] px-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-primary))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] shadow-[var(--action-chrome-shadow-hover)] focus-visible:ring-[rgb(var(--accent)/0.2)]",
          )}
          aria-pressed={resolvedIsWarmup}
          aria-label={resolvedIsWarmup ? "Warm-up set enabled" : "Working set enabled"}
          onClick={() => {
            const nextWarmup = !resolvedIsWarmup;
            setWarmupValue(nextWarmup);
            if (nextWarmup) {
              setIsFailure(false);
            }
          }}
        >
          <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
            <span className="measurement-toggle__label">
              {resolvedIsWarmup ? "Warm-Up Set" : "Working Set"}
            </span>
            <ChevronDownIcon className="h-3 w-3 text-[rgb(var(--accent-strong)/0.94)]" />
          </span>
        </button>
    </div>
  );
  const measurementSecondaryControls = (
    <div className="space-y-3">
      <div className="flex items-start justify-center gap-3">
        {lastTargetToggleRow}
        {warmupToggleRow}
        {failureToggleRow}
      </div>
      {progressionInlineControls ? (
        <div className="pt-1">
          {progressionInlineControls}
        </div>
      ) : null}
    </div>
  );

  const loggedSetList = sets.length > 0 ? (
    <div
      className={cn(
        appTokens.currentSessionLoggerSetList,
        "relative min-h-0 overflow-hidden rounded-[0.95rem]",
      )}
      data-testid="set-logger-set-list"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-5 bg-gradient-to-b from-[rgb(var(--surface-1-rgb)/0.34)] via-[rgb(var(--surface-1-rgb)/0.16)] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-7 bg-gradient-to-t from-[rgb(var(--surface-1-rgb)/0.38)] via-[rgb(var(--surface-1-rgb)/0.18)] to-transparent" />
      <div className="filter-scroll-viewport max-h-[10.1rem] overflow-y-auto overscroll-contain py-1 pr-1 touch-pan-y">
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
      </div>
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

      <WorkoutEntrySection
        className={cn(
          appTokens.currentSessionLoggerPanel,
          "relative z-[1] mt-2 !space-y-0 border-transparent bg-transparent !p-0 shadow-none backdrop-blur-0",
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
          betweenInputsAndFooterContent={measurementSecondaryControls}
          footerContent={null}
        />
        {error ? <p className={appTokens.routineEditorAutosaveErrorText}>{error}</p> : null}
        {!error && progressionSaveError ? <p className={appTokens.routineEditorAutosaveErrorText}>{progressionSaveError}</p> : null}
      </WorkoutEntrySection>

      <PublishBottomActions>{saveSetPrimaryActions}</PublishBottomActions>
    </div>
  );
}
