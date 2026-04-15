import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";
import { cookies } from "next/headers";
import { AppNav } from "@/components/AppNav";
import { ContentRail } from "@/components/layout/ContentRail";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { AppPanel } from "@/components/ui/app/AppPanel";
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
    <AppPanel className="space-y-3 p-4">
      <p className="text-sm font-medium text-slate-100">Unable to load exercise history right now.</p>
      <p className="text-xs text-slate-300">Please try again in a moment.</p>
    </AppPanel>
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
          floatingHeader={<ContentRail className="py-1"><div id="history-exercises-floating-header" /></ContentRail>}
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
          floatingHeader={<ContentRail className="py-1"><div id="history-exercises-floating-header" /></ContentRail>}
        >
          <ContentRail className="py-1">
            <ExercisesBrowserError />
          </ContentRail>
        </ScrollScreenWithBottomActions>
      </MainTabScreen>
    );
  }
}
