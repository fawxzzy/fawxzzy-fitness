"use client";

import { useEffect, useState } from "react";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionHeaderControls } from "@/components/SessionHeaderControls";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { AccentSubtitleText, SubtitleText } from "@/components/ui/text-roles";
import { PlannedExerciseSummaryRow } from "@/components/workout/PlannedExerciseSummaryRow";
import { deriveLoggedSetCountProgressFill } from "@/lib/exercise-card-progress-fill";
import { deriveSessionExerciseProgressState } from "@/lib/session-exercise-progress";
import { readSessionCache, type SessionCacheSnapshot } from "@/lib/offline/session-cache";

export function SessionOfflineShell({
  userId,
  sessionId,
  backHref,
  initialSnapshot = null,
}: {
  userId: string;
  sessionId: string;
  backHref: string;
  initialSnapshot?: SessionCacheSnapshot | null;
}) {
  const [cachedSnapshot, setCachedSnapshot] = useState<SessionCacheSnapshot | null>(initialSnapshot);

  useEffect(() => {
    void readSessionCache(userId, sessionId).then((snapshot) => {
      if (snapshot) {
        setCachedSnapshot(snapshot);
      }
    });
  }, [initialSnapshot, sessionId, userId]);

  const floatingHeader = cachedSnapshot ? (
    <ContentRail>
      <ScreenScaffold recipe="todayOverview" className="w-full">
        <SessionHeaderControls
          routineName={cachedSnapshot.routineName}
          sessionDayName={cachedSnapshot.sessionDayName}
          infoItems={cachedSnapshot.headerInfoItems}
          backHref={backHref}
        />
      </ScreenScaffold>
    </ContentRail>
  ) : null;

  return (
    <ScrollScreenWithBottomActions floatingHeader={floatingHeader}>
      <ContentRail className="space-y-3">
        <div className="flex justify-end">
          <OfflineSyncBadge userId={userId} />
        </div>

        {cachedSnapshot ? (
          <>
            <AccentSubtitleText className="rounded-[var(--radius-md)] border border-[rgb(var(--warning-rgb)/0.28)] bg-[rgb(var(--warning-rgb)/0.12)] px-3 py-2 text-xs text-[rgb(var(--warning-rgb))]">
              Offline snapshot - stale data from {new Date(cachedSnapshot.capturedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </AccentSubtitleText>
            <SubtitleText className="rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-2 text-center">
              Session logging requires a live connection. Cached session state stays visible here.
            </SubtitleText>
            <ul className="flex flex-col gap-[0.375rem]">
              {cachedSnapshot.exercises.map((exercise) => {
                const progressState = deriveSessionExerciseProgressState({
                  loggedSetCount: exercise.loggedSetCount ?? 0,
                  isSkipped: exercise.isSkipped === true,
                  targetSetsMin: exercise.targetSetsMin,
                  targetSetsMax: exercise.targetSetsMax,
                  surface: "summary",
                });

                return (
                  <li key={exercise.id}>
                    <PlannedExerciseSummaryRow
                      exercise={exercise}
                      density="compact"
                      surface="current-session"
                      state={progressState.cardState}
                      semanticTone={progressState.cardState === "completed" ? "completed" : undefined}
                      progressFill={deriveLoggedSetCountProgressFill({
                        loggedSetCount: progressState.loggedSetCount,
                        goalSetTarget: progressState.goalSetTarget,
                      })}
                    />
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <SubtitleText className="rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-2 text-center">
            Offline snapshot unavailable. Reopen this session while online once to cache this screen.
          </SubtitleText>
        )}
      </ContentRail>
    </ScrollScreenWithBottomActions>
  );
}
