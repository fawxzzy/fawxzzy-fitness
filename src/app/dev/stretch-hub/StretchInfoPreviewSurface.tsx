"use client";

import { ExerciseInfoSheet } from "@/components/ExerciseInfoSheet";
import { stretchPreviewExercise } from "@/app/dev/stretch-hub/previewData";
import { createDefaultExerciseInfoFilterState } from "@/lib/exercise-info-scope";

export function StretchInfoPreviewSurface() {
  return (
    <ExerciseInfoSheet
      exercise={stretchPreviewExercise}
      statsByScope={{ all_time: null, current_routine: null, current_cycle: null }}
      statsLoadingByScope={{ all_time: false, current_routine: false, current_cycle: false }}
      filterState={createDefaultExerciseInfoFilterState()}
      onFilterStateChange={() => {}}
      open
      inline
      onOpenChange={() => {}}
      onClose={() => {}}
    />
  );
}
