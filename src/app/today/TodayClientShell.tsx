"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TodayCacheSnapshot } from "@/lib/offline/today-cache";
import { readTodayCache } from "@/lib/offline/today-cache";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { AccentSubtitleText, SubtitleText, TitleText } from "@/components/ui/text-roles";
import { getExerciseCountSummaryFromInputs } from "@/lib/day-summary";
import { ACTIVE_SESSION_EVENT, readActiveSessionHint } from "@/lib/session-state-sync";

type TodayPayload = {
  routine: {
    id: string;
    name: string;
    dayIndex: number;
    dayName: string;
    isRest: boolean;
  } | null;
  exercises: Array<{
    id: string;
    exerciseId?: string;
    name: string;
    targets: string | null;
    notes: string | null;
    primary_muscle?: string | null;
    equipment?: string | null;
    movement_pattern?: string | null;
    measurement_type?: "reps" | "time" | "distance" | "time_distance" | null;
    isCardio?: boolean | null;
    kind?: string | null;
    type?: string | null;
    tags?: string[] | string | null;
    categories?: string[] | string | null;
    image_howto_path?: string | null;
    how_to_short?: string | null;
    image_icon_path?: string | null;
    slug?: string | null;
  }>;
  completedTodayCount: number;
  inProgressSessionId: string | null;
};

export function TodayClientShell({
  payload,
  fetchFailed,
}: {
  payload: TodayPayload;
  fetchFailed: boolean;
}) {
  const [cachedSnapshot, setCachedSnapshot] = useState<TodayCacheSnapshot | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [activeSessionHintId, setActiveSessionHintId] = useState<string | null>(payload.inProgressSessionId);
  const router = useRouter();

  useEffect(() => {
    if (!fetchFailed) {
      return;
    }

    void readTodayCache().then((snapshot) => {
      setCachedSnapshot(snapshot);
    });
  }, [fetchFailed]);

  useEffect(() => {
    setActiveSessionHintId(payload.inProgressSessionId);
  }, [payload.inProgressSessionId]);

  useEffect(() => {
    const syncActiveSessionHint = () => {
      const nextSessionId = payload.inProgressSessionId ?? readActiveSessionHint()?.sessionId ?? null;
      setActiveSessionHintId(nextSessionId);

      if (!payload.inProgressSessionId && nextSessionId) {
        router.refresh();
      }
    };

    syncActiveSessionHint();
    window.addEventListener("focus", syncActiveSessionHint);
    window.addEventListener("pageshow", syncActiveSessionHint);
    window.addEventListener(ACTIVE_SESSION_EVENT, syncActiveSessionHint as EventListener);

    return () => {
      window.removeEventListener("focus", syncActiveSessionHint);
      window.removeEventListener("pageshow", syncActiveSessionHint);
      window.removeEventListener(ACTIVE_SESSION_EVENT, syncActiveSessionHint as EventListener);
    };
  }, [payload.inProgressSessionId, router]);

  const display = useMemo(() => {
    if (payload.routine) {
      return {
        routine: payload.routine,
        exercises: payload.exercises,
        completedTodayCount: payload.completedTodayCount,
        inProgressSessionId: activeSessionHintId,
        staleAt: null,
      };
    }

    if (fetchFailed && cachedSnapshot) {
      return {
        routine: cachedSnapshot.routine,
        exercises: cachedSnapshot.exercises,
        completedTodayCount: cachedSnapshot.hints.completedTodayCount,
        inProgressSessionId: activeSessionHintId ?? cachedSnapshot.hints.inProgressSessionId,
        staleAt: cachedSnapshot.capturedAt,
      };
    }

    return null;
  }, [activeSessionHintId, cachedSnapshot, fetchFailed, payload]);

  if (!display) {
    return (
      <div className="space-y-3 px-1 py-2">
        <p className="text-sm text-muted">No active routine selected.</p>
        <Link href="/routines" className="block rounded-lg border border-border bg-bg/40 px-3 py-2 text-center text-sm text-text">
          Go to Routines
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-1 py-2">
      <OfflineSyncBadge />
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <TitleText as="h2" className="text-lg">
            {display.routine.name}: {display.routine.dayName}
          </TitleText>
          <SubtitleText>
            {display.routine.isRest
              ? "Recovery focus."
              : getExerciseCountSummaryFromInputs(display.exercises).label}
          </SubtitleText>
        </div>
        {display.completedTodayCount > 0 ? (
          <AccentSubtitleText className="inline-flex rounded-full border border-emerald-400/35 bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-200">Completed</AccentSubtitleText>
        ) : null}
      </div>

      {display.staleAt ? (
        <AccentSubtitleText className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Offline snapshot · stale data from {new Date(display.staleAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </AccentSubtitleText>
      ) : null}

      <ul className="space-y-2">
        {display.exercises.map((exercise) => (
          <li key={exercise.id}>
            <StandardExerciseRow
              exercise={exercise}
              summary={exercise.targets}
              onPress={() => {
                const canonicalExerciseId = "exerciseId" in exercise && exercise.exerciseId ? exercise.exerciseId : exercise.id;
                if (process.env.NODE_ENV === "development") {
                  console.debug("[ExerciseInfo:open] TodayClientShell", { exerciseId: canonicalExerciseId, exercise: { id: exercise.id, exerciseId: "exerciseId" in exercise ? exercise.exerciseId : undefined, name: exercise.name } });
                }
                setSelectedExerciseId(canonicalExerciseId);
              }}
            />
          </li>
        ))}
        {display.exercises.length === 0 ? (
          <li className="rounded-2xl border border-white/8 bg-[rgb(var(--surface-rgb)/0.42)] px-3 py-3"><SubtitleText>{display.routine.isRest ? "Take the day to recover, move lightly, and come back ready." : "No exercises today."}</SubtitleText></li>
        ) : null}
      </ul>

      {display.inProgressSessionId ? (
        <Link
          href={`/session/${display.inProgressSessionId}?returnTo=${encodeURIComponent("/today")}`}
          className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
        >
          Resume session
        </Link>
      ) : (
        <SubtitleText className="rounded-md border border-border bg-bg/40 px-3 py-2 text-center">
          Start session requires a live connection.
        </SubtitleText>
      )}

      <ExerciseInfo
        exerciseId={selectedExerciseId}
        open={Boolean(selectedExerciseId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExerciseId(null);
          }
        }}
        onClose={() => {
          setSelectedExerciseId(null);
        }}
        sourceContext="TodayClientShell"
      />
    </div>
  );
}
