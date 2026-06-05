"use client";

import { useEffect, useState } from "react";
import { ExerciseInfoSheet, type ExerciseInfoSheetExercise, type ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";
import { useToast } from "@/components/ui/ToastProvider";
import {
  readExerciseInfoClientPayload,
  shouldFetchExerciseInfoClientPayload,
  writeExerciseInfoClientPayload,
} from "@/lib/exercise-info-client-cache";
import { isKnownLegacyExerciseId, resolveCanonicalExerciseId } from "@/lib/exercise-id-aliases";

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

function normalizeExerciseInfoStats(stats: ExerciseInfoSheetStats | null): ExerciseInfoSheetStats | null {
  if (!stats) {
    return null;
  }

  return {
    ...stats,
    quickMetrics: Array.isArray(stats.quickMetrics) ? stats.quickMetrics : [],
    performanceMetrics: Array.isArray(stats.performanceMetrics) ? stats.performanceMetrics : [],
    surfaceMetrics: Array.isArray(stats.surfaceMetrics) ? stats.surfaceMetrics : [],
    progress: {
      metrics: Array.isArray(stats.progress?.metrics) ? stats.progress.metrics : [],
      reviewSections: Array.isArray(stats.progress?.reviewSections) ? stats.progress.reviewSections : [],
      performances: Array.isArray(stats.progress?.performances) ? stats.progress.performances : [],
    },
  };
}

export function ExerciseInfo({
  exerciseId,
  open,
  onOpenChange,
  onClose,
  sourceContext,
  initialExercise,
  initialStats,
}: {
  exerciseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  sourceContext?: string;
  initialExercise?: ExerciseInfoSheetExercise | null;
  initialStats?: ExerciseInfoSheetStats | null;
}) {
  const [exercise, setExercise] = useState<ExerciseInfoSheetExercise | null>(null);
  const [stats, setStats] = useState<ExerciseInfoSheetStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!open) {
      setExercise(null);
      setStats(null);
      setStatsLoading(false);
      return;
    }

    const rawExerciseId = typeof exerciseId === "string" ? exerciseId.trim() : "";
    const normalizedExerciseId = resolveCanonicalExerciseId(rawExerciseId);
    const isValidExerciseId = normalizedExerciseId.length > 0 && (UUID_V4ISH_PATTERN.test(normalizedExerciseId) || isKnownLegacyExerciseId(rawExerciseId));

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
      setStatsLoading(false);
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.debug("[ExerciseInfo] open request", { exerciseId: normalizedExerciseId, source: sourceContext ?? "ExerciseInfo" });
    }

    let active = true;
    const controller = new AbortController();
    const cachedEntry = readExerciseInfoClientPayload(normalizedExerciseId);
    const seedPayload = initialExercise
      ? {
          exercise: initialExercise,
          stats: normalizeExerciseInfoStats(initialStats ?? null),
        }
      : null;

    if (cachedEntry?.payload.exercise) {
      setExercise(cachedEntry.payload.exercise);
      setStats(normalizeExerciseInfoStats(cachedEntry.payload.stats ?? null));
      setStatsLoading(false);
    } else if (seedPayload) {
      setExercise(seedPayload.exercise);
      setStats(seedPayload.stats);
      writeExerciseInfoClientPayload(normalizedExerciseId, seedPayload, "seed");
      setStatsLoading(false);
    } else {
      setStatsLoading(true);
    }

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
          toast.error(resolvedMessage);
          setExercise(null);
          setStats(null);
          setStatsLoading(false);
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
          setStatsLoading(false);
          return;
        }

        const nextStats = normalizeExerciseInfoStats(successPayload.payload.stats ?? null);
        setExercise(successPayload.payload.exercise);
        setStats(nextStats);
        writeExerciseInfoClientPayload(normalizedExerciseId, {
          exercise: successPayload.payload.exercise,
          stats: nextStats,
        }, "server");
        setStatsLoading(false);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error("[ExerciseInfo] request failed", { exerciseId: normalizedExerciseId, status: "request-failed", error });
        toast.error("Could not load exercise info.");
        setExercise(null);
        setStats(null);
        setStatsLoading(false);
      }
    }

    if (shouldFetchExerciseInfoClientPayload(cachedEntry)) {
      void load();
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, [exerciseId, initialExercise, initialStats, open, sourceContext, toast]);

  return (
    <ExerciseInfoSheet
      exercise={exercise}
      stats={stats}
      statsLoading={statsLoading}
      open={open}
      onOpenChange={onOpenChange}
      onClose={onClose}
      sourceContext={sourceContext}
    />
  );
}
