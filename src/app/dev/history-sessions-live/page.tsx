import { createClient } from "@supabase/supabase-js";
import { cookies, headers } from "next/headers";
import { HistorySessionsClient } from "@/app/history/HistorySessionsClient";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { ContentRail } from "@/components/layout/ContentRail";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { loadHistorySessionsPageData } from "@/lib/history-sessions-page-loader";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { QA_LLEL_VISIBILITY_COOKIE, resolveQaLlelVisibilityOverride } from "@/lib/qa-data-visibility";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function isLocalRequest() {
  const host = (headers().get("x-forwarded-host") ?? headers().get("host") ?? "").trim().toLowerCase();
  const hostname = host.split(":")[0] ?? "";
  return hostname === "127.0.0.1" || hostname === "localhost";
}

function buildAccessTokenClient(accessToken: string) {
  return createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="app-page-scroll min-h-[100dvh] px-4 py-6">
      <div className="mx-auto max-w-md rounded-[28px] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.9)] px-4 py-5 text-sm text-[rgb(var(--text)/0.92)]">
        {message}
      </div>
    </main>
  );
}

export default async function DevHistorySessionsLivePage({
  searchParams,
}: {
  searchParams?: {
    userId?: string;
    accessToken?: string;
    view?: string;
    filters?: string;
    q?: string;
    tags?: string;
    capture?: string;
  };
}) {
  if (process.env.NODE_ENV === "production" && !isLocalRequest()) {
    return <ErrorState message="Not found." />;
  }

  const userId = searchParams?.userId?.trim() ?? "";
  const accessToken = searchParams?.accessToken?.trim() ?? "";
  const initialViewMode = searchParams?.view === "detailed" ? "detailed" : "compact";
  const initialFiltersOpen = searchParams?.filters === "open";
  const initialQuery = searchParams?.q?.trim() ?? "";
  const initialSelectedTags = (searchParams?.tags?.trim() ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const captureMode = searchParams?.capture === "1";

  if (!userId) {
    return <ErrorState message="Missing user id." />;
  }

  const dataClient = accessToken ? buildAccessTokenClient(accessToken) : supabaseAdmin();
  const data = await loadHistorySessionsPageData({
    supabase: dataClient,
    userId,
    showQaLlelDataOverride: resolveQaLlelVisibilityOverride(
      cookies().get(QA_LLEL_VISIBILITY_COOKIE)?.value,
    ),
  });

  if (captureMode) {
    return (
      <MainTabScreen topNavMode="none" ambientPreset="history">
        <ContentRail className="pt-5">
          <HistorySessionsClient
            sessions={data.sessionItems}
            currentRoutineSessions={data.currentRoutineSessionItems}
            activeRoutineTitle={data.activeRoutineTitle}
            thirtyDaySummary={data.thirtyDaySummary}
            currentRoutineThirtyDaySummary={data.currentRoutineThirtyDaySummary}
            weeklyProgress={data.weeklyProgress}
            currentRoutineWeeklyProgress={data.currentRoutineWeeklyProgress}
            weeklyProgressByWeek={data.weeklyProgressByWeek}
            currentRoutineWeeklyProgressByWeek={data.currentRoutineWeeklyProgressByWeek}
            initialViewMode={initialViewMode}
            initialFiltersOpen={initialFiltersOpen}
            initialQuery={initialQuery}
            initialSelectedTags={initialSelectedTags}
            showBottomActions={false}
          />
        </ContentRail>
      </MainTabScreen>
    );
  }

  return (
    <HistoryRouteScaffold
      mode="overview"
      title=""
      activeTab="sessions"
      headerChrome="controlsOnly"
    >
      <HistorySessionsClient
        sessions={data.sessionItems}
        currentRoutineSessions={data.currentRoutineSessionItems}
        activeRoutineTitle={data.activeRoutineTitle}
        thirtyDaySummary={data.thirtyDaySummary}
        currentRoutineThirtyDaySummary={data.currentRoutineThirtyDaySummary}
        weeklyProgress={data.weeklyProgress}
        currentRoutineWeeklyProgress={data.currentRoutineWeeklyProgress}
        weeklyProgressByWeek={data.weeklyProgressByWeek}
        currentRoutineWeeklyProgressByWeek={data.currentRoutineWeeklyProgressByWeek}
        initialViewMode={initialViewMode}
        initialFiltersOpen={initialFiltersOpen}
        initialQuery={initialQuery}
        initialSelectedTags={initialSelectedTags}
      />
    </HistoryRouteScaffold>
  );
}
