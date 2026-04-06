"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
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
  return (
    <Link
      href={`/history/${session.id}?returnTab=sessions`}
      aria-current={selected ? "page" : undefined}
      className="block rounded-[1.25rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
    >
      <StandardExerciseRow
        variant="list"
        state={selected ? "selected" : "default"}
        exercise={{ name: session.routineTitle || "Unknown routine" }}
        summary={formatSubtitle(session)}
        className="shadow-none"
        titleClassName={viewMode === "compact" ? "line-clamp-1" : undefined}
        subtitleClassName="line-clamp-2"
        contentClassName="space-y-0.75"
        rightIcon={<ChevronRightIcon className="h-5 w-5 shrink-0 self-center text-[rgb(var(--text)/0.6)]" />}
      >
        {viewMode === "compact" ? (
          <p className="text-xs text-[rgb(var(--text)/0.8)] [text-wrap:pretty]">{formatSummaryLine(session)}</p>
        ) : (
          <p className="text-xs text-[rgb(var(--text)/0.82)] [text-wrap:pretty]">{formatSummaryLine(session)}</p>
        )}
        {viewMode === "detailed" ? (
          <p className="text-xs text-[rgb(var(--text)/0.7)] [text-wrap:pretty]">
            <span className="font-medium text-[rgb(var(--text)/0.76)]">Latest:</span>{" "}
            <span>{session.topSet ? `${session.topSet.exerciseName} · ${session.topSet.display}` : "No set data"}</span>
          </p>
        ) : null}
      </StandardExerciseRow>
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
  const inverseViewLabel = viewMode === "compact" ? "Detailed" : "Compact";

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
              {inverseViewLabel}
            </BottomDockButton>
          )}
          primary={(
            <BottomDockButton type="button" intent="positive" onClick={() => router.push("/history/exercises")}>
              Exercises
            </BottomDockButton>
          )}
        />
      </PublishBottomActions>
    </div>
  );
}
