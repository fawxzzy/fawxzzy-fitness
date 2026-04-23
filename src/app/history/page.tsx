import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";
import Link from "next/link";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { appTokens } from "@/components/ui/app/tokens";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { requireUser } from "@/lib/auth";
import {
  getHistoryPreviewSessionsPageData,
} from "@/lib/history-preview-fixtures";
import { isHistoryPreviewActiveForRequest } from "@/lib/history-preview.server";
import {
  loadHistorySessionsPageData,
  resolveHistorySessionsRouteState,
  type HistorySearchParams,
} from "@/lib/history-sessions-page-loader";
import { supabaseServer } from "@/lib/supabase/server";
import { HistorySessionsClient } from "./HistorySessionsClient";

export const dynamic = "force-dynamic";

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

        const user = await requireUser();
        return loadHistorySessionsPageData({
          supabase: supabaseServer(),
          userId: user.id,
          searchParams,
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
          title="Sessions"
          subtitle="0 logged"
          activeTab="sessions"
          headerChrome="titleOnly"
        >
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
        title="Sessions"
        subtitle={`${state.data.sessionItems.length} logged`}
        activeTab="sessions"
        headerChrome="titleOnly"
      >
        <HistorySessionsClient
          sessions={state.data.sessionItems}
          selectedSessionId={state.data.selectedSessionId}
        />

        {state.data.nextCursor ? (
          <div className="flex justify-center">
            <Link
              href={`/history?tab=sessions&cursor=${encodeURIComponent(state.data.nextCursor)}`}
              className={getAppButtonClassName({ variant: "secondary", size: "md" })}
            >
              Load more
            </Link>
          </div>
        ) : null}
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
        title="Sessions"
        subtitle="0 logged"
        activeTab="sessions"
        headerChrome="titleOnly"
      >
        <HistoryRouteMessage
          title="Unable to render session history right now."
          caption="Please try again in a moment."
        />
      </HistoryRouteScaffold>
    );
  }
}
