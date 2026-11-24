import { isNotFoundError, isRedirectError } from "@/lib/next-navigation-errors";
import { ProgressionHistorySurface } from "@/components/history/ProgressionHistorySurface";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { HistoryLoadErrorState } from "@/components/history/HistoryLoadErrorState";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { requireUser } from "@/lib/auth";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import type { ProgressionHistorySearchParams } from "@/lib/progression-history-filters";
import { loadProgressionHistoryPageData } from "@/lib/progression-history-page-loader";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HistoryProgressionPage(
  props: {
    searchParams?: Promise<ProgressionHistorySearchParams>;
  }
) {
  const searchParams = await props.searchParams;
  const diagnostics = new LoadingDiagnosticsCollector("/history/progression");

  try {
    const user = await requireUser({
      gate: "history.progression.auth.session",
      route: "/history/progression",
      blockingReason: "Waiting for authenticated session before loading progression history.",
      timeoutMs: 5000,
      collector: diagnostics,
    });
    const data = await diagnostics.measure("history.progression.fetch", async () => loadProgressionHistoryPageData({
      supabase: await supabaseServer(),
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
        activeTab="progression"
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
        activeTab="progression"
      >
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <HistoryLoadErrorState title="Could not load progression" />
      </HistoryRouteScaffold>
    );
  }
}
