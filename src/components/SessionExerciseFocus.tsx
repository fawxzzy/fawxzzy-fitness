"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SetLoggerCard } from "@/components/SessionTimers";
import { AppButton } from "@/components/ui/AppButton";
import { useToast } from "@/components/ui/ToastProvider";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import type { SetRow } from "@/types/db";

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
};

type AddSetActionResult = ActionResult<{ set: SetRow }>;

type SyncQueuedSetLogsAction = (payload: {
  items: Array<{
    id: string;
    clientLogId: string;
    sessionId: string;
    sessionExerciseId: string;
    payload: {
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
    };
  }>;
}) => Promise<ActionResult<{ results: Array<{ queueItemId: string; ok: boolean; serverSetId?: string; error?: string }> }>>;

type SessionExercisePrefill = {
  weight?: number;
  reps?: number;
  durationSeconds?: number;
  weightUnit?: "lbs" | "kg";
};

type SessionExerciseFocusItem = {
  id: string;
  name: string;
  isSkipped: boolean;
  defaultUnit: "mi" | "km" | "m" | null;
  isCardio: boolean;
  initialEnabledMetrics: {
    reps: boolean;
    weight: boolean;
    time: boolean;
    distance: boolean;
    calories: boolean;
  };
  routineDayExerciseId: string | null;
  planTargetsHash: string | null;
  goalStatLine: { primary: string; secondary: string[] } | null;
  prefill?: SessionExercisePrefill;
  initialSets: SetRow[];
  loggedSetCount: number;
};

