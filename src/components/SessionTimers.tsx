"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { SetRow } from "@/types/db";
import {
  enqueueSetLog,
  readQueuedSetLogsBySessionExerciseId,
  removeSetLogQueueItem,
  type SetLogQueueItem,
} from "@/lib/offline/set-log-queue";
import { createSetLogSyncEngine } from "@/lib/offline/sync-engine";
import { useToast } from "@/components/ui/ToastProvider";
import { AppButton } from "@/components/ui/AppButton";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { useUndoAction } from "@/components/ui/useUndoAction";
import { MeasurementPanelV2 } from "@/components/ui/measurements/MeasurementPanelV2";
import { WorkoutEntrySection } from "@/components/ui/workout-entry/EntrySection";
import { CompactLogRow } from "@/components/ui/workout-entry/CompactLogRow";
import { FormSectionCard } from "@/components/ui/workout-entry/FormSectionCard";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import { formatDurationClock } from "@/lib/duration";
import { formatMeasurementSummaryText } from "@/lib/measurement-display";
import { sanitizeEnabledMeasurementValues } from "@/lib/measurement-sanitization";
import type { ActionResult } from "@/lib/action-result";
import { getNextPublishedSetCount } from "@/components/session/setCountSync";
import { EyebrowText, SubtitleText, TitleText } from "@/components/ui/text-roles";
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
  clientLogId?: string;
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

type DisplaySet = SetRow & { pending?: boolean; queueStatus?: SetLogQueueItem["status"] };
type AnimatedDisplaySet = DisplaySet & { isLeaving?: boolean };

function mergeDisplaySets(baseSets: DisplaySet[], incomingSets: DisplaySet[]) {
  const merged = new Map<string, DisplaySet>();

  for (const set of baseSets) {
    merged.set(set.id, set);
  }

  for (const set of incomingSets) {
    const current = merged.get(set.id);
    if (!current) {
      merged.set(set.id, set);
      continue;
    }

    merged.set(set.id, { ...current, ...set });
  }

  return Array.from(merged.values()).sort((left, right) => left.set_index - right.set_index);
}

