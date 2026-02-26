"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SetRow } from "@/types/db";
import {
  enqueueSetLog,
  readQueuedSetLogsBySessionExerciseId,
  removeSetLogQueueItem,
  type SetLogQueueItem,
} from "@/lib/offline/set-log-queue";
import { createSetLogSyncEngine } from "@/lib/offline/sync-engine";
import { SecondaryButton } from "@/components/ui/AppButton";
import { useToast } from "@/components/ui/ToastProvider";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
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

function formatSetMetrics(set: SetRow, fallbackWeightUnit: string) {
  const parts: string[] = [];
  if (set.reps > 0 || set.weight > 0) {
    parts.push(`${set.weight} ${set.weight_unit ?? fallbackWeightUnit} × ${set.reps} reps`);
  }
  if (set.duration_seconds !== null && set.duration_seconds > 0) {
    parts.push(formatSeconds(set.duration_seconds));
  }
  if (set.distance !== null && set.distance > 0) {
    parts.push(`${set.distance} ${set.distance_unit ?? "mi"}`);
  }
  if (set.calories !== null && set.calories > 0) {
    parts.push(`${set.calories} cal`);
  }
  return parts.length > 0 ? parts.join(" • ") : "No metrics";
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

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function SessionTimerCard({
  sessionId,
  initialDurationSeconds,
  onDurationChange,
  persistDurationAction,
}: {
  sessionId: string;
  initialDurationSeconds: number | null;
  onDurationChange: (value: number) => void;
  persistDurationAction: (payload: { sessionId: string; durationSeconds: number }) => Promise<ActionResult>;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialDurationSeconds ?? 0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const key = `session-timer:${sessionId}`;
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { elapsedSeconds?: number; isRunning?: boolean; runningStartedAt?: number | null };
      const baseElapsed = Number.isFinite(parsed.elapsedSeconds) ? Number(parsed.elapsedSeconds) : 0;
      if (parsed.isRunning && Number.isFinite(parsed.runningStartedAt)) {
        const elapsedFromStart = Math.max(0, Math.floor((Date.now() - Number(parsed.runningStartedAt)) / 1000));
        setElapsedSeconds(Math.max(baseElapsed, elapsedFromStart));
        setIsRunning(true);
        return;
      }

      setElapsedSeconds(baseElapsed);
      setIsRunning(false);
    } catch {
      window.localStorage.removeItem(key);
    }
  }, [sessionId]);

  useEffect(() => {
    onDurationChange(elapsedSeconds);
  }, [elapsedSeconds, onDurationChange]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    const key = `session-timer:${sessionId}`;
    const payload = JSON.stringify({
      elapsedSeconds,
      isRunning,
      runningStartedAt: isRunning ? Date.now() - (elapsedSeconds * 1000) : null,
      updatedAt: Date.now(),
    });
    window.localStorage.setItem(key, payload);
  }, [elapsedSeconds, isRunning, sessionId]);

  useEffect(() => {
    const handleBackgroundPersist = () => {
      if (!isRunning) {
        return;
      }
      void persistDurationAction({ sessionId, durationSeconds: elapsedSeconds });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleBackgroundPersist();
      }
    };

    window.addEventListener("pagehide", handleBackgroundPersist);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handleBackgroundPersist);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [elapsedSeconds, isRunning, persistDurationAction, sessionId]);

  return (
    <section className="space-y-2 rounded-md bg-white p-3 shadow-sm">
      <h2 className="text-sm font-semibold">Timer</h2>
      <p className="text-3xl font-semibold tabular-nums">{formatSeconds(elapsedSeconds)}</p>
      <div className="grid grid-cols-2 gap-2">
        <SecondaryButton
          type="button"
          onClick={async () => {
            if (isRunning) {
              await persistDurationAction({ sessionId, durationSeconds: elapsedSeconds });
            }
            setIsRunning((value) => !value);
          }}
          className={tapFeedbackClass}
        >
          {isRunning ? "Pause" : "Start"}
        </SecondaryButton>
        <SecondaryButton
          type="button"
          onClick={async () => {
            setIsRunning(false);
            setElapsedSeconds(0);
            await persistDurationAction({ sessionId, durationSeconds: 0 });
          }}
          className={tapFeedbackClass}
        >
          Reset
        </SecondaryButton>
      </div>
    </section>
  );
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
  resetSignal,
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
  // - Open cardio exercise: defaults to time input and can add distance/reps/weight/calories via + Add Measurement.
  // - Strength exercise defaults remain reps + weight.
  // - History view behavior is out of scope for this step.
  const [weight, setWeight] = useState(prefill?.weight !== undefined ? String(prefill.weight) : "");
  const [selectedWeightUnit, setSelectedWeightUnit] = useState<"lbs" | "kg">(prefill?.weightUnit ?? (unitLabel === "kg" ? "kg" : "lbs"));
  const [reps, setReps] = useState(prefill?.reps !== undefined ? String(prefill.reps) : "");
  const [durationInput, setDurationInput] = useState(prefill?.durationSeconds !== undefined ? formatSeconds(prefill.durationSeconds) : "");
  const [distance, setDistance] = useState("");
  const [distanceUnit, setDistanceUnit] = useState<"mi" | "km" | "m">(defaultDistanceUnit ?? "mi");
  const [calories, setCalories] = useState("");
  const [rpe, setRpe] = useState("");
  const [isWarmup, setIsWarmup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sets, setSets] = useState<DisplaySet[]>(initialSets);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tapReps, setTapReps] = useState(0);
  const [useTimerRepCount, setUseTimerRepCount] = useState(false);
  const [activeMetrics, setActiveMetrics] = useState(initialEnabledMetrics);
  const [hasUserModifiedMetrics, setHasUserModifiedMetrics] = useState(false);
  const [animatedSets, setAnimatedSets] = useState<AnimatedDisplaySet[]>(initialSets);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const repsInputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();

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

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  const averageSecondsPerRep = useMemo(() => {
    if (tapReps <= 0) {
      return null;
    }
    return (elapsedSeconds / tapReps).toFixed(1);
  }, [elapsedSeconds, tapReps]);

  const requiresReps = activeMetrics.reps;
  const requiresDuration = activeMetrics.time;
  const requiresDistance = activeMetrics.distance;
  const parsedDurationForSave = parseDurationInput(durationInput);
  const parsedDistanceForSave = distance.trim() ? Number(distance) : null;
  const parsedRepsForSave = (useTimerRepCount ? String(tapReps) : reps).trim() ? Number(useTimerRepCount ? tapReps : reps) : 0;
  const isSaveDisabled = isSubmitting
    || (requiresReps && (!Number.isFinite(parsedRepsForSave) || parsedRepsForSave <= 0))
    || (requiresDuration && (parsedDurationForSave === null || parsedDurationForSave <= 0))
    || (requiresDistance && (!Number.isFinite(parsedDistanceForSave) || (parsedDistanceForSave ?? 0) <= 0));

  const resetTimerState = useCallback(() => {
    setIsRunning(false);
    setElapsedSeconds(0);
    setTapReps(0);
    setDurationInput("");
    setUseTimerRepCount(false);
    if (activeMetrics.reps) {
      setReps("");
    }
  }, [activeMetrics.reps]);

  useEffect(() => {
    if (!resetSignal) {
      return;
    }

    resetTimerState();
  }, [resetSignal, resetTimerState]);

  async function handleLogSet() {
    const parsedWeight = weight.trim() ? Number(weight) : 0;
    const parsedReps = (useTimerRepCount ? String(tapReps) : reps).trim() ? Number(useTimerRepCount ? tapReps : reps) : 0;
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
      const message = useTimerRepCount ? "Tapped reps must be 0 or greater." : "Reps must be 0 or greater.";
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
    repsInputRef.current?.focus();
    setIsSubmitting(false);
  }


  async function handleDeleteSet(set: DisplaySet) {
    if (set.pending || set.queueStatus) {
      await removeSetLogQueueItem(set.id);
      setSets((current) => current.filter((item) => item.id !== set.id));
      toast.success("Queued set removed.");
      return;
    }

    const result = await deleteSetAction({
      sessionId,
      sessionExerciseId,
      setId: set.id,
    });

    if (!result.ok) {
      toast.error(result.error || "Could not remove set.");
      return;
    }

    setSets((current) => current.filter((item) => item.id !== set.id));
    toast.success("Set removed.");
  }

  return (
    <div className="space-y-2">
      <section className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{isCardio ? "Interval Timer" : "Set Timer"}</h3>
        <p className="text-xl font-semibold tabular-nums">{formatSeconds(elapsedSeconds)}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (isRunning) {
                setDurationInput(formatSeconds(elapsedSeconds));
              }
              setIsRunning((value) => !value);
            }}
            className={`rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}
          >
            {isRunning ? "Pause" : "Start"}
          </button>
          <button
            type="button"
            onClick={() => {
              resetTimerState();
            }}
            className={`rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}
          >
            Reset
          </button>
        </div>
      </section>

      {isRunning && activeMetrics.reps ? (
        <div className="space-y-2 rounded-md bg-slate-50 p-2">
          <button
            type="button"
            onClick={() => {
              setTapReps((value) => {
                const nextValue = value + 1;
                setReps(String(nextValue));
                return nextValue;
              });
              setUseTimerRepCount(true);
            }}
            className={`w-full rounded-md bg-accent px-4 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}
          >
            Tap Rep
          </button>
          <p className="text-sm">
            Reps tapped: <span className="font-semibold">{tapReps} reps</span>
            {averageSecondsPerRep ? <span> · Avg {averageSecondsPerRep} sec/rep</span> : null}
          </p>
        </div>
      ) : null}

      {useTimerRepCount && activeMetrics.reps ? <p className="text-xs text-slate-600">Logging reps from timer taps ({tapReps}). Edit reps input to switch back.</p> : null}

      <details className="rounded-md border border-slate-200 bg-white px-2 py-2">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Modify Measurements</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["reps", "weight", "time", "distance", "calories"] as const).map((metric) => (
            <button
              key={metric}
              type="button"
              onClick={() => {
                setHasUserModifiedMetrics(true);
                setActiveMetrics((current) => ({ ...current, [metric]: !current[metric] }));
              }}
              className={`rounded-md border px-2 py-1 text-xs ${activeMetrics[metric] ? "border-accent bg-accent/10 text-accent-strong" : "border-slate-300 text-slate-600"}`}
            >
              {activeMetrics[metric] ? "Hide" : "Show"} {metric}
            </button>
          ))}
        </div>
      </details>

      <div className="grid grid-cols-2 gap-2">
        {activeMetrics.weight ? (
          <>
            <input
              type="number"
              min={0}
              step="0.5"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder={`Weight (${selectedWeightUnit})`}
              className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            />
            <select
              value={selectedWeightUnit}
              onChange={(event) => setSelectedWeightUnit(event.target.value === "kg" ? "kg" : "lbs")}
              className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="lbs">lbs</option>
              <option value="kg">kg</option>
            </select>
          </>
        ) : null}

        {activeMetrics.reps ? (
          <>
            <input
              type="number"
              ref={repsInputRef}
              min={0}
              value={reps}
              onChange={(event) => {
                setReps(event.target.value);
                setUseTimerRepCount(false);
              }}
              placeholder="Reps (count)"
              className="col-span-2 rounded-md border border-slate-300 px-2 py-2 text-sm"
            />
          </>
        ) : null}

        {activeMetrics.time ? (
          <input
            type="text"
            inputMode="numeric"
            value={durationInput}
            onChange={(event) => setDurationInput(event.target.value)}
            placeholder="Time (mm:ss)"
            className={`rounded-md border border-slate-300 px-2 py-2 text-sm ${activeMetrics.distance ? "" : "col-span-2"}`}
          />
        ) : null}

        {activeMetrics.distance ? (
          <>
            <input
              type="number"
              min={0}
              step="0.01"
              value={distance}
              onChange={(event) => setDistance(event.target.value)}
              placeholder="Distance"
              className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            />
            <select
              value={distanceUnit}
              onChange={(event) => setDistanceUnit(event.target.value as "mi" | "km" | "m")}
              className="rounded-md border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="mi">mi</option>
              <option value="km">km</option>
              <option value="m">m</option>
            </select>
          </>
        ) : null}

        {activeMetrics.calories ? (
          <input
            type="number"
            min={0}
            step="1"
            value={calories}
            onChange={(event) => setCalories(event.target.value)}
            placeholder="Calories (optional)"
            className="rounded-md border border-slate-300 px-2 py-2 text-sm"
          />
        ) : null}
        <div className="col-span-2 space-y-1">
          <input
            type="number"
            min={0}
            step="0.5"
            value={rpe}
            onChange={(event) => setRpe(event.target.value)}
            placeholder="RPE"
            className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm"
          />
          <p className="text-[11px] text-slate-500">RPE (1–10): perceived effort. 10 = all-out.</p>
        </div>
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isWarmup} onChange={(event) => setIsWarmup(event.target.checked)} />
          Warm-up set
        </label>
        <button
          type="button"
          onClick={handleLogSet}
          disabled={isSaveDisabled}
          className={`col-span-2 rounded-md bg-accent px-3 py-2 text-sm text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:opacity-60 ${tapFeedbackClass}`}
        >
          Save set
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <ul className="space-y-1 text-sm">
        {animatedSets.map((set, index) => (
          <li
            key={set.id}
            className={[
              "rounded-md bg-slate-50 px-2 py-1",
              "origin-top transition-all duration-150 motion-reduce:transition-none",
              set.isLeaving ? "max-h-0 scale-[0.98] py-0 opacity-0" : "max-h-20 scale-100 opacity-100",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-2">
              <span>
                {isCardio ? "Interval" : "Set"} {index + 1} · {formatSetMetrics(set, unitLabel)}
                {set.queueStatus ? ` · ${set.queueStatus}` : ""}
                {set.pending && !set.queueStatus ? " · saving..." : ""}
              </span>
              <button
                type="button"
                onClick={() => {
                  void handleDeleteSet(set);
                }}
                className={`rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {sets.length === 0 ? <li className="text-slate-500">No {isCardio ? "intervals" : "sets"} logged.</li> : null}
      </ul>
    </div>
  );
}
