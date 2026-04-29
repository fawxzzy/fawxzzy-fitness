"use client";

import { ExerciseInfoSheet } from "@/components/ExerciseInfoSheet";
import { stretchPreviewExercise } from "@/app/dev/stretch-hub/previewData";

export function StretchInfoPreviewSurface() {
  return (
    <ExerciseInfoSheet
      exercise={stretchPreviewExercise}
      stats={null}
      statsLoading={false}
      open
      inline
      onOpenChange={() => {}}
      onClose={() => {}}
    />
  );
}
