"use client";

import { useState } from "react";
import { SessionExerciseFocus } from "@/components/SessionExerciseFocus";
import { stretchPreviewSessionExercise } from "@/app/dev/stretch-hub/previewData";

export function StretchSessionPreview() {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(stretchPreviewSessionExercise.id);

  return (
    <SessionExerciseFocus
      userId="preview-user"
      sessionId="preview-session"
      unitLabel="lbs"
      exercises={[stretchPreviewSessionExercise]}
      selectedExerciseId={selectedExerciseId}
      onSelectedExerciseIdChange={setSelectedExerciseId}
      addSetAction={async () => ({ ok: false, error: "Stretch is reference-only in this preview." })}
      syncQueuedSetLogsAction={async () => ({ ok: true, data: { results: [] } })}
      toggleSkipAction={async () => ({ ok: true })}
      removeExerciseAction={async () => ({ ok: true })}
      deleteSetAction={async () => ({ ok: true })}
    />
  );
}
