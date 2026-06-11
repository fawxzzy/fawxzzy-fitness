"use client";

import { useEffect, useState } from "react";
import type { ExerciseInfoSheetExercise, ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";
import { ExerciseInfoSheet } from "@/components/ExerciseInfoSheet";
import { createDefaultExerciseInfoFilterState, type ExerciseInfoFilterState } from "@/lib/exercise-info-scope";

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
  const [filterState, setFilterState] = useState<ExerciseInfoFilterState>(createDefaultExerciseInfoFilterState());

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
      <ExerciseInfoSheet
        exercise={exercise}
        statsByScope={{ all_time: stats, current_routine: stats, current_cycle: stats }}
        statsLoadingByScope={{ all_time: false, current_routine: false, current_cycle: false }}
        filterState={filterState}
        onFilterStateChange={setFilterState}
        open
        onOpenChange={() => {}}
        inline
      />
    </>
  );
}
