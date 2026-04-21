"use client";

import Link from "next/link";
import { useState } from "react";
import { SessionSummaryCard } from "@/components/SessionSummaryCard";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { HistoryTitleControlShell } from "@/components/history/HistoryShared";
import { MetricStrip, type MetricDatum } from "@/components/ui/MetricItem";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { WorkoutCardChipRow } from "@/components/workout/WorkoutCardChipRow";
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
      className="block rounded-[1.25rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
    >
      <SessionSummaryCard
        title={session.routineTitle || "Unknown routine"}
        subtitle={formatSubtitle(session)}
        summary={viewModel.outcome}
        detail={viewMode === "detailed" ? (viewModel.progress ?? formatSummaryLine(session)) : undefined}
        badgeText={session.prCounts.total > 0 ? `${session.prCounts.total} PR` : undefined}
        tone={viewModel.tone}
        density={viewMode}
        className={selected ? "ring-1 ring-[rgb(var(--accent)/0.2)]" : undefined}
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
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <HistoryTitleControlShell
        label="Session list"
        caption={`${sessions.length} shown`}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />
      {sessions.length > 0 ? (
        <ul className="space-y-1.5">
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
        <SharedSectionShell recipe="historyDetail" listState={<p className="text-sm text-muted">No completed sessions yet.</p>} />
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
