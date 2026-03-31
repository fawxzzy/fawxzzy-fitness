"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ActionFeedbackToasts } from "@/components/ActionFeedbackToasts";
import { SessionExerciseFocus, type SessionExerciseFocusItem } from "@/components/SessionExerciseFocus";
import { SessionHeaderControls } from "@/components/SessionHeaderControls";
import { AppButton } from "@/components/ui/AppButton";
import { BottomActionTriad } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { resolveScreenRecipe } from "@/components/ui/app/screenContract";
import { useToast } from "@/components/ui/ToastProvider";
import { getReturnNavigationHref, useReturnNavigation } from "@/components/ui/useReturnNavigation";
import { toastActionResult } from "@/lib/action-feedback";
import { clearActiveSessionHint, writeActiveSessionHint } from "@/lib/session-state-sync";
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
  sessionId,
  initialDurationSeconds,
  performedAt,
  sessionTitle,
  sessionSummary,
  searchError,
  unitLabel,
  exercises,
  saveSessionAction,
  quickAddAction,
  requestedReturnTo,
  addSetAction,
  syncQueuedSetLogsAction,
  toggleSkipAction,
  removeExerciseAction,
  deleteSetAction,
}: {
  sessionId: string;
  initialDurationSeconds: number | null;
  performedAt: string;
  sessionTitle: string;
  sessionSummary?: string;
  searchError?: string;
  unitLabel: string;
  exercises: SessionExerciseFocusItem[];
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
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
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
  const topChrome = !isExerciseOpen ? (
    <SessionHeaderControls
      sessionTitle={sessionTitle}
      sessionSummary={sessionSummary}
      backHref={fallbackReturnHref ?? "/today"}
    />
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
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-emerald-400/22 bg-emerald-400/12 px-3 py-2 text-sm font-semibold tabular-nums text-emerald-100"
              suppressHydrationWarning
              aria-live={hasMountedTimer ? "off" : undefined}
            >
              {formatDurationClock(hasMountedTimer ? durationSeconds : baseDurationSeconds)}
            </div>
          )}
          primary={(
            <AppButton
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              className="min-h-12 font-semibold shadow-[0_10px_24px_rgba(16,185,129,0.18)] transition hover:bg-[rgb(var(--accent-strong-rgb,16_185_129))] hover:brightness-105 active:brightness-95"
            >
              Complete
            </AppButton>
          )}
          className="w-full"
          tertiaryClassName="px-1"
        />
      </form>
    ),
    [baseDurationSeconds, durationSeconds, hasMountedTimer, navigateReturn, quickAddAction, router, saveSessionAction, sessionId, toast],
  );

  return (
    <ScrollScreenWithBottomActions className="space-y-2.5 overflow-x-clip px-1" topChrome={topChrome}>
      {!isExerciseOpen ? (
        <PublishBottomActions>{sessionActions}</PublishBottomActions>
      ) : null}

      <section
        data-screen-scaffold={sessionRecipe.scaffold}
        data-section-chrome={sessionRecipe.sectionChrome}
        data-footer-dock={sessionRecipe.footerDock}
        data-row-interaction={sessionRecipe.rowInteraction}
        className="flex min-h-full flex-col space-y-4 bg-[rgb(var(--bg))] pt-2 pb-[max(0.25rem,var(--app-safe-bottom))]"
      >
        {searchError ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchError}</p> : null}
        <ActionFeedbackToasts />

        {hasExercises ? (
          <SessionExerciseFocus
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
    </ScrollScreenWithBottomActions>
  );
}
