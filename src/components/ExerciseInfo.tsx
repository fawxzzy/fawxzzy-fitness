"use client";

import { useEffect, useState } from "react";
import { ExerciseInfoSheet, type ExerciseInfoSheetExercise, type ExerciseInfoSheetStats } from "@/components/ExerciseInfoSheet";
import { ExerciseInfoSoftBoundary } from "@/components/ExerciseInfoSoftBoundary";
import { useToast } from "@/components/ui/ToastProvider";
import {
  fetchExerciseInfoClientPayload,
  normalizeExerciseInfoClientPayload,
} from "@/lib/exercise-info-client";
import {
  readExerciseInfoClientPayload,
  shouldFetchExerciseInfoClientPayload,
  writeExerciseInfoClientPayload,
} from "@/lib/exercise-info-client-cache";
import { isKnownLegacyExerciseId, resolveCanonicalExerciseId } from "@/lib/exercise-id-aliases";

const UUID_V4ISH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    const cachedPayload = normalizeExerciseInfoClientPayload(cachedEntry?.payload ?? null);
    const seedPayload = normalizeExerciseInfoClientPayload(
      initialExercise
        ? {
            exercise: initialExercise,
            stats: initialStats ?? null,
          }
        : null,
    );
    const hasSeededPayload = Boolean(cachedPayload ?? seedPayload);

    if (cachedPayload) {
      setExercise(cachedPayload.exercise);
      setStats(cachedPayload.stats);
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
        const result = await fetchExerciseInfoClientPayload(normalizedExerciseId, controller.signal);
        if (!result.ok) {
          if (!active) return;
          console.error("[ExerciseInfo] failed to load payload", {
            exerciseId: normalizedExerciseId,
            status: result.status ?? "request-failed",
            code: result.code,
            details: result.details,
          });
          toast.error(result.message);
          if (!hasSeededPayload) {
            setExercise(null);
            setStats(null);
          }
          setStatsLoading(false);
          return;
        }

        if (!active) return;
        setExercise(result.payload.exercise);
        setStats(result.payload.stats);
        writeExerciseInfoClientPayload(normalizedExerciseId, {
          exercise: result.payload.exercise,
          stats: result.payload.stats,
        }, "server");
        setStatsLoading(false);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error("[ExerciseInfo] request failed", { exerciseId: normalizedExerciseId, status: "request-failed", error });
        toast.error("Could not load exercise info.");
        if (!hasSeededPayload) {
          setExercise(null);
          setStats(null);
        }
        setStatsLoading(false);
      }
    }

    if (shouldFetchExerciseInfoClientPayload(cachedEntry) || !cachedPayload) {
      void load();
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, [exerciseId, initialExercise, initialStats, open, sourceContext, toast]);

  return (
    <ExerciseInfoSoftBoundary exerciseId={exerciseId} onClose={onClose}>
      <ExerciseInfoSheet
        exercise={exercise}
        stats={stats}
        statsLoading={statsLoading}
        open={open}
        onOpenChange={onOpenChange}
        onClose={onClose}
        sourceContext={sourceContext}
      />
    </ExerciseInfoSoftBoundary>
  );
}
