"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionDock, DockButton } from "@/components/layout/BottomActionDock";
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
          "space-y-1.5 p-3.5 transition-colors",
          "hover:border-border/85 hover:bg-[rgb(var(--surface-rgb)/0.48)]",
          selected
            ? "border-[rgb(var(--accent-rgb)/0.78)] bg-[rgb(var(--accent-rgb)/0.2)] ring-1 ring-[rgb(var(--accent-rgb)/0.38)] shadow-[0_16px_30px_-24px_rgba(16,185,129,0.62)]"
            : undefined,
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-1 text-base font-semibold text-slate-50">{session.routineTitle || "Unknown routine"}</p>
          <span aria-hidden="true" className="text-lg leading-none text-[rgb(var(--text)/0.56)]">&gt;</span>
        </div>
        <p className="text-xs text-slate-300">{formatSubtitle(session)}</p>
        <p className="text-xs text-[rgb(var(--text)/0.82)]">{formatSummaryLine(session)}</p>
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
      <AppPanel className="p-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewMode("compact")}
            aria-pressed={viewMode === "compact"}
            className={cn(
              "inline-flex min-h-9 min-w-[6.2rem] items-center justify-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition",
              viewMode === "compact"
                ? "border-emerald-400/40 bg-emerald-400/14 text-emerald-100"
                : "border-white/12 bg-white/[0.04] text-muted hover:bg-white/[0.06] hover:text-text",
            )}
          >
            Compact
          </button>
          <button
            type="button"
            onClick={() => setViewMode("detailed")}
            aria-pressed={viewMode === "detailed"}
            className={cn(
              "inline-flex min-h-9 min-w-[6.2rem] items-center justify-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition",
              viewMode === "detailed"
                ? "border-emerald-400/40 bg-emerald-400/14 text-emerald-100"
                : "border-white/12 bg-white/[0.04] text-muted hover:bg-white/[0.06] hover:text-text",
            )}
          >
            Detailed
          </button>
        </div>
      </AppPanel>

      {sessions.length > 0 ? (
        <ul className="space-y-2 pb-8">
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
        <BottomActionDock
          left={<div aria-hidden="true" />}
          right={(
            <DockButton type="button" variant="secondary" onClick={() => router.push("/history/exercises")}>
              View Exercises
            </DockButton>
          )}
        />
      </PublishBottomActions>
    </div>
  );
}
