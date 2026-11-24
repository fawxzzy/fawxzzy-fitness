"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HistorySessionCard } from "@/components/history/HistorySessionCard";
import { HistoryScopeSummarySurface } from "@/components/history/HistoryScopeSummarySurface";
import { WeeklyProgressSurface } from "@/components/history/WeeklyProgressSurface";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { CardEmptyState } from "@/components/ui/card-system";
import { useToast } from "@/components/ui/ToastProvider";
import { appTokens } from "@/components/ui/app/tokens";
import { cn } from "@/lib/cn";
import { readHistoryCache, type HistoryCacheSnapshot } from "@/lib/offline/history-cache";
import { getWeeklyProgressWeekStart } from "@/lib/history-weekly-progress";

export function HistoryOfflineShell({
  userId,
  initialSnapshot = null,
}: {
  userId: string;
  initialSnapshot?: HistoryCacheSnapshot | null;
}) {
  const [cachedSnapshot, setCachedSnapshot] = useState<HistoryCacheSnapshot | null>(initialSnapshot);

  useEffect(() => {
    void readHistoryCache(userId).then((snapshot) => {
      if (snapshot) {
        setCachedSnapshot(snapshot);
      }
    });
  }, [initialSnapshot, userId]);

  // Offline is explained once, in the in-flow notice under the header (History review item 7), with the saved time.
  const showWarning = useToast().warning;
  const shownNoticeRef = useRef<string | null>(null);
  const savedAtLabel = cachedSnapshot?.capturedAt ? formatOfflineSavedAt(cachedSnapshot.capturedAt) : null;
  useEffect(() => {
    const notice = savedAtLabel
      ? `You're offline. Showing History saved ${savedAtLabel}.`
      : "You're offline. History opens once you reconnect.";
    if (shownNoticeRef.current === notice) return;
    shownNoticeRef.current = notice;
    showWarning(notice, { id: "history-offline", persistent: true, dismissOnRouteChange: true });
  }, [savedAtLabel, showWarning]);

  const weeklyProgressByWeekStart = useMemo(
    () => new Map((cachedSnapshot?.weeklyProgressByWeek ?? []).map((summary) => [summary.weekStart, summary])),
    [cachedSnapshot?.weeklyProgressByWeek],
  );

  const sessionWeekStarts = useMemo(
    () => new Map((cachedSnapshot?.sessionItems ?? []).map((session) => [session.id, getWeeklyProgressWeekStart(session.startedAt, cachedSnapshot?.weeklyProgress.timezone ?? "UTC")])),
    [cachedSnapshot?.sessionItems, cachedSnapshot?.weeklyProgress.timezone],
  );

  return (
    <div data-history-offline="true" className={cn(appTokens.historyBrowserStack, "!gap-2 pt-2")}>
      {cachedSnapshot ? (
        <>
          <HistoryScopeSummarySurface
            summary={cachedSnapshot.scopeSummary}
            viewMode="compact"
            titleRoutineOverride={cachedSnapshot.activeRoutineTitle}
          />
          <WeeklyProgressSurface
            summary={cachedSnapshot.weeklyProgress}
            viewMode="compact"
            titleRoutineOverride={cachedSnapshot.activeRoutineTitle}
          />
          {cachedSnapshot.sessionItems.length > 0 ? (
            <>
              <div className="px-1.5 pt-2 pb-1.5">
                <MetricAccentBar
                  variant="thin"
                  className="bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.16),rgb(var(--accent-yellow-on)/0.92),rgb(var(--accent-yellow-on)/0.16))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]"
                />
              </div>
              <ul className="grid gap-2">
                {cachedSnapshot.sessionItems.map((session, index, items) => {
                  const previousSession = items[index + 1] ?? null;
                  const previousFilteredSession = index > 0 ? items[index - 1] : null;
                  const sessionWeekStart = sessionWeekStarts.get(session.id) ?? null;
                  const previousWeekStart = previousFilteredSession
                    ? (sessionWeekStarts.get(previousFilteredSession.id) ?? null)
                    : null;
                  const startsNewWeekGroup = index === 0 || sessionWeekStart !== previousWeekStart;
                  const historicalWeeklySummary = sessionWeekStart && sessionWeekStart !== cachedSnapshot.weeklyProgress.weekStart
                    ? (weeklyProgressByWeekStart.get(sessionWeekStart) ?? null)
                    : null;

                  return (
                    <li
                      key={session.id}
                      className={cn(startsNewWeekGroup && historicalWeeklySummary ? "grid gap-2 pt-4" : undefined)}
                    >
                      {startsNewWeekGroup && historicalWeeklySummary ? (
                        <>
                          <WeeklyProgressSurface
                            summary={historicalWeeklySummary}
                            viewMode="compact"
                            presentation="historical"
                          />
                          <div className="px-1.5 pt-2 pb-1.5">
                            <MetricAccentBar
                              variant="thin"
                              className="bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.16),rgb(var(--accent-yellow-on)/0.92),rgb(var(--accent-yellow-on)/0.16))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]"
                            />
                          </div>
                        </>
                      ) : null}
                      <HistorySessionCard
                        session={session}
                        previousSession={previousSession}
                        viewMode="compact"
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <CardEmptyState
              headingLevel={2}
              title="No saved sessions"
              body="Sessions you finish show here once you are back online."
            />
          )}
        </>
      ) : (
        <CardEmptyState
          headingLevel={2}
          title="No saved History yet"
          body="History you open while online is saved on this device, so it shows here next time you are offline."
        />
      )}
    </div>
  );
}

function formatOfflineSavedAt(capturedAt: string) {
  const date = new Date(capturedAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}