export function SessionExerciseFocus({
  sessionId,
  unitLabel,
  exercises,
  addSetAction,
  syncQueuedSetLogsAction,
  toggleSkipAction,
  removeExerciseAction,
  deleteSetAction,
}: {
  sessionId: string;
  unitLabel: string;
  exercises: SessionExerciseFocusItem[];
  addSetAction: (payload: AddSetPayload) => Promise<AddSetActionResult>;
  syncQueuedSetLogsAction: SyncQueuedSetLogsAction;
  toggleSkipAction: (formData: FormData) => Promise<ActionResult>;
  removeExerciseAction: (formData: FormData) => Promise<ActionResult>;
  deleteSetAction: (payload: { sessionId: string; sessionExerciseId: string; setId: string }) => Promise<ActionResult>;
}) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [removingExerciseIds, setRemovingExerciseIds] = useState<string[]>([]);
  const [setLoggerResetSignal, setSetLoggerResetSignal] = useState(0);
  const [loggedSetCounts, setLoggedSetCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.loggedSetCount])),
  );
  const focusedRef = useRef<HTMLElement | null>(null);
  const selectedExercise = useMemo(
    () => exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null,
    [exercises, selectedExerciseId],
  );
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!selectedExerciseId || !focusedRef.current) return;
    focusedRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedExerciseId]);

  useEffect(() => {
    setLoggedSetCounts((current) => {
      const next = Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.loggedSetCount]));
      for (const exercise of exercises) {
        const existing = current[exercise.id];
        if (typeof existing === "number" && existing > (next[exercise.id] ?? 0)) {
          next[exercise.id] = existing;
        }
      }
      return next;
    });
  }, [exercises]);

  useEffect(() => {
    if (!selectedExerciseId) {
      return;
    }

    const closeSelectedExercise = () => {
      setSetLoggerResetSignal((value) => value + 1);
      setSelectedExerciseId(null);
    };

    const handlePopState = () => {
      closeSelectedExercise();
    };

    const handleCloseRequest = () => {
      closeSelectedExercise();
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("session-exercise-focus:close-request", handleCloseRequest);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("session-exercise-focus:close-request", handleCloseRequest);
    };
  }, [selectedExerciseId]);

  return (
    <div className="space-y-3">
      {selectedExerciseId === null ? (
        <ul className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border/70 bg-surface/70">
          {exercises.map((exercise) => {
            const isRemoving = removingExerciseIds.includes(exercise.id);
            const setCount = loggedSetCounts[exercise.id] ?? exercise.loggedSetCount;

            return (
              <li
                key={exercise.id}
                className={[
                  "origin-top transition-all duration-150 motion-reduce:transition-none",
                  isRemoving ? "max-h-0 scale-[0.98] opacity-0" : "max-h-32 scale-100 opacity-100",
                ].join(" ")}
              >
                <button
                  type="button"
                  aria-label={`Open ${exercise.name}`}
                  onClick={() => setSelectedExerciseId(exercise.id)}
                  className={`w-full bg-transparent p-3 text-left transition-colors duration-150 motion-reduce:transition-none ${tapFeedbackClass} hover:bg-surface-2-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{exercise.name}</p>
                      <span className="rounded-full border border-border/70 bg-surface-2-soft px-2 py-0.5 text-xs font-medium text-text">
                        {setCount} {exercise.isCardio ? `interval${setCount === 1 ? "" : "s"}` : `set${setCount === 1 ? "" : "s"}`}
                      </span>
                    </div>
                    <span aria-hidden="true" className="text-muted">›</span>
                  </div>
                  {exercise.goalStatLine ? (
                    <p className="mt-1 flex flex-wrap items-center gap-x-1 text-xs text-muted">
                      <span className="whitespace-nowrap font-semibold text-text">{exercise.goalStatLine.primary || "Open"}</span>
                      {exercise.goalStatLine.secondary.map((part) => (
                        <span key={part} className="whitespace-nowrap text-muted">
                          • {part}
                        </span>
                      ))}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted">Goal: Open</p>
                  )}
                  {exercise.isSkipped ? <p className="mt-1 text-xs text-amber-300">Skipped</p> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="glass-surface glass-sheen rounded-md p-2">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-0.5">
              <p className="text-base font-semibold">{selectedExercise?.name ?? "Exercise"}</p>
              <p className="text-xs text-muted">{(loggedSetCounts[selectedExercise?.id ?? ""] ?? selectedExercise?.loggedSetCount ?? 0)} {selectedExercise?.isCardio ? "Intervals" : "Sets"}</p>
            </div>
            <button type="button" aria-label="Close exercise" onClick={() => setSelectedExerciseId(null)} className={`rounded-md px-2 py-1 text-lg leading-none text-muted hover:bg-surface-2-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}>‹</button>
          </div>
        </div>
      )}

      {selectedExercise ? (
        <article
          ref={focusedRef}
          className="space-y-4 overflow-hidden rounded-md border border-border/70 bg-surface p-4 pt-[max(env(safe-area-inset-top),1rem)]"
          aria-hidden={false}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg font-semibold leading-tight text-text">{selectedExercise.name}</p>
            <div className="flex gap-2">
              <form
                action={async (formData) => {
                  const result = await toggleSkipAction(formData);
                  toastActionResult(toast, result, {
                    success: selectedExercise.isSkipped ? "Exercise unskipped." : "Exercise skipped.",
                    error: "Could not update skip state.",
                  });

                  if (result.ok) {
                    router.refresh();
                  }
                }}
              >
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="sessionExerciseId" value={selectedExercise.id} />
                <input type="hidden" name="nextSkipped" value={String(!selectedExercise.isSkipped)} />
                <AppButton type="submit" variant="secondary" size="sm" className={tapFeedbackClass}>
                  {selectedExercise.isSkipped ? "Unskip" : "Skip"}
                </AppButton>
              </form>
              <form
                action={async (formData) => {
                  if (removingExerciseIds.includes(selectedExercise.id)) {
                    return;
                  }

                  setRemovingExerciseIds((current) => [...current, selectedExercise.id]);
                  try {
                    const result = await removeExerciseAction(formData);
                    toastActionResult(toast, result, {
                      success: "Exercise removed.",
                      error: "Could not remove exercise.",
                    });

                    if (result.ok) {
                      setSelectedExerciseId(null);
                      router.refresh();
                      return;
                    }
                  } catch {
                    toast.error("Could not remove exercise.");
                  }

                  setRemovingExerciseIds((current) => current.filter((id) => id !== selectedExercise.id));
                }}
              >
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="sessionExerciseId" value={selectedExercise.id} />
                <AppButton
                  type="submit"
                  variant="destructive"
                  size="sm"
                  disabled={removingExerciseIds.includes(selectedExercise.id)}
                  className={tapFeedbackClass}
                >
                  {removingExerciseIds.includes(selectedExercise.id) ? "Removing..." : "Remove"}
                </AppButton>
              </form>
            </div>
          </div>

          <div className="space-y-1 border-t border-border/60 pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Goal</p>
            {selectedExercise.goalStatLine ? (
              <p className="flex flex-wrap items-center gap-x-1 text-xs text-muted">
                <span className="whitespace-nowrap font-semibold text-text">{selectedExercise.goalStatLine.primary || "Open"}</span>
                {selectedExercise.goalStatLine.secondary.map((part) => (
                  <span key={part} className="whitespace-nowrap text-muted">
                    • {part}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-sm text-muted">Open</p>
            )}
          </div>
          {selectedExercise.isSkipped ? <p className="text-sm text-amber-300">Marked skipped for this session.</p> : null}

          <SetLoggerCard
            sessionId={sessionId}
            sessionExerciseId={selectedExercise.id}
            addSetAction={addSetAction}
            syncQueuedSetLogsAction={syncQueuedSetLogsAction}
            unitLabel={unitLabel}
            initialSets={selectedExercise.initialSets}
            prefill={selectedExercise.prefill}
            defaultDistanceUnit={selectedExercise.defaultUnit}
            isCardio={selectedExercise.isCardio}
            initialEnabledMetrics={selectedExercise.initialEnabledMetrics}
            routineDayExerciseId={selectedExercise.routineDayExerciseId}
            planTargetsHash={selectedExercise.planTargetsHash}
            deleteSetAction={deleteSetAction}
            resetSignal={setLoggerResetSignal}
            onSetCountChange={(count) => {
              setLoggedSetCounts((current) => ({ ...current, [selectedExercise.id]: count }));
            }}
          />
        </article>
      ) : null}
    </div>
  );
}
