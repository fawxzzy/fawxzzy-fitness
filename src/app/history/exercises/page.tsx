import { isNotFoundError } from "next/dist/client/components/not-found";
import { isRedirectError } from "next/dist/client/components/redirect";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { appTokens } from "@/components/ui/app/tokens";
import { getExerciseBrowserScopePayloadForUser } from "@/lib/exercises-browser";
import { getHistoryPreviewExerciseRows } from "@/lib/history-preview-fixtures";
import { isHistoryPreviewActiveForRequest } from "@/lib/history-preview.server";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { ExerciseBrowserClient } from "./ExerciseBrowserClient";

export const dynamic = "force-dynamic";

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
  const diagnostics = new LoadingDiagnosticsCollector("/history/exercises");

  try {
    const browserPayload = isHistoryPreviewActiveForRequest()
      ? {
          initialRows: getHistoryPreviewExerciseRows(),
          filterOptions: { routines: [] },
          activeRoutineTitle: null,
        }
      : await diagnostics.measure("history.exercises.fetch", () => getExerciseBrowserScopePayloadForUser(), {
          blockingReason: "Waiting for exercise history stats.",
          timeoutMs: 7000,
        });

    return (
      <HistoryRouteScaffold
        mode="overview"
        title="Exercises"
        activeTab="exercises"
        headerChrome="controlsOnly"
        floatingHeaderSlot={<div id="history-exercises-floating-header" />}
      >
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <ExerciseBrowserClient
          initialRows={browserPayload.initialRows}
          filterOptions={browserPayload.filterOptions}
          activeRoutineTitle={browserPayload.activeRoutineTitle}
          initialViewMode="compact"
        />
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
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <ExercisesBrowserError />
      </HistoryRouteScaffold>
    );
  }
}
