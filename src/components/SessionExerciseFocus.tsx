"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SetLoggerCard } from "@/components/SessionTimers";
import { AppButton } from "@/components/ui/AppButton";
import { Pill } from "@/components/ui/Pill";
import { useToast } from "@/components/ui/ToastProvider";
import { useUndoAction } from "@/components/ui/useUndoAction";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { SessionExerciseActionRow } from "@/components/session/SessionExerciseActionRow";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { WorkoutEntryIdentity } from "@/components/ui/workout-entry/EntrySection";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import type { SetRow } from "@/types/db";
import { mergeLoggedSetCountState } from "@/components/session/setCountSync";
import { hasMeaningfulExerciseGoalSummary } from "@/lib/exercise-goal-summary";
import { resolveQuickLogFromTarget, type SessionQuickLogTarget } from "@/lib/session-quick-log";

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
  quickLogTarget?: SessionQuickLogTarget;
  initialSets: SetRow[];
  loggedSetCount: number;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  slug?: string | null;
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
  const [warmupDraft, setWarmupDraft] = useState(false);
  const [openRowId, setOpenRowId] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const focusedRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    setWarmupDraft(false);
  }, [selectedExerciseId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const syncDesktop = () => setIsDesktop(mediaQuery.matches);
    syncDesktop();
    mediaQuery.addEventListener("change", syncDesktop);

    return () => {
      mediaQuery.removeEventListener("change", syncDesktop);
    };
  }, []);

  useEffect(() => {
    setOpenRowId(null);
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
    setLoggedSetCounts((current) => mergeLoggedSetCountState(current, exercises));
  }, [exercises]);

  const handleSetCountChange = useCallback((exerciseId: string, count: number) => {
    setLoggedSetCounts((current) => {
      if (current[exerciseId] === count) {
        return current;
      }

      return { ...current, [exerciseId]: count };
    });
  }, []);

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
    <div className="flex min-h-full flex-col space-y-2.5">
      {selectedExerciseId === null ? (
        <ul className="space-y-2">
          {exercises.map((exercise) => {
            const isRemoving = removingExerciseIds.includes(exercise.id);
            const setCount = loggedSetCounts[exercise.id] ?? exercise.loggedSetCount;
            const hasGoalSummary = hasMeaningfulExerciseGoalSummary(exercise.goalLabel);

            return (
              <li
                key={exercise.id}
                className={[
                  "origin-top transition-all duration-150 motion-reduce:transition-none",
                  isRemoving ? "max-h-0 scale-[0.98] opacity-0" : "max-h-40 scale-100 opacity-100",
                ].join(" ")}
              >
                <SessionExerciseActionRow
                  id={exercise.id}
                  isDesktop={isDesktop}
                  isOpen={openRowId === exercise.id}
                  onOpenChange={setOpenRowId}
                  onQuickLog={async () => {
                    const quickLogResolution = resolveQuickLogFromTarget(exercise.quickLogTarget, unitLabel === "lbs" ? "lbs" : "kg");
                    if (!quickLogResolution.ok) {
                      toast.error(quickLogResolution.reason);
                      onSelectedExerciseIdChange(exercise.id);
                      return;
                    }

                    const result = await addSetAction({
                      sessionId,
                      sessionExerciseId: exercise.id,
                      ...quickLogResolution.payload,
                      isWarmup: false,
                      rpe: null,
                      notes: null,
                    });

                    toastActionResult(toast, result, {
                      success: "Set logged.",
                      error: "Could not quick log set.",
                    });

                    if (result.ok) {
                      handleSetCountChange(exercise.id, setCount + 1);
                      router.refresh();
                    }
                  }}
                  onSkip={async () => {
                    const formData = new FormData();
                    formData.set("sessionId", sessionId);
                    formData.set("sessionExerciseId", exercise.id);
                    formData.set("nextSkipped", String(!exercise.isSkipped));
                    const result = await toggleSkipAction(formData);

                    toastActionResult(toast, result, {
                      success: exercise.isSkipped ? "Exercise unskipped." : "Exercise skipped.",
                      error: "Could not update skip state.",
                    });

                    if (result.ok) {
                      router.refresh();
                    }
                  }}
                  skipLabel={exercise.isSkipped ? "Unskip" : "Skip"}
                >
                  <StandardExerciseRow
                    exercise={exercise}
                    summary={exercise.goalLabel}
                    variant="expanded"
                    state={setCount > 0 ? "completed" : undefined}
                    onPress={() => onSelectedExerciseIdChange(exercise.id)}
                    className="shadow-none"
                    trailingClassName="self-center text-muted"
                    rightIcon={<ChevronRightIcon className="h-5 w-5" />}
                    badgeText={setCount > 0 ? `${setCount} logged` : undefined}
                  >
                    {(exercise.routineDayExerciseId === null || exercise.isSkipped) ? (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {exercise.routineDayExerciseId === null ? <Pill className="border border-accent/30 bg-accent/10 px-2 py-0.5 normal-case tracking-normal text-[10px] text-text">Added today</Pill> : null}
                        {exercise.isSkipped ? <Pill className="border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 normal-case tracking-normal text-[10px] text-amber-200">Skipped</Pill> : null}
                      </div>
                    ) : null}
                    {setCount === 0 && !hasGoalSummary ? <p className="text-xs text-amber-100/90">No sets yet.</p> : null}
                  </StandardExerciseRow>
                </SessionExerciseActionRow>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex min-h-full flex-col space-y-3">
          <WorkoutEntryIdentity
            eyebrow="Exercise Log"
            title={selectedExercise?.name ?? "Exercise"}
            description={selectedExercise?.goalLabel || undefined}
            meta={selectedExercise?.routineDayExerciseId === null || selectedExercise?.isSkipped ? (
              <div className="flex flex-wrap items-center gap-2">
                {selectedExercise?.routineDayExerciseId === null ? <Pill className="border border-accent/30 bg-accent/10 px-2.5 py-1 normal-case tracking-normal text-[11px] text-text">Added today</Pill> : null}
                {selectedExercise?.isSkipped ? <Pill className="border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 normal-case tracking-normal text-[11px] text-amber-200">Skipped</Pill> : null}
              </div>
            ) : undefined}
            actions={(
              <TopRightBackButton
                ariaLabel="Collapse exercise"
                onClick={(event) => {
                  event.preventDefault();
                  onSelectedExerciseIdChange(null);
                }}
              />
            )}
            className="scroll-mt-4"
          />

          <div ref={focusedRef} />


          {selectedExercise!.isSkipped ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-3 text-sm text-amber-200">
              Skipped for this session. Unskip to keep logging.
            </div>
          ) : null}

          <SetLoggerCard
            sessionId={sessionId}
            sessionExerciseId={selectedExercise!.id}
            addSetAction={addSetAction}
            syncQueuedSetLogsAction={syncQueuedSetLogsAction}
            unitLabel={unitLabel}
            initialSets={selectedExercise!.initialSets}
            prefill={selectedExercise!.prefill}
            defaultDistanceUnit={selectedExercise!.defaultUnit}
            isCardio={selectedExercise!.isCardio}
            initialEnabledMetrics={selectedExercise!.initialEnabledMetrics}
            routineDayExerciseId={selectedExercise!.routineDayExerciseId}
            planTargetsHash={selectedExercise!.planTargetsHash}
            deleteSetAction={deleteSetAction}
            resetSignal={setLoggerResetSignal}
            skipAction={(
              <form
                action={async (formData) => {
                  const result = await toggleSkipAction(formData);
                  toastActionResult(toast, result, {
                    success: selectedExercise!.isSkipped ? "Exercise unskipped." : "Exercise skipped.",
                    error: "Could not update skip state.",
                  });

                  if (result.ok) {
                    router.refresh();
                  }
                }}
                className="w-full"
              >
                <input type="hidden" name="sessionId" value={sessionId} />
                <input type="hidden" name="sessionExerciseId" value={selectedExercise!.id} />
                <input type="hidden" name="nextSkipped" value={String(!selectedExercise!.isSkipped)} />
                <AppButton type="submit" variant="secondary" size="md" fullWidth className={tapFeedbackClass}>
                  {selectedExercise!.isSkipped ? "Unskip" : "Skip"}
                </AppButton>
              </form>
            )}
            warmupValue={warmupDraft}
            onWarmupValueChange={setWarmupDraft}
            onSetCountChange={(count) => {
              handleSetCountChange(selectedExercise!.id, count);
            }}
          />
        </div>
      )}
    </div>
  );
}
