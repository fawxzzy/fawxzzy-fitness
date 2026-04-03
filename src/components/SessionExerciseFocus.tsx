"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SetLoggerCard } from "@/components/SessionTimers";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { Pill } from "@/components/ui/Pill";
import { useToast } from "@/components/ui/ToastProvider";
import { useUndoAction } from "@/components/ui/useUndoAction";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { AttachedQuickActionStrip, SessionExerciseBlock, SessionExerciseCard } from "@/components/session/SessionExerciseBlock";
import { WorkoutExerciseRowChips } from "@/components/session/WorkoutExerciseRowChips";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { WorkoutEntryIdentity } from "@/components/ui/workout-entry/EntrySection";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { resolveScreenContract } from "@/components/ui/app/screenContract";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import type { SetRow } from "@/types/db";
import { mergeLoggedSetCountState } from "@/components/session/setCountSync";
import {
  buildInitialSessionRowClientState,
  reconcileSessionRowClientState,
  type SessionRowClientState,
} from "@/components/session/sessionRowClientState";
import { hasMeaningfulExerciseGoalSummary } from "@/lib/exercise-goal-summary";
import { resolveQuickLogFromTarget, type SessionQuickLogTarget } from "@/lib/session-quick-log";
import { deriveSessionExerciseProgressState } from "@/lib/session-exercise-progress";
import { deriveSessionExerciseRowViewModel } from "@/lib/session-row-view-model";

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
  exerciseId: string;
  name: string;
  isSkipped: boolean;
  defaultUnit: "mi" | "km" | "m" | null;
  isCardio: boolean;
  useIntervalLanguage: boolean;
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
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
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
  const contract = resolveScreenContract("exerciseLog");
  const [removingExerciseIds, setRemovingExerciseIds] = useState<string[]>([]);
  const [setLoggerResetSignal, setSetLoggerResetSignal] = useState(0);
  const [rowClientStateBySessionExerciseId, setRowClientStateBySessionExerciseId] = useState<Record<string, SessionRowClientState>>(() =>
    buildInitialSessionRowClientState(exercises),
  );
  const [warmupDraft, setWarmupDraft] = useState(false);
  const [exerciseInfoExerciseId, setExerciseInfoExerciseId] = useState<string | null>(null);
  const focusedRef = useRef<HTMLDivElement | null>(null);
  const selectedExercise = useMemo(
    () => exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null,
    [exercises, selectedExerciseId],
  );
  const rowViewModelBySessionExerciseId = useMemo(() => {
    const fallbackWeightUnit = unitLabel === "lbs" ? "lbs" : "kg";
    return new Map(
      exercises.map((exercise) => {
        const rowClientState = rowClientStateBySessionExerciseId[exercise.id] ?? {
          loggedSetCount: exercise.loggedSetCount,
          isSkipped: exercise.isSkipped,
          isQuickLogPending: false,
          isSkipPending: false,
        };
        const rowViewModel = deriveSessionExerciseRowViewModel({
          exerciseId: exercise.id,
          loggedSetCount: rowClientState.loggedSetCount,
          isSkipped: rowClientState.isSkipped,
          isQuickLogPending: rowClientState.isQuickLogPending,
          isSkipPending: rowClientState.isSkipPending,
          targetSetsMin: exercise.targetSetsMin,
          targetSetsMax: exercise.targetSetsMax,
          quickLogTarget: exercise.quickLogTarget,
          fallbackWeightUnit,
        });

        return [exercise.id, rowViewModel] as const;
      }),
    );
  }, [exercises, rowClientStateBySessionExerciseId, unitLabel]);
  const selectedExerciseSetCount = selectedExercise ? (rowViewModelBySessionExerciseId.get(selectedExercise.id)?.loggedSetCount ?? selectedExercise.loggedSetCount) : 0;
  const selectedExerciseProgress = selectedExercise
    ? deriveSessionExerciseProgressState({
      loggedSetCount: selectedExerciseSetCount,
      isSkipped: rowViewModelBySessionExerciseId.get(selectedExercise.id)?.isSkipped ?? selectedExercise.isSkipped,
      targetSetsMin: selectedExercise.targetSetsMin,
      targetSetsMax: selectedExercise.targetSetsMax,
    })
    : null;
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

  const patchRowState = useCallback((
    sessionExerciseId: string,
    patch: (previous: SessionRowClientState) => SessionRowClientState,
  ) => {
    setRowClientStateBySessionExerciseId((current) => {
      const exercise = exercises.find((item) => item.id === sessionExerciseId);
      if (!exercise) {
        return current;
      }
      const previous = current[sessionExerciseId] ?? {
        loggedSetCount: exercise.loggedSetCount,
        isSkipped: exercise.isSkipped,
        isQuickLogPending: false,
        isSkipPending: false,
      };
      return {
        ...current,
        [sessionExerciseId]: patch(previous),
      };
    });
  }, [exercises]);

  useEffect(() => {
    setRowClientStateBySessionExerciseId((current) => {
      const mergedCountState = mergeLoggedSetCountState(
        Object.fromEntries(
          Object.entries(current).map(([exerciseId, rowState]) => [exerciseId, rowState.loggedSetCount]),
        ),
        exercises,
      );
      return reconcileSessionRowClientState({
        current,
        rows: exercises,
        mergedLoggedSetCount: mergedCountState,
      });
    });
  }, [exercises]);

  const handleSetCountChange = useCallback((exerciseId: string, count: number) => {
    patchRowState(exerciseId, (existing) => existing.loggedSetCount === count ? existing : {
      ...existing,
      loggedSetCount: count,
    });
  }, [patchRowState]);

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
    <div className="flex flex-col space-y-2" data-row-interaction={contract.rowInteraction}>
      {selectedExerciseId === null ? (
        <ul className="space-y-1.5">
          {exercises.map((exercise) => {
            const isRemoving = removingExerciseIds.includes(exercise.id);
            const rowViewModel = rowViewModelBySessionExerciseId.get(exercise.id) ?? deriveSessionExerciseRowViewModel({
              exerciseId: exercise.id,
              loggedSetCount: exercise.loggedSetCount,
              isSkipped: exercise.isSkipped,
              isQuickLogPending: false,
              isSkipPending: false,
              targetSetsMin: exercise.targetSetsMin,
              targetSetsMax: exercise.targetSetsMax,
              quickLogTarget: exercise.quickLogTarget,
              fallbackWeightUnit: unitLabel === "lbs" ? "lbs" : "kg",
            });
            const setCount = rowViewModel.loggedSetCount;
            const hasGoalSummary = hasMeaningfulExerciseGoalSummary(exercise.goalLabel);
            const rowState = rowViewModel.rowState;

            return (
              <li
                key={exercise.id}
                className={[
                  "origin-top overflow-hidden transition-all duration-150 motion-reduce:transition-none",
                  isRemoving ? "max-h-0 scale-[0.98] opacity-0" : "max-h-56 scale-100 opacity-100",
                ].join(" ")}
              >
                <SessionExerciseBlock>
                  <SessionExerciseCard>
                    <StandardExerciseRow
                      exercise={exercise}
                      summary={exercise.goalLabel}
                      variant="expanded"
                      state={rowState.cardState}
                      onPress={() => onSelectedExerciseIdChange(exercise.id)}
                      className="shadow-none"
                      trailingClassName="self-center text-muted"
                      rightIcon={<ChevronRightIcon className="h-5 w-5" />}
                      badgeText={rowState.badgeText}
                    >
                      <WorkoutExerciseRowChips
                        progressLabel={rowState.progressLabel}
                        chips={exercise.routineDayExerciseId === null ? ["addedToday", ...rowState.chips] : rowState.chips}
                      />
                      {setCount === 0 && !hasGoalSummary ? <p className="text-xs text-amber-100/90">No {exercise.useIntervalLanguage ? "intervals" : "sets"} yet.</p> : null}
                    </StandardExerciseRow>
                  </SessionExerciseCard>
                  <AttachedQuickActionStrip
                    rowContract={{
                      label: rowState.quickLogLabel,
                      skipLabel: rowState.skipActionLabel,
                      quickLogActionClassName: rowState.quickLogActionClassName,
                      skipActionClassName: rowState.skipActionClassName,
                      actionRowClassName: rowState.actionRowClassName,
                      isQuickLogDisabled: rowState.isQuickLogDisabled,
                      quickLogDisabledMessage: rowState.quickLogDisabledMessage,
                      isSkipPending: rowViewModel.isSkipPending,
                      isQuickLogPending: rowViewModel.isQuickLogPending,
                    }}
                    onSkip={async () => {
                      if (rowViewModel.isQuickLogPending || rowViewModel.isSkipPending) {
                        return;
                      }
                      const previousSkipped = rowViewModel.isSkipped;
                      const nextSkipped = !previousSkipped;
                      patchRowState(exercise.id, (current) => ({
                        ...current,
                        isSkipped: nextSkipped,
                        isSkipPending: true,
                      }));
                      try {
                        const formData = new FormData();
                        formData.set("sessionId", sessionId);
                        formData.set("sessionExerciseId", exercise.id);
                        formData.set("nextSkipped", String(nextSkipped));
                        const result = await toggleSkipAction(formData);
                        toastActionResult(toast, result, {
                          success: previousSkipped ? "Exercise unskipped." : "Exercise skipped.",
                          error: "Could not update skip state.",
                        });

                        if (result.ok) {
                          router.refresh();
                        } else {
                          patchRowState(exercise.id, (current) => ({
                            ...current,
                            isSkipped: previousSkipped,
                            isSkipPending: false,
                          }));
                        }
                      } finally {
                        patchRowState(exercise.id, (current) => ({
                          ...current,
                          isSkipPending: false,
                        }));
                      }
                    }}
                    onPress={async () => {
                      if (rowViewModel.isQuickLogPending || rowViewModel.isSkipPending || rowState.isQuickLogDisabled) {
                        return;
                      }
                      patchRowState(exercise.id, (current) => ({
                        ...current,
                        isQuickLogPending: true,
                      }));
                      try {
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
                      } finally {
                        patchRowState(exercise.id, (current) => ({
                          ...current,
                          isQuickLogPending: false,
                        }));
                      }
                    }}
                  />
                </SessionExerciseBlock>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col space-y-2.5">
          <WorkoutEntryIdentity
            eyebrow="Exercise Log"
            title={selectedExercise?.name ?? "Exercise"}
            description={selectedExercise?.goalLabel || undefined}
            meta={selectedExercise && (selectedExercise.routineDayExerciseId === null || (selectedExerciseProgress?.chips.length ?? 0) > 0) ? (
              <div className="flex flex-wrap items-center gap-2">
                {selectedExercise.routineDayExerciseId === null ? <Pill tone="success" className="normal-case tracking-normal">Added today</Pill> : null}
                {selectedExerciseProgress?.chips.includes("loggedProgress") ? <Pill tone="default" className="normal-case tracking-normal">{selectedExerciseProgress.progressLabel ?? "Logged"}</Pill> : null}
                {selectedExerciseProgress?.chips.includes("endedEarly") ? <Pill tone="warning" className="normal-case tracking-normal">Ended early</Pill> : null}
                {selectedExerciseProgress?.chips.includes("skipped") ? <Pill tone="warning" className="normal-case tracking-normal">Skipped</Pill> : null}
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
            className="mt-1 scroll-mt-24"
          />

          <div ref={focusedRef} />


          {selectedExerciseProgress?.kind === "skipped" || selectedExerciseProgress?.kind === "partialSkipped" ? (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-3 text-sm text-amber-200">
              {selectedExerciseProgress?.kind === "partialSkipped"
                ? `${selectedExerciseProgress.progressLabel ?? "Partial"} • Ended early for this session. Unskip to keep logging.`
                : "Skipped for this session. Unskip to keep logging."}
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
            useIntervalLanguage={selectedExercise!.useIntervalLanguage}
            initialEnabledMetrics={selectedExercise!.initialEnabledMetrics}
            routineDayExerciseId={selectedExercise!.routineDayExerciseId}
            planTargetsHash={selectedExercise!.planTargetsHash}
            deleteSetAction={deleteSetAction}
            resetSignal={setLoggerResetSignal}
            secondaryActionLabel="View Exercise"
            onSecondaryAction={() => setExerciseInfoExerciseId(selectedExercise!.exerciseId)}
            warmupValue={warmupDraft}
            onWarmupValueChange={setWarmupDraft}
            onSetCountChange={(count) => {
              handleSetCountChange(selectedExercise!.id, count);
            }}
          />
        </div>
      )}
      <ExerciseInfo
        exerciseId={exerciseInfoExerciseId}
        open={Boolean(exerciseInfoExerciseId)}
        onOpenChange={(open) => {
          if (!open) setExerciseInfoExerciseId(null);
        }}
        onClose={() => setExerciseInfoExerciseId(null)}
        sourceContext="SessionExerciseFocus"
      />
    </div>
  );
}
