"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { ViewModeSelect } from "@/components/ui/app/ViewModeSelect";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

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

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(date);
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
}: {
  session: HistorySessionItem;
  mode: ViewMode;
}) {
  const routineTitle = session.name || "Session";
  const dayTitle = session.dayLabel || "Custom session";
  const timeRange = formatTimeRange(session.performedAt, session.durationSeconds);
  const timeOnly = formatTime(session.performedAt);

  return (
    <Link
      href={`/history/${session.id}?returnTab=sessions&view=${mode}`}
      aria-label={`View session details for ${session.name || "session"}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
    >
      <AppPanel clip className="p-3 transition-colors hover:border-border/70 active:scale-[0.99]">
        {mode === "list" ? (
          <div className="text-left">
            <p className="whitespace-normal break-words text-sm font-semibold text-slate-100">
              {routineTitle} | {formatDuration(session.durationSeconds)}
            </p>
            <p className="mt-1 whitespace-normal break-words text-sm text-slate-300">{dayTitle}</p>
            <p className="mt-1 whitespace-normal break-words text-sm text-slate-400">
              {formatDate(session.performedAt)} | {timeRange ?? timeOnly}
            </p>
          </div>
        ) : (
          <div className="text-left">
            <p className="truncate text-sm font-semibold text-slate-100">
              {routineTitle} | {formatDate(session.performedAt)}
            </p>
            <p className="mt-1 truncate text-sm text-slate-300">{dayTitle}</p>
          </div>
        )}
      </AppPanel>
    </Link>
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
      <AppPanel className="space-y-2 p-2">
        <SegmentedControl
          options={[
            { label: "Sessions", value: "sessions", href: `/history?tab=sessions&view=${viewMode}` },
            { label: "Exercises", value: "exercises", href: "/history/exercises" },
          ]}
          value="sessions"
          ariaLabel="History tabs"
        />

        <ViewModeSelect
          label="View Mode"
          value={viewMode}
          options={[
            { label: "List", value: "list" },
            { label: "Compact", value: "compact" },
          ]}
          onChange={(next) => {
            if (next === "list" || next === "compact") setViewMode(next);
          }}
          withPanel={false}
        />
      </AppPanel>

      {sessions.length > 0 ? (
        <div className="relative">
          <ul className={viewMode === "compact" ? "space-y-2 pb-8" : "space-y-3 pb-8"}>
            {sessions.map((session) => (
              <li key={session.id} className="relative">
                <HistorySessionRow session={session} mode={viewMode} />
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-6 text-center">
          <div>
            <p className="text-sm font-medium text-slate-200">No completed sessions yet.</p>
            <p className="mt-1 text-xs text-slate-400">Finish a workout and your performance timeline will appear here.</p>
          </div>
        </div>
      )}
    </div>
  );
}
