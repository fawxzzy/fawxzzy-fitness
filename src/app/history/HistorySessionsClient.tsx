"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AppRow } from "@/components/ui/app/AppRow";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { listShellClasses } from "@/components/ui/listShellClasses";

type ViewMode = "list" | "compact";

type HistorySessionItem = {
  id: string;
  name: string;
  dayLabel: string;
  durationSeconds: number;
  performedAt: string;
};

type HistorySessionsClientProps = {
  sessions: HistorySessionItem[];
  initialViewMode: ViewMode;
};

const VIEW_MODE_STORAGE_KEY = "history:sessions:view-mode";

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = Math.floor(safe / 60);
  const remainingSeconds = safe % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatTimeRange(value: string, durationSeconds: number) {
  const end = new Date(value);
  if (Number.isNaN(end.getTime()) || durationSeconds <= 0) return null;

  const start = new Date(end.getTime() - (durationSeconds * 1000));
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (typeof formatter.formatRange === "function") {
    return formatter.formatRange(start, end).replace(" – ", " → ");
  }

  return `${formatter.format(start)} → ${formatter.format(end)}`;
}

function HistorySessionRow({
  session,
  mode,
  viewMode,
}: {
  session: HistorySessionItem;
  mode: ViewMode;
  viewMode: ViewMode;
}) {
  const primaryMeta = `${formatDuration(session.durationSeconds)} • ${formatDate(session.performedAt)}`;
  const secondaryMeta = mode === "list" ? formatTimeRange(session.performedAt, session.durationSeconds) : null;

  return (
    <AppPanel className="relative overflow-hidden p-2">
      <AppRow
        density={mode === "compact" ? "compact" : "default"}
        leftTop={
          <span className="block truncate">
            {session.name || "Session"}
          </span>
        }
        leftBottom={
          mode === "list" ? (
            <>
              <span className="truncate">{session.dayLabel || "Custom session"}</span>
              <span className="mx-1.5">•</span>
              <span className="truncate">{primaryMeta}</span>
              {secondaryMeta ? (
                <>
                  <span className="mx-1.5">•</span>
                  <span className="truncate">{secondaryMeta}</span>
                </>
              ) : null}
            </>
          ) : undefined
        }
        rightTop={mode === "list" ? <AppBadge>View</AppBadge> : undefined}
        className="border-white/15"
      />
      <Link
        href={`/history/${session.id}?returnTab=sessions&view=${viewMode}`}
        aria-label={`View session details for ${session.name || "session"}`}
        className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
      >
        <span className="sr-only">Open session</span>
      </Link>
    </AppPanel>
  );
}

export function HistorySessionsClient({ sessions, initialViewMode }: HistorySessionsClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  useEffect(() => {
    try {
      if (initialViewMode === "list" || initialViewMode === "compact") {
        setViewMode(initialViewMode);
        return;
      }

      const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === "list" || saved === "compact") {
        setViewMode(saved);
      }
    } catch {
      // Ignore storage read failures.
    }
  }, [initialViewMode]);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // Ignore storage write failures.
    }
  }, [viewMode]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Log view</p>
        <SegmentedControl
          options={[
            { label: "List", value: "list" },
            { label: "Compact", value: "compact" },
          ]}
          value={viewMode}
          size="sm"
          ariaLabel="History session density"
          className="w-auto"
          onChange={(next) => {
            if (next === "list" || next === "compact") setViewMode(next);
          }}
        />
      </div>

      <div className={`${listShellClasses.viewport} relative min-h-0 flex-1`} style={{ WebkitOverflowScrolling: "touch" }}>
        <ul className={`${listShellClasses.list} ${viewMode === "compact" ? "space-y-2" : "space-y-3"}`}>
          {sessions.map((session) => (
            <li key={session.id} className="relative">
              <HistorySessionRow session={session} mode={viewMode} viewMode={viewMode} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
