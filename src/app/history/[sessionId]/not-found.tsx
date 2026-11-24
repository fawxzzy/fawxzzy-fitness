import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { HistorySessionMissingState } from "@/components/history/HistorySessionMissingState";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { ScreenHeaderBackButton } from "@/components/ui/app/ScreenHeaderBackButton";

// notFound() in ./page.tsx (session deleted, or hidden QA data) lands here instead of the app-wide "Page not found",
// so a stale "Open session" link from Progression keeps the History header and a way back (review 2026-11-24).
export default function HistorySessionNotFound() {
  return (
    <HistoryRouteScaffold
      mode="detail"
      showTopChrome={false}
      floatingHeader={<ScreenHeader kind="detail" title="Workout" back={<ScreenHeaderBackButton href="/history" historyBehavior="history-first" label="Back to History" />} />}
    >
      <HistorySessionMissingState />
    </HistoryRouteScaffold>
  );
}
