import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { HistoryPageHeader, HistoryTabs } from "@/components/history/HistoryShared";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
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
    <section className="rounded-[1.5rem] border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.88)] px-5 py-4 shadow-[0_18px_40px_rgb(0_0_0/0.18)] backdrop-blur-[10px]">
      <div className="space-y-2">
        <p className="text-base font-semibold text-[rgb(var(--text)/0.98)]">{title}</p>
        <p className="text-sm leading-6 text-[rgb(var(--text-secondary)/0.92)]">{caption}</p>
      </div>
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
        <MainTabScreen topNavMode="none" ambientPreset="history">
          <ScrollScreenWithBottomActions
            topChrome={<AppNav mode="topChrome" />}
            floatingHeader={(
              <ContentRail>
                <HistoryPageHeader title="History" subtitle={state.fallback.subtitle}>
                  <HistoryTabs value="sessions" sessionsHref="/history" exercisesHref="/history/exercises" />
                </HistoryPageHeader>
              </ContentRail>
            )}
          >
            <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
              <HistoryRouteMessage
                title={state.fallback.errorTitle}
                caption={state.fallback.errorCaption}
              />
            </ContentRail>
          </ScrollScreenWithBottomActions>
        </MainTabScreen>
      );
    }

    return (
      <MainTabScreen topNavMode="none" ambientPreset="history">
        <ScrollScreenWithBottomActions
          topChrome={<AppNav mode="topChrome" />}
          floatingHeader={(
            <ContentRail>
              <HistoryPageHeader title="History" subtitle={state.data.subtitle}>
                <HistoryTabs value="sessions" sessionsHref="/history" exercisesHref="/history/exercises" />
              </HistoryPageHeader>
            </ContentRail>
          )}
        >
          <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
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
          </ContentRail>
        </ScrollScreenWithBottomActions>
      </MainTabScreen>
    );
  } catch (error) {
    if (isRedirectError(error) || isNotFoundError(error)) {
      throw error;
    }

    console.error("[history/sessions] unexpected render failure", error);

    return (
      <MainTabScreen topNavMode="none" ambientPreset="history">
        <ScrollScreenWithBottomActions
          topChrome={<AppNav mode="topChrome" />}
          floatingHeader={(
            <ContentRail>
              <HistoryPageHeader title="History" subtitle="Session history unavailable">
                <HistoryTabs value="sessions" sessionsHref="/history" exercisesHref="/history/exercises" />
              </HistoryPageHeader>
            </ContentRail>
          )}
        >
          <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
            <HistoryRouteMessage
              title="Unable to render session history right now."
              caption="Please try again in a moment."
            />
          </ContentRail>
        </ScrollScreenWithBottomActions>
      </MainTabScreen>
    );
  }
}
