"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { SetRow } from "@/types/db";
import {
  enqueueSetLog,
  readQueuedSetLogsBySessionExerciseId,
  removeSetLogQueueItem,
  type SetLogQueueItem,
} from "@/lib/offline/set-log-queue";
import { createSetLogSyncEngine } from "@/lib/offline/sync-engine";
import { useToast } from "@/components/ui/ToastProvider";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { AppButton } from "@/components/ui/AppButton";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { useUndoAction } from "@/components/ui/useUndoAction";
import { ModifyMeasurements } from "@/components/ui/measurements/ModifyMeasurements";
import { MeasurementSummary } from "@/components/ui/measurements/MeasurementSummary";
import { WorkoutEntrySection } from "@/components/ui/workout-entry/EntrySection";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import { formatDurationClock } from "@/lib/duration";
import type { ActionResult } from "@/lib/action-result";

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
  resetSignal
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
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sets, setSets] = useState<DisplaySet[]>(initialSets);
  const [activeMetrics, setActiveMetrics] = useState(initialEnabledMetrics);
  const [hasUserModifiedMetrics, setHasUserModifiedMetrics] = useState(false);
  const [animatedSets, setAnimatedSets] = useState<AnimatedDisplaySet[]>(initialSets);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [showRpeTooltip, setShowRpeTooltip] = useState(false);
  const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);

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
    setIsWarmup(false);
    setError(null);
  }, [defaultDistanceUnit, prefill, sessionExerciseId, unitLabel]);

  useEffect(() => {
    onSetCountChange?.(sets.length);
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
        setSets(parsed.sets);
      }

      if (parsed.form) {
        if (typeof parsed.form.weight === "string") setWeight(parsed.form.weight);
        if (typeof parsed.form.reps === "string") setReps(parsed.form.reps);
        if (typeof parsed.form.durationSeconds === "string") setDurationInput(parsed.form.durationSeconds);
        if (typeof parsed.form.distance === "string") setDistance(parsed.form.distance);
        if (parsed.form.distanceUnit === "mi" || parsed.form.distanceUnit === "km" || parsed.form.distanceUnit === "m") setDistanceUnit(parsed.form.distanceUnit);
        if (typeof parsed.form.calories === "string") setCalories(parsed.form.calories);
        if (typeof parsed.form.rpe === "string") setRpe(parsed.form.rpe);
        if (typeof parsed.form.isWarmup === "boolean") setIsWarmup(parsed.form.isWarmup);
        if (parsed.form.selectedWeightUnit === "kg" || parsed.form.selectedWeightUnit === "lbs") {
          setSelectedWeightUnit(parsed.form.selectedWeightUnit);
        }
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [sessionExerciseId, sessionId]);

  useEffect(() => {
    const storageKey = `session-sets:${sessionId}:${sessionExerciseId}`;
    const payload = JSON.stringify({
      sets,
      form: {
        weight,
        reps,
        durationSeconds: durationInput,
        distance,
        distanceUnit,
        calories,
        rpe,
        isWarmup,
        selectedWeightUnit,
      },
      updatedAt: Date.now(),
    });

    window.localStorage.setItem(storageKey, payload);
  }, [calories, distance, distanceUnit, durationInput, isWarmup, reps, rpe, selectedWeightUnit, sessionExerciseId, sessionId, sets, weight]);

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
    const parsedWeight = weight.trim() ? Number(weight) : 0;
    const parsedReps = reps.trim() ? Number(reps) : 0;
    const parsedDuration = parseDurationInput(durationInput);
    const parsedDistance = distance.trim() ? Number(distance) : null;
    const parsedCalories = calories.trim() ? Number(calories) : null;
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
      is_warmup: isWarmup,
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
          isWarmup,
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
        isWarmup,
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
            isWarmup,
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
          isWarmup,
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

    setDurationInput("");
    setDistance("");
    setCalories("");
    setWeight(String(parsedWeight));
    setReps(String(parsedReps));
    setRpe(parsedRpe === null ? "" : String(parsedRpe));
    setIsWarmup(isWarmup);
    setIsSubmitting(false);
  }, [
    activeMetrics.reps,
    activeMetrics.weight,
    calories,
    distance,
    distanceUnit,
    durationInput,
    isWarmup,
    reps,
    requiresDistance,
    requiresDuration,
    requiresReps,
    rpe,
    selectedWeightUnit,
    sessionExerciseId,
    sessionId,
    setSets,
    sets.length,
    toast,
    weight,
    addSetAction,
  ]);

  const saveSetActions = useMemo(
    () => (
      <BottomActionSingle>
        <AppButton type="button" onClick={handleLogSet} disabled={isSaveDisabled} variant="primary" fullWidth>
          Save Set
        </AppButton>
      </BottomActionSingle>
    ),
    [handleLogSet, isSaveDisabled],
  );

  usePublishBottomActions(saveSetActions);


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
    <div className="space-y-3">
      {/* Manual QA checklist:
          - Add/exercise metric hints are visible inside input boxes
          - No Set Timer UI remains; duration logging still works via mm:ss
          - RPE tooltip does not reserve blank space when closed
          - Save button remains stable while toggling measurements */}

      <WorkoutEntrySection
        eyebrow="Entry"
        title="Measurement entry"
        description="Use the shared measurement system to capture the values for the set you are about to save."
        className="border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))]"
      >
        <ModifyMeasurements
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
            setActiveMetrics((current) => ({ ...current, [metric]: !current[metric] }));
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
          tapFeedbackClass={tapFeedbackClass}
          showHeader={false}
        />
      </WorkoutEntrySection>

      <WorkoutEntrySection
        eyebrow="Effort"
        title="Finish this set"
        description="Add optional effort details before you commit this set to the log."
        className="border-white/8 bg-[rgb(var(--surface-rgb)/0.42)]"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="relative rounded-2xl border border-white/8 bg-white/5 p-3">
              <div className="mb-1 flex items-center gap-1">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">RPE</span>
                <button
                  type="button"
                  onClick={() => setShowRpeTooltip((value) => !value)}
                  className="rounded-full border border-border/70 px-1.5 py-0.5 text-[10px] text-muted"
                >
                  ⓘ
                </button>
              </div>
              {showRpeTooltip ? (
                <div className="pointer-events-none absolute left-3 top-full z-10 mt-1 w-44 rounded-md border border-border/70 bg-surface p-2 text-[11px] text-muted shadow-sm">
                  <p className="font-medium text-text">RPE (1–10)</p>
                  <p>10 = max effort</p>
                  <p>8 = ~2 reps left</p>
                  <p>6 = moderate effort</p>
                </div>
              ) : null}
              <input
                type="number"
                min={0}
                step="0.5"
                value={rpe}
                onChange={(event) => setRpe(event.target.value)}
                placeholder="RPE"
                className="min-h-11 w-full rounded-xl border border-border/55 bg-surface/70 px-3 py-2 text-sm"
              />
            </div>
            <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-3 py-3 text-sm text-text">
              <input
                type="checkbox"
                checked={isWarmup}
                onChange={(event) => setIsWarmup(event.target.checked)}
                className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
              />
              <span>
                <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Warm-up</span>
                <span className="block text-sm text-text">Mark this set as prep work</span>
              </span>
            </label>
          </div>
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
      </WorkoutEntrySection>

      <WorkoutEntrySection
        eyebrow="Review"
        title="Logged sets"
        description="Review saved and queued work here before you move on to the next set."
        aside={<p className="text-xs text-muted">{sets.length} total</p>}
        className="border-white/8 bg-[rgb(var(--surface-rgb)/0.42)]"
        contentClassName="space-y-0"
      >
        <ul className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-white/8 bg-surface/45 text-sm">
        {animatedSets.map((set, index) => (
          <li
            key={set.id}
            className={[
              "bg-surface/70 px-3 py-2",
              "origin-top transition-all duration-150 motion-reduce:transition-none",
              set.isLeaving ? "max-h-0 scale-[0.98] py-0 opacity-0" : "max-h-20 scale-100 opacity-100",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <span>
                  {isCardio ? "Interval" : "Set"} {index + 1}
                  {set.queueStatus ? ` · ${set.queueStatus}` : ""}
                  {set.pending && !set.queueStatus ? " · saving..." : ""}
                </span>
                <MeasurementSummary
                  values={{
                    reps: set.reps,
                    weight: set.weight,
                    weightUnit: set.weight_unit ?? unitLabel,
                    durationSeconds: set.duration_seconds,
                    distance: set.distance,
                    distanceUnit: set.distance_unit,
                    calories: set.calories,
                  }}
                  emptyLabel="No measurements"
                  className="mt-1"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleDeleteSet(set);
                }}
                aria-label="Remove set"
                className={`rounded-md px-1.5 py-1 text-xs text-muted hover:bg-surface-2-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
        {sets.length === 0 ? <li className="px-3 py-4 text-slate-400">No {isCardio ? "intervals" : "sets"} logged yet. Save one to start the review list.</li> : null}
        </ul>
      </WorkoutEntrySection>

    </div>
  );
}
