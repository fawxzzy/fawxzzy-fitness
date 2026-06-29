"use client";

import { useMemo, useState } from "react";
import { SessionExerciseFocus } from "@/components/SessionExerciseFocus";
import { stretchPreviewSessionExercise } from "@/app/dev/stretch-hub/previewData";

export function StretchSessionPreview() {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(stretchPreviewSessionExercise.id);
  const exercises = useMemo(() => [stretchPreviewSessionExercise], []);
  const noopCopilotFeedbackAction = async (payload: {
    sessionId: string;
    sessionExerciseId: string;
    signal: typeof stretchPreviewSessionExercise.copilotFeedbackSignal;
    note: string | null;
  }) => ({
    ok: true as const,
    data: {
      signal: payload.signal ?? null,
      note: payload.note ?? null,
      updatedAt: new Date().toISOString(),
    },
  });

  return (
    <SessionExerciseFocus
      userId="preview-user"
      sessionId="preview-session"
      unitLabel="lbs"
      exercises={exercises}
      selectedExerciseId={selectedExerciseId}
      onSelectedExerciseIdChange={setSelectedExerciseId}
      addSetAction={async () => ({ ok: false, error: "Stretch is reference-only in this preview." })}
      syncQueuedSetLogsAction={async () => ({ ok: true, data: { results: [] } })}
      toggleSkipAction={async () => ({ ok: true })}
      removeExerciseAction={async () => ({ ok: true })}
      deleteSetAction={async () => ({ ok: true })}
      updateSessionExerciseCopilotFeedbackAction={noopCopilotFeedbackAction}
      updateSessionExerciseProgressionAction={async () => ({ ok: true })}
    />
  );
}
