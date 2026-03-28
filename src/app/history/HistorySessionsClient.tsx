"use client";

import Link from "next/link";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { HistoryTabs } from "@/components/history/HistoryShared";
import { cn } from "@/lib/cn";
import { formatDateShort, formatDurationShort } from "@/lib/formatting";
import type { SessionSummary } from "./session-summary";

function formatSummaryLine(session: SessionSummary) {
  const duration = session.durationSec ? formatDurationShort(session.durationSec) : "0m";
  return `${duration} • ${session.exerciseCount} ${session.exerciseCount === 1 ? "exercise" : "exercises"} • ${session.setCount} ${session.setCount === 1 ? "set" : "sets"}`;
}

function formatSubtitle(session: SessionSummary) {
  const dateLabel = formatDateShort(session.startedAt);
  return session.dayTitle ? `${session.dayTitle} • ${dateLabel}` : dateLabel;
}

function HistorySessionCard({
  session,
  selected,
}: {
  session: SessionSummary;
  selected: boolean;
}) {
  return (
    <Link
      href={`/history/${session.id}?returnTab=sessions`}
      aria-current={selected ? "page" : undefined}
      className={cn(
        "block rounded-[1.25rem] transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]",
        "active:scale-[0.995]",
      )}
    >
      <AppPanel
        className={cn(
          "space-y-1.5 p-3.5 transition-colors",
          "hover:border-border/85 hover:bg-[rgb(var(--surface-rgb)/0.48)]",
          selected
            ? "border-[rgb(var(--accent-rgb)/0.55)] bg-[rgb(var(--accent-rgb)/0.14)]"
            : undefined,
        )}
      >
        <p className="line-clamp-1 text-base font-semibold text-slate-50">{session.routineTitle || "Unknown routine"}</p>
        <p className="text-xs text-slate-300">{formatSubtitle(session)}</p>
        <p className="text-xs text-[rgb(var(--text)/0.82)]">{formatSummaryLine(session)}</p>
        <p className="line-clamp-1 text-xs text-[rgb(var(--text)/0.7)]">
          Top set: {session.topSet ? `${session.topSet.exerciseName} • ${session.topSet.display}` : "No set data"}
        </p>
      </AppPanel>
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
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <AppPanel className="p-3">
        <HistoryTabs value="sessions" sessionsHref="/history?tab=sessions" exercisesHref="/history/exercises" />
      </AppPanel>

      {sessions.length > 0 ? (
        <ul className="space-y-2 pb-8">
          {sessions.map((session) => (
            <li key={session.id}>
              <HistorySessionCard session={session} selected={session.id === selectedSessionId} />
            </li>
          ))}
        </ul>
      ) : (
        <AppPanel className="rounded-[1.5rem] border-dashed p-5 text-sm text-muted">No completed sessions yet.</AppPanel>
      )}
    </div>
  );
}
