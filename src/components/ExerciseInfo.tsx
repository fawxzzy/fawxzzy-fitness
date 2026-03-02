"use client";

import { useEffect, useState } from "react";
import { ExerciseInfoSheet, type ExerciseInfoSheetExercise, type ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";

type ExerciseInfoResponse = {
  exercise: ExerciseInfoSheetExercise;
  stats: ExerciseInfoSheetStats | null;
};

export function ExerciseInfo({
  exerciseId,
  open,
  onOpenChange,
  onClose,
}: {
  exerciseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  sourceContext?: string;
}) {
  const [exercise, setExercise] = useState<ExerciseInfoSheetExercise | null>(null);
  const [stats, setStats] = useState<ExerciseInfoSheetStats | null>(null);

  useEffect(() => {
    if (!open || !exerciseId) {
      setExercise(null);
      setStats(null);
      return;
    }

    let active = true;
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/exercise-info/${exerciseId}`, { signal: controller.signal });
        if (!response.ok) return;

        const data = (await response.json()) as ExerciseInfoResponse;
        if (!active) return;
        setExercise(data.exercise);
        setStats(data.stats);
      } catch {
        if (!active) return;
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [exerciseId, open]);

  return <ExerciseInfoSheet exercise={exercise} stats={stats} open={open} onOpenChange={onOpenChange} onClose={onClose} />;
}
