import type { Metadata } from "next";
import { HistorySessionsClient } from "@/app/history/HistorySessionsClient";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";
import { getHistoryPreviewSessionsPageData } from "@/lib/history-preview-fixtures";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

/**
 * Dev-only History overview on the static preview data (`history-preview-fixtures`): the real
 * `HistorySessionsClient` (calendar, streak, heatmap, summaries, session cards) without a Supabase client or a
 * signed-in user, because `/history` itself needs one even in the preview lane. `?view=detailed` shows the
 * detailed density. Availability is the shared dev-route guard (middleware answers 404 for `/dev/*` on
 * production hosts before this page runs; the first statement repeats it). See `src/lib/dev-route-guard.ts`.
 */
export default function DevHistoryOverviewPage({ searchParams }: { searchParams?: { view?: string } }) {
  assertDevPageAvailable();

  const data = getHistoryPreviewSessionsPageData();
  return (
    <HistoryRouteScaffold mode="overview" title="" activeTab="sessions" headerChrome="controlsOnly">
      <HistorySessionsClient
        sessions={data.sessionItems}
        filterOptions={data.filterOptions}
        currentRoutineSessions={data.currentRoutineSessionItems}
        currentCycleSessions={data.currentCycleSessionItems}
        plannedSkippedDayKeys={data.plannedSkippedDayKeys}
        currentRoutinePlannedSkippedDayKeys={data.currentRoutinePlannedSkippedDayKeys}
        currentCyclePlannedSkippedDayKeys={data.currentCyclePlannedSkippedDayKeys}
        activeRoutineTitle={data.activeRoutineTitle}
        scopeSummary={data.scopeSummary}
        currentRoutineScopeSummary={data.currentRoutineScopeSummary}
        currentCycleScopeSummary={data.currentCycleScopeSummary}
        weeklyProgress={data.weeklyProgress}
        currentRoutineWeeklyProgress={data.currentRoutineWeeklyProgress}
        currentCycleWeeklyProgress={data.currentCycleWeeklyProgress}
        weeklyProgressByWeek={data.weeklyProgressByWeek}
        currentRoutineWeeklyProgressByWeek={data.currentRoutineWeeklyProgressByWeek}
        currentCycleWeeklyProgressByWeek={data.currentCycleWeeklyProgressByWeek}
        selectedSessionId={data.selectedSessionId}
        initialViewMode={searchParams?.view === "detailed" ? "detailed" : "compact"}
      />
    </HistoryRouteScaffold>
  );
}
