"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SetLoggerCard } from "@/components/SessionTimers";
import { ExerciseInfo } from "@/components/ExerciseInfo";
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
import { isStretchHubExercise } from "@/lib/stretch-library";
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
  measurementType?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
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
  if (args.isCompleted) {
    return "completed";
  }

  if (args.isSkipped) {
    return "attention";
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
    const rowViewModel = rowViewModelBySessionExerciseId.get(exerciseId);
    if (rowViewModel?.isSkipped) {
      return;
    }
    setSetLoggerResetSignal((value) => value + 1);
    onSelectedExerciseIdChange(selectedExerciseId === exerciseId ? null : exerciseId);
  }, [onSelectedExerciseIdChange, rowViewModelBySessionExerciseId, selectedExerciseId]);

  const handleSkipToggle = useCallback(async (
    exerciseId: string,
    previousSkipped: boolean,
    isQuickLogPending: boolean,
    isSkipPending: boolean,
    loggedSetCount: number,
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
        success: previousSkipped
          ? "Exercise unskipped."
          : (loggedSetCount > 0 ? "Skipped. Logged sets were saved." : "Exercise skipped."),
        error: "Could not update skip state.",
      });

      if (result.ok) {
        if (nextSkipped && selectedExerciseId === exerciseId) {
          onSelectedExerciseIdChange(null);
        }
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
  }, [onSelectedExerciseIdChange, patchRowState, router, selectedExerciseId, sessionId, toast, toggleSkipAction]);

  return (
    <div className={appTokens.currentSessionFocusStack} data-row-interaction={contract.rowInteraction}>
      <ul className={cn(appTokens.currentSessionFocusList, "space-y-0")}>
        {visibleExercises.map((exercise) => {
          const isRemoving = removingExerciseIds.includes(exercise.id);
          const isExpanded = selectedExerciseId === exercise.id;
          const isStretchHub = isStretchHubExercise(exercise);
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
          const isCompletedRow = rowState.cardState === "completed";
          const progressState = deriveSessionExerciseProgressState({
            loggedSetCount: setCount,
            isSkipped: rowViewModel.isSkipped,
            targetSetsMin: exercise.targetSetsMin,
            targetSetsMax: exercise.targetSetsMax,
          });
          const titleMeta = progressState.goalSetTarget !== null && progressState.loggedSetCount > 0
            ? (
              <span className={isCompletedRow ? "text-[rgb(var(--success-rgb)/0.98)]" : undefined}>
                {progressState.loggedSetCount} / {progressState.goalSetTarget}
              </span>
            )
            : undefined;
          const exerciseSummary = isStretchHub ? null : exercise.goalLabel;
          const semanticTone = resolveSessionExerciseTone({
            loggedSetCount: setCount,
            isSkipped: rowViewModel.isSkipped,
            isCompleted: rowState.cardState === "completed",
            isAddedToday: exercise.routineDayExerciseId === null,
          });
          const shouldRenderCompactSkippedRow = rowViewModel.isSkipped && rowState.cardState !== "completed";

          const disclosureCard = (
            <ExerciseDisclosureCard
              scope="session-exercise"
              itemId={exercise.id}
              expanded={isExpanded}
              onToggle={() => toggleExercise(exercise.id)}
              exercise={exercise}
              summary={exerciseSummary}
              summaryLabel=""
              density="compact"
              state={rowState.cardState === "completed" ? "completed" : (isExpanded ? "selected" : rowState.cardState)}
              semanticTone={semanticTone}
              trailingClassName={appTokens.metaText}
              badgeText={rowViewModel.isSkipped ? undefined : (titleMeta ? undefined : rowState.badgeText ?? (exercise.routineDayExerciseId === null ? "Added" : undefined))}
              showLeadingVisual={surfacePolicy.showMedia}
              subtitleTone="plain"
              subtitleClassName={isCompletedRow ? "!text-[rgb(var(--success-rgb)/0.98)]" : undefined}
              className={isExpanded ? "overflow-visible" : "overflow-hidden rounded-none shadow-none ring-0"}
              shellClassName={[
                isExpanded ? "sticky top-0 z-20 shadow-[0_14px_28px_rgb(0_0_0/0.3)]" : "rounded-none shadow-none ring-0",
                rowState.cardState === "completed"
      ? "border-[rgb(var(--success-rgb)/0.96)] bg-[linear-gradient(180deg,rgb(var(--success-rgb)/0.76),rgb(var(--surface-2-rgb)/0.99))] ring-1 ring-[rgb(var(--success-rgb)/0.42)]"
                  : undefined,
              ].filter(Boolean).join(" ")}
              shellStyle={isExpanded ? {
                borderBottomRightRadius: "0px",
              } : {
                borderTopRightRadius: "var(--card-radius)",
                borderBottomRightRadius: "0px",
              }}
              cardClassName={!isExpanded ? "rounded-none shadow-none ring-0" : undefined}
              contentClassName="pl-3"
              mediaLeftCornerMode={isExpanded ? "top-rounded" : undefined}
              titleMeta={titleMeta}
              showAccentRail={!isStretchHub}
              hideEmptySummary={isStretchHub}
            >
              <>
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
          );

          const quickActionStrip = !isExpanded ? (
            <AttachedQuickActionStrip
              className="rounded-bl-none [border-bottom-left-radius:0px]"
              rowContract={{
                label: rowState.quickLogLabel,
                skipLabel: rowState.skipActionLabel,
                quickLogActionClassName: rowState.quickLogActionClassName,
                skipActionClassName: rowState.skipActionClassName,
                actionRowClassName: rowState.actionRowClassName,
                isQuickLogDisabled: rowState.isQuickLogDisabled,
                isSkipDisabled: rowState.isSkipDisabled,
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
                  setCount,
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
          ) : null;

          return (
            <li
              key={exercise.id}
              className={[
                "origin-top transition-all duration-150 motion-reduce:transition-none",
                isRemoving
                  ? "max-h-0 scale-[0.98] overflow-hidden opacity-0"
                  : isExpanded
                    ? "max-h-[240rem] scale-100 overflow-visible opacity-100"
                    : "max-h-72 scale-100 overflow-hidden opacity-100",
              ].join(" ")}
            >
              <SessionExerciseBlock>
                <div className={cn(!isExpanded ? "mx-auto w-full min-[360px]:max-w-[22.75rem]" : undefined)}>
                  {shouldRenderCompactSkippedRow ? (
                    <div className="overflow-hidden rounded-none rounded-r-[var(--card-radius)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.86)]">
                      <div className="flex min-h-[3.25rem] items-center justify-between gap-3 px-4 py-2.5">
                        <p className="min-w-0 flex-1 whitespace-normal break-words text-[0.95rem] font-semibold leading-[1.2] text-[rgb(var(--text)/0.96)]">
                          {exercise.name}
                        </p>
                        <button
                          type="button"
                          disabled={rowViewModel.isSkipPending}
                          onClick={() => {
                            void handleSkipToggle(
                              exercise.id,
                              rowViewModel.isSkipped,
                              rowViewModel.isQuickLogPending,
                              rowViewModel.isSkipPending,
                              setCount,
                            );
                          }}
                          className="shrink-0 rounded-[999px] border border-[rgb(var(--danger-rgb)/0.24)] bg-[rgb(var(--danger-rgb)/0.14)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--button-destructive-text))] transition-colors hover:bg-[rgb(var(--danger-rgb)/0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {rowViewModel.isSkipPending ? "Saving..." : "Unskip"}
                        </button>
                      </div>
                    </div>
                  ) : isExpanded ? (
                    <SessionExerciseCard>
                      {disclosureCard}
                    </SessionExerciseCard>
                  ) : (
                    <div className="overflow-hidden rounded-none rounded-r-[var(--card-radius)] border border-[rgb(var(--border-strong)/0.18)] bg-transparent">
                      {disclosureCard}
                      {quickActionStrip}
                    </div>
                  )}
                </div>
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
