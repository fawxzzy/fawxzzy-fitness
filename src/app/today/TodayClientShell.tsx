"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TodayExerciseRows } from "@/app/today/TodayExerciseRows";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { TodayOverviewContent, TodayOverviewScaffold } from "@/components/today/TodayScreenFamily";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubtitleText } from "@/components/ui/text-roles";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { readTodayCache, type TodayCacheSnapshot } from "@/lib/offline/today-cache";
import { ACTIVE_SESSION_EVENT, clearActiveSessionHint, readActiveSessionHint } from "@/lib/session-state-sync";

type TodayPayload = {
  routine: {
    id: string;
    name: string;
    dayIndex: number;
    dayName: string;
    dayWeekday?: string | null;
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
    measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
    isCardio?: boolean | null;
    kind?: string | null;
    type?: string | null;
    tags?: string[] | string | null;
    categories?: string[] | string | null;
    image_howto_path?: string | null;
    how_to_short?: string | null;
    image_icon_path?: string | null;
    slug?: string | null;
    progressionStateLabel?: string | null;
    loggedSetCount?: number;
    isSkipped?: boolean;
    targetSetsMin?: number | null;
    targetSetsMax?: number | null;
  }>;
  completedTodayCount: number;
  inProgressSessionId: string | null;
};

export function TodayClientShell({
  userId,
  payload,
  fetchFailed,
}: {
  userId: string;
  payload: TodayPayload;
  fetchFailed: boolean;
}) {
  const [cachedSnapshot, setCachedSnapshot] = useState<TodayCacheSnapshot | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!fetchFailed) {
      return;
    }

    void readTodayCache(userId).then((snapshot) => {
      setCachedSnapshot(snapshot);
    });
  }, [fetchFailed, userId]);

  useEffect(() => {
    const syncActiveSessionHint = () => {
      const hintSessionId = readActiveSessionHint()?.sessionId ?? null;
      if (!payload.inProgressSessionId && hintSessionId) {
        clearActiveSessionHint(hintSessionId);
      }

      if (!payload.inProgressSessionId && hintSessionId) {
        router.refresh();
      }
    };

    syncActiveSessionHint();
    window.addEventListener(ACTIVE_SESSION_EVENT, syncActiveSessionHint as EventListener);

    return () => {
      window.removeEventListener(ACTIVE_SESSION_EVENT, syncActiveSessionHint as EventListener);
    };
  }, [payload.inProgressSessionId, router]);

  const display = useMemo(() => {
    if (payload.routine) {
      return {
        routine: payload.routine,
        exercises: payload.exercises,
        completedTodayCount: payload.completedTodayCount,
        inProgressSessionId: payload.inProgressSessionId,
        staleAt: null,
      };
    }

    if (fetchFailed && cachedSnapshot) {
      return {
        routine: cachedSnapshot.routine,
        exercises: cachedSnapshot.exercises,
        completedTodayCount: cachedSnapshot.hints.completedTodayCount,
        inProgressSessionId: null,
        staleAt: cachedSnapshot.capturedAt,
      };
    }

    return null;
  }, [cachedSnapshot, fetchFailed, payload]);

  if (!display) {
    return (
      <TodayOverviewContent>
        <TodayOverviewScaffold>
          <EmptyState
            title="No routine selected"
            body="Choose a routine to see today's plan."
            action={(
              <Link href="/routines" className={getAppButtonClassName({ variant: "primary", fullWidth: true })}>
                Go to Routines
              </Link>
            )}
          />
        </TodayOverviewScaffold>
      </TodayOverviewContent>
    );
  }

  return (
    <TodayOverviewContent>
      <TodayOverviewScaffold>
        <div className="flex flex-col gap-[0.625rem]">
          <OfflineSyncBadge userId={userId} label={display.staleAt ? "Offline" : null} />

          <TodayExerciseRows
            exercises={display.exercises.map((exercise) => ({
              ...exercise,
              exerciseId: exercise.exerciseId ?? exercise.id,
            }))}
            emptyMessage={display.routine.isRest ? "Rest day active. Exercises stay saved and hidden until rest mode is turned off." : "No exercises today."}
            isRestDay={display.routine.isRest}
          />

          {display.inProgressSessionId ? (
            <TodayStartButton
              sessionId={display.inProgressSessionId}
              returnTo="/today"
              fullWidth
              className="w-full"
              label="Resume Workout"
            />
          ) : display.staleAt ? null : (
            <SubtitleText className="rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-2 text-center">
              Start session requires a live connection.
            </SubtitleText>
          )}
        </div>
      </TodayOverviewScaffold>
    </TodayOverviewContent>
  );
}
