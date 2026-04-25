"use client";

import { ExerciseInfoSheet, type ExerciseInfoSheetExercise, type ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";

export function LiveExerciseInfoPreview({
  exercise,
  stats,
}: {
  exercise: ExerciseInfoSheetExercise;
  stats: ExerciseInfoSheetStats | null;
}) {
  return (
    <ExerciseInfoSheet
      exercise={exercise}
      stats={stats}
      statsLoading={false}
      open
      inline
      onOpenChange={() => {}}
      onClose={() => {}}
    />
  );
}
