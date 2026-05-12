import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { ContentRail } from "@/components/layout/ContentRail";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { ExerciseBrowserClient } from "@/app/history/exercises/ExerciseBrowserClient";
import { getExercisesWithStatsForExplicitUser } from "@/lib/exercises-browser";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
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

export default async function DevHistoryExercisesLivePage({
  searchParams,
}: {
  searchParams?: {
    userId?: string;
    view?: string;
    filters?: string;
    capture?: string;
    accessToken?: string;
  };
}) {
  if (process.env.NODE_ENV === "production" && !isLocalRequest()) {
    return <ErrorState message="Not found." />;
  }

  const userId = searchParams?.userId?.trim() ?? "";
  const initialViewMode = searchParams?.view === "detailed" ? "detailed" : "compact";
  const initialFiltersOpen = searchParams?.filters === "open";
  const captureMode = searchParams?.capture === "1";
  const accessToken = searchParams?.accessToken?.trim() ?? "";

  if (!userId) {
    return <ErrorState message="Missing user id." />;
  }

  const dataClient = accessToken ? buildAccessTokenClient(accessToken) : supabaseAdmin();
  const rows = await getExercisesWithStatsForExplicitUser(userId, dataClient);

  if (captureMode) {
    return (
      <MainTabScreen topNavMode="none" ambientPreset="history">
        <ContentRail className="pt-5">
          <ExerciseBrowserClient
            rows={rows}
            inlineHeaderControls
            initialViewMode={initialViewMode}
            initialFiltersOpen={initialFiltersOpen}
            showBottomActions={false}
          />
        </ContentRail>
      </MainTabScreen>
    );
  }

  return (
    <HistoryRouteScaffold
      mode="overview"
      title="Exercises"
      activeTab="exercises"
      headerChrome="controlsOnly"
      floatingHeaderSlot={<div id="history-exercises-floating-header" />}
    >
      <ExerciseBrowserClient
        rows={rows}
        initialViewMode={initialViewMode}
        initialFiltersOpen={initialFiltersOpen}
      />
    </HistoryRouteScaffold>
  );
}
