"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { HistoryTitleControlShell } from "@/components/history/HistoryShared";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
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
  viewMode,
}: {
  session: SessionSummary;
  selected: boolean;
  viewMode: "compact" | "detailed";
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
          "space-y-1 p-3 transition-colors",
          "hover:border-border/85 hover:bg-[rgb(var(--surface-rgb)/0.48)]",
          selected
            ? "border-[rgb(var(--accent-rgb)/0.78)] bg-[rgb(var(--accent-rgb)/0.2)] ring-1 ring-[rgb(var(--accent-rgb)/0.38)] shadow-[0_16px_30px_-24px_rgba(16,185,129,0.62)]"
            : undefined,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          {viewMode === "compact" ? (
            <p className="line-clamp-1 text-sm font-semibold text-slate-50">
              {(session.routineTitle || "Unknown routine")} {"|"} {formatSubtitle(session)}
            </p>
          ) : (
            <p className="line-clamp-1 text-base font-semibold text-slate-50">{session.routineTitle || "Unknown routine"}</p>
          )}
          <ChevronRightIcon className="h-5 w-5 shrink-0 self-center text-[rgb(var(--text)/0.6)]" />
        </div>
        {viewMode === "compact" ? null : <p className="text-xs text-slate-300">{formatSubtitle(session)}</p>}
        {viewMode === "compact" ? null : (
          <p className="text-xs text-[rgb(var(--text)/0.82)]">{formatSummaryLine(session)}</p>
        )}
        {viewMode === "detailed" ? (
          <p className="line-clamp-1 text-xs text-[rgb(var(--text)/0.7)]">
            Top set • {session.topSet ? `${session.topSet.exerciseName} • ${session.topSet.display}` : "No set data"}
          </p>
        ) : null}
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
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("compact");
  const router = useRouter();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <HistoryTitleControlShell label="Sessions" viewMode={viewMode} onViewModeChange={setViewMode} />

      {sessions.length > 0 ? (
        <ul className="space-y-1.5 pb-24">
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
        <BottomActionSingle>
          <BottomDockButton type="button" variant="secondary" onClick={() => router.push("/history/exercises")}>
            View Exercises
          </BottomDockButton>
        </BottomActionSingle>
      </PublishBottomActions>
    </div>
  );
}
