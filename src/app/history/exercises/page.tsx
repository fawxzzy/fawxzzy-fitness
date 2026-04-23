import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";
import { cookies } from "next/headers";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { appTokens } from "@/components/ui/app/tokens";
import { getExercisesWithStatsForUser } from "@/lib/exercises-browser";
import { getHistoryPreviewExerciseRows } from "@/lib/history-preview-fixtures";
import { isHistoryPreviewActiveForRequest } from "@/lib/history-preview.server";
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
      label={<span className={appTokens.historyTitleControlLabel}>Unable to load exercise history right now.</span>}
      context={<span className={appTokens.historyTitleControlCaption}>Please try again in a moment.</span>}
    />
  );
}

export default async function HistoryExercisesPage() {
  const initialViewMode = resolveInitialViewMode();

  try {
    const rows = isHistoryPreviewActiveForRequest()
      ? getHistoryPreviewExerciseRows()
      : await getExercisesWithStatsForUser();

    return (
      <HistoryRouteScaffold
        mode="overview"
        title="Exercises"
        activeTab="exercises"
        headerChrome="controlsOnly"
        floatingHeaderSlot={<div id="history-exercises-floating-header" />}
      >
        <ExerciseBrowserClient rows={rows} initialViewMode={initialViewMode} />
      </HistoryRouteScaffold>
    );
  } catch (error) {
    if (isRedirectError(error) || isNotFoundError(error)) {
      throw error;
    }

    console.error("[history/exercises] failed to load or render exercise stats", error);

    return (
      <HistoryRouteScaffold
        mode="overview"
        title="Exercises"
        activeTab="exercises"
        headerChrome="controlsOnly"
      >
        <ExercisesBrowserError />
      </HistoryRouteScaffold>
    );
  }
}
