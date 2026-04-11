"use client";

import { useEffect } from "react";
import type { ExerciseInfoSheetExercise, ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";
import { ExerciseInfoSheet } from "@/components/ExerciseInfoSheet";

export function RegressionExerciseInfoSheet({
  scenarioId,
  exercise,
  stats,
  scrollToBottom = false,
}: {
  scenarioId: string;
  exercise: ExerciseInfoSheetExercise;
  stats: ExerciseInfoSheetStats;
  scrollToBottom?: boolean;
}) {
  useEffect(() => {
    if (!scrollToBottom) return;

    let frameA = 0;
    let frameB = 0;
    frameA = window.requestAnimationFrame(() => {
      frameB = window.requestAnimationFrame(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "auto" });
      });
    });

    return () => {
      if (frameA) window.cancelAnimationFrame(frameA);
      if (frameB) window.cancelAnimationFrame(frameB);
    };
  }, [scrollToBottom]);

  return (
    <>
      <div hidden data-mobile-regression-id={scenarioId} data-mobile-regression-screen="exercise-detail" />
      <ExerciseInfoSheet exercise={exercise} stats={stats} statsLoading={false} open onOpenChange={() => {}} inline />
    </>
  );
}
