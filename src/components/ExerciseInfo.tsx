"use client";

import { useEffect, useState } from "react";
import { ExerciseInfoSheet, type ExerciseInfoSheetExercise, type ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";
import { useToast } from "@/components/ui/ToastProvider";
import { resolveCanonicalExerciseId } from "@/lib/exercise-id-aliases";

const UUID_V4ISH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ExerciseInfoResponse = {
  ok: true;
  payload: {
    exercise: ExerciseInfoSheetExercise;
    stats: ExerciseInfoSheetStats | null;
  };
};

type ExerciseInfoErrorResponse = {
  ok?: false;
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
};

export function ExerciseInfo({
  exerciseId,
  open,
  onOpenChange,
  onClose,
  sourceContext,
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
    if (!open) {
      setExercise(null);
      setStats(null);
      return;
    }

    const rawExerciseId = typeof exerciseId === "string" ? exerciseId.trim() : "";
    const normalizedExerciseId = resolveCanonicalExerciseId(rawExerciseId);
    const isValidExerciseId = normalizedExerciseId.length > 0 && UUID_V4ISH_PATTERN.test(normalizedExerciseId);

    if (!isValidExerciseId) {
      const minimalShape = {
        hasId: normalizedExerciseId.length > 0,
        wasAliased: rawExerciseId !== normalizedExerciseId,
        length: normalizedExerciseId.length,
      };
      console.error("[ExerciseInfo] blocked invalid open request", {
        source: sourceContext ?? "ExerciseInfo",
        exerciseId: rawExerciseId || null,
        canonicalExerciseId: normalizedExerciseId || null,
        minimalShape,
      });
      toast.error("Invalid exercise link");
      setExercise(null);
      setStats(null);
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.debug("[ExerciseInfo] open request", { exerciseId: normalizedExerciseId, source: sourceContext ?? "ExerciseInfo" });
    }

    let active = true;
    const controller = new AbortController();

    async function load() {
      try {
        const response = await fetch(`/api/exercise-info/${normalizedExerciseId}`, { signal: controller.signal });
        const payload = (await response.json().catch(() => null)) as ExerciseInfoResponse | ExerciseInfoErrorResponse | null;

        if (!response.ok) {
          if (!active) return;
          const errorPayload = payload as ExerciseInfoErrorResponse | null;
          const resolvedMessage = errorPayload?.message ?? errorPayload?.error ?? "Could not load exercise info.";
          console.error("[ExerciseInfo] failed to load payload", {
            exerciseId: normalizedExerciseId,
            status: response.status,
            code: errorPayload?.code,
            payload: errorPayload,
          });
          toast.error(`${resolvedMessage} (status ${response.status}, id ${normalizedExerciseId})`);
          setExercise(null);
          setStats(null);
          return;
        }

        if (!active) return;
        const successPayload = payload as ExerciseInfoResponse | null;

        if (!successPayload?.ok || !successPayload.payload) {
          console.error("[ExerciseInfo] unexpected response payload", {
            exerciseId: normalizedExerciseId,
            status: response.status,
            payload,
          });
          toast.error("Could not load exercise info.");
          setExercise(null);
          setStats(null);
          return;
        }

        setExercise(successPayload.payload.exercise);
        setStats(successPayload.payload.stats);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error("[ExerciseInfo] request failed", { exerciseId: normalizedExerciseId, status: "request-failed", error });
        toast.error(`Could not load exercise info. (status request-failed, id ${normalizedExerciseId})`);
        setExercise(null);
        setStats(null);
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [exerciseId, open, sourceContext, toast]);

  return <ExerciseInfoSheet exercise={exercise} stats={stats} open={open} onOpenChange={onOpenChange} onClose={onClose} />;
}
