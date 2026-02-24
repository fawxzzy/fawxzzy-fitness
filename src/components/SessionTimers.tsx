"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SetRow } from "@/types/db";
import {
  enqueueSetLog,
  readQueuedSetLogsBySessionExerciseId,
  type SetLogQueueItem,
} from "@/lib/offline/set-log-queue";
import { createSetLogSyncEngine } from "@/lib/offline/sync-engine";
import { useToast } from "@/components/ui/ToastProvider";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import type { ActionResult } from "@/lib/action-result";

type AddSetPayload = {
  sessionId: string;
  sessionExerciseId: string;
  weight: number;
  reps: number;
  durationSeconds: number | null;
  isWarmup: boolean;
  rpe: number | null;
  notes: string | null;
  weightUnit: "lbs" | "kg";
  clientLogId?: string;
};

type AddSetActionResult = ActionResult<{ set: SetRow }>;

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
        const deltaSeconds = Math.max(0, Math.floor((Date.now() - Number(parsed.runningStartedAt)) / 1000));
        setElapsedSeconds(baseElapsed + deltaSeconds);
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
      <h2 className="text-sm font-semibold">Session Timer</h2>
      <p className="text-3xl font-semibold tabular-nums">{formatSeconds(elapsedSeconds)}</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={async () => {
            if (isRunning) {
              await persistDurationAction({ sessionId, durationSeconds: elapsedSeconds });
            }
            setIsRunning((value) => !value);
          }}
          className={`rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          type="button"
          onClick={async () => {
            setIsRunning(false);
            setElapsedSeconds(0);
            await persistDurationAction({ sessionId, durationSeconds: 0 });
          }}
          className={`rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}
        >
          Reset
        </button>
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
}) {
  const [weight, setWeight] = useState("");
  const [selectedWeightUnit, setSelectedWeightUnit] = useState<"lbs" | "kg">(unitLabel === "kg" ? "kg" : "lbs");
  const [reps, setReps] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [rpe, setRpe] = useState("");
  const [isWarmup, setIsWarmup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sets, setSets] = useState<DisplaySet[]>(initialSets);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tapReps, setTapReps] = useState(0);
  const [useTimerRepCount, setUseTimerRepCount] = useState(false);
  const [animatedSets, setAnimatedSets] = useState<AnimatedDisplaySet[]>(initialSets);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const repsInputRef = useRef<HTMLInputElement | null>(null);
  const toast = useToast();

  useEffect(() => {
    onSetCountChange?.(sets.length);
  }, [onSetCountChange, sets.length]);

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

  async function handleLogSet() {
    const parsedWeight = Number(weight);
    const parsedReps = Number(useTimerRepCount ? tapReps : reps);
    const parsedDuration = durationSeconds.trim() ? Number(durationSeconds) : null;
    const parsedRpe = rpe.trim() ? Number(rpe) : null;

    if (!Number.isFinite(parsedWeight) || !Number.isFinite(parsedReps) || parsedWeight < 0 || parsedReps < 0) {
      const message = useTimerRepCount ? "Weight and tapped reps must be 0 or greater." : "Weight and reps must be 0 or greater.";
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

    setDurationSeconds("");
    setWeight(String(parsedWeight));
    setReps(String(parsedReps));
    setRpe(parsedRpe === null ? "" : String(parsedRpe));
    setIsWarmup(isWarmup);
    repsInputRef.current?.focus();
    setIsSubmitting(false);
  }

  return (
    <div className="space-y-2">
      <section className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Set Timer</h3>
        <p className="text-xl font-semibold tabular-nums">{formatSeconds(elapsedSeconds)}</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (isRunning) {
                setDurationSeconds(String(elapsedSeconds));
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
              setIsRunning(false);
              setElapsedSeconds(0);
              setTapReps(0);
              setDurationSeconds("");
              setUseTimerRepCount(false);
            }}
            className={`rounded-md border border-slate-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}
          >
            Reset
          </button>
        </div>
      </section>

      {isRunning ? (
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

      {useTimerRepCount ? <p className="text-xs text-slate-600">Logging reps from timer taps ({tapReps}). Edit reps input to switch back.</p> : null}

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={0}
          step="0.5"
          required
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
        <input
          type="number"
          ref={repsInputRef}
          min={0}
          required
          value={reps}
          onChange={(event) => {
            setReps(event.target.value);
            setUseTimerRepCount(false);
          }}
          placeholder="Reps (count)"
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          value={durationSeconds}
          onChange={(event) => setDurationSeconds(event.target.value)}
          placeholder="Time (sec)"
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        />
        <input
          type="number"
          min={0}
          step="0.5"
          value={rpe}
          onChange={(event) => setRpe(event.target.value)}
          placeholder="RPE"
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        />
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isWarmup} onChange={(event) => setIsWarmup(event.target.checked)} />
          Warm-up set
        </label>
        <button
          type="button"
          onClick={handleLogSet}
          disabled={isSubmitting}
          className={`col-span-2 rounded-md bg-accent px-3 py-2 text-sm text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:opacity-60 ${tapFeedbackClass}`}
        >
          Log Set
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <ul className="space-y-1 text-sm">
        {animatedSets.map((set) => (
          <li
            key={set.id}
            className={[
              "rounded-md bg-slate-50 px-2 py-1",
              "origin-top transition-all duration-150 motion-reduce:transition-none",
              set.isLeaving ? "max-h-0 scale-[0.98] py-0 opacity-0" : "max-h-20 scale-100 opacity-100",
            ].join(" ")}
          >
            Set {set.set_index + 1} · {set.weight} {set.weight_unit ?? unitLabel} × {set.reps} reps
            {set.duration_seconds !== null ? ` · ${set.duration_seconds} sec` : ""}
            {set.queueStatus ? ` · ${set.queueStatus}` : ""}
            {set.pending && !set.queueStatus ? " · saving..." : ""}
          </li>
        ))}
        {sets.length === 0 ? <li className="text-slate-500">No sets logged.</li> : null}
      </ul>
    </div>
  );
}
