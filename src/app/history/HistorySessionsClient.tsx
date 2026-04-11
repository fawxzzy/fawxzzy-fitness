"use client";

import Link from "next/link";
import { useState } from "react";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { SessionSummaryCard } from "@/components/SessionSummaryCard";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { MetricStrip, type MetricDatum } from "@/components/ui/MetricItem";
import { formatDateShort, formatDurationShort } from "@/lib/formatting";
import type { SessionSummary } from "./session-summary";

function formatSummaryLine(session: SessionSummary) {
  const duration = session.durationSec ? formatDurationShort(session.durationSec) : "0m";
  return `${duration} | ${session.exerciseCount} ${session.exerciseCount === 1 ? "exercise" : "exercises"} | ${session.setCount} ${session.setCount === 1 ? "set" : "sets"}`;
}

function formatSubtitle(session: SessionSummary) {
  const dateLabel = formatDateShort(session.startedAt);
  return session.dayTitle ? `${session.dayTitle} | ${dateLabel}` : dateLabel;
}

function formatVolume(value: number) {
  return `${Math.round(value).toLocaleString()} load`;
}

function formatCompletionRate(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return `${Math.round(value * 100)}%`;
}

function buildDetailedMetrics(session: SessionSummary): MetricDatum[] {
  const metrics: MetricDatum[] = [];

  if (session.bestLift) {
    metrics.push({
      label: "Best Lift",
      value: `${session.bestLift.exerciseName} | ${session.bestLift.display}`,
    });
  }

  if (session.totalVolume > 0) {
    metrics.push({
      label: "Volume",
      value: formatVolume(session.totalVolume),
    });
  }

  const completionRate = formatCompletionRate(session.completionRate);
  if (completionRate) {
    metrics.push({
      label: "Completion",
      value: completionRate,
      timeframe: `${session.exerciseCount} exercises`,
    });
  }

  if (session.prCounts.total > 0) {
    metrics.push({
      label: "PRs",
      value: `${session.prCounts.total}`,
      timeframe: session.prLabel,
    });
  }

  return metrics;
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
  const detailCopy = viewMode === "detailed"
    ? [
        !session.hasSetData ? "No set data recorded." : null,
        session.hasNote ? "Session note saved." : null,
      ].filter(Boolean).join(" | ") || undefined
    : undefined;

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
        detail={detailCopy}
        badgeText={session.prCounts.total > 0 ? `${session.prCounts.total} PR` : undefined}
        tone={tone}
        className={selected ? "ring-1 ring-[rgb(var(--accent)/0.2)]" : undefined}
      >
        {viewMode === "detailed" ? <MetricStrip items={buildDetailedMetrics(session)} /> : null}
      </SessionSummaryCard>
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
