import { HistoryLoadErrorState } from "@/components/history/HistoryLoadErrorState";
import { isNotFoundError, isRedirectError } from "@/lib/next-navigation-errors";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { LoadingDiagnosticsClientBridge } from "@/components/shared/LoadingDiagnosticsClientBridge";
import { getExerciseBrowserScopePayloadForUser } from "@/lib/exercises-browser";
import { getHistoryPreviewExerciseRows } from "@/lib/history-preview-fixtures";
import { isHistoryPreviewActiveForRequest } from "@/lib/history-preview.server";
import { LoadingDiagnosticsCollector } from "@/lib/loading-diagnostics";
import { ExerciseBrowserClient } from "./ExerciseBrowserClient";

export const dynamic = "force-dynamic";

export default async function HistoryExercisesPage() {
  const diagnostics = new LoadingDiagnosticsCollector("/history/exercises");

  try {
    const browserPayload = (await isHistoryPreviewActiveForRequest())
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
        activeTab="exercises"
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
        activeTab="exercises"
      >
        <LoadingDiagnosticsClientBridge entries={diagnostics.snapshot()} />
        <HistoryLoadErrorState title="Could not load exercises" />
      </HistoryRouteScaffold>
    );
  }
}
