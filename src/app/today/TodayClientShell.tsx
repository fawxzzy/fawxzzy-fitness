"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TodayExerciseRows } from "@/app/today/TodayExerciseRows";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { AccentSubtitleText, SubtitleText } from "@/components/ui/text-roles";
import { readTodayCache, type TodayCacheSnapshot } from "@/lib/offline/today-cache";
import { ACTIVE_SESSION_EVENT, clearActiveSessionHint, readActiveSessionHint } from "@/lib/session-state-sync";

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
    loggedSetCount?: number;
    isSkipped?: boolean;
    targetSetsMin?: number | null;
    targetSetsMax?: number | null;
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
      <ContentRail>
        <ScreenScaffold recipe="todayOverview" className="w-full">
          <SharedSectionShell recipe="todayOverview" bodyClassName="space-y-2.5">
            <Link href="/routines" className="block rounded-lg border border-border bg-bg/40 px-3 py-2 text-center text-sm text-text">
              Go to Routines
            </Link>
          </SharedSectionShell>
        </ScreenScaffold>
      </ContentRail>
    );
  }

  return (
    <ContentRail>
      <ScreenScaffold recipe="todayOverview" className="w-full">
        <SharedSectionShell recipe="todayOverview" bodyClassName="space-y-2.5">
          <OfflineSyncBadge />
          {display.staleAt ? (
            <AccentSubtitleText className="rounded-md border border-[rgb(var(--accent-yellow-on)/0.28)] bg-[rgb(var(--accent-yellow-off)/0.12)] px-3 py-2 text-xs text-[rgb(var(--accent-yellow-on))]">
              Offline snapshot - stale data from {new Date(display.staleAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </AccentSubtitleText>
          ) : null}

          <TodayExerciseRows
            exercises={display.exercises.map((exercise) => ({
              ...exercise,
              exerciseId: exercise.exerciseId ?? exercise.id,
            }))}
            emptyMessage={display.routine.isRest ? "Rest day active. Exercises stay saved and hidden until rest mode is turned off." : "No exercises today."}
          />

          {display.inProgressSessionId ? (
            <TodayStartButton
              sessionId={display.inProgressSessionId}
              returnTo="/today"
              fullWidth
              className="w-full"
              label="Resume"
            />
          ) : (
            <SubtitleText className="rounded-md border border-border bg-bg/40 px-3 py-2 text-center">
              Start session requires a live connection.
            </SubtitleText>
          )}
        </SharedSectionShell>
      </ScreenScaffold>
    </ContentRail>
  );
}
