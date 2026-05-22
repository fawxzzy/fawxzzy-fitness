import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";
import { ProgressionHistorySurface } from "@/components/history/ProgressionHistorySurface";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { HistoryRouteErrorShell } from "@/components/history/HistoryShared";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { requireUser } from "@/lib/auth";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import type { ProgressionHistorySearchParams } from "@/lib/progression-history-filters";
import { loadProgressionHistoryPageData } from "@/lib/progression-history-page-loader";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HistoryProgressionPage({
  searchParams,
}: {
  searchParams?: ProgressionHistorySearchParams;
}) {
  const diagnostics = new LoadingDiagnosticsCollector("/history/progression");

  try {
    const user = await requireUser({
      gate: "history.progression.auth.session",
      route: "/history/progression",
      blockingReason: "Waiting for authenticated session before loading progression history.",
      timeoutMs: 5000,
      collector: diagnostics,
    });
    const data = await diagnostics.measure("history.progression.fetch", () => loadProgressionHistoryPageData({
      supabase: supabaseServer(),
      userId: user.id,
      searchParams,
    }), {
      blockingReason: "Waiting for progression history page data.",
      metadata: {
        userId: user.id,
      },
      timeoutMs: 7000,
    });

    return (
      <HistoryRouteScaffold
        mode="overview"
        title=""
        activeTab="progression"
        headerChrome="controlsOnly"
      >
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <ProgressionHistorySurface {...data} />
      </HistoryRouteScaffold>
    );
  } catch (error) {
    if (isRedirectError(error) || isNotFoundError(error)) {
      throw error;
    }

    console.error("[history/progression] failed to load or render progression history", error);

    return (
      <HistoryRouteScaffold
        mode="overview"
        title=""
        activeTab="progression"
        headerChrome="controlsOnly"
      >
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <HistoryRouteErrorShell
          title="Unable to load progression history right now."
          caption="Please try again in a moment."
        />
      </HistoryRouteScaffold>
    );
  }
}
