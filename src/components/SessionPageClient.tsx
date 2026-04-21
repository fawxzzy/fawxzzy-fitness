"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionFeedbackToasts } from "@/components/ActionFeedbackToasts";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionExerciseFocus, type SessionExerciseFocusItem } from "@/components/SessionExerciseFocus";
import { SessionHeaderControls } from "@/components/SessionHeaderControls";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { BottomActionTriad } from "@/components/layout/CanonicalBottomActions";
import { ContentRail } from "@/components/layout/ContentRail";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { resolveScreenRecipe } from "@/components/ui/app/screenContract";
import { useToast } from "@/components/ui/ToastProvider";
import { getReturnNavigationHref, useReturnNavigation } from "@/components/ui/useReturnNavigation";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import { clearActiveSessionHint, writeActiveSessionHint } from "@/lib/session-state-sync";
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

type ServerAction = (formData: FormData) => Promise<ActionResult<{ sessionId: string }>>;

function formatDurationClock(totalSeconds: number) {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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
  performedAt,
  routineName,
  sessionDayName,
  sessionSummaryCounts,
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
}: {
  userId: string;
  sessionId: string;
  initialDurationSeconds: number | null;
  performedAt: string;
  routineName: string;
  sessionDayName: string;
  sessionSummaryCounts: {
    strength: number;
    cardio: number;
    unknown: number;
  };
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
}) {
  const sessionRecipe = resolveScreenRecipe("currentSession");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(initialSelectedExerciseId);
  const router = useRouter();
  const baseDurationSeconds = initialDurationSeconds ?? 0;
  const [durationSeconds, setDurationSeconds] = useState(baseDurationSeconds);
  const [hasMountedTimer, setHasMountedTimer] = useState(false);
  const toast = useToast();
  const fallbackReturnHref = useMemo(
    () => getReturnNavigationHref({ fallbackHref: "/today", currentPath: `/session/${sessionId}`, requestedReturnTo }),
    [requestedReturnTo, sessionId],
  );
  const { navigateReturn } = useReturnNavigation(fallbackReturnHref ?? "/today");

  useEffect(() => {
    writeActiveSessionHint(sessionId);
  }, [sessionId]);

  useEffect(() => {
    setHasMountedTimer(true);
    setDurationSeconds(getElapsedDuration(baseDurationSeconds, performedAt));
    const timer = window.setInterval(() => {
      setDurationSeconds(getElapsedDuration(baseDurationSeconds, performedAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [baseDurationSeconds, performedAt]);

  const isExerciseOpen = selectedExerciseId !== null;
  const hasExercises = exercises.length > 0;
  const floatingHeader = !isExerciseOpen ? (
    <ContentRail>
      <SessionHeaderControls
        routineName={routineName}
        sessionDayName={sessionDayName}
        sessionSummaryCounts={sessionSummaryCounts}
        backHref={fallbackReturnHref ?? "/today"}
      />
    </ContentRail>
  ) : null;

  const emptyState = useMemo(
    () => (hasExercises ? null : <p className="rounded-xl border border-border/55 bg-surface/55 p-3 text-sm text-muted">No exercises yet.</p>),
    [hasExercises],
  );

  const sessionActions = useMemo(
    () => (
      <form
        action={async (formData) => {
          const result = await saveSessionAction(formData);
          toastActionResult(toast, result, {
            success: "Workout saved.",
            error: "Could not save workout.",
          });

          if (result.ok) {
            clearActiveSessionHint(sessionId);
            router.refresh();
            navigateReturn();
          }
        }}
        className="w-full"
      >
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="durationSeconds" value={String(durationSeconds)} />
        <BottomActionTriad
          secondary={quickAddAction}
          tertiary={(
            <div
              className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-[rgb(var(--border-subtle)/0.18)] bg-[rgb(var(--surface-muted)/0.92)] px-3.25 py-1.5 text-[0.925rem] font-semibold tabular-nums text-[rgb(var(--text-secondary)/0.96)]"
              suppressHydrationWarning
              aria-live={hasMountedTimer ? "off" : undefined}
            >
              {formatDurationClock(hasMountedTimer ? durationSeconds : baseDurationSeconds)}
            </div>
          )}
          primary={(
            <BottomDockButton
              type="submit"
              intent="positive"
            >
              Finish
            </BottomDockButton>
          )}
          className="w-full"
          tertiaryClassName="px-0.5 [&>*]:max-w-[6.1rem]"
        />
      </form>
    ),
    [baseDurationSeconds, durationSeconds, hasMountedTimer, navigateReturn, quickAddAction, router, saveSessionAction, sessionId, toast],
  );

  return (
    <ScrollScreenWithBottomActions className="space-y-2.5 overflow-x-clip" floatingHeader={floatingHeader}>
      {!isExerciseOpen ? (
        <PublishBottomActions>{sessionActions}</PublishBottomActions>
      ) : null}

      <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
        <section
          data-screen-scaffold={sessionRecipe.scaffold}
          data-section-chrome={sessionRecipe.sectionChrome}
          data-footer-dock={sessionRecipe.footerDock}
          data-row-interaction={sessionRecipe.rowInteraction}
          className="flex flex-col gap-3"
        >
          {!isExerciseOpen ? (
            <div className="flex justify-end">
              <OfflineSyncBadge userId={userId} />
            </div>
          ) : null}
          {searchError ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchError}</p> : null}
          <ActionFeedbackToasts />

          {hasExercises ? (
            <SessionExerciseFocus
              userId={userId}
              sessionId={sessionId}
              unitLabel={unitLabel}
              exercises={exercises}
              selectedExerciseId={selectedExerciseId}
              onSelectedExerciseIdChange={setSelectedExerciseId}
              addSetAction={addSetAction}
              syncQueuedSetLogsAction={syncQueuedSetLogsAction}
              toggleSkipAction={toggleSkipAction}
              removeExerciseAction={removeExerciseAction}
              deleteSetAction={deleteSetAction}
            />
          ) : null}

          {emptyState}
        </section>
      </ContentRail>
    </ScrollScreenWithBottomActions>
  );
}
