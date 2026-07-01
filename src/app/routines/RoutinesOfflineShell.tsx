"use client";

import { useEffect, useMemo, useState } from "react";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { RoutineBrowseCard, type RoutineBrowseCardItem } from "@/components/routines/RoutineBrowseCard";
import { RoutinesCardList, RoutinesListItem, SharedDayListSection } from "@/components/routines/RoutinesScreenFamily";
import { AccentSubtitleText, SubtitleText } from "@/components/ui/text-roles";
import { readRoutinesCache, type RoutinesCacheSnapshot } from "@/lib/offline/routines-cache";

export function RoutinesOfflineShell({
  userId,
  fetchFailed,
}: {
  userId: string;
  fetchFailed: boolean;
}) {
  const [cachedSnapshot, setCachedSnapshot] = useState<RoutinesCacheSnapshot | null>(null);

  useEffect(() => {
    if (!fetchFailed) {
      return;
    }

    void readRoutinesCache(userId).then((snapshot) => {
      setCachedSnapshot(snapshot);
    });
  }, [fetchFailed, userId]);

  const routines = useMemo<RoutineBrowseCardItem[]>(() => (
    cachedSnapshot?.routines ?? []
  ), [cachedSnapshot]);

  return (
    <SharedDayListSection>
      <OfflineSyncBadge userId={userId} />
      {cachedSnapshot ? (
        <>
          <AccentSubtitleText className="rounded-[var(--radius-md)] border border-[rgb(var(--warning-rgb)/0.28)] bg-[rgb(var(--warning-rgb)/0.12)] px-3 py-2 text-xs text-[rgb(var(--warning-rgb))]">
            Offline snapshot - stale data from {new Date(cachedSnapshot.capturedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </AccentSubtitleText>
          <SubtitleText className="rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-2 text-center">
            Editing routines requires a live connection. Cached browse state stays available here.
          </SubtitleText>
          <RoutinesCardList>
            {routines.map((routine) => (
              <RoutinesListItem key={routine.id}>
                <RoutineBrowseCard
                  routine={routine}
                  showPreviewDays={Boolean(routine.isActive)}
                  onPress={undefined}
                  rightIcon={null}
                />
              </RoutinesListItem>
            ))}
          </RoutinesCardList>
        </>
      ) : (
        <SubtitleText className="rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-2 text-center">
          Offline snapshot unavailable. Reopen Routines while online once to cache this screen.
        </SubtitleText>
      )}
    </SharedDayListSection>
  );
}
