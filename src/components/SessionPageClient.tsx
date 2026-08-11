"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionFeedbackToasts } from "@/components/ActionFeedbackToasts";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionExerciseFocus, type SessionExerciseFocusItem } from "@/components/SessionExerciseFocus";
import { SessionHeaderControls } from "@/components/SessionHeaderControls";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { ContentRail } from "@/components/layout/ContentRail";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { appTokens } from "@/components/ui/app/tokens";
import { resolveScreenRecipe } from "@/components/ui/app/screenContract";
import { useToast } from "@/components/ui/ToastProvider";
import { useToastMessageEffect } from "@/components/ui/useToastMessageEffect";
import { getReturnNavigationHref, useReturnNavigation } from "@/components/ui/useReturnNavigation";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import { writeInstallEarnedMoment } from "@/lib/install/earned-install-prompt";
import { clearActiveSessionHint, writeActiveSessionHint } from "@/lib/session-state-sync";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import { buildCurrentSessionHeaderInfoRailItems } from "@/lib/header-info-rail";
import type { SessionCopilotFeedbackSignal } from "@/lib/session-copilot-feedback";
import type { SetRow } from "@/types/db";
import type { ExerciseTimerCommand, ExerciseTimerSnapshot } from "@/lib/exercise-timer";

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

type SessionAutoPromotionUpdate = {
  exerciseName: string;
  previousTarget: string | null;
  appliedTarget: string | null;
  linkedDayNames: string[];
};

type ServerAction = (formData: FormData) => Promise<ActionResult<{
  sessionId: string;
  progressionUpdates: SessionAutoPromotionUpdate[];
}>>;
type ProgressionUpdateAction = (formData: FormData) => Promise<ActionResult>;
type CopilotFeedbackUpdateAction = (payload: {
  sessionId: string;
  sessionExerciseId: string;
  signal: SessionCopilotFeedbackSignal | null;
  note: string | null;
  effort: number | null;
}) => Promise<ActionResult<{ signal: SessionCopilotFeedbackSignal | null; note: string | null; effort: number | null; updatedAt: string | null }>>;

