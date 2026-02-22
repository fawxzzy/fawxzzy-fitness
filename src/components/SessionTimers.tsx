"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SetRow } from "@/types/db";
import {
  enqueueSetLog,
  readQueuedSetLogsBySessionExerciseId,
  type SetLogQueueItem,
} from "@/lib/offline/set-log-queue";
import { createSetLogSyncEngine } from "@/lib/offline/sync-engine";

type AddSetPayload = {
  sessionId: string;
  sessionExerciseId: string;
  weight: number;
  reps: number;
  durationSeconds: number | null;
  isWarmup: boolean;
  rpe: number | null;
  notes: string | null;
  clientLogId?: string;
};

type AddSetActionResult = {
  ok: boolean;
  error?: string;
  set?: SetRow;
};

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
  persistDurationAction: (payload: { sessionId: string; durationSeconds: number }) => Promise<{ ok: boolean }>;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialDurationSeconds ?? 0);
  const [isRunning, setIsRunning] = useState(false);

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
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
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
}: {
  sessionId: string;
  sessionExerciseId: string;
  addSetAction: (payload: AddSetPayload) => Promise<AddSetActionResult>;
  syncQueuedSetLogsAction: (payload: {
    items: SetLogQueueItem[];
  }) => Promise<{ ok: boolean; results: Array<{ queueItemId: string; ok: boolean; serverSetId?: string; error?: string }> }>;
  unitLabel: string;
  initialSets: SetRow[];
}) {
  const [weight, setWeight] = useState("");
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
  const [animatedSets, setAnimatedSets] = useState<AnimatedDisplaySet[]>(initialSets);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const repsInputRef = useRef<HTMLInputElement | null>(null);

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
    const parsedReps = Number(reps);
    const parsedDuration = durationSeconds.trim() ? Number(durationSeconds) : null;
    const parsedRpe = rpe.trim() ? Number(rpe) : null;

    if (!Number.isFinite(parsedWeight) || !Number.isFinite(parsedReps) || parsedWeight < 0 || parsedReps < 0) {
      setError("Weight and reps must be 0 or greater.");
      return;
    }

    if (parsedDuration !== null && (!Number.isInteger(parsedDuration) || parsedDuration < 0)) {
      setError("Time must be an integer in seconds.");
      return;
    }

    if (parsedRpe !== null && (!Number.isFinite(parsedRpe) || parsedRpe < 0)) {
      setError("RPE must be 0 or greater.");
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
      setError(queued ? "Offline: set queued for sync." : "Offline: unable to save set locally.");
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
      });

      if (!result.ok || !result.set) {
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
        setError(queued ? "Could not reach server. Set queued for sync." : result.error ?? "Could not log set.");
        setIsSubmitting(false);
        return;
      }

      setSets((current) => current.map((item) => (item.id === pendingId ? result.set! : item)));
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
      setError(queued ? "Request failed. Set queued for sync." : "Could not log set.");
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
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setElapsedSeconds(0);
            setTapReps(0);
            setDurationSeconds("");
            setIsRunning(true);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          Start Set
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRunning(false);
            setDurationSeconds(String(elapsedSeconds));
            if (tapReps > 0) {
              setReps(String(tapReps));
            }
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          Stop
        </button>
      </div>

      <p className="text-sm text-slate-600">Set timer: {formatSeconds(elapsedSeconds)}</p>

      {isRunning ? (
        <div className="space-y-2 rounded-md bg-slate-50 p-2">
          <button
            type="button"
            onClick={() => setTapReps((value) => value + 1)}
            className="w-full rounded-md bg-accent px-4 py-4 text-base font-semibold text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          >
            Tap Rep
          </button>
          <p className="text-sm">
            Reps tapped: <span className="font-semibold">{tapReps}</span>
            {averageSecondsPerRep ? <span> · Avg {averageSecondsPerRep}s/rep</span> : null}
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={0}
          step="0.5"
          required
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          placeholder="Weight"
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        />
        <input
          type="number"
          ref={repsInputRef}
          min={0}
          required
          value={reps}
          onChange={(event) => setReps(event.target.value)}
          placeholder="Reps"
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
          className="col-span-2 rounded-md bg-accent px-3 py-2 text-sm text-white transition-colors hover:bg-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:opacity-60"
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
            #{set.set_index + 1} · {set.weight} {unitLabel} × {set.reps}
            {set.duration_seconds !== null ? ` · ${set.duration_seconds}s` : ""}
            {set.queueStatus ? ` · ${set.queueStatus}` : ""}
            {set.pending && !set.queueStatus ? " · saving..." : ""}
          </li>
        ))}
        {sets.length === 0 ? <li className="text-slate-500">No sets logged.</li> : null}
      </ul>
    </div>
  );
}
