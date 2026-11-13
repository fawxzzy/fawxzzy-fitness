"use client";

import { useEffect, useState } from "react";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionHeaderControls } from "@/components/SessionHeaderControls";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { SubtitleText } from "@/components/ui/text-roles";
import { TodayExerciseRows } from "@/app/today/TodayExerciseRows";
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
          statusBadge={<OfflineSyncBadge userId={userId} label="Offline" />}
        />
      </ScreenScaffold>
    </ContentRail>
  ) : null;

  return (
    <ScrollScreenWithBottomActions floatingHeader={floatingHeader}>
      <ContentRail className="space-y-3">
        {cachedSnapshot ? (
          <>
            <TodayExerciseRows
              exercises={cachedSnapshot.exercises.map((exercise) => ({ ...exercise, exerciseId: exercise.exerciseId ?? exercise.id }))}
              emptyMessage="No exercises in this session."
              surface="current-session"
            />
          </>
        ) : (
          <SubtitleText className="rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-2 text-center">
            No cached session available yet.
          </SubtitleText>
        )}
      </ContentRail>
    </ScrollScreenWithBottomActions>
  );
}
