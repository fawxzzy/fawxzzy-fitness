"use client";

import Link from "next/link";
import { useState } from "react";
import { SessionSummaryCard } from "@/components/SessionSummaryCard";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { HistoryTitleControlShell } from "@/components/history/HistoryShared";
import { appTokens } from "@/components/ui/app/tokens";
import { MetricStrip, type MetricDatum } from "@/components/ui/MetricItem";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { WorkoutCardChipRow } from "@/components/workout/WorkoutCardChipRow";
import { cn } from "@/lib/cn";
import { formatDateShort, formatDurationShort } from "@/lib/formatting";
import type { SessionSummary } from "./session-summary";
import { buildHistorySessionCardViewModel } from "@/lib/workout-card-view-models";

function formatSummaryLine(session: SessionSummary) {
  const duration = session.durationSec ? formatDurationShort(session.durationSec) : "0m";
  return `${duration} | ${session.exerciseCount} ${session.exerciseCount === 1 ? "exercise" : "exercises"} | ${session.setCount} ${session.setCount === 1 ? "set" : "sets"}`;
}

function formatSubtitle(session: SessionSummary) {
  const dateLabel = formatDateShort(session.startedAt);
  return session.dayTitle ? `${session.dayTitle} | ${dateLabel}` : dateLabel;
}

function HistorySessionCard({
  session,
  previousSession,
  selected,
  viewMode,
}: {
  session: SessionSummary;
  previousSession?: SessionSummary | null;
  selected: boolean;
  viewMode: "compact" | "detailed";
}) {
  const viewModel = buildHistorySessionCardViewModel(session, previousSession);

  return (
    <Link
      href={`/history/${session.id}?returnTab=sessions`}
      aria-current={selected ? "page" : undefined}
      className={appTokens.historySessionLink}
    >
      <SessionSummaryCard
        title={session.routineTitle || "Unknown routine"}
        subtitle={formatSubtitle(session)}
        summary={viewModel.outcome}
        detail={viewMode === "detailed" ? (viewModel.progress ?? formatSummaryLine(session)) : undefined}
        badgeText={session.prCounts.total > 0 ? `${session.prCounts.total} PR` : undefined}
        tone={viewModel.tone}
        density={viewMode}
        className={cn(appTokens.historyExerciseCardShell, selected ? appTokens.historySessionSelected : undefined)}
      >
        {viewMode === "detailed" ? (
          <MetricStrip items={viewModel.detailedMetrics as MetricDatum[]} />
        ) : (
          <WorkoutCardChipRow chips={viewModel.compactChips} />
        )}
      </SessionSummaryCard>
    </Link>
  );
}

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
      <HistoryTitleControlShell
        label="Session list"
        caption={`${sessions.length} shown`}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      {sessions.length > 0 ? (
        <ul className={appTokens.historyBrowserList}>
          {sessions.map((session, index) => (
            <li key={session.id}>
              <HistorySessionCard
                session={session}
                previousSession={sessions[index + 1] ?? null}
                selected={session.id === selectedSessionId}
                viewMode={viewMode}
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
