"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TodayExerciseRows } from "@/app/today/TodayExerciseRows";
import { TodayNoRoutinePanel } from "@/app/today/TodayNoRoutinePanel";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { TodayOverviewContent, TodayOverviewScaffold } from "@/components/today/TodayScreenFamily";
import { CardEmptyState, CardNotice } from "@/components/ui/card-system";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { readTodayCache, type TodayCacheSnapshot } from "@/lib/offline/today-cache";
import { ACTIVE_SESSION_EVENT, clearActiveSessionHint, readActiveSessionHint } from "@/lib/session-state-sync";
import type { TodayNoRoutineState } from "@/lib/start-fast-guards";

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
  noRoutineState = null,
}: {
  userId: string;
  payload: TodayPayload;
  fetchFailed: boolean;
  /** Read by page.tsx only when there is no active routine; null shows the plain Routines card, never plans. */
  noRoutineState?: TodayNoRoutineState | null;
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
          {fetchFailed ? (
            // Today could not load (offline or a server error) and nothing is cached: the person may well have a
            // routine, so offering new plans here could make a duplicate. Point at a retry instead.
            <CardEmptyState
              title="Today could not load"
              body="Check your connection, then try again."
              action={(
                <button
                  type="button"
                  onClick={() => router.refresh()}
                  className={getAppButtonClassName({ variant: "secondary", fullWidth: true })}
                >
                  Try again
                </button>
              )}
            />
          ) : (
            // Starter plans only on a true first run; routines that exist are picked, not re-created.
            <TodayNoRoutinePanel state={noRoutineState} />
          )}
        </TodayOverviewScaffold>
      </TodayOverviewContent>
    );
  }

  return (
    <TodayOverviewContent>
      <TodayOverviewScaffold>
        <div className="flex flex-col gap-[0.625rem]">
          <TodayExerciseRows
            exercises={display.exercises}
            emptyMessage={display.routine.isRest ? "Rest day active. Exercises stay saved and hidden until rest mode is turned off." : "No exercises today."}
            isRestDay={display.routine.isRest}
            compact
          />

          {display.inProgressSessionId ? (
            <TodayStartButton
              sessionId={display.inProgressSessionId}
              returnTo="/today"
              fullWidth
              className="w-full"
              label="Resume workout"
            />
          ) : display.staleAt ? null : (
            <CardNotice>Starting a workout needs a connection.</CardNotice>
          )}
        </div>
      </TodayOverviewScaffold>
    </TodayOverviewContent>
  );
}
