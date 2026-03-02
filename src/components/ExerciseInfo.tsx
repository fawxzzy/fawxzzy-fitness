"use client";

import { useEffect, useState } from "react";
import { ExerciseInfoSheet, type ExerciseInfoSheetExercise, type ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";
import { useToast } from "@/components/ui/ToastProvider";

type ExerciseInfoResponse = {
  exercise: ExerciseInfoSheetExercise;
  stats: ExerciseInfoSheetStats | null;
};

type ExerciseInfoErrorResponse = {
  error?: string;
  code?: string;
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
  const toast = useToast();

  useEffect(() => {
    if (!open || !exerciseId) {
      setExercise(null);
      setStats(null);
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.debug("[ExerciseInfo] open request", { exerciseId });
    }

    let active = true;
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/exercise-info/${exerciseId}`, { signal: controller.signal });
        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as ExerciseInfoErrorResponse | null;
          if (!active) return;
          console.error("[ExerciseInfo] failed to load payload", {
            exerciseId,
            status: response.status,
            error: errorPayload,
          });
          toast.error(errorPayload?.error ?? "Could not load exercise info.");
          setExercise(null);
          setStats(null);
          return;
        }

        const data = (await response.json()) as ExerciseInfoResponse;
        if (!active) return;
        setExercise(data.exercise);
        setStats(data.stats);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error("[ExerciseInfo] request failed", { exerciseId, error });
        toast.error("Could not load exercise info.");
        setExercise(null);
        setStats(null);
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [exerciseId, open, toast]);

  return <ExerciseInfoSheet exercise={exercise} stats={stats} open={open} onOpenChange={onOpenChange} onClose={onClose} />;
}
