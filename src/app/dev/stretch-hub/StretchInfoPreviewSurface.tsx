"use client";

import { ExerciseInfoSheet } from "@/components/ExerciseInfoSheet";
import { stretchPreviewExercise } from "@/app/dev/stretch-hub/previewData";

export function StretchInfoPreviewSurface() {
  return (
    <ExerciseInfoSheet
      exercise={stretchPreviewExercise}
      statsByScope={{ all_time: null, current_routine: null }}
      statsLoadingByScope={{ all_time: false, current_routine: false }}
      analyticsScope="all_time"
      onAnalyticsScopeChange={() => {}}
      open
      inline
      onOpenChange={() => {}}
      onClose={() => {}}
    />
  );
}
