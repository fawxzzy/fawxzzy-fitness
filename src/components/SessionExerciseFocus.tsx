"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SetLoggerCard } from "@/components/SessionTimers";
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
  goalText: string | null;
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
        <ul className="space-y-2">
          {exercises.map((exercise) => {
            const isRemoving = removingExerciseIds.includes(exercise.id);
            const setCount = loggedSetCounts[exercise.id] ?? exercise.loggedSetCount;

            return (
              <li
                key={exercise.id}
                className={[
                  "origin-top transition-all duration-150 motion-reduce:transition-none",
                  isRemoving ? "max-h-0 scale-[0.98] opacity-0" : "max-h-40 scale-100 opacity-100",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => setSelectedExerciseId(exercise.id)}
                  className={`w-full rounded-md bg-white p-3 text-left shadow-sm transition-all duration-150 motion-reduce:transition-none ${tapFeedbackClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{exercise.name}</p>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {setCount} set{setCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <span className={`rounded-md border border-slate-300 px-2 py-1 text-xs ${tapFeedbackClass}`}>Open</span>
                  </div>
                  {exercise.goalText ? <p className="text-xs text-slate-500">{exercise.goalText}</p> : null}
                  {exercise.isSkipped ? <p className="mt-1 text-xs text-amber-700">Skipped</p> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-md bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{selectedExercise?.name ?? "Exercise"}</p>
            <button type="button" onClick={() => setSelectedExerciseId(null)} className={`rounded-md border border-slate-300 px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}>Close</button>
          </div>
        </div>
      )}

      {selectedExercise ? (
        <article ref={focusedRef} className="space-y-2 overflow-hidden rounded-md bg-white p-3 shadow-sm" aria-hidden={false}>
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">{selectedExercise.name}</p>
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
                <button type="submit" className={`rounded-md border border-slate-300 px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${tapFeedbackClass}`}>
                  {selectedExercise.isSkipped ? "Unskip" : "Skip"}
                </button>
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
                <button
                  type="submit"
                  disabled={removingExerciseIds.includes(selectedExercise.id)}
                  className={`rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:opacity-50 ${tapFeedbackClass}`}
                >
                  {removingExerciseIds.includes(selectedExercise.id) ? "Removing..." : "Remove"}
                </button>
              </form>
            </div>
          </div>

          {selectedExercise.goalText ? <p className="text-xs text-slate-500">{selectedExercise.goalText}</p> : null}
          {selectedExercise.isSkipped ? <p className="text-sm text-amber-700">Marked skipped for this session.</p> : null}

          <SetLoggerCard
            sessionId={sessionId}
            sessionExerciseId={selectedExercise.id}
            addSetAction={addSetAction}
            syncQueuedSetLogsAction={syncQueuedSetLogsAction}
            unitLabel={unitLabel}
            initialSets={selectedExercise.initialSets}
            prefill={selectedExercise.prefill}
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
