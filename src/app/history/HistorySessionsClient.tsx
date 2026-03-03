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
const HISTORY_LOCALE = "en-US";
const HISTORY_TIMEZONE = "America/Toronto";

function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainingSeconds = safe % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${remainingSeconds}s`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(HISTORY_LOCALE, {
    timeZone: HISTORY_TIMEZONE,
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(HISTORY_LOCALE, {
    timeZone: HISTORY_TIMEZONE,
    hour: "numeric",
    hour12: true,
  }).format(date);
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
  const timeOnly = formatTime(session.performedAt);
  const dateOnly = formatDate(session.performedAt);
  const durationLabel = `Duration: ${formatDuration(session.durationSeconds)}`;

  const compactParts = [routineTitle || "Routine", dayTitle || "Day", dateOnly].filter((part) => part.length > 0);
  const detailsPrimaryParts = [dayTitle, durationLabel].filter((part) => part.length > 0);
  const detailsSecondaryParts = [dateOnly, `Started: ${timeOnly}`].filter((part) => part.length > 0);

  return (
    <Link
      href={`/history/${session.id}?returnTab=sessions&view=${mode}`}
      aria-label={`View session details for ${session.name || "session"}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
    >
      <AppPanel clip className="p-3 transition-colors hover:border-border/70 active:scale-[0.99]">
        {mode === "list" ? (
          <div className="text-left">
            <p className="whitespace-normal break-words text-sm font-semibold text-slate-100">{routineTitle}</p>
            <p className="mt-1 whitespace-normal break-words text-sm text-slate-300">{detailsPrimaryParts.join(" | ")}</p>
            <p className="mt-1 whitespace-normal break-words text-sm text-slate-400">{detailsSecondaryParts.join(" | ")}</p>
          </div>
        ) : (
          <div className="flex min-h-[40px] items-center justify-center text-center">
            <p className="w-full truncate text-sm font-semibold text-slate-100">{compactParts.join(" | ")}</p>
          </div>
        )}
      </AppPanel>
    </Link>
  );
}

export function HistorySessionsClient({ sessions, initialViewMode }: HistorySessionsClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    try {
      const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === "list" || saved === "compact") {
        setViewMode(saved);
      }
    } catch {
      // Ignore storage read failures.
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // Ignore storage write failures.
    }
  }, [mounted, viewMode]);

  const effectiveViewMode: ViewMode = mounted ? viewMode : initialViewMode;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <AppPanel className="space-y-1.5 p-2">
        <SegmentedControl
          options={[
            { label: "Sessions", value: "sessions", href: `/history?tab=sessions&view=${effectiveViewMode}` },
            { label: "Exercises", value: "exercises", href: "/history/exercises" },
          ]}
          value="sessions"
          ariaLabel="History tabs"
        />

        <ViewModeSelect
          label="View Mode"
          value={effectiveViewMode}
          options={[
            { label: "Details", value: "list" },
            { label: "Compact", value: "compact" },
          ]}
          onChange={(next) => {
            if (next === "list" || next === "compact") setViewMode(next);
          }}
        />
      </AppPanel>

      {sessions.length > 0 ? (
        <div className="relative">
          <ul className={effectiveViewMode === "compact" ? "space-y-2 pb-8" : "space-y-3 pb-8"}>
            {sessions.map((session) => (
              <li key={session.id} className="relative">
                <HistorySessionRow session={session} mode={effectiveViewMode} />
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
