"use client";

import { useState } from "react";
import { HistorySessionCard } from "@/components/history/HistorySessionCard";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { appTokens } from "@/components/ui/app/tokens";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import type { SessionSummary } from "./session-summary";

export function HistorySessionsClient({
  sessions,
  selectedSessionId,
  initialViewMode = "compact",
}: {
  sessions: SessionSummary[];
  selectedSessionId?: string;
  initialViewMode?: "compact" | "detailed";
}) {
  const [viewMode, setViewMode] = useState<"compact" | "detailed">(initialViewMode);
  const nextViewModeLabel = viewMode === "compact" ? "Detailed" : "Compact";

  return (
    <div className={appTokens.historyBrowserStack}>
      {sessions.length > 0 ? (
        <ul className={appTokens.historyBrowserList}>
          {sessions.map((session, index) => (
            <li key={session.id}>
              <HistorySessionCard
                session={session}
                previousSession={sessions[index + 1] ?? null}
                selected={session.id === selectedSessionId}
                viewMode={viewMode}
                href={`/history/${session.id}?returnTab=sessions`}
              />
            </li>
          ))}
        </ul>
      ) : (
        <SharedSectionShell recipe="historyDetail" listState={<p className={appTokens.historyBrowserEmptyState}>No completed sessions yet.</p>} />
      )}
      <PublishBottomActions>
        <BottomActionSplit
          secondary={(
            <BottomDockButton
              type="button"
              intent="info"
              data-history-density-toggle="sessions"
              onClick={() => setViewMode((current) => (current === "compact" ? "detailed" : "compact"))}
            >
              {nextViewModeLabel}
            </BottomDockButton>
          )}
          primary={(
            <BottomDockLink href="/history/exercises" intent="positive">
              Exercises
            </BottomDockLink>
          )}
        />
      </PublishBottomActions>
    </div>
  );
}
