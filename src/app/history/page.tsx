import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";
import { cookies } from "next/headers";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { appTokens } from "@/components/ui/app/tokens";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { requireUser } from "@/lib/auth";
import {
  getHistoryPreviewSessionsPageData,
} from "@/lib/history-preview-fixtures";
import { isHistoryPreviewActiveForRequest } from "@/lib/history-preview.server";
import {
  type HistorySessionsPageData,
  loadHistorySessionsPageData,
  resolveHistorySessionsRouteState,
  type HistorySearchParams,
} from "@/lib/history-sessions-page-loader";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { QA_LLEL_VISIBILITY_COOKIE, resolveQaLlelVisibilityOverride } from "@/lib/qa-data-visibility";
import { supabaseServer } from "@/lib/supabase/server";
import { HistorySessionsClient } from "./HistorySessionsClient";

export const dynamic = "force-dynamic";

function getSingleSearchParam(value: string | string[] | null | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" ? value : undefined;
}

function HistoryRouteMessage({
  title,
  caption,
}: {
  title: string;
  caption: string;
}) {
  return (
    <section className={appTokens.historyRouteMessage}>
      <p className={appTokens.historyRouteMessageTitle}>{title}</p>
      <p className={appTokens.historyRouteMessageCaption}>{caption}</p>
    </section>
  );
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: HistorySearchParams;
}) {
  const diagnostics = new LoadingDiagnosticsCollector("/history");
  const viewParam = getSingleSearchParam(searchParams?.view);
  const initialViewMode = viewParam === "detailed" ? "detailed" : "compact";
  const initialFiltersOpen = getSingleSearchParam(searchParams?.filters) === "open";
  const initialQuery = getSingleSearchParam(searchParams?.q) ?? "";
  const initialSelectedTags = (getSingleSearchParam(searchParams?.tags) ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  try {
    const state = await resolveHistorySessionsRouteState({
      fallback: {
        subtitle: "Session history unavailable",
        errorTitle: "Unable to load session history right now.",
        errorCaption: "Please try again in a moment.",
      },
      load: async () => {
        if (isHistoryPreviewActiveForRequest()) {
          return getHistoryPreviewSessionsPageData({
            selected: searchParams?.selected,
          });
        }

        const user = await requireUser({
          gate: "history.auth.session",
          route: "/history",
          blockingReason: "Waiting for authenticated session before loading history.",
          timeoutMs: 5000,
          collector: diagnostics,
        });
        return diagnostics.measure<HistorySessionsPageData>("history.sessions.fetch", () => loadHistorySessionsPageData({
          supabase: supabaseServer(),
          userId: user.id,
          searchParams,
          showQaLlelDataOverride: resolveQaLlelVisibilityOverride(
            cookies().get(QA_LLEL_VISIBILITY_COOKIE)?.value,
          ),
        }), {
          blockingReason: "Waiting for history sessions page data.",
          metadata: {
            userId: user.id,
          },
          timeoutMs: 7000,
        });
      },
      shouldPassthroughError: (error) => isRedirectError(error) || isNotFoundError(error),
      onError: (error) => {
        console.error("[history/sessions] failed to load", error);
      },
    });

    if (state.kind === "fallback") {
      return (
        <HistoryRouteScaffold
          mode="overview"
          title=""
          activeTab="sessions"
          headerChrome="controlsOnly"
        >
          <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
          <HistoryRouteMessage
            title={state.fallback.errorTitle}
            caption={state.fallback.errorCaption}
          />
        </HistoryRouteScaffold>
      );
    }

    return (
      <HistoryRouteScaffold
        mode="overview"
        title=""
        activeTab="sessions"
        headerChrome="controlsOnly"
      >
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <HistorySessionsClient
          sessions={state.data.sessionItems}
          weeklyProgress={state.data.weeklyProgress}
          weeklyProgressByWeek={state.data.weeklyProgressByWeek}
          selectedSessionId={state.data.selectedSessionId}
          initialViewMode={initialViewMode}
          initialFiltersOpen={initialFiltersOpen}
          initialQuery={initialQuery}
          initialSelectedTags={initialSelectedTags}
        />
      </HistoryRouteScaffold>
    );
  } catch (error) {
    if (isRedirectError(error) || isNotFoundError(error)) {
      throw error;
    }

    console.error("[history/sessions] unexpected render failure", error);

    return (
      <HistoryRouteScaffold
        mode="overview"
        title=""
        activeTab="sessions"
        headerChrome="controlsOnly"
      >
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <HistoryRouteMessage
          title="Unable to render session history right now."
          caption="Please try again in a moment."
        />
      </HistoryRouteScaffold>
    );
  }
}
