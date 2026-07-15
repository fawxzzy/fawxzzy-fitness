"use client";

import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  SetLoggerCard,
  type SessionLoggerDraftQuickLogPayload,
  type SessionLoggerDraftState,
  type SetLoggerSeedSet,
} from "@/components/SessionTimers";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import { AttachedQuickActionStrip, SessionExerciseBlock, SessionExerciseCard } from "@/components/session/SessionExerciseBlock";
import { resolveScreenContract } from "@/components/ui/app/screenContract";
import { getBottomActionButtonClassName } from "@/components/layout/bottomActionIntents";
import { ExerciseDisclosureCard } from "@/components/workout/ExerciseDisclosureCard";
import {
  buildExerciseCardMetadataItems,
  ExerciseCardMetadataLine,
  ExerciseCardProgressionStateInline,
  ExerciseCardStandardTitle,
} from "@/components/workout/ExerciseCardStandardTitle";
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
import { deriveCompletedVisibilityOverride } from "@/lib/session-completed-visibility";
import { formatSessionCopilotFeedbackLabel, type SessionCopilotFeedbackSignal } from "@/lib/session-copilot-feedback";
import { areSessionLoggerDraftStatesEqual, buildSessionProgressionFeedbackSummaryLabel } from "@/lib/session-feedback-ui";
import { cn } from "@/lib/cn";
import { scrollDockAwareIntoView } from "@/lib/scrollDockAwareIntoView";
import { resolveWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";
import { areSetListsEquivalent, createStableSetId, mergeByStableSetId, resolveStableSetId, sortSetsByIndex } from "@/lib/offline/set-log-reconciliation";
import { isStretchHubExercise } from "@/lib/stretch-library";
import { ExerciseTimerControl } from "@/components/session/ExerciseTimerControl";
import { hasSavedSessionExerciseFeedback, SessionExerciseFeedbackPrompt } from "@/components/session/SessionExerciseFeedbackPrompt";
import type { ExerciseTimerCommand, ExerciseTimerSnapshot } from "@/lib/exercise-timer";
import { buildRecoveryTimingInsight } from "@/lib/recovery-timing";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { ProgressionProgressFill } from "@/lib/progression-progress-percent";
import type { ProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import type { PromotionStepFieldId } from "@/lib/session-progression-display";
import type { SetRow } from "@/types/db";

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
  notes: string | null;
  weightUnit: "lbs" | "kg";
  clientLogId: string;
};

type AddSetActionResult = ActionResult<{ set: SetRow }>;

type SessionExerciseLocalCacheEntry = {
  rowClientStateBySessionExerciseId: Record<string, SessionRowClientState>;
  setSnapshotsBySessionExerciseId: Record<string, SetLoggerSeedSet[]>;
  draftStateBySessionExerciseId: Record<string, SessionLoggerDraftState>;
};

const sessionExerciseLocalStateCache = new Map<string, SessionExerciseLocalCacheEntry>();

const COMPACT_SESSION_ROW_SHELL_CLASS_NAME = "overflow-hidden rounded-none rounded-r-[var(--card-radius)] rounded-bl-[var(--card-radius)] border border-[rgb(var(--accent-divider-rgb)/0.28)] bg-[rgb(var(--surface-1-rgb)/0.06)] shadow-[0_0_0_1px_rgb(var(--accent-divider-rgb)/0.06)]";
const CURRENT_SESSION_CARD_CHEVRON_RAIL_CLASS_NAME = "!right-[0.58rem] !top-[0.58rem] !bottom-auto !translate-y-0";
const CURRENT_SESSION_CARD_INFO_OVERLAY_CLASS_NAME = "inset-0 !left-0 !right-0 !top-0 !bottom-0 !block !translate-y-0 pointer-events-none";
const CURRENT_SESSION_CARD_INFO_BUTTON_CLASS_NAME = "pointer-events-auto absolute bottom-[0.3rem] right-[0.3rem] z-[3] inline-flex h-[1.625rem] w-[1.625rem] items-center justify-center rounded-full border border-[rgb(var(--accent-divider-rgb)/0.22)] bg-[rgb(var(--bg-app)/0.84)] text-[0.9rem] font-semibold text-[rgb(var(--accent-strong)/0.96)] shadow-[0_0_10px_rgb(var(--accent)/0.1)] backdrop-blur-[16px] transition-colors hover:border-[rgb(var(--accent)/0.42)] hover:text-[rgb(var(--accent)/0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.2)]";
const CURRENT_SESSION_CARD_TITLE_CONTAINER_CLASS_NAME = "!pr-[2.75rem] sm:!pr-[3.3rem] pb-[1.9rem]";
const CURRENT_SESSION_CARD_CORNER_META_CLASS_NAME = "!right-[1.82rem] !top-[0.71rem]";

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

function areSessionRowClientStateMapsEqual(
  left: Record<string, SessionRowClientState>,
  right: Record<string, SessionRowClientState>,
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    const leftValue = left[key];
    const rightValue = right[key];
    if (!rightValue) {
      return false;
    }
    if (
      leftValue.loggedSetCount !== rightValue.loggedSetCount
      || leftValue.setCountOverrideActive !== rightValue.setCountOverrideActive
      || leftValue.isSkipped !== rightValue.isSkipped
      || leftValue.isQuickLogPending !== rightValue.isQuickLogPending
      || leftValue.isSkipPending !== rightValue.isSkipPending
      || leftValue.showWhenCompleted !== rightValue.showWhenCompleted
    ) {
      return false;
    }
  }

  return true;
}

