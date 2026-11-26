import { isNotFoundError, isRedirectError } from "@/lib/next-navigation-errors";
import { ProgressionHistorySurface } from "@/components/history/ProgressionHistorySurface";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { HistoryLoadErrorState } from "@/components/history/HistoryLoadErrorState";
import { HistoryProgressOverview } from "@/components/history/HistoryProgressOverview";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { requireUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { getHistoryPreviewSessionsPageData } from "@/lib/history-preview-fixtures";
import { isHistoryPreviewActiveForRequest } from "@/lib/history-preview.server";
import { type HistorySessionsScopePayload, loadHistorySessionsScopePayloadForUser } from "@/lib/history-sessions-page-loader";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import type { ProgressionHistorySearchParams } from "@/lib/progression-history-filters";
import { loadProgressionHistoryPageData } from "@/lib/progression-history-page-loader";
import { QA_LLEL_VISIBILITY_COOKIE, resolveQaLlelVisibilityOverride } from "@/lib/qa-data-visibility";
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
    // Wave 2 (SIMPLIFY #11): the training summary cards moved here from the Workouts list, so this page also reads
    // the workouts summary (same loader as /history). If that read fails, Progress still renders without them.
    const [data, sessionsData] = await Promise.all([
      diagnostics.measure("history.progression.fetch", async () => loadProgressionHistoryPageData({
        supabase: await supabaseServer(),
        userId: user.id,
        searchParams,
      }), {
        blockingReason: "Waiting for progression history page data.",
        metadata: {
          userId: user.id,
        },
        timeoutMs: 7000,
      }),
      diagnostics.measure<HistorySessionsScopePayload | null>("history.progression.training-summary", async () => {
        try {
          if (await isHistoryPreviewActiveForRequest()) {
            const preview = getHistoryPreviewSessionsPageData();
            return {
              sessionItems: preview.sessionItems,
              plannedSkippedDayKeys: preview.plannedSkippedDayKeys,
              scopeSummary: preview.scopeSummary,
              weeklyProgress: preview.weeklyProgress,
              weeklyProgressByWeek: preview.weeklyProgressByWeek,
              routineTitle: preview.activeRoutineTitle,
            };
          }
          return await loadHistorySessionsScopePayloadForUser({
            supabase: await supabaseServer(),
            userId: user.id,
            showQaLlelDataOverride: resolveQaLlelVisibilityOverride(
              (await cookies()).get(QA_LLEL_VISIBILITY_COOKIE)?.value,
            ),
          });
        } catch (error) {
          if (isRedirectError(error) || isNotFoundError(error)) {
            throw error;
          }
          console.error("[history/progression] training summary failed to load", error);
          return null;
        }
      }, {
        blockingReason: "Waiting for the training summary on Progress.",
        metadata: {
          userId: user.id,
        },
        timeoutMs: 7000,
      }),
    ]);

    return (
      <HistoryRouteScaffold
        mode="overview"
        activeTab="progression"
      >
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <ProgressionHistorySurface
          {...data}
          overview={sessionsData ? (
            <HistoryProgressOverview
              sessions={sessionsData.sessionItems}
              plannedSkippedDayKeys={sessionsData.plannedSkippedDayKeys}
              scopeSummary={sessionsData.scopeSummary}
              weeklyProgress={sessionsData.weeklyProgress}
              activeRoutineTitle={sessionsData.routineTitle}
            />
          ) : null}
        />
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
        <HistoryLoadErrorState title="Could not load your progress" />
      </HistoryRouteScaffold>
    );
  }
}
