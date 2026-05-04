"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
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
import { getBottomActionButtonClassName } from "@/components/layout/bottomActionIntents";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { SignatureInlineList, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { appTokens } from "@/components/ui/app/tokens";
import { ACTION_CHROME_CONTROL_CLASS_NAME } from "@/components/ui/actionChrome";
import { selectionChromeStyle } from "@/components/ui/selectionChromeStyle";
import { useUndoAction } from "@/components/ui/useUndoAction";
import { MeasurementDockSummary, measurementDockSurfaceClassName } from "@/components/ui/measurements/MeasurementDock";
import { MeasurementPanelV2 } from "@/components/ui/measurements/MeasurementPanelV2";
import { WorkoutEntrySection } from "@/components/ui/workout-entry/EntrySection";
import { LoggedSetSummaryRow } from "@/components/ui/workout-entry/LoggedSetSummaryRow";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import { formatDurationClock } from "@/lib/duration";
import { formatMeasurementSummaryItems, formatSetPositionLabel } from "@/lib/measurement-display";
import { deriveMeasurementPresenceFromValues, sanitizeEnabledMeasurementValues } from "@/lib/measurement-sanitization";
import type { SessionTargetHint } from "@/lib/session-target-hints";
import type { ActionResult } from "@/lib/action-result";
import { getNextPublishedSetCount } from "@/components/session/setCountSync";
import { cn } from "@/lib/cn";

type AddSetPayload = {
  sessionId: string;
  sessionExerciseId: string;
  weight: number;
  reps: number;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: "mi" | "km" | "m" | null;
  calories: number | null;
  isWarmup: boolean;
  rpe: number | null;
  notes: string | null;
  weightUnit: "lbs" | "kg";
  clientLogId: string;
};

type AddSetActionResult = ActionResult<{ set: SetRow }>;

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

function getSessionSummaryItems({
  reps,
  weight,
  weightUnit,
  durationSeconds,
  distance,
  distanceUnit,
  calories,
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
  distanceUnit: "mi" | "km" | "m" | null | undefined;
  calories: number | null | undefined;
  rpe?: number | null;
  isWarmup?: boolean;
  queueStatus?: string;
  pending?: boolean;
  emptyLabel: string;
  includeWarmupTag?: boolean;
}) {
  const hasCardioSignal = [durationSeconds, distance, calories].some((value) => Number.isFinite(value ?? null) && (value ?? 0) > 0);
  const normalizedReps = hasCardioSignal && (reps ?? 0) <= 0 ? null : reps;
  const normalizedWeight = hasCardioSignal && (weight ?? 0) <= 0 ? null : weight;
  const normalizedDistance = (distance ?? 0) > 0 ? distance : null;
  const normalizedCalories = (calories ?? 0) > 0 ? calories : null;
  const parts = formatMeasurementSummaryItems({
    reps: normalizedReps,
    weight: normalizedWeight,
    weightUnit,
    durationSeconds,
    distance: normalizedDistance,
    distanceUnit,
    calories: normalizedCalories,
    emptyLabel,
  }).map((item) => item.label);

  if (rpe !== null && rpe !== undefined) {
    parts.push(`Effort ${rpe}`);
  }

  if (isWarmup && includeWarmupTag) {
    parts.push("Warm-Up");
  }

  if (queueStatus) {
    parts.push(queueStatus);
  } else if (pending) {
    parts.push("saving...");
  }

  return parts;
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
  defaultDistanceUnit: "mi" | "km" | "m" | null;
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
  const [distanceUnit, setDistanceUnit] = useState<"mi" | "km" | "m">(defaultDistanceUnit ?? "mi");
  const [calories, setCalories] = useState("");
  const [rpe, setRpe] = useState("");
  const [isWarmup, setIsWarmup] = useState(false);
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
  const [isSecondaryPending, setIsSecondaryPending] = useState(false);
  const [sets, setSets] = useState<DisplaySet[]>(() => initialSets.map(toDisplaySet));
  const [visibleMetrics, setVisibleMetrics] = useState(initialEnabledMetrics);
  const [animatedSets, setAnimatedSets] = useState<AnimatedDisplaySet[]>(() => initialSets.map(toDisplaySet));
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);
  const lastPublishedSetCountRef = useRef<number | null>(initialSets.length);

  const toast = useToast();
  const queueUndo = useUndoAction(6000);

  const planContractSignature = `${sessionExerciseId}:${routineDayExerciseId ?? ""}:${planTargetsHash ?? ""}`;

  useEffect(() => {
    setVisibleMetrics(initialEnabledMetrics);
  }, [initialEnabledMetrics, planContractSignature]);

  useEffect(() => {
    setIsMetricsExpanded(false);
  }, [sessionExerciseId]);

  useEffect(() => {
    setWeight(prefill?.weight !== undefined ? String(prefill.weight) : "");
    setSelectedWeightUnit(prefill?.weightUnit ?? (unitLabel === "kg" ? "kg" : "lbs"));
    setReps(prefill?.reps !== undefined ? String(prefill.reps) : "");
    setDurationInput(prefill?.durationSeconds !== undefined ? formatDurationClock(prefill.durationSeconds) : "");
    setDistance("");
    setDistanceUnit(defaultDistanceUnit ?? "mi");
    setCalories("");
    setRpe("");
    setWarmupValue(false);
    setError(null);
    const nextDisplaySets = initialSets.map(toDisplaySet);
    setSets(nextDisplaySets);
    setAnimatedSets(nextDisplaySets);
    lastPublishedSetCountRef.current = initialSets.length;
  }, [defaultDistanceUnit, initialSets, prefill, sessionExerciseId, setWarmupValue, unitLabel]);

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
        form?: { weight?: string; reps?: string; durationSeconds?: string; distance?: string; distanceUnit?: "mi" | "km" | "m"; calories?: string; rpe?: string; isWarmup?: boolean; selectedWeightUnit?: "lbs" | "kg" };
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
        setSets(mergeDisplaySets(initialSets.map(toDisplaySet), storedSets));
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
        if (parsed.form.distanceUnit === "mi" || parsed.form.distanceUnit === "km" || parsed.form.distanceUnit === "m") setDistanceUnit(parsed.form.distanceUnit);
        if (typeof sanitizedForm.calories === "string") setCalories(sanitizedForm.calories);
        if (typeof parsed.form.rpe === "string") setRpe(parsed.form.rpe);
        if (typeof parsed.form.isWarmup === "boolean") setWarmupValue(parsed.form.isWarmup);
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
        selectedWeightUnit,
      },
      updatedAt: Date.now(),
    });

    window.localStorage.setItem(storageKey, payload);
  }, [calories, distance, distanceUnit, durationInput, reps, resolvedIsWarmup, rpe, selectedWeightUnit, sessionExerciseId, sessionId, sets, userId, weight]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    setAnimatedSets((current) => {
      const nextIds = new Set(sets.map((set) => set.stableId));
      const removed = current
        .filter((set) => !nextIds.has(set.stableId))
        .map((set) => ({ ...set, isLeaving: true }));
      const merged = [...sets, ...removed];
      const uniqueById = new Map<string, AnimatedDisplaySet>();
      for (const set of merged) {
        uniqueById.set(set.stableId, set);
      }
      return Array.from(uniqueById.values());
    });
  }, [sets]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimatedSets(sets);
      return;
    }
    if (!animatedSets.some((set) => set.isLeaving)) {
      return;
    }
    const timeout = window.setTimeout(() => {
      setAnimatedSets((current) => current.filter((set) => !set.isLeaving));
    }, 140);
    return () => window.clearTimeout(timeout);
  }, [animatedSets, prefersReducedMotion, sets]);

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
      },
      onQueueUpdate: () => {
        void readQueuedSetLogsBySessionExerciseIdForUser(userId, sessionExerciseId).then((queued) => {
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


  const isSaveDisabled = isSubmitting;

  const resetLoggerState = useCallback(() => {
    setDurationInput("");
    if (visibleMetrics.reps) {
      setReps("");
    }
  }, [visibleMetrics.reps]);

  useEffect(() => {
    if (!resetSignal) {
      return;
    }

    resetLoggerState();
  }, [resetLoggerState, resetSignal]);

  const handleLogSet = useCallback(async () => {
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
    setIsSubmitting(true);

    const clientLogId = createStableSetId();
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
      notes: null,
      rpe: parsedRpe,
      weight_unit: selectedWeightUnit,
      pending: true,
    };

    setSets((current) => [...current, optimisticSet]);

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
          notes: null,
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
      setIsSubmitting(false);
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
        notes: null,
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
            notes: null,
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
        setIsSubmitting(false);
        return;
      }

      setSets((current) => current.map((item) => (item.stableId === clientLogId ? toDisplaySet(result.data!.set) : item)));
      toast.success("Set logged.");
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
          notes: null,
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
      setIsSubmitting(false);
      return;
    }

    setDurationInput(presentMetrics.time ? formatDurationInput(parsedDuration) : sanitizedValues.duration);
    setDistance(presentMetrics.distance ? (parsedDistance === null ? "" : String(parsedDistance)) : sanitizedValues.distance);
    setCalories(presentMetrics.calories ? (parsedCalories === null ? "" : String(parsedCalories)) : sanitizedValues.calories);
    setWeight(presentMetrics.weight ? String(parsedWeight) : sanitizedValues.weight);
    setReps(presentMetrics.reps ? String(parsedReps) : sanitizedValues.reps);
    setRpe(parsedRpe === null ? "" : String(parsedRpe));
    setWarmupValue(resolvedIsWarmup);
    setIsSubmitting(false);
  }, [
    calories,
    distance,
    distanceUnit,
    durationInput,
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
    userId,
    weight,
    addSetAction,
  ]);

  const saveSetActions = useMemo(
    () => (
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
            Log
          </DockButton>
        )}
      />
    ),
    [handleLogSet, isSaveDisabled, isSecondaryPending, onSecondaryAction, secondaryActionLabel],
  );

  const liveSummaryItems = useMemo(() => {
    const hasVisibleMeasurements = Object.values(visibleMetrics).some(Boolean);
    return getSessionSummaryItems({
      reps: reps.trim() ? Number(reps) : null,
      weight: weight.trim() ? Number(weight) : null,
      weightUnit: selectedWeightUnit,
      durationSeconds: parseDurationInput(durationInput),
      distance: distance.trim() ? Number(distance) : null,
      distanceUnit,
      calories: calories.trim() ? Number(calories) : null,
      rpe: rpe.trim() ? Number(rpe.trim()) : null,
      isWarmup: resolvedIsWarmup,
      emptyLabel: hasVisibleMeasurements ? "Add measurements" : "",
      includeWarmupTag: false,
    });
  }, [calories, distance, distanceUnit, durationInput, reps, resolvedIsWarmup, rpe, selectedWeightUnit, visibleMetrics, weight]);
  const currentSetLabel = useMemo(
    () => resolvedIsWarmup ? "Warm-up" : formatSetPositionLabel(sets.length + 1, useIntervalLanguage ? "Interval" : "Set"),
    [resolvedIsWarmup, sets.length, useIntervalLanguage],
  );


  async function handleDeleteSet(set: DisplaySet) {
    if (set.pending || set.queueStatus) {
      if (set.queueItemId) {
        await removeSetLogQueueItem(set.queueItemId);
      }
      setSets((current) => current.filter((item) => item.stableId !== set.stableId));
      toast.success("Queued set removed.");
      return;
    }

    const removalIndex = sets.findIndex((item) => item.stableId === set.stableId);
    if (removalIndex === -1) return;

    setSets((current) => current.filter((item) => item.stableId !== set.stableId));

    queueUndo({
      message: "Removed set",
      onUndo: () => {
        setSets((current) => {
          if (current.some((item) => item.stableId === set.stableId)) return current;
          const next = [...current];
          next.splice(removalIndex, 0, set);
          return next;
        });
      },
      onCommit: async () => {
        const result = await deleteSetAction({
          sessionId,
          sessionExerciseId,
          setId: set.id,
        });

        if (!result.ok) {
          setSets((current) => {
            if (current.some((item) => item.stableId === set.stableId)) return current;
            const next = [...current];
            next.splice(removalIndex, 0, set);
            return next;
          });
          toast.error(result.error || "Could not remove set.");
        }
      },
    });
  }

  const currentSummary = (
    <div data-testid="set-logger-current-summary">
      <MeasurementDockSummary
        className={cn(
          appTokens.currentSessionLoggerSummaryCard,
          "border-0 bg-transparent px-0 py-0 shadow-none transition-all duration-200 ease-out",
        )}
        lead={(
          <div className={cn(appTokens.currentSessionLoggerSummaryText, "inline-flex items-center gap-x-2 text-[14px] leading-[1.25] transition-all duration-200 ease-out")}>
            <span className={cn(appTokens.currentSessionSetSummaryLabel, "shrink-0")}>{currentSetLabel}</span>
            <SignatureMiniPipe />
          </div>
        )}
        summary={(
          <SignatureInlineList
            items={liveSummaryItems}
            separator="dot"
            className={cn(
              appTokens.currentSessionLoggerSummaryText,
              "justify-center whitespace-normal break-words text-center text-[14px] leading-[1.25] transition-all duration-200 ease-out",
            )}
          />
        )}
      />
    </div>
  );

  const contextRows = [
    targetHint.lastSummary
      ? `Last time: ${targetHint.lastSummary}${targetHint.lastPerformedAtLabel ? ` • ${targetHint.lastPerformedAtLabel}` : ""}`
      : null,
    targetHint.recentBestSummary && targetHint.recentBestSummary !== targetHint.lastSummary
      ? `Recent best: ${targetHint.recentBestSummary}${targetHint.recentBestPerformedAtLabel ? ` • ${targetHint.recentBestPerformedAtLabel}` : ""}`
      : null,
  ].filter((value): value is string => Boolean(value));

  const targetHintSourceLabel = targetHint.source === "planned_target"
    ? "Planned"
    : targetHint.source === "last_performance"
      ? "Last time"
      : targetHint.source === "recent_best"
        ? "Recent best"
        : "New";

  const targetHintPanel = (
    <div
      data-testid="session-target-hint"
      className="mb-2 rounded-[1rem] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2)/0.58)] px-3.5 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text-muted)/0.88)]">
            Next target
          </p>
          <p className="mt-1 text-[0.96rem] font-semibold leading-[1.25] text-[rgb(var(--text-primary)/0.98)]">
            {targetHint.shortLabel}
          </p>
        </div>
        <span className="rounded-full border border-[rgb(var(--border-strong)/0.16)] px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.9)]">
          {targetHintSourceLabel}
        </span>
      </div>
      <p className="mt-2 text-[0.82rem] leading-5 text-[rgb(var(--text-secondary)/0.95)]">
        {targetHint.reason}
      </p>
      {contextRows.length > 0 ? (
        <div className="mt-2 space-y-1">
          {contextRows.map((row) => (
            <p
              key={row}
              className="text-[0.76rem] leading-5 text-[rgb(var(--text-muted)/0.92)]"
            >
              {row}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );

  const loggedSetList = sets.length > 0 ? (
    <div className={appTokens.currentSessionLoggerSetList} data-testid="set-logger-set-list">
      <ul className={cn(appTokens.currentSessionFocusList, "text-sm")}>
        {animatedSets.map((set, index) => (
          <li
            key={set.stableId}
            className={[
              "origin-top transition-all duration-150 motion-reduce:transition-none",
              set.isLeaving ? "max-h-0 scale-[0.98] opacity-0" : "max-h-28 scale-100 opacity-100",
            ].join(" ")}
          >
            <LoggedSetSummaryRow
              label={set.is_warmup ? "Warm-up" : (useIntervalLanguage ? `Interval ${index + 1}` : `Set ${index + 1}`)}
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
                  aria-label={`Delete ${useIntervalLanguage ? "interval" : "set"} ${index + 1}`}
                  data-bottom-action-intent="danger"
                  className={cn(
                    getBottomActionButtonClassName({
                      intent: "danger",
                      fullWidth: false,
                      className: "!h-6 !min-h-0 rounded-full !px-4 text-[12px] font-semibold tracking-[0.04em]",
                    }),
                    "shrink-0 self-center",
                    tapFeedbackClass,
                  )}
                >
                  <span className="bottom-action__label">Delete</span>
                </button>
              )}
            />
          </li>
        ))}
      </ul>
    </div>
  ) : null;

  return (
    <div
      className={cn(
        appTokens.currentSessionLoggerStack,
        "relative flex min-h-[calc(100dvh-var(--bottom-actions-height,0px)-10rem)] flex-col",
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
          measurementDockSurfaceClassName,
          "sticky bottom-[calc(var(--bottom-actions-height,0px)+0.625rem)] z-20 mt-auto shadow-[0_-12px_28px_rgba(2,8,16,0.2)] pt-2.5",
        )}
        contentClassName="space-y-0"
      >
        {targetHintPanel}
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
          activeMetrics={deriveMeasurementPresenceFromValues({
            reps,
            weight,
            duration: durationInput,
            distance,
            calories,
          })}
          isExpanded={isMetricsExpanded}
          onExpandedChange={setIsMetricsExpanded}
          onMetricToggle={undefined}
          onChange={(patch) => {
            if (patch.reps !== undefined) setReps(patch.reps);
            if (patch.weight !== undefined) setWeight(patch.weight);
            if (patch.duration !== undefined) setDurationInput(patch.duration);
            if (patch.distance !== undefined) setDistance(patch.distance);
            if (patch.calories !== undefined) setCalories(patch.calories);
            if (patch.weightUnit !== undefined) setSelectedWeightUnit(patch.weightUnit);
            if (patch.distanceUnit !== undefined) setDistanceUnit(patch.distanceUnit);
          }}
          className={tapFeedbackClass}
          showInnerHeader={false}
          layoutMode="horizontal-scroll"
          labelTreatment="floating-border"
          topField={{
            title: "Warm up",
            input: null,
            inlineLabel: "",
            useInlineFieldShell: false,
            hasValue: resolvedIsWarmup,
            labelClassName: "hidden",
            valueLabelClassName: "hidden",
            renderInput: ({ inputClassName }) => (
              <button
                type="button"
                className={cn(
                  ACTION_CHROME_CONTROL_CLASS_NAME,
                  inputClassName,
                  appTokens.currentSessionWarmupToggle,
                  "flex !h-11 !min-h-11 w-full translate-y-[2px] flex-col items-center justify-center !rounded-[1rem] !border-0 !bg-transparent !px-3 !py-2 text-center leading-none !shadow-none focus-visible:ring-[var(--button-focus-ring)]",
                )}
                data-action-chrome-intent="ghost"
                style={{
                  ...selectionChromeStyle,
                  "--action-chrome-text-color": resolvedIsWarmup
                    ? "rgb(var(--text-primary) / 0.96)"
                    : "rgb(var(--text-muted) / 0.92)",
                } as CSSProperties}
                aria-pressed={resolvedIsWarmup}
                aria-label={resolvedIsWarmup ? "Warm set enabled" : "Warm set disabled"}
                onClick={() => setWarmupValue(!resolvedIsWarmup)}
              >
                <span className="text-xs font-semibold uppercase tracking-[0.06em]">Warm</span>
                <span className="text-xs font-semibold uppercase tracking-[0.06em]">Up</span>
              </button>
            ),
          }}
          visibleMetrics={(Object.entries(visibleMetrics) as Array<[keyof typeof visibleMetrics, boolean]>).filter(([, enabled]) => enabled).map(([metric]) => metric)}
          rpe={rpe}
          onRpeChange={setRpe}
          footerContent={currentSummary}
        />
        {error ? <p className={appTokens.routineEditorAutosaveErrorText}>{error}</p> : null}
      </WorkoutEntrySection>

      <PublishBottomActions>{saveSetActions}</PublishBottomActions>
    </div>
  );
}