function areSetSnapshotMapsEqual(
  left: Record<string, SetLoggerSeedSet[]>,
  right: Record<string, SetLoggerSeedSet[]>,
) {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (!areSetListsEquivalent(left[key] ?? [], right[key] ?? [])) {
      return false;
    }
  }

  return true;
}

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

  return Object.keys(prefill).length > 0 ? prefill : undefined;
}

function toSeedSet(set: SetRow): SetLoggerSeedSet {
  return {
    ...set,
    stableId: resolveStableSetId(set),
    pending: false,
    queueItemId: undefined,
    queueStatus: undefined,
  };
}

function removeSeedSetByStableId(sets: SetLoggerSeedSet[], stableId: string) {
  return sets.filter((set) => resolveStableSetId(set) !== stableId);
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
  caloriesEstimationMethod?: string | null;
  copilotFeedbackSignal?: SessionCopilotFeedbackSignal | null;
  copilotFeedbackNote?: string | null;
  copilotFeedbackUpdatedAt?: string | null;
  copilotFeedbackEffort?: number | null;
  exerciseTimer?: ExerciseTimerSnapshot;
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
  cycleLengthDays,
  sessionDayIndex,
  exercises,
  selectedExerciseId,
  onSelectedExerciseIdChange,
  addSetAction,
  syncQueuedSetLogsAction,
  toggleSkipAction,
  removeExerciseAction,
  deleteSetAction,
  updateSessionExerciseCopilotFeedbackAction,
  updateSessionExerciseProgressionAction,
  updateSessionExerciseTimerAction,
  disableDraftPersistence = false,
  bottomDockCenter,
}: {
  userId: string;
  sessionId: string;
  unitLabel: string;
  cycleLengthDays?: number | null;
  sessionDayIndex?: number | null;
  exercises: SessionExerciseFocusItem[];
  selectedExerciseId: string | null;
  onSelectedExerciseIdChange: (exerciseId: string | null) => void;
  addSetAction: (payload: AddSetPayload) => Promise<AddSetActionResult>;
  syncQueuedSetLogsAction: SyncQueuedSetLogsAction;
  toggleSkipAction: (formData: FormData) => Promise<ActionResult>;
  removeExerciseAction: (formData: FormData) => Promise<ActionResult>;
  deleteSetAction: (payload: { sessionId: string; sessionExerciseId: string; setId: string }) => Promise<ActionResult>;
  updateSessionExerciseCopilotFeedbackAction?: (payload: {
    sessionId: string;
    sessionExerciseId: string;
    signal: SessionCopilotFeedbackSignal | null;
    note: string | null;
    effort: number | null;
  }) => Promise<ActionResult<{ signal: SessionCopilotFeedbackSignal | null; note: string | null; effort: number | null; updatedAt: string | null }>>;
  updateSessionExerciseProgressionAction: (formData: FormData) => Promise<ActionResult>;
  updateSessionExerciseTimerAction?: (payload: {
    sessionId: string;
    sessionExerciseId: string;
    command: ExerciseTimerCommand;
  }) => Promise<ActionResult<{ timer: ExerciseTimerSnapshot }>>;
  disableDraftPersistence?: boolean;
  bottomDockCenter?: ReactNode;
}) {
  const cachedSessionState = sessionExerciseLocalStateCache.get(sessionId);
  const contract = resolveScreenContract("exerciseLog");
  const surfacePolicy = resolveWorkoutCardSurfacePolicy("current-session", "compact");
  const [removingExerciseIds] = useState<string[]>([]);
  const [persistedLoggerExerciseId, setPersistedLoggerExerciseId] = useState<string | null>(selectedExerciseId);
  const [rowClientStateBySessionExerciseId, setRowClientStateBySessionExerciseId] = useState<Record<string, SessionRowClientState>>(() =>
    cachedSessionState?.rowClientStateBySessionExerciseId
      ? reconcileSessionRowClientState({
          current: cachedSessionState.rowClientStateBySessionExerciseId,
          rows: exercises,
          mergedLoggedSetCount: Object.fromEntries(
            exercises.map((exercise) => [
              exercise.id,
              cachedSessionState.setSnapshotsBySessionExerciseId[exercise.id]?.length
                ?? cachedSessionState.rowClientStateBySessionExerciseId[exercise.id]?.loggedSetCount
                ?? exercise.loggedSetCount,
            ]),
          ),
        })
      : buildInitialSessionRowClientState(exercises),
  );
  const [setSnapshotsBySessionExerciseId, setSetSnapshotsBySessionExerciseId] = useState<Record<string, SetLoggerSeedSet[]>>(() =>
    cachedSessionState?.setSnapshotsBySessionExerciseId
      ? Object.fromEntries(
          exercises.map((exercise) => [
            exercise.id,
            cachedSessionState.setSnapshotsBySessionExerciseId[exercise.id] ?? exercise.initialSets,
          ]),
        )
      : {},
  );
  const [draftStateBySessionExerciseId, setDraftStateBySessionExerciseId] = useState<Record<string, SessionLoggerDraftState>>(
    () => cachedSessionState?.draftStateBySessionExerciseId ?? {},
  );
  const [timerSnapshotsBySessionExerciseId, setTimerSnapshotsBySessionExerciseId] = useState<Record<string, ExerciseTimerSnapshot>>({});
  const [timerVisibilityBySessionExerciseId, setTimerVisibilityBySessionExerciseId] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(exercises
      .filter((exercise) => exercise.exerciseTimer?.enabled)
      .map((exercise) => [exercise.id, true])),
  );
  const [exerciseInfoExerciseId, setExerciseInfoExerciseId] = useState<string | null>(null);
  const [answeredFeedbackExerciseIds, setAnsweredFeedbackExerciseIds] = useState<Set<string>>(() => new Set());
  const [savedFeedbackByExerciseId, setSavedFeedbackByExerciseId] = useState<Record<string, {
    signal: SessionCopilotFeedbackSignal | null;
    note: string | null;
    effort: number | null;
  }>>({});
  const rowViewModelBySessionExerciseId = useMemo(() => {
    const fallbackWeightUnit = unitLabel === "lbs" ? "lbs" : "kg";
    return new Map(
      exercises.map((exercise) => {
        const snapshotLoggedSetCount = setSnapshotsBySessionExerciseId[exercise.id]?.length;
        const rowClientState = rowClientStateBySessionExerciseId[exercise.id] ?? {
          loggedSetCount: exercise.loggedSetCount,
          setCountOverrideActive: false,
          isSkipped: exercise.isSkipped,
          isQuickLogPending: false,
          isSkipPending: false,
        };
        const resolvedLoggedSetCount = typeof snapshotLoggedSetCount === "number"
          ? snapshotLoggedSetCount
          : rowClientState.loggedSetCount;
        const setFlowQuickLogTarget = exercise.setFlowQuickLogTargets?.[resolvedLoggedSetCount] ?? null;
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
          loggedSetCount: resolvedLoggedSetCount,
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
  }, [exercises, rowClientStateBySessionExerciseId, setSnapshotsBySessionExerciseId, unitLabel]);
  const toast = useToast();
  void removeExerciseAction;

  useEffect(() => {
    sessionExerciseLocalStateCache.set(sessionId, {
      rowClientStateBySessionExerciseId,
      setSnapshotsBySessionExerciseId,
      draftStateBySessionExerciseId,
    });
  }, [draftStateBySessionExerciseId, rowClientStateBySessionExerciseId, sessionId, setSnapshotsBySessionExerciseId]);
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
      const next = patch(previous);
      if (next === previous) {
        return current;
      }
      return {
        ...current,
        [sessionExerciseId]: next,
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
      const next = reconcileSessionRowClientState({
        current,
        rows: exercises,
        mergedLoggedSetCount: mergedCountState,
      });
      return areSessionRowClientStateMapsEqual(current, next) ? current : next;
    });
  }, [exercises]);

  useEffect(() => {
    setSetSnapshotsBySessionExerciseId((current) => {
      const next: Record<string, SetLoggerSeedSet[]> = {};
      for (const exercise of exercises) {
        next[exercise.id] = current[exercise.id] ?? exercise.initialSets;
      }
      return areSetSnapshotMapsEqual(current, next) ? current : next;
    });
  }, [exercises]);

  useEffect(() => {
    setDraftStateBySessionExerciseId((current) => {
      const next = Object.fromEntries(
        exercises
          .map((exercise) => {
            const draftState = current[exercise.id];
            return draftState ? [exercise.id, draftState] : null;
          })
          .filter((entry): entry is [string, SessionLoggerDraftState] => entry !== null),
      );

      return Object.keys(next).length === Object.keys(current).length ? current : next;
    });
  }, [exercises]);

  useEffect(() => {
    setRowClientStateBySessionExerciseId((current) => {
      const next = Object.fromEntries(
        exercises.map((exercise) => {
          const previous = current[exercise.id] ?? {
            loggedSetCount: exercise.loggedSetCount,
            setCountOverrideActive: false,
            isSkipped: exercise.isSkipped,
            isQuickLogPending: false,
            isSkipPending: false,
            showWhenCompleted: false,
          };
          const snapshotLoggedSetCount = setSnapshotsBySessionExerciseId[exercise.id]?.length;
          const resolvedLoggedSetCount = typeof snapshotLoggedSetCount === "number"
            ? snapshotLoggedSetCount
            : previous.loggedSetCount;

          return [exercise.id, {
            ...previous,
            loggedSetCount: resolvedLoggedSetCount,
            setCountOverrideActive: resolvedLoggedSetCount !== exercise.loggedSetCount || previous.setCountOverrideActive,
          } satisfies SessionRowClientState];
        }),
      );

      return areSessionRowClientStateMapsEqual(current, next) ? current : next;
    });
  }, [exercises, setSnapshotsBySessionExerciseId]);

  const handleSetCountChange = useCallback((exerciseId: string, count: number) => {
    patchRowState(exerciseId, (existing) => {
      const exercise = exercises.find((item) => item.id === exerciseId);
      const nextShowWhenCompleted = exercise
        ? deriveCompletedVisibilityOverride({
            previousLoggedSetCount: existing.loggedSetCount,
            nextLoggedSetCount: count,
            isSkipped: existing.isSkipped,
            targetSetsMin: exercise.targetSetsMin,
            targetSetsMax: exercise.targetSetsMax,
            previousShowWhenCompleted: existing.showWhenCompleted,
            retainWhenFirstCompleted: !answeredFeedbackExerciseIds.has(exercise.id) && !hasSavedSessionExerciseFeedback({
              signal: exercise.copilotFeedbackSignal,
              note: exercise.copilotFeedbackNote,
              effort: exercise.copilotFeedbackEffort,
            }),
          })
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
  }, [answeredFeedbackExerciseIds, exercises, patchRowState]);

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
    const shouldRetainCompletedCard = Boolean(exercise) && !answeredFeedbackExerciseIds.has(exerciseId) && !hasSavedSessionExerciseFeedback({
      signal: exercise?.copilotFeedbackSignal,
      note: exercise?.copilotFeedbackNote,
      effort: exercise?.copilotFeedbackEffort,
    });
    const isActuallySkipped = clientRowState?.isSkipped ?? exercise?.isSkipped ?? false;

    if (isOpeningExercise && progressState?.isGoalCompleted && !rowViewModel?.isSkipped) {
      patchRowState(exerciseId, (current) => ({
        ...current,
        showWhenCompleted: true,
      }));
      onSelectedExerciseIdChange(exerciseId);
      return;
    }

    if (isActuallySkipped) {
      return;
    }
    if (!isOpeningExercise && progressState?.isGoalCompleted) {
      patchRowState(exerciseId, (current) => ({
        ...current,
        showWhenCompleted: shouldRetainCompletedCard,
      }));
    }
    onSelectedExerciseIdChange(selectedExerciseId === exerciseId ? null : exerciseId);
  }, [answeredFeedbackExerciseIds, exercises, onSelectedExerciseIdChange, patchRowState, rowClientStateBySessionExerciseId, rowViewModelBySessionExerciseId, selectedExerciseId]);

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
  }, [onSelectedExerciseIdChange, patchRowState, selectedExerciseId, sessionId, toast, toggleSkipAction]);

  return (
    <div className={appTokens.currentSessionFocusStack} data-row-interaction={contract.rowInteraction}>
      <ul className={cn(appTokens.currentSessionFocusList, "space-y-0")}>
        {exercises.map((exercise) => {
          const isRemoving = removingExerciseIds.includes(exercise.id);
          const isExpanded = selectedExerciseId === exercise.id;
          const isStretchHub = isStretchHubExercise(exercise);
          const clientRowState = rowClientStateBySessionExerciseId[exercise.id];
          const currentExerciseSets = setSnapshotsBySessionExerciseId[exercise.id] ?? exercise.initialSets;
          const currentExerciseTimer = timerSnapshotsBySessionExerciseId[exercise.id] ?? exercise.exerciseTimer;
          const isExerciseTimerVisible = currentExerciseTimer?.enabled === true
            && (timerVisibilityBySessionExerciseId[exercise.id] ?? true);
          const recoveryTimingInsight = buildRecoveryTimingInsight(currentExerciseSets);
          const snapshotLoggedSetCount = setSnapshotsBySessionExerciseId[exercise.id]?.length;
          const loggedCountForTarget = typeof snapshotLoggedSetCount === "number"
            ? snapshotLoggedSetCount
            : (clientRowState?.loggedSetCount ?? exercise.loggedSetCount);
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
            primaryQuickLogTarget,
            unitLabel === "lbs" ? "lbs" : "kg",
          ) ?? exercise.prefill;
          const progressState = deriveSessionExerciseProgressState({
            loggedSetCount: setCount,
            isSkipped: clientRowState?.isSkipped ?? exercise.isSkipped,
            targetSetsMin: exercise.targetSetsMin,
            targetSetsMax: exercise.targetSetsMax,
          });
          const isActuallySkipped = clientRowState?.isSkipped ?? exercise.isSkipped;
          const savedFeedback = savedFeedbackByExerciseId[exercise.id] ?? {
            signal: exercise.copilotFeedbackSignal,
            note: exercise.copilotFeedbackNote,
            effort: exercise.copilotFeedbackEffort,
          };
          const hasSavedFeedback = answeredFeedbackExerciseIds.has(exercise.id) || hasSavedSessionExerciseFeedback({
            signal: savedFeedback.signal,
            note: savedFeedback.note,
            effort: savedFeedback.effort,
          });
          const needsPostCloseFeedback = Boolean(updateSessionExerciseCopilotFeedbackAction)
            && progressState.isGoalCompleted
            && !hasSavedFeedback;
          const effectiveIsHidden = isActuallySkipped || (
            progressState.isGoalCompleted
            && !(clientRowState?.showWhenCompleted ?? false)
            && !needsPostCloseFeedback
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
          const shouldShowFeedbackPrompt = Boolean(updateSessionExerciseCopilotFeedbackAction)
            && progressState.isGoalCompleted
            && !isExpanded
            && !hasSavedFeedback;
          const savedFeedbackLabel = [
            savedFeedback.signal ? formatSessionCopilotFeedbackLabel(savedFeedback.signal) : null,
            savedFeedback.effort !== null ? `${savedFeedback.effort}/10` : null,
            !savedFeedback.signal && savedFeedback.effort === null && savedFeedback.note ? "Note saved" : null,
          ].filter((item): item is string => Boolean(item)).join(" · ");
          const hasCollapsedSupplement = Boolean(recoveryTimingInsight) || shouldShowFeedbackPrompt || Boolean(savedFeedbackLabel);
          const titleMeta = progressState.goalSetTarget !== null
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
          const draftState = draftStateBySessionExerciseId[exercise.id] ?? null;
          const exerciseSummary = isStretchHub ? null : (draftState?.goalLabel ?? exercise.goalLabel);
          const semanticTone = resolveSessionExerciseTone({
            loggedSetCount: setCount,
            isSkipped: effectiveIsHidden,
            isCompleted: rowState.cardState === "completed",
            isAddedToday: exercise.routineDayExerciseId === null,
          });
          const shouldRenderCompactSkippedRow = effectiveIsHidden && !isExpanded;
          const headerMetaItems = buildExerciseCardMetadataItems({
            primaryMuscle: exercise.primary_muscle,
            movementPattern: exercise.movement_pattern,
            equipment: exercise.equipment,
          }).slice(0, 2);
          const copilotFeedbackSignal = draftState?.copilotFeedbackSignal ?? exercise.copilotFeedbackSignal ?? null;
          const progressionStateLabel = buildSessionProgressionFeedbackSummaryLabel({
            progressionFormState: exercise.progressionFormState ?? null,
            copilotFeedbackSignal,
          });
          const sessionTitle = (
            <ExerciseCardStandardTitle
              name={exercise.name}
              metadata={<ExerciseCardMetadataLine items={headerMetaItems} />}
              rightContent={exerciseSummary ?? undefined}
              rightSubcontent={isStretchHub ? undefined : <ExerciseCardProgressionStateInline label={progressionStateLabel} />}
              columnLayout="compact"
            />
          );
          const cardInfoButton = (
            <button
              type="button"
              aria-label={`Open exercise info for ${exercise.name}`}
              onClick={(event) => {
                event.stopPropagation();
                setExerciseInfoExerciseId(exercise.exerciseId);
              }}
              className={CURRENT_SESSION_CARD_INFO_BUTTON_CLASS_NAME}
            >
              <span aria-hidden="true">i</span>
            </button>
          );

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
              keepPanelMounted={false}
              onToggle={() => toggleExercise(exercise.id)}
              exercise={exercise}
              title={sessionTitle}
              summary={undefined}
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
              contentClassName="pl-3 pr-[2.45rem]"
              titleContainerClassName={CURRENT_SESSION_CARD_TITLE_CONTAINER_CLASS_NAME}
              panelClassName={isExpanded ? "flex flex-col" : undefined}
              mediaClassName={cardMediaToneClassNames.completed}
              mediaLeftCornerMode={isExpanded ? "top-rounded" : undefined}
              rightIconMode="overlay"
              rightRailClassName={CURRENT_SESSION_CARD_CHEVRON_RAIL_CLASS_NAME}
              cornerMeta={titleMeta}
              cornerMetaClassName={CURRENT_SESSION_CARD_CORNER_META_CLASS_NAME}
              overlayActions={cardInfoButton}
              overlayActionsClassName={CURRENT_SESSION_CARD_INFO_OVERLAY_CLASS_NAME}
              showAccentRail
              hideEmptySummary
              contentVerticalAlign="top"
              progressFill={sessionProgressFill}
              collapsedCardFooter={recoveryTimingInsight ? (
                <p className="border-t border-[rgb(var(--accent-divider-rgb)/0.2)] bg-[rgb(var(--surface-1-rgb)/0.26)] px-3 py-2 text-[11px] font-semibold text-[rgb(var(--text-muted)/0.9)]">
                  {recoveryTimingInsight.label}
                </p>
              ) : null}
              collapsedContent={(
                <>
                  {savedFeedbackLabel ? (
                    <p className="border-x border-b border-t border-[rgb(var(--accent-divider-rgb)/0.2)] bg-[rgb(var(--surface-1-rgb)/0.26)] px-3 py-2 text-[11px] font-semibold text-[rgb(var(--text-muted)/0.9)]">
                      {savedFeedbackLabel}
                    </p>
                  ) : null}
                  {shouldShowFeedbackPrompt && updateSessionExerciseCopilotFeedbackAction ? (
                    <SessionExerciseFeedbackPrompt
                      sessionId={sessionId}
                      sessionExerciseId={exercise.id}
                      updateFeedbackAction={updateSessionExerciseCopilotFeedbackAction}
                      onSaved={(feedback) => {
                        setAnsweredFeedbackExerciseIds((current) => new Set([...current, exercise.id]));
                        setSavedFeedbackByExerciseId((current) => ({ ...current, [exercise.id]: feedback }));
                        patchRowState(exercise.id, (current) => ({ ...current, showWhenCompleted: false }));
                      }}
                    />
                  ) : null}
                </>
              )}
            >
              <>
                <SetLoggerCard
                  userId={userId}
                  sessionId={sessionId}
                  sessionExerciseId={exercise.id}
                  addSetAction={addSetAction}
                  syncQueuedSetLogsAction={syncQueuedSetLogsAction}
                  unitLabel={unitLabel}
                  initialSets={currentExerciseSets}
                  onSetsChange={(nextSets) => {
                    setSetSnapshotsBySessionExerciseId((current) => {
                      const previous = current[exercise.id];
                      if (previous && areSetListsEquivalent(previous, nextSets)) {
                        return current;
                      }
                      return {
                        ...current,
                        [exercise.id]: nextSets,
                      };
                    });
                  }}
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
                  copilotFeedbackSignal={exercise.copilotFeedbackSignal ?? null}
                  copilotFeedbackNote={exercise.copilotFeedbackNote ?? null}
                  copilotFeedbackUpdatedAt={exercise.copilotFeedbackUpdatedAt ?? null}
                  initialEffortRating={draftState?.copilotFeedbackEffort ?? exercise.copilotFeedbackEffort ?? null}
                  updateCopilotFeedbackAction={updateSessionExerciseCopilotFeedbackAction}
                  exerciseTimerVisible={isExerciseTimerVisible}
                  onExerciseTimerVisibilityChange={currentExerciseTimer?.enabled && updateSessionExerciseTimerAction ? async (nextVisible) => {
                    const result = await updateSessionExerciseTimerAction({
                      sessionId,
                      sessionExerciseId: exercise.id,
                      command: nextVisible ? "start" : "pause",
                    });
                    if (!result.ok) {
                      toast.error(result.error || "Could not update exercise timer.");
                      return false;
                    }
                    if (!result.data?.timer) {
                      toast.error("Could not update exercise timer.");
                      return false;
                    }
                    const nextTimer = result.data.timer;
                    setTimerSnapshotsBySessionExerciseId((current) => ({ ...current, [exercise.id]: nextTimer }));
                    setTimerVisibilityBySessionExerciseId((current) => ({ ...current, [exercise.id]: nextVisible }));
                    return true;
                  } : undefined}
                  progressionFormState={exercise.progressionFormState ?? null}
                  progressionStepPolicy={exercise.progressionStepPolicy ?? null}
                  visiblePromotionStepFields={exercise.visiblePromotionStepFields ?? null}
                  progressionSelectedMetrics={exercise.progressionSelectedMetrics ?? []}
                  calorieEstimationExercise={{
                    name: exercise.name,
                    slug: exercise.slug ?? null,
                    equipment: exercise.equipment ?? null,
                    movementPattern: exercise.movement_pattern ?? null,
                    measurementType: exercise.measurementType ?? null,
                    defaultUnit: exercise.defaultUnit ?? null,
                    caloriesEstimationMethod: exercise.caloriesEstimationMethod ?? null,
                  }}
                  exerciseMeasurementType={exercise.measurementType ?? "reps"}
                  exerciseEquipment={exercise.equipment ?? null}
                  exerciseMovementPattern={exercise.movement_pattern ?? null}
                  exerciseName={exercise.name}
                  targetSetsMin={exercise.targetSetsMin ?? null}
                  targetSetsMax={exercise.targetSetsMax ?? null}
                  cycleLengthDays={cycleLengthDays ?? null}
                  progressionExampleDayNumber={sessionDayIndex ?? null}
                  showAllMeasurementInputs={!isStretchHub}
                  showWarmupToggle={!isStretchHub}
                  showFailureToggle={!isStretchHub}
                  showProgressionControls={!isStretchHub}
                  updateProgressionAction={updateSessionExerciseProgressionAction}
                  bottomDockCenter={bottomDockCenter}
                  fallbackGoalLabel={exercise.goalLabel}
                  reportDraftState={isExpanded}
                  draftFormState={draftState?.formState ?? null}
                  disableDraftPersistence={disableDraftPersistence}
                  onDraftStateChange={(nextDraftState) => {
                    setDraftStateBySessionExerciseId((current) => {
                      const previous = current[exercise.id];
                      if (areSessionLoggerDraftStatesEqual(previous, nextDraftState)) {
                        return current;
                      }

                      return {
                        ...current,
                        [exercise.id]: nextDraftState,
                      };
                    });
                  }}
                  onSetCountChange={(count) => {
                    handleSetCountChange(exercise.id, count);
                  }}
                />
                {isExerciseTimerVisible && currentExerciseTimer && updateSessionExerciseTimerAction ? (
                  <ExerciseTimerControl
                    sessionId={sessionId}
                    sessionExerciseId={exercise.id}
                    initialTimer={currentExerciseTimer}
                    updateTimerAction={updateSessionExerciseTimerAction}
                  />
                ) : null}
              </>
            </ExerciseDisclosureCard>
          );

          const quickActionStrip = !isExpanded ? (
            <AttachedQuickActionStrip
              gridClassName="grid-cols-[88px_minmax(0,1fr)]"
              rowContract={{
                label: draftState?.quickLogLabel ?? rowState.quickLogLabel,
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
                const clientLogId = createStableSetId();
                try {
                  const quickLogPayload = (() => {
                    const draftQuickLogPayload = draftState?.quickLogPayload ?? null;
                    if (draftQuickLogPayload) {
                      return draftQuickLogPayload;
                    }

                    const quickLogResolution = resolveQuickLogFromResolvedTarget(
                      resolvedQuickLogTarget,
                      unitLabel === "lbs" ? "lbs" : "kg",
                    );
                    if (!quickLogResolution.ok) {
                      toast.error(quickLogResolution.reason);
                      toggleExercise(exercise.id);
                      return null;
                    }

                    return {
                      ...quickLogResolution.payload,
                      isWarmup: false,
                      notes: null,
                    } satisfies SessionLoggerDraftQuickLogPayload;
                  })();
                  if (!quickLogPayload) {
                    return;
                  }

                  setSetSnapshotsBySessionExerciseId((current) => {
                    const previous = current[exercise.id] ?? exercise.initialSets;
                    const nextSetIndex = previous.reduce((max, set) => Math.max(max, set.set_index), -1) + 1;
                    const optimisticSet: SetLoggerSeedSet = {
                      id: clientLogId,
                      client_log_id: clientLogId,
                      stableId: clientLogId,
                      session_exercise_id: exercise.id,
                      user_id: userId,
                      set_index: nextSetIndex,
                      weight: quickLogPayload.weight,
                      reps: quickLogPayload.reps,
                      duration_seconds: quickLogPayload.durationSeconds,
                      distance: quickLogPayload.distance,
                      distance_unit: quickLogPayload.distanceUnit,
                      calories: quickLogPayload.calories,
                      is_warmup: quickLogPayload.isWarmup,
                      notes: quickLogPayload.notes,
                      rpe: null,
                      weight_unit: quickLogPayload.weightUnit,
                      pending: true,
                    };
                    const next = sortSetsByIndex(mergeByStableSetId(previous, [optimisticSet]));
                    if (areSetListsEquivalent(previous, next)) {
                      return current;
                    }
                    return {
                      ...current,
                      [exercise.id]: next,
                    };
                  });

                  const result = await addSetAction({
                    sessionId,
                    sessionExerciseId: exercise.id,
                    weight: quickLogPayload.weight,
                    reps: quickLogPayload.reps,
                    durationSeconds: quickLogPayload.durationSeconds,
                    distance: quickLogPayload.distance,
                    distanceUnit: quickLogPayload.distanceUnit,
                    calories: quickLogPayload.calories,
                    isWarmup: quickLogPayload.isWarmup,
                    notes: quickLogPayload.notes,
                    weightUnit: quickLogPayload.weightUnit,
                    clientLogId,
                  });

                  toastActionResult(toast, result, {
                    success: "Set logged.",
                    error: "Could not quick log set.",
                  });

                  if (result.ok) {
                    if (result.data?.set) {
                      const savedSet = toSeedSet(result.data.set);
                      setSetSnapshotsBySessionExerciseId((current) => {
                        const previous = current[exercise.id] ?? exercise.initialSets;
                        const next = sortSetsByIndex(mergeByStableSetId(previous, [savedSet]));
                        if (areSetListsEquivalent(previous, next)) {
                          return current;
                        }
                        return {
                          ...current,
                          [exercise.id]: next,
                        };
                      });
                    }
                    handleSetCountChange(exercise.id, setCount + 1);
                  } else {
                    setSetSnapshotsBySessionExerciseId((current) => {
                      const previous = current[exercise.id] ?? exercise.initialSets;
                      const next = removeSeedSetByStableId(previous, clientLogId);
                      if (areSetListsEquivalent(previous, next)) {
                        return current;
                      }
                      return {
                        ...current,
                        [exercise.id]: next,
                      };
                    });
                  }
                } catch {
                  setSetSnapshotsBySessionExerciseId((current) => {
                    const previous = current[exercise.id] ?? exercise.initialSets;
                    const next = removeSeedSetByStableId(previous, clientLogId);
                    if (areSetListsEquivalent(previous, next)) {
                      return current;
                    }
                    return {
                      ...current,
                        [exercise.id]: next,
                      };
                    });
                  toast.error("Could not quick log set.");
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
                    : hasCollapsedSupplement
                      ? "max-h-[48rem] scale-100 overflow-visible opacity-100"
                      : "max-h-72 scale-100 overflow-hidden opacity-100",
              ].join(" ")}
            >
              <SessionExerciseBlock>
                <div className="w-full">
                  {shouldRenderCompactSkippedRow ? (
                    <div className={cn("relative", COMPACT_SESSION_ROW_SHELL_CLASS_NAME, "bg-[rgb(var(--surface-1-rgb)/0.86)]")}>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-px left-px top-px z-[2] w-[4px] rounded-r-full bg-[rgb(var(--accent-divider-rgb)/0.96)]"
                      />
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
                        >
                          {isCompactProgressFillComplete && !baseRowViewModel.isSkipped ? (
                            <span className="exercise-card-progress-glint" />
                          ) : null}
                        </span>
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