export function SetLoggerCard({
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
  initialEnabledMetrics,
  routineDayExerciseId,
  planTargetsHash,
  deleteSetAction,
  resetSignal,
  skipAction,
  warmupValue,
  onWarmupValueChange,
}: {
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
  skipAction?: ReactNode;
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
  const [sets, setSets] = useState<DisplaySet[]>(initialSets);
  const [activeMetrics, setActiveMetrics] = useState(initialEnabledMetrics);
  const [hasUserModifiedMetrics, setHasUserModifiedMetrics] = useState(false);
  const [animatedSets, setAnimatedSets] = useState<AnimatedDisplaySet[]>(initialSets);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [showRpeTooltip, setShowRpeTooltip] = useState(false);
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);
  const lastPublishedSetCountRef = useRef<number | null>(initialSets.length);

  const toast = useToast();
  const queueUndo = useUndoAction(6000);

  const planContractSignature = `${sessionExerciseId}:${routineDayExerciseId ?? ""}:${planTargetsHash ?? ""}`;

  useEffect(() => {
    if (hasUserModifiedMetrics) {
      return;
    }

    setActiveMetrics(initialEnabledMetrics);
  }, [hasUserModifiedMetrics, initialEnabledMetrics, planContractSignature]);

  useEffect(() => {
    setHasUserModifiedMetrics(false);
  }, [planContractSignature]);

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
    setSets(initialSets);
    setAnimatedSets(initialSets);
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
    const storageKey = `session-sets:${sessionId}:${sessionExerciseId}`;
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        sets?: DisplaySet[];
        form?: { weight?: string; reps?: string; durationSeconds?: string; distance?: string; distanceUnit?: "mi" | "km" | "m"; calories?: string; rpe?: string; isWarmup?: boolean; selectedWeightUnit?: "lbs" | "kg" };
      };

      if (Array.isArray(parsed.sets)) {
        setSets(mergeDisplaySets(initialSets, parsed.sets));
      }

      if (parsed.form) {
        const sanitizedForm = sanitizeEnabledMeasurementValues(activeMetrics, {
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
  }, [activeMetrics, initialSets, sessionExerciseId, sessionId, setWarmupValue]);

  useEffect(() => {
    const storageKey = `session-sets:${sessionId}:${sessionExerciseId}`;
    const sanitizedForm = sanitizeEnabledMeasurementValues(activeMetrics, {
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
  }, [activeMetrics, calories, distance, distanceUnit, durationInput, reps, resolvedIsWarmup, rpe, selectedWeightUnit, sessionExerciseId, sessionId, sets, weight]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();
    mediaQuery.addEventListener("change", syncPreference);
    return () => mediaQuery.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    setAnimatedSets((current) => {
      const nextIds = new Set(sets.map((set) => set.id));
      const removed = current
        .filter((set) => !nextIds.has(set.id))
        .map((set) => ({ ...set, isLeaving: true }));
      const merged = [...sets, ...removed];
      const uniqueById = new Map<string, AnimatedDisplaySet>();
      for (const set of merged) {
        uniqueById.set(set.id, set);
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
      syncSetLogsAction: syncQueuedSetLogsAction,
      onQueueUpdate: () => {
        void readQueuedSetLogsBySessionExerciseId(sessionExerciseId).then((queued) => {
          setSets((current) =>
            current.map((set) => {
              const queuedMatch = queued.find((item) => item.id === set.id);
              if (!queuedMatch) {
                return set;
              }
              return {
                ...set,
                queueStatus: queuedMatch.status,
              };
            }),
          );
        });
      },
    });

    engine.start();
    return () => engine.stop();
  }, [sessionExerciseId, syncQueuedSetLogsAction]);

  useEffect(() => {
    let isCancelled = false;

    async function restoreQueuedSets() {
      try {
        const queued = await readQueuedSetLogsBySessionExerciseId(sessionExerciseId);
        if (isCancelled || queued.length === 0) {
          return;
        }

        setSets((current) => {
          const existingIds = new Set(current.map((set) => set.id));
          const restored = queued
            .filter((item) => !existingIds.has(item.id))
            .map(
              (item, index): DisplaySet => ({
                id: item.id,
                session_exercise_id: item.sessionExerciseId,
                user_id: "queued",
                set_index: current.length + index,
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
              }),
            );

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
  }, [sessionExerciseId]);


  const requiresReps = activeMetrics.reps;
  const requiresDuration = activeMetrics.time;
  const requiresDistance = activeMetrics.distance;
  const parsedDurationForSave = parseDurationInput(durationInput);
  const parsedDistanceForSave = distance.trim() ? Number(distance) : null;
  const parsedRepsForSave = reps.trim() ? Number(reps) : 0;
  const isSaveDisabled = isSubmitting
    || (requiresReps && (!Number.isFinite(parsedRepsForSave) || parsedRepsForSave <= 0))
    || (requiresDuration && (parsedDurationForSave === null || parsedDurationForSave <= 0))
    || (requiresDistance && (!Number.isFinite(parsedDistanceForSave) || (parsedDistanceForSave ?? 0) <= 0));

  const resetLoggerState = useCallback(() => {
    setDurationInput("");
    if (activeMetrics.reps) {
      setReps("");
    }
  }, [activeMetrics.reps]);

  useEffect(() => {
    if (!resetSignal) {
      return;
    }

    resetLoggerState();
  }, [resetLoggerState, resetSignal]);

  const handleLogSet = useCallback(async () => {
    const sanitizedValues = sanitizeEnabledMeasurementValues(activeMetrics, {
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

    if (requiresReps && (!Number.isFinite(parsedReps) || parsedReps <= 0)) {
      const message = "Reps must be greater than 0 for this exercise.";
      setError(message);
      toast.error(message);
      return;
    }

    if (requiresDuration && (parsedDuration === null || parsedDuration <= 0)) {
      const message = "Time must be greater than 0 for this exercise.";
      setError(message);
      toast.error(message);
      return;
    }

    if (requiresDistance && (parsedDistance === null || parsedDistance <= 0)) {
      const message = "Distance must be greater than 0 for this exercise.";
      setError(message);
      toast.error(message);
      return;
    }

    if (activeMetrics.weight && (!Number.isFinite(parsedWeight) || parsedWeight < 0)) {
      const message = "Weight must be 0 or greater.";
      setError(message);
      toast.error(message);
      return;
    }

    if (activeMetrics.reps && (!Number.isFinite(parsedReps) || parsedReps < 0)) {
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

    const pendingId = `pending-${Date.now()}`;
    const nextSetIndex = sets.length;
    const optimisticSet: DisplaySet = {
      id: pendingId,
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
        sessionId,
        sessionExerciseId,
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
          item.id === pendingId
            ? {
                ...item,
                id: queued?.id ?? item.id,
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
      });

      if (!result.ok || !result.data?.set) {
        const queued = await enqueueSetLog({
          sessionId,
          sessionExerciseId,
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
            item.id === pendingId
              ? {
                  ...item,
                  id: queued?.id ?? item.id,
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

      setSets((current) => current.map((item) => (item.id === pendingId ? result.data!.set : item)));
      toast.success("Set logged.");
    } catch {
      const queued = await enqueueSetLog({
        sessionId,
        sessionExerciseId,
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
          item.id === pendingId
            ? {
                ...item,
                id: queued?.id ?? item.id,
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

    setDurationInput(activeMetrics.time ? "" : sanitizedValues.duration);
    setDistance(activeMetrics.distance ? "" : sanitizedValues.distance);
    setCalories(activeMetrics.calories ? "" : sanitizedValues.calories);
    setWeight(activeMetrics.weight ? String(parsedWeight) : sanitizedValues.weight);
    setReps(activeMetrics.reps ? String(parsedReps) : sanitizedValues.reps);
    setRpe(parsedRpe === null ? "" : String(parsedRpe));
    setWarmupValue(resolvedIsWarmup);
    setIsSubmitting(false);
  }, [
    activeMetrics,
    calories,
    distance,
    distanceUnit,
    durationInput,
    resolvedIsWarmup,
    reps,
    requiresDistance,
    requiresDuration,
    requiresReps,
    rpe,
    selectedWeightUnit,
    sessionExerciseId,
    sessionId,
    setSets,
    setWarmupValue,
    sets.length,
    toast,
    weight,
    addSetAction,
  ]);

  const saveSetActions = useMemo(
    () => (
      <BottomActionSplit
        secondary={skipAction ?? <div aria-hidden="true" />}
        primary={(
          <AppButton
            type="button"
            onClick={handleLogSet}
            disabled={isSaveDisabled}
            variant="primary"
            fullWidth
          >
            Save Set
          </AppButton>
        )}
      />
    ),
    [handleLogSet, isSaveDisabled, skipAction],
  );


  async function handleDeleteSet(set: DisplaySet) {
    if (set.pending || set.queueStatus) {
      await removeSetLogQueueItem(set.id);
      setSets((current) => current.filter((item) => item.id !== set.id));
      toast.success("Queued set removed.");
      return;
    }

    const removalIndex = sets.findIndex((item) => item.id === set.id);
    if (removalIndex === -1) return;

    setSets((current) => current.filter((item) => item.id !== set.id));

    queueUndo({
      message: "Removed set",
      onUndo: () => {
        setSets((current) => {
          if (current.some((item) => item.id === set.id)) return current;
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
            if (current.some((item) => item.id === set.id)) return current;
            const next = [...current];
            next.splice(removalIndex, 0, set);
            return next;
          });
          toast.error(result.error || "Could not remove set.");
        }
      },
    });
  }

  return (
    <div className="flex min-h-full flex-col space-y-3">
      {/* Manual QA checklist:
          - Add/exercise metric hints are visible inside input boxes
          - No Set Timer UI remains; duration logging still works via mm:ss
          - RPE tooltip does not reserve blank space when closed
          - Save button remains stable while toggling measurements */}

      <FormSectionCard className="border-white/8 bg-[rgb(var(--surface-rgb)/0.42)]" insetClassName="space-y-2.5">
        <div className="space-y-2">
          <EyebrowText as="h3">EFFORT</EyebrowText>
          <div className="relative">
            <input
              type="number"
              min={0}
              step="0.5"
              value={rpe}
              onChange={(event) => setRpe(event.target.value)}
              placeholder="0-10"
              className="min-h-11 w-full rounded-xl border border-border/55 bg-surface/70 px-3 py-2 pr-11 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowRpeTooltip((value) => !value)}
              aria-label="Effort scale help"
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border/70 bg-[rgb(var(--bg)/0.42)] text-[11px] text-muted transition hover:bg-[rgb(var(--bg)/0.58)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
            >
              ⓘ
            </button>
            {showRpeTooltip ? (
              <div className="pointer-events-none absolute right-0 top-full z-10 mt-1 w-44 rounded-md border border-border/70 bg-surface p-2 text-[11px] text-muted shadow-sm">
                <TitleText as="p" className="text-[11px]">0-10 effort scale</TitleText>
                <SubtitleText className="text-[11px]">10 = max effort</SubtitleText>
                <SubtitleText className="text-[11px]">8 = about 2 reps left</SubtitleText>
                <SubtitleText className="text-[11px]">6 = moderate effort</SubtitleText>
              </div>
            ) : null}
          </div>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </div>

        <button
          type="button"
          onClick={() => setWarmupValue(!resolvedIsWarmup)}
          aria-pressed={resolvedIsWarmup}
          className={[
            "flex w-full items-center justify-between gap-3 rounded-[1.1rem] border px-3 py-2.5 text-left transition",
            resolvedIsWarmup
              ? "border-emerald-400/35 bg-emerald-400/14 text-emerald-100"
              : "border-white/8 bg-white/[0.04] text-text hover:bg-white/[0.06]",
            tapFeedbackClass,
          ].join(" ")}
        >
          <span className="min-w-0">
            <EyebrowText as="span" className={cn("text-xs tracking-[0.14em]", resolvedIsWarmup ? "text-emerald-200" : "text-muted")}>
              WARM-UP | TAP
            </EyebrowText>
          </span>
          <span className={resolvedIsWarmup ? "text-sm font-semibold text-emerald-100" : "text-sm font-medium text-text"}>{resolvedIsWarmup ? "On" : "Off"}</span>
        </button>
      </FormSectionCard>

      <WorkoutEntrySection
        className="border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]"
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
          activeMetrics={activeMetrics}
          isExpanded={isMetricsExpanded}
          onExpandedChange={setIsMetricsExpanded}
          onMetricToggle={(metric) => {
            setHasUserModifiedMetrics(true);
            setActiveMetrics((current) => {
              const nextMetrics = { ...current, [metric]: !current[metric] };
              const sanitizedValues = sanitizeEnabledMeasurementValues(nextMetrics, {
                reps,
                weight,
                duration: durationInput,
                distance,
                calories,
              });
              setReps(sanitizedValues.reps);
              setWeight(sanitizedValues.weight);
              setDurationInput(sanitizedValues.duration);
              setDistance(sanitizedValues.distance);
              setCalories(sanitizedValues.calories);
              return nextMetrics;
            });
          }}
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
          showHeader={false}
        />
      </WorkoutEntrySection>

      <WorkoutEntrySection
        eyebrow="Logged Sets"
        className="border-white/8 bg-[rgb(var(--surface-rgb)/0.42)]"
        contentClassName="space-y-0"
      >
        <ul className="space-y-1.5 text-sm">
        {animatedSets.map((set, index) => (
          <li
            key={set.id}
            className={[
              "origin-top transition-all duration-150 motion-reduce:transition-none",
              set.isLeaving ? "max-h-0 scale-[0.98] opacity-0" : "max-h-28 scale-100 opacity-100",
            ].join(" ")}
          >
            <CompactLogRow
              summary={(
                <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-snug text-[rgb(var(--text)/0.94)]">
                  <span className="font-semibold text-text">{isCardio ? "Interval" : "Set"} {index + 1}</span>
                  <span className="text-muted">—</span>
                  <span>{formatMeasurementSummaryText({
                    reps: set.reps,
                    weight: set.weight,
                    weightUnit: set.weight_unit ?? unitLabel,
                    durationSeconds: set.duration_seconds,
                    distance: set.distance,
                    distanceUnit: set.distance_unit,
                    calories: set.calories,
                    emptyLabel: "No measurements",
                  })}</span>
                  {set.is_warmup ? (
                    <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-medium text-emerald-100">Warm-Up</span>
                  ) : null}
                  {set.rpe !== null ? (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-text">RPE {set.rpe}</span>
                  ) : null}
                  {set.queueStatus ? <span className="text-[11px] text-muted">{set.queueStatus}</span> : null}
                  {set.pending && !set.queueStatus ? <span className="text-[11px] text-muted">saving...</span> : null}
                </span>
              )}
              actionClassName="border-l border-white/8 bg-[linear-gradient(180deg,rgba(244,63,94,0.08),rgba(190,24,93,0.04))]"
              action={(
                <button
                  type="button"
                  onClick={() => {
                    void handleDeleteSet(set);
                  }}
                  aria-label={`Delete ${isCardio ? "interval" : "set"} ${index + 1}`}
                  className={cn(
                    "min-h-[44px] self-stretch px-3.5 text-[11px] font-semibold tracking-[0.02em] text-rose-100/80 transition hover:bg-rose-400/8 hover:text-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-300/30",
                    tapFeedbackClass,
                  )}
                >
                  Delete
                </button>
              )}
            />
          </li>
        ))}
        {sets.length === 0 ? <li className="rounded-2xl border border-dashed border-white/10 px-3 py-3 text-muted">No {isCardio ? "intervals" : "sets"} logged yet.</li> : null}
        </ul>
      </WorkoutEntrySection>

      <PublishBottomActions>{saveSetActions}</PublishBottomActions>
    </div>
  );
}
