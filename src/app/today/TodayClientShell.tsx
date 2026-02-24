"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { TodayCacheSnapshot } from "@/lib/offline/today-cache";
import { readTodayCache } from "@/lib/offline/today-cache";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";

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
    name: string;
    targets: string | null;
    notes: string | null;
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

  useEffect(() => {
    if (!fetchFailed) {
      return;
    }

    void readTodayCache().then((snapshot) => {
      setCachedSnapshot(snapshot);
    });
  }, [fetchFailed]);

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
        inProgressSessionId: cachedSnapshot.hints.inProgressSessionId,
        staleAt: cachedSnapshot.capturedAt,
      };
    }

    return null;
  }, [cachedSnapshot, fetchFailed, payload]);

  if (!display) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-surface/95 p-4">
        <p className="text-sm text-muted">No active routine selected.</p>
        <Link href="/routines" className="block rounded-lg border border-border bg-bg/40 px-3 py-2 text-center text-sm text-text">
          Go to Routines
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface/95 p-4">
      <OfflineSyncBadge />
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-text">
          {display.routine.name}: {display.routine.isRest ? `REST DAY — ${display.routine.dayName}` : display.routine.dayName}
        </h2>
        {display.completedTodayCount > 0 ? (
          <p className="inline-flex rounded-full border border-emerald-400/35 bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-200">Completed</p>
        ) : null}
      </div>

      {display.staleAt ? (
        <p className="rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Offline snapshot · stale data from {new Date(display.staleAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </p>
      ) : null}

      <ul className="space-y-1 text-sm">
        {display.exercises.map((exercise) => (
          <li key={exercise.id} className="flex items-center justify-between gap-3 rounded-md bg-surface-2-strong px-3 py-2 text-text">
            <span className="truncate">{exercise.name}</span>
            {exercise.targets ? <span className="shrink-0 text-xs text-muted">Goal: {exercise.targets}</span> : null}
          </li>
        ))}
        {display.exercises.length === 0 ? (
          <li className="rounded-md bg-surface-2-strong px-3 py-2 text-muted">No routine exercises planned today.</li>
        ) : null}
      </ul>

      {display.inProgressSessionId ? (
        <Link
          href={`/session/${display.inProgressSessionId}`}
          className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
        >
          Resume Workout
        </Link>
      ) : (
        <p className="rounded-md border border-border bg-bg/40 px-3 py-2 text-center text-sm text-muted">
          Start Workout requires a live connection.
        </p>
      )}
    </div>
  );
}
