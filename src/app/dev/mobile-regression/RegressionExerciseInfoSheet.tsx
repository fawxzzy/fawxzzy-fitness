"use client";

import type { ExerciseInfoSheetExercise, ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";
import { ExerciseInfoSheet } from "@/components/ExerciseInfoSheet";

export function RegressionExerciseInfoSheet({
  scenarioId,
  exercise,
  stats,
}: {
  scenarioId: string;
  exercise: ExerciseInfoSheetExercise;
  stats: ExerciseInfoSheetStats;
}) {
  return (
    <>
      <div hidden data-mobile-regression-id={scenarioId} data-mobile-regression-screen="exercise-detail" />
      <ExerciseInfoSheet exercise={exercise} stats={stats} statsLoading={false} open onOpenChange={() => {}} inline />
    </>
  );
}
