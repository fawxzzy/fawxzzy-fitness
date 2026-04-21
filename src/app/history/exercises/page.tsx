import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";
import { cookies } from "next/headers";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { HistoryPageHeader, HistoryTabs } from "@/components/history/HistoryShared";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { getExercisesWithStatsForUser } from "@/lib/exercises-browser";
import { ExerciseBrowserClient } from "./ExerciseBrowserClient";

export const dynamic = "force-dynamic";
const HISTORY_EXERCISE_VIEW_MODE_COOKIE = "history-exercises-view-mode";

function resolveInitialViewMode() {
  const cookieValue = cookies().get(HISTORY_EXERCISE_VIEW_MODE_COOKIE)?.value;
  return cookieValue === "detailed" ? "detailed" : "compact";
}

function ExercisesBrowserError() {
  return (
    <SharedSectionShell
      recipe="historyDetail"
      label={<span className="text-sm font-medium text-text">Unable to load exercise history right now.</span>}
      context={<span className="text-xs text-muted">Please try again in a moment.</span>}
    />
  );
}

export default async function HistoryExercisesPage() {
  const initialViewMode = resolveInitialViewMode();

  try {
    const rows = await getExercisesWithStatsForUser();

    return (
      <MainTabScreen topNavMode="none" ambientPreset="history">
        <ScrollScreenWithBottomActions
          topChrome={<AppNav mode="topChrome" />}
          floatingHeader={(
            <ContentRail className="py-1">
              <HistoryPageHeader title="History" subtitle={`${rows.length} tracked exercises`}>
                <div className="space-y-2">
                  <HistoryTabs value="exercises" sessionsHref="/history" exercisesHref="/history/exercises" />
                  <div id="history-exercises-floating-header" />
                </div>
              </HistoryPageHeader>
            </ContentRail>
          )}
        >
          <ContentRail className="flex min-h-0 flex-1 flex-col gap-3 py-1">
            <ExerciseBrowserClient rows={rows} initialViewMode={initialViewMode} />
          </ContentRail>
        </ScrollScreenWithBottomActions>
      </MainTabScreen>
    );
  } catch (error) {
    if (isRedirectError(error) || isNotFoundError(error)) {
      throw error;
    }

    console.error("[history/exercises] failed to load exercise stats", error);

    return (
      <MainTabScreen topNavMode="none" ambientPreset="history">
        <ScrollScreenWithBottomActions
          topChrome={<AppNav mode="topChrome" />}
          floatingHeader={(
            <ContentRail className="py-1">
              <HistoryPageHeader title="History" subtitle="Exercise history unavailable">
                <div className="space-y-2">
                  <HistoryTabs value="exercises" sessionsHref="/history" exercisesHref="/history/exercises" />
                  <div id="history-exercises-floating-header" />
                </div>
              </HistoryPageHeader>
            </ContentRail>
          )}
        >
          <ContentRail className="py-1">
            <ExercisesBrowserError />
          </ContentRail>
        </ScrollScreenWithBottomActions>
      </MainTabScreen>
    );
  }
}
