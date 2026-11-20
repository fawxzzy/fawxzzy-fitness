"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ActionFeedbackToasts } from "@/components/ActionFeedbackToasts";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionExerciseFocus, type SessionExerciseFocusItem } from "@/components/SessionExerciseFocus";
import { SessionHeaderControls } from "@/components/SessionHeaderControls";
import { buildSessionFinishedFacts, SessionFinishedCard, type SessionFinishedExercise } from "@/components/session/SessionRowCards";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { ContentRail } from "@/components/layout/ContentRail";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { AppMenu } from "@/components/AppNav";
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
import { buildSessionFinishCheck, type SessionFinishCheck } from "@/lib/session-finish";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
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

type ServerAction = (formData: FormData) => Promise<ActionResult<{
  sessionId: string;
}>>;
type ProgressionUpdateAction = (formData: FormData) => Promise<ActionResult>;
type CopilotFeedbackUpdateAction = (payload: {
  sessionId: string;
  sessionExerciseId: string;
  signal: SessionCopilotFeedbackSignal | null;
  note: string | null;
  effort: number | null;
}) => Promise<ActionResult<{ signal: SessionCopilotFeedbackSignal | null; note: string | null; effort: number | null; updatedAt: string | null }>>;

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
  routineCycleLengthDays,
  sessionDayIndex,
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
  routineCycleLengthDays?: number | null;
  sessionDayIndex?: number | null;
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
  // Live per-exercise set counts, written by SessionExerciseFocus (read-only mirror of its local state, queued sets included).
  // The finish card reads it; a session opened already completed has no live list and uses the server snapshot.
  const liveProgressRef = useRef<SessionFinishedExercise[] | null>(null);
  const baseDurationSeconds = initialDurationSeconds ?? 0;
  const [durationSeconds, setDurationSeconds] = useState(baseDurationSeconds);
  const [isSessionCompleted, setIsSessionCompleted] = useState(initialIsSessionCompleted);
  // Set only when Finish is tapped with planned sets still unlogged; null means the sheet is closed.
  const [finishConfirm, setFinishConfirm] = useState<SessionFinishCheck | null>(null);
  const finishFormRef = useRef<HTMLFormElement>(null);
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

    setDurationSeconds(getElapsedDuration(baseDurationSeconds, performedAt));
    const timer = window.setInterval(() => {
      setDurationSeconds(getElapsedDuration(baseDurationSeconds, performedAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [baseDurationSeconds, isSessionCompleted, performedAt]);

  const hasExercises = exercises.length > 0;
  // The header stays on screen while an exercise is open: Back is always top left (DESIGN-CONTRACT.md section 15).
  // Opening an exercise only rewrites the URL in place, so the first Back tap closes it and the second leaves.
  const floatingHeader = (
    <SessionHeaderControls
      routineName={routineName}
      sessionDayName={sessionDayName}
      backHref={fallbackReturnHref ?? "/today"}
      statusBadge={<OfflineSyncBadge userId={userId} variant="header" />}
      exerciseOpen={selectedExerciseId !== null}
      onCloseExercise={() => setSelectedExerciseId(null)}
    />
  );

  const emptyState = useMemo(
    () => (hasExercises ? null : <p className={appTokens.currentSessionEmptyState}>No exercises yet.</p>),
    [hasExercises],
  );
  const sessionActions = useMemo(
    () => isSessionCompleted ? (
      <BottomDockButton
        type="button"
        intent="positive"
        className="!min-h-[44px]"
        onClick={navigateReturn}
      >
        Continue
      </BottomDockButton>
    ) : (
      <form
        ref={finishFormRef}
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
            // Progression is manual-only (2026-11-19): saving never promotes, so return straight to Today.
            navigateReturn();
          }
        }}
        className="w-full"
      >
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="durationSeconds" value={String(durationSeconds)} />
        <BottomActionSplit
          secondary={quickAddAction}
          primary={(
            <BottomDockButton
              type="submit"
              intent="positive"
              className="!min-h-[44px]"
              onClick={(event) => {
                // One tap (plain submit) when every planned set is logged; a confirm sheet only when some are unfinished.
                const check = buildSessionFinishCheck({ exercises, live: liveProgressRef.current });
                if (check.needsConfirm) {
                  event.preventDefault();
                  setFinishConfirm(check);
                }
              }}
            >
              Finish
            </BottomDockButton>
          )}
        />
      </form>
    ),
    [durationSeconds, exercises, isSessionCompleted, navigateReturn, quickAddAction, saveSessionAction, sessionId, toast],
  );

  return (
    <ScrollScreenWithBottomActions className={cn(appTokens.currentSessionScreenStack, "overflow-x-clip [touch-action:pan-x_pan-y]")} headerMenu={<AppMenu />} floatingHeader={floatingHeader}>
      <PublishBottomActions>{sessionActions}</PublishBottomActions>

      <ContentRail className={cn(appTokens.currentSessionContentRail, "!gap-0 !py-0")}>
        <section
          data-screen-scaffold={sessionRecipe.scaffold}
          data-section-chrome={sessionRecipe.sectionChrome}
          data-footer-dock={sessionRecipe.footerDock}
          data-row-interaction={sessionRecipe.rowInteraction}
          className={cn(appTokens.currentSessionSectionStack, "!gap-0")}
        >
          <ActionFeedbackToasts />

          {isSessionCompleted ? (
            <SessionFinishedCard facts={buildSessionFinishedFacts({ exercises: liveProgressRef.current ?? exercises, durationSeconds })} />
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
              liveProgressRef={liveProgressRef}
            />
          ) : null}

          {isSessionCompleted ? null : emptyState}
        </section>
      </ContentRail>
      {finishConfirm && !isSessionCompleted ? (
        <ConfirmDestructiveModal
          open
          title="Finish workout?"
          titleVariant="raw"
          description={finishConfirm.message}
          confirmLabel="Finish"
          confirmActionLabel="Finish"
          confirmVariant="primary"
          cancelLabel="Keep going"
          onCancel={() => setFinishConfirm(null)}
          onConfirm={() => {
            setFinishConfirm(null);
            finishFormRef.current?.requestSubmit();
          }}
        />
      ) : null}
    </ScrollScreenWithBottomActions>
  );
}
