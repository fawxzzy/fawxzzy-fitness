"use client";

import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SetLoggerCard } from "@/components/SessionTimers";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import { AttachedQuickActionStrip, SessionExerciseBlock, SessionExerciseCard } from "@/components/session/SessionExerciseBlock";
import { resolveScreenContract } from "@/components/ui/app/screenContract";
import { getBottomActionButtonClassName } from "@/components/layout/bottomActionIntents";
import { ExerciseDisclosureCard } from "@/components/workout/ExerciseDisclosureCard";
import { cardMediaToneClassNames } from "@/components/cardSemanticTones";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import { deriveSessionExerciseProgressState } from "@/lib/session-exercise-progress";
import {
  resolveEffectiveQuickLogTarget,
  resolveQuickLogFromResolvedTarget,
  toQuickLogTargetFromSuggestedValues,
  type SessionQuickLogTarget,
} from "@/lib/session-quick-log";
import { buildInitialSessionRowClientState, reconcileSessionRowClientState, type SessionRowClientState } from "@/components/session/sessionRowClientState";
import { mergeLoggedSetCountState } from "@/components/session/setCountSync";
import { deriveSessionExerciseRowViewModel } from "@/lib/session-row-view-model";
import { deriveSessionTargetHint } from "@/lib/session-target-hints";
import type { SessionTargetHint } from "@/lib/session-target-hints";
import { cn } from "@/lib/cn";
import { scrollDockAwareIntoView } from "@/lib/scrollDockAwareIntoView";
import { resolveWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";
import { createStableSetId } from "@/lib/offline/set-log-reconciliation";
import { isStretchHubExercise } from "@/lib/stretch-library";
import type { ProgressionProgressFill } from "@/lib/progression-progress-percent";
import type { ProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import type { PromotionStepFieldId } from "@/lib/session-progression-display";
import type { FitnessDistanceUnit, SetRow } from "@/types/db";

type AddSetPayload = {
  sessionId: string;
  sessionExerciseId: string;
  weight: number;
  reps: number;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: FitnessDistanceUnit | null;
  calories: number | null;
  isWarmup: boolean;
  rpe: number | null;
  notes: string | null;
  weightUnit: "lbs" | "kg";
  clientLogId: string;
};

type AddSetActionResult = ActionResult<{ set: SetRow }>;

const COMPACT_SESSION_ROW_SHELL_CLASS_NAME = "overflow-hidden rounded-none rounded-r-[var(--card-radius)] rounded-bl-[var(--card-radius)] border border-[rgb(var(--accent-divider-rgb)/0.28)] bg-[rgb(var(--surface-1-rgb)/0.06)] shadow-[0_0_0_1px_rgb(var(--accent-divider-rgb)/0.06)]";

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
      distanceUnit: FitnessDistanceUnit | null;
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
  distance?: number;
  distanceUnit?: FitnessDistanceUnit;
  calories?: number;
  weightUnit?: "lbs" | "kg";
};

function toPrefillFromQuickLogTarget(
  target: SessionQuickLogTarget | null | undefined,
  fallbackWeightUnit: "lbs" | "kg",
): SessionExercisePrefill | undefined {
  if (!target) {
    return undefined;
  }

  const weight = target.weightMax ?? target.weightMin;
  const reps = target.repsMax ?? target.repsMin;
  const prefill: SessionExercisePrefill = {};
  if (weight !== undefined) {
    prefill.weight = weight;
    prefill.weightUnit = target.weightUnit ?? fallbackWeightUnit;
  }
  if (reps !== undefined) {
    prefill.reps = reps;
  }
  if (target.durationSeconds !== undefined) {
    prefill.durationSeconds = target.durationSeconds;
  }
  if (target.distance !== undefined) {
    prefill.distance = target.distance;
    prefill.distanceUnit = target.distanceUnit ?? "mi";
  }
  if (target.calories !== undefined) {
    prefill.calories = target.calories;
  }

  return Object.keys(prefill).length > 0 ? prefill : undefined;
}

export type SessionExerciseFocusItem = {
  id: string;
  exerciseId: string;
  name: string;
  isSkipped: boolean;
  defaultUnit: FitnessDistanceUnit | null;
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
  setFlowQuickLogTargets?: SessionQuickLogTarget[];
  targetHint?: SessionTargetHint;
  progressFill?: ProgressionProgressFill | null;
  progressionFormState?: ProgressionPlaybookFormState | null;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  visiblePromotionStepFields?: PromotionStepFieldId[] | null;
  progressionSelectedMetrics?: Array<"reps" | "weight" | "time" | "distance" | "calories">;
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
  updateSessionExerciseProgressionAction,
  bottomDockCenter,
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
  updateSessionExerciseProgressionAction: (formData: FormData) => Promise<ActionResult>;
  bottomDockCenter?: ReactNode;
}) {
  const contract = resolveScreenContract("exerciseLog");
  const surfacePolicy = resolveWorkoutCardSurfacePolicy("current-session", "compact");
  const [removingExerciseIds] = useState<string[]>([]);
  const [setLoggerResetSignal, setSetLoggerResetSignal] = useState(0);
  const [persistedLoggerExerciseId, setPersistedLoggerExerciseId] = useState<string | null>(selectedExerciseId);
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
          setCountOverrideActive: false,
          isSkipped: exercise.isSkipped,
          isQuickLogPending: false,
          isSkipPending: false,
        };
        const setFlowQuickLogTarget = exercise.setFlowQuickLogTargets?.[rowClientState.loggedSetCount] ?? null;
        const primaryQuickLogTarget = setFlowQuickLogTarget ?? exercise.quickLogTarget;
        const resolvedTargetHint = exercise.targetHint ?? deriveSessionTargetHint({
          measurementType: exercise.measurementType ?? "reps",
          fallbackWeightUnit,
          stats: null,
          plan: primaryQuickLogTarget ? {
            measurementType: primaryQuickLogTarget.measurementType ?? (exercise.measurementType ?? "reps"),
            setsMin: exercise.targetSetsMin ?? null,
            setsMax: exercise.targetSetsMax ?? null,
            repsMin: primaryQuickLogTarget.repsMin ?? null,
            repsMax: primaryQuickLogTarget.repsMax ?? null,
            weightMin: primaryQuickLogTarget.weightMin ?? null,
            weightMax: primaryQuickLogTarget.weightMax ?? null,
            weightUnit: primaryQuickLogTarget.weightUnit ?? fallbackWeightUnit,
            durationSeconds: primaryQuickLogTarget.durationSeconds ?? null,
            distance: primaryQuickLogTarget.distance ?? null,
            distanceUnit: primaryQuickLogTarget.distanceUnit ?? null,
            calories: primaryQuickLogTarget.calories ?? null,
          } : null,
        });
        const rowViewModel = deriveSessionExerciseRowViewModel({
          exerciseId: exercise.id,
          loggedSetCount: rowClientState.loggedSetCount,
          isSkipped: rowClientState.isSkipped,
          isQuickLogPending: rowClientState.isQuickLogPending,
          isSkipPending: rowClientState.isSkipPending,
          targetSetsMin: exercise.targetSetsMin,
          targetSetsMax: exercise.targetSetsMax,
          quickLogTarget: primaryQuickLogTarget,
          quickLogNextTarget: toQuickLogTargetFromSuggestedValues(resolvedTargetHint.suggestedValues),
          quickLogLastTarget: toQuickLogTargetFromSuggestedValues(resolvedTargetHint.lastSuggestedValues),
          quickLogBestTarget: toQuickLogTargetFromSuggestedValues(resolvedTargetHint.recentBestSuggestedValues),
          fallbackWeightUnit,
        });

        return [exercise.id, rowViewModel] as const;
      }),
    );
  }, [exercises, rowClientStateBySessionExerciseId, unitLabel]);
  const toast = useToast();
  const router = useRouter();
  void removeExerciseAction;
  useEffect(() => {
    setWarmupDraft(false);
  }, [selectedExerciseId]);

  useEffect(() => {
    if (!selectedExerciseId) {
      return;
    }
    setPersistedLoggerExerciseId(selectedExerciseId);
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
        setCountOverrideActive: false,
        isSkipped: exercise.isSkipped,
        isQuickLogPending: false,
        isSkipPending: false,
        showWhenCompleted: false,
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
    patchRowState(exerciseId, (existing) => {
      const exercise = exercises.find((item) => item.id === exerciseId);
      const progressState = exercise ? deriveSessionExerciseProgressState({
        loggedSetCount: count,
        isSkipped: existing.isSkipped,
        targetSetsMin: exercise.targetSetsMin,
        targetSetsMax: exercise.targetSetsMax,
      }) : null;
      const isNowGoalCompleted = Boolean(progressState?.isGoalCompleted);
      const nextShowWhenCompleted = isNowGoalCompleted
        ? false
        : existing.showWhenCompleted;

      if (existing.loggedSetCount === count && existing.showWhenCompleted === nextShowWhenCompleted) {
        return existing;
      }

      return {
        ...existing,
        loggedSetCount: count,
        setCountOverrideActive: true,
        showWhenCompleted: nextShowWhenCompleted,
      };
    });
    const exercise = exercises.find((item) => item.id === exerciseId);
    const isNowGoalCompleted = exercise ? deriveSessionExerciseProgressState({
      loggedSetCount: count,
      isSkipped: rowClientStateBySessionExerciseId[exerciseId]?.isSkipped ?? exercise.isSkipped,
      targetSetsMin: exercise.targetSetsMin,
      targetSetsMax: exercise.targetSetsMax,
    }).isGoalCompleted : false;
    if (isNowGoalCompleted && selectedExerciseId === exerciseId) {
      onSelectedExerciseIdChange(null);
    }
  }, [exercises, onSelectedExerciseIdChange, patchRowState, rowClientStateBySessionExerciseId, selectedExerciseId]);

  const toggleExercise = useCallback((exerciseId: string) => {
    setPersistedLoggerExerciseId(exerciseId);
    const exercise = exercises.find((item) => item.id === exerciseId);
    const clientRowState = rowClientStateBySessionExerciseId[exerciseId];
    const rowViewModel = rowViewModelBySessionExerciseId.get(exerciseId);
    const progressState = exercise ? deriveSessionExerciseProgressState({
      loggedSetCount: clientRowState?.loggedSetCount ?? exercise.loggedSetCount,
      isSkipped: clientRowState?.isSkipped ?? exercise.isSkipped,
      targetSetsMin: exercise.targetSetsMin,
      targetSetsMax: exercise.targetSetsMax,
    }) : null;
    const isOpeningExercise = selectedExerciseId !== exerciseId;

    if (isOpeningExercise && progressState?.isGoalCompleted && !rowViewModel?.isSkipped) {
      patchRowState(exerciseId, (current) => ({
        ...current,
        showWhenCompleted: true,
      }));
      setSetLoggerResetSignal((value) => value + 1);
      onSelectedExerciseIdChange(exerciseId);
      return;
    }

    if (rowViewModel?.isSkipped) {
      return;
    }
    if (!isOpeningExercise && progressState?.isGoalCompleted) {
      patchRowState(exerciseId, (current) => ({
        ...current,
        showWhenCompleted: true,
      }));
    }
    setSetLoggerResetSignal((value) => value + 1);
    onSelectedExerciseIdChange(selectedExerciseId === exerciseId ? null : exerciseId);
  }, [exercises, onSelectedExerciseIdChange, patchRowState, rowClientStateBySessionExerciseId, rowViewModelBySessionExerciseId, selectedExerciseId]);

  const handleSkipToggle = useCallback(async (
    exerciseId: string,
    previousSkipped: boolean,
    previousHidden: boolean,
    isGoalCompleted: boolean,
    isQuickLogPending: boolean,
    isSkipPending: boolean,
    loggedSetCount: number,
  ) => {
    if (isQuickLogPending || isSkipPending) {
      return;
    }

    if (isGoalCompleted && !previousSkipped) {
      const nextShowWhenCompleted = previousHidden;
      patchRowState(exerciseId, (current) => ({
        ...current,
        showWhenCompleted: nextShowWhenCompleted,
      }));
      if (selectedExerciseId === exerciseId) {
        onSelectedExerciseIdChange(null);
      }
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
          ? "Exercise shown."
          : "Exercise hidden.",
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
        {exercises.map((exercise) => {
          const isRemoving = removingExerciseIds.includes(exercise.id);
          const isExpanded = selectedExerciseId === exercise.id;
          const isStretchHub = isStretchHubExercise(exercise);
          const clientRowState = rowClientStateBySessionExerciseId[exercise.id];
          const loggedCountForTarget = clientRowState?.loggedSetCount ?? exercise.loggedSetCount;
          const setFlowQuickLogTarget = exercise.setFlowQuickLogTargets?.[loggedCountForTarget] ?? null;
          const primaryQuickLogTarget = setFlowQuickLogTarget ?? exercise.quickLogTarget;
          const baseRowViewModel = rowViewModelBySessionExerciseId.get(exercise.id) ?? deriveSessionExerciseRowViewModel({
            exerciseId: exercise.id,
            loggedSetCount: exercise.loggedSetCount,
            isSkipped: exercise.isSkipped,
            isQuickLogPending: false,
            isSkipPending: false,
            targetSetsMin: exercise.targetSetsMin,
            targetSetsMax: exercise.targetSetsMax,
            quickLogTarget: primaryQuickLogTarget,
            quickLogNextTarget: toQuickLogTargetFromSuggestedValues(exercise.targetHint?.suggestedValues ?? null),
            quickLogLastTarget: toQuickLogTargetFromSuggestedValues(exercise.targetHint?.lastSuggestedValues ?? null),
            quickLogBestTarget: toQuickLogTargetFromSuggestedValues(exercise.targetHint?.recentBestSuggestedValues ?? null),
            fallbackWeightUnit: unitLabel === "lbs" ? "lbs" : "kg",
          });
          const setCount = baseRowViewModel.loggedSetCount;
          const resolvedTargetHint = exercise.targetHint ?? deriveSessionTargetHint({
            measurementType: exercise.measurementType ?? "reps",
            fallbackWeightUnit: unitLabel === "lbs" ? "lbs" : "kg",
            stats: null,
            plan: primaryQuickLogTarget ? {
              measurementType: primaryQuickLogTarget.measurementType ?? (exercise.measurementType ?? "reps"),
              setsMin: exercise.targetSetsMin ?? null,
              setsMax: exercise.targetSetsMax ?? null,
              repsMin: primaryQuickLogTarget.repsMin ?? null,
              repsMax: primaryQuickLogTarget.repsMax ?? null,
              weightMin: primaryQuickLogTarget.weightMin ?? null,
              weightMax: primaryQuickLogTarget.weightMax ?? null,
              weightUnit: primaryQuickLogTarget.weightUnit ?? (unitLabel === "lbs" ? "lbs" : "kg"),
              durationSeconds: primaryQuickLogTarget.durationSeconds ?? null,
              distance: primaryQuickLogTarget.distance ?? null,
              distanceUnit: primaryQuickLogTarget.distanceUnit ?? null,
              calories: primaryQuickLogTarget.calories ?? null,
            } : null,
          });
          const resolvedQuickLogTarget = resolveEffectiveQuickLogTarget({
            quickLogTarget: primaryQuickLogTarget,
            nextTarget: toQuickLogTargetFromSuggestedValues(resolvedTargetHint.suggestedValues),
            lastTarget: toQuickLogTargetFromSuggestedValues(resolvedTargetHint.lastSuggestedValues),
            bestTarget: toQuickLogTargetFromSuggestedValues(resolvedTargetHint.recentBestSuggestedValues),
          });
          const setLoggerPrefill = toPrefillFromQuickLogTarget(
            resolvedQuickLogTarget?.target ?? primaryQuickLogTarget,
            unitLabel === "lbs" ? "lbs" : "kg",
          ) ?? exercise.prefill;
          const progressState = deriveSessionExerciseProgressState({
            loggedSetCount: setCount,
            isSkipped: baseRowViewModel.isSkipped,
            targetSetsMin: exercise.targetSetsMin,
            targetSetsMax: exercise.targetSetsMax,
          });
          const effectiveIsHidden = baseRowViewModel.isSkipped || (
            progressState.isGoalCompleted
            && !(clientRowState?.showWhenCompleted ?? false)
            && !isExpanded
          );
          const rowViewModel = effectiveIsHidden === baseRowViewModel.isSkipped
            ? baseRowViewModel
            : deriveSessionExerciseRowViewModel({
                ...baseRowViewModel,
                isSkipped: effectiveIsHidden,
              });
          const rowState = rowViewModel.rowState;
          const isCompletedRow = rowState.cardState === "completed";
          const titleMeta = progressState.goalSetTarget !== null && progressState.loggedSetCount > 0
            ? (
              <span className={isCompletedRow ? "text-[rgb(var(--success-rgb)/0.98)]" : undefined}>
                {progressState.loggedSetCount} / {progressState.goalSetTarget}
              </span>
            )
            : undefined;
          const sessionProgressFill = progressState.goalSetTarget !== null
            ? {
                percent: Math.max(0, Math.min(100, Math.round((progressState.loggedSetCount / progressState.goalSetTarget) * 100))),
                state: progressState.isGoalCompleted ? "ready" : "partial",
                label: `${Math.min(progressState.loggedSetCount, progressState.goalSetTarget)}/${progressState.goalSetTarget} sets`,
              } satisfies ProgressionProgressFill
            : null;
          const exerciseSummary = isStretchHub ? null : exercise.goalLabel;
          const semanticTone = resolveSessionExerciseTone({
            loggedSetCount: setCount,
            isSkipped: effectiveIsHidden,
            isCompleted: rowState.cardState === "completed",
            isAddedToday: exercise.routineDayExerciseId === null,
          });
          const shouldRenderCompactSkippedRow = effectiveIsHidden && !isExpanded;

          const cardShellStyle: CSSProperties & {
            "--exercise-card-progress-fill-top-right-radius": string;
            "--exercise-card-progress-fill-bottom-right-radius": string;
          } = isExpanded
            ? {
                borderTopRightRadius: "var(--card-radius)",
                borderBottomRightRadius: "0px",
                "--exercise-card-progress-fill-top-right-radius": "var(--card-radius)",
                "--exercise-card-progress-fill-bottom-right-radius": "0px",
              }
            : {
                borderTopRightRadius: "var(--card-radius)",
                borderBottomRightRadius: "0px",
                "--exercise-card-progress-fill-top-right-radius": "var(--card-radius)",
                "--exercise-card-progress-fill-bottom-right-radius": "0px",
              };
          const compactProgressFillPercent = sessionProgressFill && sessionProgressFill.percent > 0
            ? Math.max(0, Math.min(100, sessionProgressFill.percent))
            : null;
          const compactProgressFillStyle = compactProgressFillPercent !== null
            ? ({
                width: `${compactProgressFillPercent}%`,
              } satisfies CSSProperties)
            : null;
          const isCompactProgressFillComplete = compactProgressFillPercent !== null && compactProgressFillPercent >= 100;

          const disclosureCard = (
            <ExerciseDisclosureCard
              scope="session-exercise"
              itemId={exercise.id}
              expanded={isExpanded}
              keepPanelMounted={persistedLoggerExerciseId === exercise.id}
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
              className={isExpanded ? "flex flex-col overflow-visible" : "overflow-hidden rounded-none shadow-none ring-0"}
              shellClassName={[
                isExpanded
                  ? "!border-0 shadow-none ring-0 [--glass-current-border-alpha:0] [--glass-current-sheen-strength:0]"
                  : "rounded-none !border-0 shadow-none ring-0 [--glass-current-border-alpha:0] [--glass-current-sheen-strength:0]",
                rowState.cardState === "completed"
                  ? "!border-0 bg-[linear-gradient(180deg,rgb(var(--success-rgb)/0.76),rgb(var(--surface-2-rgb)/0.99))] ring-0"
                  : undefined,
              ].filter(Boolean).join(" ")}
              shellStyle={cardShellStyle}
              cardClassName={
                !isExpanded
                  ? "rounded-none !border-0 shadow-none ring-0 [--glass-current-border-alpha:0] [--glass-current-sheen-strength:0]"
                  : "!border-0 ring-0 shadow-none [--glass-current-border-alpha:0] [--glass-current-sheen-strength:0]"
              }
              contentClassName="pl-3"
              panelClassName={isExpanded ? "flex flex-col" : undefined}
              mediaClassName={cardMediaToneClassNames.completed}
              mediaLeftCornerMode={isExpanded ? "top-rounded" : undefined}
              rightIconMode={isExpanded ? "overlay" : undefined}
              rightRailClassName={isExpanded ? "!top-auto bottom-[0.9rem] !translate-y-0" : undefined}
              titleMeta={titleMeta}
              showAccentRail={!isStretchHub}
              hideEmptySummary={isStretchHub}
              contentVerticalAlign={isStretchHub ? "top" : "auto"}
              progressFill={sessionProgressFill}
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
                  prefill={setLoggerPrefill}
                  setFlowQuickLogTargets={exercise.setFlowQuickLogTargets}
                  defaultDistanceUnit={exercise.defaultUnit}
                  isCardio={exercise.isCardio}
                  targetHint={resolvedTargetHint}
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
                  progressionFormState={exercise.progressionFormState ?? null}
                  progressionStepPolicy={exercise.progressionStepPolicy ?? null}
                  visiblePromotionStepFields={exercise.visiblePromotionStepFields ?? null}
                  progressionSelectedMetrics={exercise.progressionSelectedMetrics ?? []}
                  showAllMeasurementInputs={!isStretchHub}
                  showFailureToggle={!isStretchHub}
                  showProgressionControls={!isStretchHub}
                  updateProgressionAction={updateSessionExerciseProgressionAction}
                  bottomDockCenter={bottomDockCenter}
                  onSetCountChange={(count) => {
                    handleSetCountChange(exercise.id, count);
                  }}
                />
              </>
            </ExerciseDisclosureCard>
          );

          const quickActionStrip = !isExpanded ? (
            <AttachedQuickActionStrip
              rowContract={{
                label: rowState.quickLogLabel,
                skipLabel: rowState.skipActionLabel,
                quickLogActionClassName: rowState.quickLogActionClassName,
                skipActionClassName: rowState.skipActionClassName,
                skipActionIntent: rowState.skipActionIntent,
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
                  baseRowViewModel.isSkipped,
                  effectiveIsHidden,
                  progressState.isGoalCompleted,
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
                  const quickLogResolution = resolveQuickLogFromResolvedTarget(
                    resolvedQuickLogTarget,
                    unitLabel === "lbs" ? "lbs" : "kg",
                  );
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
                "origin-top transition-all duration-75 ease-out motion-reduce:transition-none",
                isRemoving
                  ? "max-h-0 scale-[0.98] overflow-hidden opacity-0"
                  : isExpanded
                    ? "max-h-[240rem] scale-100 overflow-visible opacity-100"
                    : "max-h-72 scale-100 overflow-hidden opacity-100",
              ].join(" ")}
            >
              <SessionExerciseBlock>
                <div className="w-full">
                  {shouldRenderCompactSkippedRow ? (
                    <div className={cn("relative", COMPACT_SESSION_ROW_SHELL_CLASS_NAME, "bg-[rgb(var(--surface-1-rgb)/0.86)]")}>
                      {compactProgressFillStyle ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute bottom-0 left-0 top-0 z-0 bg-[linear-gradient(90deg,rgb(var(--accent)/0.30),rgb(var(--accent)/0.17))]",
                            isCompactProgressFillComplete
                              ? "right-0 rounded-br-[var(--card-radius)] rounded-tr-[var(--card-radius)] shadow-[inset_-10px_0_18px_rgb(var(--accent)/0.20)]"
                              : "rounded-r-[999px] shadow-[0_0_18px_rgb(var(--accent)/0.12)]",
                          )}
                          style={compactProgressFillStyle}
                        />
                      ) : null}
                      <div className="relative z-[1] flex min-h-[3.25rem] items-center justify-between gap-3 px-4 py-2.5">
                        <p className="min-w-0 flex-1 whitespace-normal break-words text-[0.95rem] font-semibold leading-[1.2] text-[rgb(var(--text)/0.96)]">
                          {exercise.name}
                        </p>
                        <button
                          type="button"
                          disabled={rowViewModel.isSkipPending}
                          onClick={() => {
                            void handleSkipToggle(
                              exercise.id,
                              baseRowViewModel.isSkipped,
                              effectiveIsHidden,
                              progressState.isGoalCompleted,
                              rowViewModel.isQuickLogPending,
                              rowViewModel.isSkipPending,
                              setCount,
                            );
                          }}
                          data-bottom-action-intent={rowState.skipActionIntent}
                          className={cn(
                            getBottomActionButtonClassName({
                              intent: rowState.skipActionIntent,
                              fullWidth: false,
                              className: "!min-h-0 h-auto rounded-[999px] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em]",
                            }),
                            "shrink-0",
                            rowViewModel.isSkipPending ? "shadow-none" : undefined,
                          )}
                        >
                          {rowViewModel.isSkipPending ? "Saving..." : rowState.skipActionLabel}
                        </button>
                      </div>
                    </div>
                  ) : isExpanded ? (
                    <SessionExerciseCard>
                      {disclosureCard}
                    </SessionExerciseCard>
                  ) : (
                    <div className={COMPACT_SESSION_ROW_SHELL_CLASS_NAME}>
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
