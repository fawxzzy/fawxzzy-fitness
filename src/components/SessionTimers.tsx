"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
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
import { useUndoAction } from "@/components/ui/useUndoAction";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import { InlineHintInput } from "@/components/ui/InlineHintInput";
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

function formatSetMetrics(set: SetRow, fallbackWeightUnit: string) {
  const parts: string[] = [];
  if (set.reps > 0 || set.weight > 0) {
    parts.push(`${set.weight} ${set.weight_unit ?? fallbackWeightUnit} × ${set.reps} reps`);
  }
  if (set.duration_seconds !== null && set.duration_seconds > 0) {
    parts.push(formatDurationClock(set.duration_seconds));
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
  const metricsPanelId = useId();

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

  async function handleLogSet() {
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
  }


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

      <div className="overflow-hidden rounded-lg border border-border/80 bg-surface-2-soft/70">
        <button
          type="button"
          aria-expanded={isMetricsExpanded}
          aria-controls={metricsPanelId}
          onClick={() => setIsMetricsExpanded((current) => !current)}
          className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-surface-2-soft active:bg-surface-2-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 [-webkit-tap-highlight-color:transparent] ${tapFeedbackClass}`}
        >
          <span className="text-xs font-medium text-[rgb(var(--text)/0.72)]">Modify measurements</span>
          {isMetricsExpanded ? (
            <ChevronUpIcon className="h-4 w-4 shrink-0 text-[rgb(var(--text)/0.72)]" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 shrink-0 text-[rgb(var(--text)/0.72)]" />
          )}
        </button>
        {isMetricsExpanded ? (
          <div id={metricsPanelId} className="flex flex-wrap gap-2 border-t border-border/70 bg-surface/65 p-2.5">
            {(["reps", "weight", "time", "distance", "calories"] as const).map((metric) => (
              <button
                key={metric}
                type="button"
                onClick={() => {
                  setHasUserModifiedMetrics(true);
                  setActiveMetrics((current) => ({ ...current, [metric]: !current[metric] }));
                }}
                className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${activeMetrics[metric] ? "border-emerald-300/45 bg-emerald-400/15 text-emerald-100" : "border-white/15 bg-surface-2-soft text-[rgb(var(--text)/0.85)]"}`}
              >
                {activeMetrics[metric] ? "Hide" : "Show"} {metric}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-border/70 bg-surface/70 p-3">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className={`col-span-2 overflow-hidden transition-all duration-200 ease-out ${activeMetrics.reps ? "max-h-24 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
              <InlineHintInput
                type="number"
                min={0}
                value={reps}
                onChange={(event) => {
                  setReps(event.target.value);
                }}
                hint="reps"
              />
            </div>

            <div className={`col-span-2 overflow-hidden transition-all duration-200 ease-out ${activeMetrics.weight ? "max-h-24 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <InlineHintInput
                  type="number"
                  min={0}
                  step="0.5"
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  hint={selectedWeightUnit}
                />
                <select
                  value={selectedWeightUnit}
                  onChange={(event) => setSelectedWeightUnit(event.target.value === "kg" ? "kg" : "lbs")}
                  className="min-h-11 rounded-md border border-border/70 bg-surface-2-soft px-3 py-2 text-sm"
                >
                  <option value="lbs">lbs</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>

            <div className={`col-span-2 overflow-hidden transition-all duration-200 ease-out ${activeMetrics.time ? "max-h-24 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
              <InlineHintInput
                type="text"
                inputMode="numeric"
                value={durationInput}
                onChange={(event) => setDurationInput(event.target.value)}
                hint="mm:ss"
              />
            </div>

            <div className={`col-span-2 overflow-hidden transition-all duration-200 ease-out ${activeMetrics.distance ? "max-h-24 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <InlineHintInput
                  type="number"
                  min={0}
                  step="0.01"
                  value={distance}
                  onChange={(event) => setDistance(event.target.value)}
                  hint={distanceUnit}
                />
                <select
                  value={distanceUnit}
                  onChange={(event) => setDistanceUnit(event.target.value as "mi" | "km" | "m")}
                  className="min-h-11 rounded-md border border-border/70 bg-surface-2-soft px-3 py-2 text-sm"
                >
                  <option value="mi">mi</option>
                  <option value="km">km</option>
                  <option value="m">m</option>
                </select>
              </div>
            </div>

            <div className={`col-span-2 overflow-hidden transition-all duration-200 ease-out ${activeMetrics.calories ? "max-h-24 translate-y-0 opacity-100" : "max-h-0 -translate-y-1 opacity-0"}`}>
              <InlineHintInput
                type="number"
                min={0}
                step="1"
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
                hint="cal"
              />
            </div>

            <div className="col-span-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="relative">
                <div className="mb-1 flex items-center gap-1">
                  <span className="text-[11px] font-medium text-slate-600">RPE</span>
                  <button
                    type="button"
                    onClick={() => setShowRpeTooltip((value) => !value)}
                    className="rounded-full border border-border/70 px-1.5 py-0.5 text-[10px] text-muted"
                  >
                    ⓘ
                  </button>
                </div>
                {showRpeTooltip ? (
                  <div className="pointer-events-none absolute left-0 top-full z-10 mt-1 w-44 rounded-md border border-border/70 bg-surface p-2 text-[11px] text-muted shadow-sm">
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
                  className="min-h-11 w-full rounded-md border border-border/70 bg-surface-2-soft px-3 py-2 text-sm"
                />
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  checked={isWarmup}
                  onChange={(event) => setIsWarmup(event.target.checked)}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                />
                Warm-up
              </label>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-20 -mx-3 mt-3 border-t border-white/10 bg-surface/95 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur">
          <AppButton type="button" onClick={handleLogSet} disabled={isSaveDisabled} variant="primary" fullWidth>
            Save set
          </AppButton>
        </div>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <ul className="divide-y divide-border/70 overflow-hidden rounded-md border border-border/70 bg-surface/70 text-sm">
        {animatedSets.map((set, index) => (
          <li
            key={set.id}
            className={[
              "bg-surface/70 px-3 py-2",
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
                aria-label="Remove set"
                className={`rounded-md px-1.5 py-1 text-xs text-muted hover:bg-surface-2-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}
              >
                ✕
              </button>
            </div>
          </li>
        ))}
        {sets.length === 0 ? <li className="px-3 py-2 text-slate-500">No {isCardio ? "intervals" : "sets"} logged.</li> : null}
      </ul>
    </div>
  );
}
