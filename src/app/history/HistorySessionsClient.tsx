"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
}: {
  session: HistorySessionItem;
  mode: ViewMode;
}) {
  const primaryMeta = `${formatDuration(session.durationSeconds)} • ${formatDate(session.performedAt)}`;
  const secondaryMeta = mode === "list" ? formatTimeRange(session.performedAt, session.durationSeconds) : null;

  return (
    <li
      className={`${listShellClasses.card} relative overflow-hidden border-[rgb(var(--glass-tint-rgb)/0.14)] bg-[rgb(var(--glass-tint-rgb)/0.52)] ${mode === "compact" ? "p-2.5" : "p-0"} shadow-[0_8px_22px_-18px_rgba(0,0,0,0.8)]`}
    >
      <Link
        href={`/history/${session.id}`}
        aria-label={`View session details for ${session.name || "session"}`}
        className={`relative z-10 flex gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)] ${mode === "compact" ? "items-center px-2.5 py-2" : "items-start p-3.5"}`}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <p className={`truncate font-semibold text-slate-100 ${mode === "compact" ? "text-[13px]" : "text-sm"}`}>{session.name || "Session"}</p>
          {mode === "list" ? <p className="truncate text-xs font-normal text-slate-300">{session.dayLabel || "Custom session"}</p> : null}
          <p className={`truncate ${mode === "compact" ? "text-[11px]" : "text-xs"} text-slate-400`}>{primaryMeta}</p>
          {secondaryMeta ? <p className="truncate text-[11px] text-slate-500">{secondaryMeta}</p> : null}
        </div>

        {mode === "list" ? <span className="shrink-0 rounded-md border border-white/10 bg-black/15 px-2.5 py-1.5 text-xs font-semibold text-slate-200">View</span> : null}
      </Link>
    </li>
  );
}

export function HistorySessionsClient({ sessions }: HistorySessionsClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [showBottomFade, setShowBottomFade] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      if (saved === "list" || saved === "compact") {
        setViewMode(saved);
      }
    } catch {
      // Ignore storage read failures.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
    } catch {
      // Ignore storage write failures.
    }
  }, [viewMode]);

  const updateFadeState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowBottomFade(remaining > 8);
  }, []);

  const onScroll = useCallback(() => {
    if (rafRef.current !== null) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      updateFadeState();
    });
  }, [updateFadeState]);

  useEffect(() => {
    updateFadeState();
    const handleResize = () => updateFadeState();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [updateFadeState, sessions.length, viewMode]);

  const listClassName = useMemo(
    () => `${listShellClasses.list} ${viewMode === "compact" ? "space-y-2" : "space-y-3"}`,
    [viewMode],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Log view</p>
        <div className="inline-flex rounded-lg border border-[rgb(var(--glass-tint-rgb)/0.16)] bg-[rgb(var(--glass-tint-rgb)/0.34)] p-1">
          {(["list", "compact"] as const).map((option) => {
            const active = viewMode === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setViewMode(option)}
                className={`min-h-8 rounded-md px-2.5 text-[11px] font-semibold transition ${
                  active
                    ? "bg-[rgb(var(--glass-tint-rgb)/0.86)] text-slate-100"
                    : "text-slate-300 hover:bg-white/5 hover:text-white"
                }`}
                aria-pressed={active}
              >
                {option === "list" ? "List" : "Compact"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+16px)] pr-1"
          onScroll={onScroll}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <ul className={listClassName}>
            {sessions.map((session) => (
              <HistorySessionRow key={session.id} session={session} mode={viewMode} />
            ))}
          </ul>
        </div>

        {showBottomFade ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-9 rounded-b-xl bg-gradient-to-b from-transparent to-[rgb(var(--surface-rgb)/0.98)]"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </div>
  );
}
