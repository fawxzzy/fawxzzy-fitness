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
import {
  createDefaultExerciseInfoFilterState,
  normalizeExerciseInfoFilterState,
  type ExerciseInfoAnalyticsScope,
  type ExerciseInfoFilterState,
} from "@/lib/exercise-info-scope";

const UUID_V4ISH_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createEmptyStatsLoadingState(): Record<ExerciseInfoAnalyticsScope, boolean> {
  return {
    all_time: false,
    current_routine: false,
    current_cycle: false,
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
  initialFilterState,
}: {
  exerciseId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
  sourceContext?: string;
  initialExercise?: ExerciseInfoSheetExercise | null;
  initialStats?: ExerciseInfoSheetStats | null;
  initialFilterState?: ExerciseInfoFilterState | null;
}) {
  const [exercise, setExercise] = useState<ExerciseInfoSheetExercise | null>(null);
  const [statsByScope, setStatsByScope] = useState<Partial<Record<ExerciseInfoAnalyticsScope, ExerciseInfoSheetStats | null>>>({});
  const [statsLoadingByScope, setStatsLoadingByScope] = useState<Record<ExerciseInfoAnalyticsScope, boolean>>(createEmptyStatsLoadingState);
  const [filterState, setFilterState] = useState<ExerciseInfoFilterState>(createDefaultExerciseInfoFilterState());
  const toast = useToast();

  useEffect(() => {
    setFilterState(normalizeExerciseInfoFilterState(initialFilterState ?? createDefaultExerciseInfoFilterState()));
  }, [exerciseId, initialFilterState]);

  useEffect(() => {
    if (open) {
      return;
    }

    setExercise(null);
    setStatsByScope({});
    setStatsLoadingByScope(createEmptyStatsLoadingState());
    setFilterState(createDefaultExerciseInfoFilterState());
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const rawExerciseId = typeof exerciseId === "string" ? exerciseId.trim() : "";
    const normalizedExerciseId = resolveCanonicalExerciseId(rawExerciseId);
    const normalizedFilterState = normalizeExerciseInfoFilterState(filterState);
    const currentScope = normalizedFilterState.analyticsScope;
    const seedPayload = normalizeExerciseInfoClientPayload(
      initialExercise
        ? {
            exercise: initialExercise,
            stats: initialStats ?? null,
          }
        : null,
    );
    const isValidExerciseId = normalizedExerciseId.length > 0 && (UUID_V4ISH_PATTERN.test(normalizedExerciseId) || isKnownLegacyExerciseId(rawExerciseId));

    if (!isValidExerciseId) {
      if (seedPayload) {
        setExercise(seedPayload.exercise);
        setStatsByScope({
          all_time: seedPayload.stats,
          current_routine: null,
          current_cycle: null,
        });
        setStatsLoadingByScope(createEmptyStatsLoadingState());
        return;
      }

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
      setStatsByScope({});
      setStatsLoadingByScope(createEmptyStatsLoadingState());
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.debug("[ExerciseInfo] open request", {
        exerciseId: normalizedExerciseId,
        source: sourceContext ?? "ExerciseInfo",
        filterState: normalizedFilterState,
      });
    }

    let active = true;
    const controller = new AbortController();
    const cachedEntry = readExerciseInfoClientPayload(normalizedExerciseId, normalizedFilterState);
    const cachedPayload = normalizeExerciseInfoClientPayload(cachedEntry?.payload ?? null);
    const canUseCachedPayload = Boolean(cachedPayload && cachedEntry?.source === "server" && !shouldFetchExerciseInfoClientPayload(cachedEntry));
    const localPayload = canUseCachedPayload ? cachedPayload : null;
    const hasSeededStats = Boolean(seedPayload?.stats);

    if (!localPayload && seedPayload?.exercise) {
      setExercise(seedPayload.exercise);
    }

    if (localPayload) {
      setExercise(localPayload.exercise);
      setStatsByScope((current) => ({
        ...current,
        [currentScope]: localPayload.stats,
      }));
    } else if (seedPayload) {
      setExercise(seedPayload.exercise);
      setStatsByScope((current) => ({
        ...current,
        [currentScope]: seedPayload.stats,
      }));
      writeExerciseInfoClientPayload(normalizedExerciseId, seedPayload, "seed", normalizedFilterState);
    }

    setStatsLoadingByScope((current) => ({
      ...current,
      [currentScope]: !localPayload && !hasSeededStats,
    }));

    async function loadCurrentFilter() {
      try {
        const result = await fetchExerciseInfoClientPayload(normalizedExerciseId, normalizedFilterState, controller.signal);
        if (!active) return;

        if (!result.ok) {
          console.error("[ExerciseInfo] failed to load payload", {
            exerciseId: normalizedExerciseId,
            filterState: normalizedFilterState,
            status: result.status ?? "request-failed",
            code: result.code,
            details: result.details,
          });
          if (currentScope === "all_time") {
            toast.error(result.message);
          }
          setStatsLoadingByScope((current) => ({ ...current, [currentScope]: false }));
          return;
        }

        setExercise((current) => current ?? result.payload.exercise);
        setStatsByScope((current) => ({
          ...current,
          [currentScope]: result.payload.stats,
        }));
        writeExerciseInfoClientPayload(normalizedExerciseId, {
          exercise: result.payload.exercise,
          stats: result.payload.stats,
        }, "server", normalizedFilterState);
        setStatsLoadingByScope((current) => ({ ...current, [currentScope]: false }));
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error("[ExerciseInfo] request failed", {
          exerciseId: normalizedExerciseId,
          filterState: normalizedFilterState,
          status: "request-failed",
          error,
        });
        if (currentScope === "all_time") {
          toast.error("Could not load exercise info.");
        }
        setStatsLoadingByScope((current) => ({ ...current, [currentScope]: false }));
      }
    }

    if (!canUseCachedPayload) {
      if (!localPayload && !hasSeededStats) {
        setStatsLoadingByScope((current) => ({ ...current, [currentScope]: true }));
      }
      void loadCurrentFilter();
    }

    return () => {
      active = false;
      controller.abort();
    };
  }, [exerciseId, filterState, initialExercise, initialStats, open, sourceContext, toast]);

  return (
    <ExerciseInfoSoftBoundary exerciseId={exerciseId} onClose={onClose}>
      <ExerciseInfoSheet
        exercise={exercise}
        statsByScope={statsByScope}
        statsLoadingByScope={statsLoadingByScope}
        open={open}
        onOpenChange={onOpenChange}
        onClose={onClose}
        sourceContext={sourceContext}
        filterState={filterState}
        onFilterStateChange={setFilterState}
      />
    </ExerciseInfoSoftBoundary>
  );
}
