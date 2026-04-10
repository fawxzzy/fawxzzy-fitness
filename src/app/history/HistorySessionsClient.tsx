"use client";

import Link from "next/link";
import { useState } from "react";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SessionSummaryCard } from "@/components/SessionSummaryCard";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { formatDateShort, formatDurationShort } from "@/lib/formatting";
import type { SessionSummary } from "./session-summary";

function formatSummaryLine(session: SessionSummary) {
  const duration = session.durationSec ? formatDurationShort(session.durationSec) : "0m";
  return `${duration} · ${session.exerciseCount} ${session.exerciseCount === 1 ? "exercise" : "exercises"} · ${session.setCount} ${session.setCount === 1 ? "set" : "sets"}`;
}

function formatSubtitle(session: SessionSummary) {
  const dateLabel = formatDateShort(session.startedAt);
  return session.dayTitle ? `${session.dayTitle} · ${dateLabel}` : dateLabel;
}

function HistorySessionCard({
  session,
  selected,
  viewMode,
}: {
  session: SessionSummary;
  selected: boolean;
  viewMode: "compact" | "detailed";
}) {
  const tone = session.prCounts.total > 0 ? "pr" : "completed";

  return (
    <Link
      href={`/history/${session.id}?returnTab=sessions`}
      aria-current={selected ? "page" : undefined}
      className="block rounded-[1.25rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
    >
      <SessionSummaryCard
        title={session.routineTitle || "Unknown routine"}
        subtitle={formatSubtitle(session)}
        summary={formatSummaryLine(session)}
        detail={viewMode === "detailed" ? (session.topSet ? `${session.topSet.exerciseName} · ${session.topSet.display}` : "No set data") : undefined}
        badgeText={session.prCounts.total > 0 ? `${session.prCounts.total} PR` : undefined}
        tone={tone}
        className={selected ? "ring-1 ring-[rgb(var(--accent)/0.2)]" : undefined}
      />
    </Link>
  );
}

export function HistorySessionsClient({
  sessions,
  selectedSessionId,
}: {
  sessions: SessionSummary[];
  selectedSessionId?: string;
}) {
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact");
  const nextViewModeLabel = viewMode === "compact" ? "Detailed" : "Compact";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {sessions.length > 0 ? (
        <ul className="space-y-1.5">
          {sessions.map((session) => (
            <li key={session.id}>
              <HistorySessionCard session={session} selected={session.id === selectedSessionId} viewMode={viewMode} />
            </li>
          ))}
        </ul>
      ) : (
        <AppPanel className="rounded-[1.5rem] border-dashed p-5 text-sm text-muted">No completed sessions yet.</AppPanel>
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
