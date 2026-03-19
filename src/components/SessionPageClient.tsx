"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionFeedbackToasts } from "@/components/ActionFeedbackToasts";
import { SessionExerciseFocus, type SessionExerciseFocusItem } from "@/components/SessionExerciseFocus";
import { SessionHeaderControls } from "@/components/SessionHeaderControls";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { AppButton } from "@/components/ui/AppButton";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { useToast } from "@/components/ui/ToastProvider";
import { useReturnNavigation } from "@/components/ui/useReturnNavigation";
import { toastActionResult } from "@/lib/action-feedback";
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
type VoidServerAction = (formData: FormData) => Promise<ActionResult>;

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
  searchError,
  unitLabel,
  exercises,
  saveSessionAction,
  discardSessionAction,
  quickAddAction,
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
  searchError?: string;
  unitLabel: string;
  exercises: SessionExerciseFocusItem[];
  saveSessionAction: ServerAction;
  discardSessionAction: VoidServerAction;
  quickAddAction: React.ReactNode;
  addSetAction: (payload: AddSetPayload) => Promise<ActionResult<{ set: SetRow }>>;
  syncQueuedSetLogsAction: SyncQueuedSetLogsAction;
  toggleSkipAction: (formData: FormData) => Promise<ActionResult>;
  removeExerciseAction: (formData: FormData) => Promise<ActionResult>;
  deleteSetAction: (payload: { sessionId: string; sessionExerciseId: string; setId: string }) => Promise<ActionResult>;
}) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const baseDurationSeconds = initialDurationSeconds ?? 0;
  const [durationSeconds, setDurationSeconds] = useState(() => getElapsedDuration(baseDurationSeconds, performedAt));
  const toast = useToast();
  const { navigateReturn } = useReturnNavigation("/history");

  useEffect(() => {
    setDurationSeconds(getElapsedDuration(baseDurationSeconds, performedAt));
    const timer = window.setInterval(() => {
      setDurationSeconds(getElapsedDuration(baseDurationSeconds, performedAt));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [baseDurationSeconds, performedAt]);

  const isExerciseOpen = selectedExerciseId !== null;
  const hasExercises = exercises.length > 0;

  const emptyState = useMemo(
    () => (hasExercises ? null : <p className="rounded-xl border border-border/55 bg-surface/55 p-3 text-sm text-muted">No exercises in this session yet.</p>),
    [hasExercises],
  );

  return (
    <section className="space-y-4 overflow-x-clip px-1 pb-2">
      {!isExerciseOpen ? (
        <SessionHeaderControls
          sessionTitle={sessionTitle}
          durationSeconds={durationSeconds}
          quickAddAction={quickAddAction}
        />
      ) : null}

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

      {!isExerciseOpen ? (
        <BottomActionSplit
          primary={(
            <form
              action={async (formData) => {
              const result = await saveSessionAction(formData);
              toastActionResult(toast, result, {
                success: "Workout saved.",
                error: "Could not save workout.",
              });

              if (result.ok) {
                navigateReturn();
              }
              }}
              className="w-full"
            >
            <input type="hidden" name="sessionId" value={sessionId} />
            <input type="hidden" name="durationSeconds" value={String(durationSeconds)} />
            <AppButton type="submit" variant="primary" size="md" fullWidth className="min-h-12 font-semibold">
              Save Session
            </AppButton>
            </form>
          )}
          secondary={(
            <ConfirmedServerFormButton
              action={async (formData) => {
              const result = await discardSessionAction(formData);
              toastActionResult(toast, result, {
                success: "Workout discarded.",
                error: "Could not discard workout.",
              });

              if (result.ok) {
                navigateReturn();
              }
              }}
              hiddenFields={{ sessionId }}
              triggerLabel="Discard"
            triggerClassName="w-full"
            size="md"
            modalTitle="Discard workout?"
            modalDescription="This will delete your in-progress workout, including exercises and sets."
              confirmLabel="Discard"
            />
          )}
        />
      ) : null}
    </section>
  );
}
