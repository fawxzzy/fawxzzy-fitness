"use client";

import { useEffect, useMemo, useState } from "react";
import { HistorySessionCard } from "@/components/history/HistorySessionCard";
import { HistoryScopeSummarySurface } from "@/components/history/HistoryScopeSummarySurface";
import { WeeklyProgressSurface } from "@/components/history/WeeklyProgressSurface";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
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

  const weeklyProgressByWeekStart = useMemo(
    () => new Map((cachedSnapshot?.weeklyProgressByWeek ?? []).map((summary) => [summary.weekStart, summary])),
    [cachedSnapshot?.weeklyProgressByWeek],
  );

  const sessionWeekStarts = useMemo(
    () => new Map((cachedSnapshot?.sessionItems ?? []).map((session) => [session.id, getWeeklyProgressWeekStart(session.startedAt, cachedSnapshot?.weeklyProgress.timezone ?? "UTC")])),
    [cachedSnapshot?.sessionItems, cachedSnapshot?.weeklyProgress.timezone],
  );

  return (
    <div className={cn(appTokens.historyBrowserStack, "gap-4 pt-2")}>
      <div className="flex justify-end">
        <OfflineSyncBadge userId={userId} />
      </div>
      {cachedSnapshot ? (
        <>
          <p className="rounded-[var(--radius-md)] border border-[rgb(var(--warning-rgb)/0.28)] bg-[rgb(var(--warning-rgb)/0.12)] px-3 py-2 text-xs text-[rgb(var(--warning-rgb))]">
            Offline snapshot - stale data from {new Date(cachedSnapshot.capturedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </p>
          <p className="rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-2 text-center text-sm text-[rgb(var(--text-secondary)/0.94)]">
            History stays browseable here, but loading fresh scope data still requires a live connection.
          </p>
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
              <ul className={appTokens.historyBrowserList}>
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
                      className={cn(startsNewWeekGroup && historicalWeeklySummary ? "space-y-2.5 pt-6" : undefined)}
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
            <SharedSectionShell
              recipe="historyDetail"
              listState={<p className={appTokens.historyBrowserEmptyState}>No completed sessions in this cached history snapshot yet.</p>}
            />
          )}
        </>
      ) : (
        <SharedSectionShell
          recipe="historyDetail"
          listState={(
            <p className={appTokens.historyBrowserEmptyState}>
              Offline snapshot unavailable. Open History while online once to cache this screen.
            </p>
          )}
        />
      )}
    </div>
  );
}
