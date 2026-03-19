"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SetLoggerCard } from "@/components/SessionTimers";
import { AppButton } from "@/components/ui/AppButton";
import { BackButton } from "@/components/ui/BackButton";
import { Pill } from "@/components/ui/Pill";
import { useToast } from "@/components/ui/ToastProvider";
import { useUndoAction } from "@/components/ui/useUndoAction";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import { ExerciseCard } from "@/components/ExerciseCard";
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

export type SessionExerciseFocusItem = {
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
  goalLabel: string;
  prefill?: SessionExercisePrefill;
  initialSets: SetRow[];
  loggedSetCount: number;
};

export function SessionExerciseFocus({
  sessionId,
  unitLabel,
  exercises,
  selectedExerciseId,
  onSelectedExerciseIdChange,
  addSetAction,
  syncQueuedSetLogsAction,
  toggleSkipAction,
  removeExerciseAction,
  deleteSetAction,
}: {
  sessionId: string;
  unitLabel: string;
  exercises: SessionExerciseFocusItem[];
  selectedExerciseId: string | null;
  onSelectedExerciseIdChange: (exerciseId: string | null) => void;
  addSetAction: (payload: AddSetPayload) => Promise<AddSetActionResult>;
  syncQueuedSetLogsAction: SyncQueuedSetLogsAction;
  toggleSkipAction: (formData: FormData) => Promise<ActionResult>;
  removeExerciseAction: (formData: FormData) => Promise<ActionResult>;
  deleteSetAction: (payload: { sessionId: string; sessionExerciseId: string; setId: string }) => Promise<ActionResult>;
}) {
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
  const queueUndo = useUndoAction(6000);

  useEffect(() => {
    if (!selectedExerciseId || !focusedRef.current) return;
    focusedRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedExerciseId]);

  const handleRemoveExercise = (exerciseId: string) => {
    if (removingExerciseIds.includes(exerciseId)) return;

    setRemovingExerciseIds((current) => [...current, exerciseId]);
    onSelectedExerciseIdChange(null);

    queueUndo({
      message: "Removed exercise",
      onUndo: () => {
        setRemovingExerciseIds((current) => current.filter((id) => id !== exerciseId));
      },
      onCommit: async () => {
        const formData = new FormData();
        formData.set("sessionId", sessionId);
        formData.set("sessionExerciseId", exerciseId);
        const result = await removeExerciseAction(formData);

        if (!result.ok) {
          setRemovingExerciseIds((current) => current.filter((id) => id !== exerciseId));
          toast.error(result.error || "Could not remove exercise.");
          return;
        }

        router.refresh();
      },
    });
  };

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
      onSelectedExerciseIdChange(null);
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
  }, [onSelectedExerciseIdChange, selectedExerciseId]);

  return (
    <div className="space-y-3">
      {selectedExerciseId === null ? (
        <ul className="space-y-2">
          {exercises.map((exercise) => {
            const isRemoving = removingExerciseIds.includes(exercise.id);
            const setCount = loggedSetCounts[exercise.id] ?? exercise.loggedSetCount;
            const setCountLabel = `${setCount} ${exercise.isCardio ? `interval${setCount === 1 ? "" : "s"}` : `set${setCount === 1 ? "" : "s"}`}`;

            return (
              <li
                key={exercise.id}
                className={[
                  "origin-top transition-all duration-150 motion-reduce:transition-none",
                  isRemoving ? "max-h-0 scale-[0.98] opacity-0" : "max-h-40 scale-100 opacity-100",
                ].join(" ")}
              >
                <ExerciseCard
                  title={exercise.name}
                  subtitle={exercise.goalLabel}
                  onPress={() => onSelectedExerciseIdChange(exercise.id)}
                  className="rounded-2xl border border-white/8 bg-[rgb(var(--surface-rgb)/0.72)] px-3 py-3 shadow-none"
                  trailingClassName="self-start pt-1 text-muted"
                  rightIcon={null}
                  badgeText={setCountLabel}
                >
                  {(exercise.routineDayExerciseId === null || exercise.isSkipped) ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {exercise.routineDayExerciseId === null ? <Pill className="border border-accent/30 bg-accent/10 px-2 py-0.5 normal-case tracking-normal text-[10px] text-text">Added today</Pill> : null}
                      {exercise.isSkipped ? <Pill className="border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 normal-case tracking-normal text-[10px] text-amber-200">Skipped</Pill> : null}
                    </div>
                  ) : null}
                </ExerciseCard>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.7)] p-3.5 shadow-none">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Set entry</p>
              <p className="text-lg font-semibold leading-tight text-text">{selectedExercise?.name ?? "Exercise"}</p>
              <p className="text-sm text-muted">{(loggedSetCounts[selectedExercise?.id ?? ""] ?? selectedExercise?.loggedSetCount ?? 0)} {selectedExercise?.isCardio ? "intervals logged" : "sets logged"}</p>
            </div>
            <BackButton
              onClick={(event) => {
                event.preventDefault();
                onSelectedExerciseIdChange(null);
              }}
              ariaLabel="Collapse exercise"
              iconOnly
              className={tapFeedbackClass}
            />
          </div>
        </div>
      )}

      {selectedExercise ? (
        <>
          <article
            ref={focusedRef}
            className="space-y-4 rounded-[1.5rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.74)] p-4"
            aria-hidden={false}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Set entry</p>
                <p className="text-xl font-semibold leading-tight text-text">{selectedExercise.name}</p>
                <p className="text-sm text-muted">{(loggedSetCounts[selectedExercise.id] ?? selectedExercise.loggedSetCount)} {selectedExercise.isCardio ? "intervals logged" : "sets logged"}</p>
              </div>
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
                <AppButton
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={removingExerciseIds.includes(selectedExercise.id)}
                  className={tapFeedbackClass}
                  onClick={() => handleRemoveExercise(selectedExercise.id)}
                >
                  {removingExerciseIds.includes(selectedExercise.id) ? "Removing..." : "Delete"}
                </AppButton>
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-border/40 bg-[rgb(var(--surface-2-soft)/0.84)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Target</p>
              <p className="mt-1 text-sm font-medium text-text">{selectedExercise.goalLabel}</p>
            </div>

            {selectedExercise.isSkipped ? (
              <p className="text-sm text-amber-300">Marked skipped for this session.</p>
            ) : null}
          </article>

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
        </>
      ) : null}
    </div>
  );
}
