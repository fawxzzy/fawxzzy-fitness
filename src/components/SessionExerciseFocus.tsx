"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SetLoggerCard } from "@/components/SessionTimers";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppButton } from "@/components/ui/AppButton";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import { AttachedQuickActionStrip, SessionExerciseBlock, SessionExerciseCard } from "@/components/session/SessionExerciseBlock";
import { resolveScreenContract } from "@/components/ui/app/screenContract";
import { ExerciseDisclosureCard } from "@/components/workout/ExerciseDisclosureCard";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import { deriveSessionExerciseProgressState } from "@/lib/session-exercise-progress";
import { resolveQuickLogFromTarget, type SessionQuickLogTarget } from "@/lib/session-quick-log";
import { buildInitialSessionRowClientState, reconcileSessionRowClientState, type SessionRowClientState } from "@/components/session/sessionRowClientState";
import { mergeLoggedSetCountState } from "@/components/session/setCountSync";
import { deriveSessionExerciseRowViewModel } from "@/lib/session-row-view-model";
import { cn } from "@/lib/cn";
import { scrollDockAwareIntoView } from "@/lib/scrollDockAwareIntoView";
import { resolveWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";
import { createStableSetId } from "@/lib/offline/set-log-reconciliation";
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
  clientLogId: string;
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
  measurementType?: "reps" | "time" | "distance" | "time_distance" | null;
  primary_muscle?: string | null;
  equipment?: string | null;
  movement_pattern?: string | null;
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

function resolveSessionExerciseTone(args: {
  loggedSetCount: number;
  isSkipped: boolean;
  isCompleted: boolean;
  isAddedToday: boolean;
}) {
  if (args.isSkipped) {
    return "attention";
  }

  if (args.isCompleted) {
    return "completed";
  }

  if (args.loggedSetCount > 0) {
    return "logged";
  }

  if (args.isAddedToday) {
    return "current";
  }

  return "neutral";
}

export function SessionExerciseFocus({
  userId,
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
  userId: string;
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
  const surfacePolicy = resolveWorkoutCardSurfacePolicy("current-session", "compact");
  const [removingExerciseIds] = useState<string[]>([]);
  const [setLoggerResetSignal, setSetLoggerResetSignal] = useState(0);
  const [rowClientStateBySessionExerciseId, setRowClientStateBySessionExerciseId] = useState<Record<string, SessionRowClientState>>(() =>
    buildInitialSessionRowClientState(exercises),
  );
  const [warmupDraft, setWarmupDraft] = useState(false);
  const [exerciseInfoExerciseId, setExerciseInfoExerciseId] = useState<string | null>(null);
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
  const toast = useToast();
  const router = useRouter();
  void removeExerciseAction;
  const visibleExercises = useMemo(
    () => selectedExerciseId ? exercises.filter((exercise) => exercise.id === selectedExerciseId) : exercises,
    [exercises, selectedExerciseId],
  );

  useEffect(() => {
    setWarmupDraft(false);
  }, [selectedExerciseId]);

  useEffect(() => {
    if (!selectedExerciseId) {
      return;
    }

    let frameA = 0;
    let frameB = 0;

    frameA = window.requestAnimationFrame(() => {
      frameB = window.requestAnimationFrame(() => {
        const scrollContainer = document.querySelector("[data-app-scroll-container='true']");
        const activeRow = document.querySelector(`[data-testid='session-exercise-toggle-${selectedExerciseId}']`)?.closest("li");

        if (!(scrollContainer instanceof HTMLElement) || !(activeRow instanceof HTMLElement)) {
          return;
        }

        scrollDockAwareIntoView(scrollContainer, activeRow);
      });
    });

    return () => {
      window.cancelAnimationFrame(frameA);
      window.cancelAnimationFrame(frameB);
    };
  }, [selectedExerciseId]);

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

  const toggleExercise = useCallback((exerciseId: string) => {
    setSetLoggerResetSignal((value) => value + 1);
    onSelectedExerciseIdChange(selectedExerciseId === exerciseId ? null : exerciseId);
  }, [onSelectedExerciseIdChange, selectedExerciseId]);

  const handleSkipToggle = useCallback(async (
    exerciseId: string,
    previousSkipped: boolean,
    isQuickLogPending: boolean,
    isSkipPending: boolean,
  ) => {
    if (isQuickLogPending || isSkipPending) {
      return;
    }

    const nextSkipped = !previousSkipped;
    patchRowState(exerciseId, (current) => ({
      ...current,
      isSkipped: nextSkipped,
      isSkipPending: true,
    }));

    try {
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("sessionExerciseId", exerciseId);
      formData.set("nextSkipped", String(nextSkipped));
      const result = await toggleSkipAction(formData);
      toastActionResult(toast, result, {
        success: previousSkipped ? "Exercise unskipped." : "Exercise skipped.",
        error: "Could not update skip state.",
      });

      if (result.ok) {
        router.refresh();
      } else {
        patchRowState(exerciseId, (current) => ({
          ...current,
          isSkipped: previousSkipped,
          isSkipPending: false,
        }));
      }
    } finally {
      patchRowState(exerciseId, (current) => ({
        ...current,
        isSkipPending: false,
      }));
    }
  }, [patchRowState, router, sessionId, toast, toggleSkipAction]);

  return (
    <div className={appTokens.currentSessionFocusStack} data-row-interaction={contract.rowInteraction}>
      <ul className={cn(appTokens.currentSessionFocusList, "space-y-0")}>
        {visibleExercises.map((exercise) => {
          const isRemoving = removingExerciseIds.includes(exercise.id);
          const isExpanded = selectedExerciseId === exercise.id;
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
          const rowState = rowViewModel.rowState;
          const progressState = deriveSessionExerciseProgressState({
            loggedSetCount: setCount,
            isSkipped: rowViewModel.isSkipped,
            targetSetsMin: exercise.targetSetsMin,
            targetSetsMax: exercise.targetSetsMax,
          });
          const titleMeta = progressState.goalSetTarget !== null && progressState.loggedSetCount > 0
            ? `${progressState.loggedSetCount} / ${progressState.goalSetTarget}`
            : undefined;
          const semanticTone = resolveSessionExerciseTone({
            loggedSetCount: setCount,
            isSkipped: rowViewModel.isSkipped,
            isCompleted: rowState.cardState === "completed",
            isAddedToday: exercise.routineDayExerciseId === null,
          });

          return (
            <li
              key={exercise.id}
              className={[
                "origin-top overflow-hidden transition-all duration-150 motion-reduce:transition-none",
                isRemoving ? "max-h-0 scale-[0.98] opacity-0" : isExpanded ? "max-h-[240rem] scale-100 opacity-100" : "max-h-72 scale-100 opacity-100",
              ].join(" ")}
            >
              <SessionExerciseBlock>
                <SessionExerciseCard>
                  <ExerciseDisclosureCard
                    scope="session-exercise"
                    itemId={exercise.id}
                    expanded={isExpanded}
                    onToggle={() => toggleExercise(exercise.id)}
                    exercise={exercise}
                    summary={exercise.goalLabel}
                    summaryLabel=""
                    density="compact"
                    state={isExpanded ? "selected" : rowState.cardState}
                    semanticTone={semanticTone}
                    trailingClassName={appTokens.metaText}
                    badgeText={titleMeta ? undefined : rowState.badgeText ?? (exercise.routineDayExerciseId === null ? "Added" : undefined)}
                    showLeadingVisual={surfacePolicy.showMedia}
                    subtitleTone="plain"
                    cardClassName={!isExpanded ? "rounded-bl-none border-b-0" : undefined}
                    contentClassName="pl-3"
                    titleMeta={titleMeta}
                  >
                    <>
                      {progressState.kind === "skipped" || progressState.kind === "partialSkipped" ? (
                        <div className={cn(appTokens.currentSessionWarningBanner, "flex items-start justify-between gap-3")}>
                          <p className={cn("min-w-0 flex-1", appTokens.detailBodyText)}>
                            {progressState.kind === "partialSkipped"
                              ? `${progressState.progressLabel ?? "Partial progress"} - ended early for this session. Unskip to keep logging.`
                              : "Skipped for this session. Unskip to keep logging."}
                          </p>
                          <AppButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={rowViewModel.isQuickLogPending || rowViewModel.isSkipPending}
                            onClick={() => {
                              void handleSkipToggle(
                                exercise.id,
                                rowViewModel.isSkipped,
                                rowViewModel.isQuickLogPending,
                                rowViewModel.isSkipPending,
                              );
                            }}
                            className="shrink-0"
                          >
                            {rowViewModel.isSkipPending ? "Saving..." : "Unskip"}
                          </AppButton>
                        </div>
                      ) : null}

                      <SetLoggerCard
                        userId={userId}
                        sessionId={sessionId}
                        sessionExerciseId={exercise.id}
                        addSetAction={addSetAction}
                        syncQueuedSetLogsAction={syncQueuedSetLogsAction}
                        unitLabel={unitLabel}
                        initialSets={exercise.initialSets}
                        prefill={exercise.prefill}
                        defaultDistanceUnit={exercise.defaultUnit}
                        isCardio={exercise.isCardio}
                        useIntervalLanguage={exercise.useIntervalLanguage}
                        initialEnabledMetrics={exercise.initialEnabledMetrics}
                        routineDayExerciseId={exercise.routineDayExerciseId}
                        planTargetsHash={exercise.planTargetsHash}
                        deleteSetAction={deleteSetAction}
                        resetSignal={setLoggerResetSignal}
                        secondaryActionLabel="View"
                        onSecondaryAction={() => setExerciseInfoExerciseId(exercise.exerciseId)}
                        warmupValue={warmupDraft}
                        onWarmupValueChange={setWarmupDraft}
                        onSetCountChange={(count) => {
                          handleSetCountChange(exercise.id, count);
                        }}
                      />
                    </>
                  </ExerciseDisclosureCard>

                  {!isExpanded ? (
                    <AttachedQuickActionStrip
                        rowContract={{
                          label: rowState.quickLogLabel,
                          skipLabel: rowState.skipActionLabel,
                          quickLogActionIntent: rowState.quickLogActionIntent,
                          skipActionIntent: rowState.skipActionIntent,
                          quickLogActionClassName: rowState.quickLogActionClassName,
                          skipActionClassName: rowState.skipActionClassName,
                          actionRowClassName: rowState.actionRowClassName,
                          isQuickLogDisabled: rowState.isQuickLogDisabled,
                          quickLogDisabledMessage: rowState.quickLogDisabledMessage,
                          isSkipPending: rowViewModel.isSkipPending,
                          isQuickLogPending: rowViewModel.isQuickLogPending,
                        }}
                        onSkip={() => {
                          void handleSkipToggle(
                            exercise.id,
                            rowViewModel.isSkipped,
                            rowViewModel.isQuickLogPending,
                            rowViewModel.isSkipPending,
                          );
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
                              toggleExercise(exercise.id);
                              return;
                            }

                            const result = await addSetAction({
                              sessionId,
                              sessionExerciseId: exercise.id,
                              ...quickLogResolution.payload,
                              isWarmup: false,
                              rpe: null,
                              notes: null,
                              clientLogId: createStableSetId(),
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
                  ) : null}
                </SessionExerciseCard>
              </SessionExerciseBlock>
            </li>
          );
        })}
      </ul>
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
