"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { HistorySessionCard } from "@/components/history/HistorySessionCard";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { appTokens } from "@/components/ui/app/tokens";
import { readHistorySessionSummary } from "@/lib/history-session-summary-cache";

export default function HistoryDetailLoading() {
  const params = useParams<{ sessionId?: string }>();
  const cachedSummary = useMemo(
    () => readHistorySessionSummary(typeof params?.sessionId === "string" ? params.sessionId : null),
    [params?.sessionId],
  );

  return (
    <HistoryRouteScaffold mode="detail" showTopChrome={false} floatingHeader={<div id="history-log-floating-header" />}>
      <div className="space-y-3 px-1 pt-2">
        {cachedSummary ? (
          <HistorySessionCard
            session={cachedSummary}
            viewMode="detailed"
            detailedHeaderMode="hidden"
            showDetailedDivider={false}
            rightIcon={null}
          />
        ) : (
          <SharedSectionShell
            recipe="historyDetail"
            listState={<p className={appTokens.historyBrowserEmptyState}>Loading session detail...</p>}
          />
        )}
      </div>
    </HistoryRouteScaffold>
  );
}