function formatDurationClock(totalSeconds: number) {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getElapsedDuration(baseDurationSeconds: number, performedAt: string) {
  const parsed = Date.parse(performedAt);
  if (Number.isNaN(parsed)) {
    return baseDurationSeconds;
  }

  const elapsed = Math.floor((Date.now() - parsed) / 1000);
  return elapsed > 0 ? elapsed : baseDurationSeconds;
}

export function SessionPageClient({
  userId,
  sessionId,
  initialDurationSeconds,
  initialIsSessionCompleted,
  performedAt,
  routineName,
  sessionDayName,
  sessionSummaryCounts,
  routineTrainingDays,
  routineRestDays,
  routineCycleLengthDays,
  sessionDayIndex,
  sessionIsRestDay = false,
  searchError,
  unitLabel,
  exercises,
  initialSelectedExerciseId = null,
  saveSessionAction,
  quickAddAction,
  requestedReturnTo,
  addSetAction,
  syncQueuedSetLogsAction,
  toggleSkipAction,
  removeExerciseAction,
  deleteSetAction,
  updateSessionExerciseCopilotFeedbackAction,
  updateSessionExerciseProgressionAction,
  updateSessionExerciseTimerAction,
  disableDraftPersistence = false,
}: {
  userId: string;
  sessionId: string;
  initialDurationSeconds: number | null;
  initialIsSessionCompleted: boolean;
  performedAt: string;
  routineName: string;
  sessionDayName: string;
  sessionSummaryCounts: {
    strength: number;
    cardio: number;
    bodyweight: number;
    unknown: number;
  };
  routineTrainingDays?: number | null;
  routineRestDays?: number | null;
  routineCycleLengthDays?: number | null;
  sessionDayIndex?: number | null;
  sessionIsRestDay?: boolean;
  searchError?: string;
  unitLabel: string;
  exercises: SessionExerciseFocusItem[];
  initialSelectedExerciseId?: string | null;
  saveSessionAction: ServerAction;
  quickAddAction: import("react").ReactNode;
  requestedReturnTo?: string;
  addSetAction: (payload: AddSetPayload) => Promise<ActionResult<{ set: SetRow }>>;
  syncQueuedSetLogsAction: SyncQueuedSetLogsAction;
  toggleSkipAction: (formData: FormData) => Promise<ActionResult>;
  removeExerciseAction: (formData: FormData) => Promise<ActionResult>;
  deleteSetAction: (payload: { sessionId: string; sessionExerciseId: string; setId: string }) => Promise<ActionResult>;
  updateSessionExerciseCopilotFeedbackAction?: CopilotFeedbackUpdateAction;
  updateSessionExerciseProgressionAction: ProgressionUpdateAction;
  updateSessionExerciseTimerAction?: (payload: {
    sessionId: string;
    sessionExerciseId: string;
    command: ExerciseTimerCommand;
  }) => Promise<ActionResult<{ timer: ExerciseTimerSnapshot }>>;
  disableDraftPersistence?: boolean;
}) {
  const sessionRecipe = resolveScreenRecipe("currentSession");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(initialSelectedExerciseId);
  const baseDurationSeconds = initialDurationSeconds ?? 0;
  const [durationSeconds, setDurationSeconds] = useState(baseDurationSeconds);
  const [hasMountedTimer, setHasMountedTimer] = useState(false);
  const [isSessionCompleted, setIsSessionCompleted] = useState(initialIsSessionCompleted);
  const [completedSessionUpdates, setCompletedSessionUpdates] = useState<SessionAutoPromotionUpdate[] | null>(null);
  const toast = useToast();
  useToastMessageEffect("error", searchError, { id: "session-search-error" });
  const fallbackReturnHref = useMemo(
    () => getReturnNavigationHref({ fallbackHref: "/today", currentPath: `/session/${sessionId}`, requestedReturnTo }),
    [requestedReturnTo, sessionId],
  );
  const { navigateReturn } = useReturnNavigation(fallbackReturnHref ?? "/today");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (selectedExerciseId) {
      url.searchParams.set("exerciseId", selectedExerciseId);
    } else {
      url.searchParams.delete("exerciseId");
    }

    const nextHref = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState(window.history.state, "", nextHref);
  }, [selectedExerciseId]);

  useEffect(() => {
    if (isSessionCompleted) {
      clearActiveSessionHint(sessionId);
      return;
    }

    writeActiveSessionHint(sessionId);
  }, [isSessionCompleted, sessionId]);

  useEffect(() => {
    if (isSessionCompleted) {
      return;
    }

    setHasMountedTimer(true);
    setDurationSeconds(getElapsedDuration(baseDurationSeconds, performedAt));
    const timer = window.setInterval(() => {
      setDurationSeconds(getElapsedDuration(baseDurationSeconds, performedAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [baseDurationSeconds, isSessionCompleted, performedAt]);

  const isExerciseOpen = selectedExerciseId !== null;
  const hasExercises = exercises.length > 0;
  const sessionHeaderInfoItems = useMemo(() => {
    const total = exercises.length;
    const loggedExerciseCount = exercises.filter((exercise) => exercise.loggedSetCount > 0).length;
    const skippedExerciseCount = exercises.filter((exercise) => exercise.isSkipped).length;

    return buildCurrentSessionHeaderInfoRailItems({
      isCompleted: isSessionCompleted,
      sessionDayIndex,
      cycleLengthDays: routineCycleLengthDays,
      isRestDay: sessionIsRestDay,
      trainingDays: routineTrainingDays,
      restDays: routineRestDays,
      sessionExerciseCount: total,
      loggedExerciseCount,
      skippedExerciseCount,
      splitSummary: {
        total,
        strength: sessionSummaryCounts.strength,
        cardio: sessionSummaryCounts.cardio,
        bodyweight: sessionSummaryCounts.bodyweight,
        unknown: sessionSummaryCounts.unknown,
      },
    });
  }, [
    exercises,
    isSessionCompleted,
    routineCycleLengthDays,
    routineRestDays,
    routineTrainingDays,
    sessionDayIndex,
    sessionIsRestDay,
    sessionSummaryCounts.bodyweight,
    sessionSummaryCounts.cardio,
    sessionSummaryCounts.strength,
    sessionSummaryCounts.unknown,
  ]);
  const floatingHeader = !isExerciseOpen ? (
    <ContentRail>
      <ScreenScaffold recipe="todayOverview" className="w-full">
        <SessionHeaderControls
          routineName={routineName}
          sessionDayName={sessionDayName}
          infoItems={sessionHeaderInfoItems}
          backHref={fallbackReturnHref ?? "/today"}
        />
      </ScreenScaffold>
    </ContentRail>
  ) : null;

  const emptyState = useMemo(
    () => (hasExercises ? null : <p className={appTokens.currentSessionEmptyState}>No exercises yet.</p>),
    [hasExercises],
  );
  const timerPill = useMemo(
    () => (
      <div
        className={cn(
          appTokens.currentSessionDurationPill,
          "flex min-h-[44px] w-full items-center justify-center bg-[linear-gradient(180deg,rgba(26,31,42,0.98),rgba(12,16,24,0.98))] px-2 text-[1.4rem] font-black tracking-[0.03em] text-[rgb(236_247_255/0.98)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_0_24px_rgba(125,211,252,0.08)] [font-variant-numeric:tabular-nums] [text-shadow:0_0_10px_rgba(220,240,255,0.12)]",
        )}
        suppressHydrationWarning
        aria-live={hasMountedTimer ? "off" : undefined}
      >
        <span className="inline-flex w-full items-center justify-center whitespace-nowrap font-mono leading-none">
          {formatDurationClock(hasMountedTimer ? durationSeconds : 0)}
        </span>
      </div>
    ),
    [durationSeconds, hasMountedTimer],
  );
  const sessionActions = useMemo(
    () => isSessionCompleted ? (
      <div
        role="status"
        className="flex min-h-[44px] w-full items-center justify-center rounded-[var(--control-radius)] border border-[rgb(var(--success-rgb)/0.28)] bg-[rgb(var(--success-rgb)/0.12)] px-4 text-sm font-semibold text-[rgb(var(--success-rgb)/0.98)]"
      >
        Workout complete
      </div>
    ) : (
      <form
        action={async (formData) => {
          const result = await saveSessionAction(formData);
          toastActionResult(toast, result, {
            success: "Workout saved.",
            error: "Could not save workout.",
          });

          if (result.ok) {
            clearActiveSessionHint(sessionId);
            writeInstallEarnedMoment("workout-completed");
            setSelectedExerciseId(null);
            setIsSessionCompleted(true);
            setCompletedSessionUpdates(result.data?.progressionUpdates ?? []);
          }
        }}
        className="w-full"
      >
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="durationSeconds" value={String(durationSeconds)} />
        <div
          role="group"
          aria-label="Bottom actions"
          className="grid w-full max-w-full overflow-x-clip grid-cols-[minmax(84px,0.72fr)_minmax(6.5rem,7.8rem)_minmax(0,1.16fr)] items-stretch gap-2"
        >
          <div className="flex min-w-0 items-stretch [&>*]:w-full">
            {quickAddAction}
          </div>
          <div className="flex min-w-0 items-stretch justify-center">
            {timerPill}
          </div>
          <div className="flex min-w-0 items-stretch [&>*]:w-full">
            <BottomDockButton
              type="submit"
              intent="positive"
              className="!min-h-[44px]"
            >
              Finish
            </BottomDockButton>
          </div>
        </div>
      </form>
    ),
    [durationSeconds, isSessionCompleted, quickAddAction, saveSessionAction, sessionId, timerPill, toast],
  );

  return (
    <ScrollScreenWithBottomActions className={cn(appTokens.currentSessionScreenStack, "overflow-x-clip [touch-action:pan-x_pan-y]")} floatingHeader={floatingHeader}>
      <PublishBottomActions>{sessionActions}</PublishBottomActions>

      <ContentRail className={cn(appTokens.currentSessionContentRail, "!gap-0 !py-0")}>
        <section
          data-screen-scaffold={sessionRecipe.scaffold}
          data-section-chrome={sessionRecipe.sectionChrome}
          data-footer-dock={sessionRecipe.footerDock}
          data-row-interaction={sessionRecipe.rowInteraction}
          className={cn(appTokens.currentSessionSectionStack, "!gap-0", isExerciseOpen ? "pt-3" : undefined)}
        >
          {!isExerciseOpen ? (
            <div className="flex justify-end">
              <OfflineSyncBadge userId={userId} />
            </div>
          ) : null}
          <ActionFeedbackToasts />

          {isSessionCompleted ? (
            <div
              role="status"
              className="rounded-[var(--card-radius)] border border-[rgb(var(--success-rgb)/0.24)] bg-[rgb(var(--success-rgb)/0.08)] px-4 py-6 text-center"
            >
              <p className="text-base font-bold text-[rgb(var(--success-rgb)/0.98)]">Workout saved</p>
              <p className="mt-1 text-sm font-medium text-[rgb(var(--text-muted)/0.92)]">
                Continue to return to your workout overview.
              </p>
            </div>
          ) : hasExercises ? (
            <SessionExerciseFocus
              userId={userId}
              sessionId={sessionId}
              unitLabel={unitLabel}
              cycleLengthDays={routineCycleLengthDays ?? null}
              sessionDayIndex={sessionDayIndex ?? null}
              exercises={exercises}
              selectedExerciseId={selectedExerciseId}
              onSelectedExerciseIdChange={setSelectedExerciseId}
              addSetAction={addSetAction}
              syncQueuedSetLogsAction={syncQueuedSetLogsAction}
              toggleSkipAction={toggleSkipAction}
              removeExerciseAction={removeExerciseAction}
              deleteSetAction={deleteSetAction}
              updateSessionExerciseCopilotFeedbackAction={updateSessionExerciseCopilotFeedbackAction}
              updateSessionExerciseProgressionAction={updateSessionExerciseProgressionAction}
              updateSessionExerciseTimerAction={updateSessionExerciseTimerAction}
              disableDraftPersistence={disableDraftPersistence}
              bottomDockCenter={null}
            />
          ) : null}

          {isSessionCompleted ? null : emptyState}
        </section>
      </ContentRail>
      {completedSessionUpdates ? (
        <ConfirmDestructiveModal
          open
          title="Progression Promotions"
          titleVariant="raw"
          description={completedSessionUpdates.length > 0 ? undefined : "No promotions this session."}
          confirmLabel="Continue"
          confirmActionLabel="Continue"
          confirmVariant="primary"
          cancelLabel="Continue"
          hideCancelAction
          onCancel={navigateReturn}
          onConfirm={navigateReturn}
        >
          {completedSessionUpdates.length > 0 ? (
            <ul className="space-y-2 text-left">
              {completedSessionUpdates.map((update) => (
                <li
                  key={`${update.exerciseName}-${update.appliedTarget}`}
                  className="rounded-[0.8rem] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-2-rgb)/0.22)] px-3 py-2"
                >
                  <p className="text-[0.78rem] font-semibold text-[rgb(var(--text-primary)/0.96)]">{update.exerciseName}</p>
                  <p className="mt-0.5 text-[0.72rem] font-medium text-[rgb(var(--text-muted)/0.9)]">
                    {update.previousTarget ?? "Current target"} {"\u2192"} {update.appliedTarget ?? "Updated target"}
                  </p>
                  {update.linkedDayNames.length > 1 ? (
                    <p className="mt-1 text-[0.68rem] font-semibold text-[rgb(var(--accent)/0.92)]">
                      Plans: {update.linkedDayNames.join(", ")}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </ConfirmDestructiveModal>
      ) : null}
    </ScrollScreenWithBottomActions>
  );
}
