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
import { EXERCISE_INFO_ANALYTICS_SCOPE_OPTIONS, type ExerciseInfoAnalyticsScope } from "@/lib/exercise-info-scope";

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
  const [statsByScope, setStatsByScope] = useState<Partial<Record<ExerciseInfoAnalyticsScope, ExerciseInfoSheetStats | null>>>({});
  const [statsLoadingByScope, setStatsLoadingByScope] = useState<Record<ExerciseInfoAnalyticsScope, boolean>>({
    all_time: false,
    current_routine: false,
  });
  const [analyticsScope, setAnalyticsScope] = useState<ExerciseInfoAnalyticsScope>("all_time");
  const toast = useToast();

  useEffect(() => {
    if (!open) {
      setExercise(null);
      setStatsByScope({});
      setStatsLoadingByScope({
        all_time: false,
        current_routine: false,
      });
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
      setStatsByScope({});
      setStatsLoadingByScope({
        all_time: false,
        current_routine: false,
      });
      return;
    }

    if (process.env.NODE_ENV === "development") {
      console.debug("[ExerciseInfo] open request", { exerciseId: normalizedExerciseId, source: sourceContext ?? "ExerciseInfo" });
    }

    let active = true;
    const seedPayload = normalizeExerciseInfoClientPayload(
      initialExercise
        ? {
            exercise: initialExercise,
            stats: initialStats ?? null,
          }
        : null,
    );
    const controllers = new Map<ExerciseInfoAnalyticsScope, AbortController>();
    const nextStatsByScope: Partial<Record<ExerciseInfoAnalyticsScope, ExerciseInfoSheetStats | null>> = {};
    const nextStatsLoadingByScope: Record<ExerciseInfoAnalyticsScope, boolean> = {
      all_time: false,
      current_routine: false,
    };
    let nextExercise: ExerciseInfoSheetExercise | null = null;

    for (const scope of EXERCISE_INFO_ANALYTICS_SCOPE_OPTIONS.map((option) => option.id)) {
      const cachedEntry = readExerciseInfoClientPayload(normalizedExerciseId, scope);
      const cachedPayload = normalizeExerciseInfoClientPayload(cachedEntry?.payload ?? null);
      const fallbackPayload = scope === "all_time" ? seedPayload : null;
      const localPayload = cachedPayload ?? fallbackPayload;

      if (localPayload) {
        nextExercise ??= localPayload.exercise;
        nextStatsByScope[scope] = localPayload.stats;
        if (!cachedPayload && fallbackPayload) {
          writeExerciseInfoClientPayload(normalizedExerciseId, fallbackPayload, "seed", scope);
        }
      }

      nextStatsLoadingByScope[scope] = !cachedPayload && !fallbackPayload;
    }

    setExercise(nextExercise);
    setStatsByScope(nextStatsByScope);
    setStatsLoadingByScope(nextStatsLoadingByScope);

    async function loadScope(scope: ExerciseInfoAnalyticsScope) {
      const controller = new AbortController();
      controllers.set(scope, controller);

      try {
        const result = await fetchExerciseInfoClientPayload(normalizedExerciseId, scope, controller.signal);
        if (!active) return;

        if (!result.ok) {
          console.error("[ExerciseInfo] failed to load payload", {
            exerciseId: normalizedExerciseId,
            scope,
            status: result.status ?? "request-failed",
            code: result.code,
            details: result.details,
          });
          if (scope === "all_time") {
            toast.error(result.message);
          }
          setStatsLoadingByScope((current) => ({ ...current, [scope]: false }));
          return;
        }

        setExercise((current) => current ?? result.payload.exercise);
        setStatsByScope((current) => ({
          ...current,
          [scope]: result.payload.stats,
        }));
        writeExerciseInfoClientPayload(normalizedExerciseId, {
          exercise: result.payload.exercise,
          stats: result.payload.stats,
        }, "server", scope);
        setStatsLoadingByScope((current) => ({ ...current, [scope]: false }));
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error("[ExerciseInfo] request failed", {
          exerciseId: normalizedExerciseId,
          scope,
          status: "request-failed",
          error,
        });
        if (scope === "all_time") {
          toast.error("Could not load exercise info.");
        }
        setStatsLoadingByScope((current) => ({ ...current, [scope]: false }));
      }
    }

    for (const scope of EXERCISE_INFO_ANALYTICS_SCOPE_OPTIONS.map((option) => option.id)) {
      const cachedEntry = readExerciseInfoClientPayload(normalizedExerciseId, scope);
      const cachedPayload = normalizeExerciseInfoClientPayload(cachedEntry?.payload ?? null);
      const fallbackPayload = scope === "all_time" ? seedPayload : null;
      if (shouldFetchExerciseInfoClientPayload(cachedEntry) || !cachedPayload) {
        if (!cachedPayload && !fallbackPayload) {
          setStatsLoadingByScope((current) => ({ ...current, [scope]: true }));
        }
        void loadScope(scope);
      }
    }

    return () => {
      active = false;
      for (const controller of controllers.values()) {
        controller.abort();
      }
    };
  }, [exerciseId, initialExercise, initialStats, open, sourceContext, toast]);

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
        analyticsScope={analyticsScope}
        onAnalyticsScopeChange={setAnalyticsScope}
      />
    </ExerciseInfoSoftBoundary>
  );
}
