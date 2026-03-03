"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deleteCompletedSessionAction } from "@/app/actions/history";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { ViewModeSelect } from "@/components/ui/app/ViewModeSelect";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatCount, formatDateShort, formatDurationShort } from "@/lib/formatting";
import type { SessionSummary } from "./session-summary";

type ViewMode = "list" | "compact";

type HistorySessionsClientProps = {
  sessions: SessionSummary[];
  initialViewMode: ViewMode;
};

const VIEW_MODE_STORAGE_KEY = "history:sessions:view-mode";

function performanceParts(session: SessionSummary) {
  const parts = [
    session.durationSec ? formatDurationShort(session.durationSec) : null,
    formatCount(session.exerciseCount, "exercise"),
    formatCount(session.setCount, "set"),
    session.prLabel || null,
  ].filter((part): part is string => Boolean(part));

  return parts;
}


function isWeekdayTitle(value?: string) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(normalized);
}
function SessionCardMenu({ sessionId, mode, routineTitle, startedAt, durationSec }: {
  sessionId: string;
  mode: ViewMode;
  routineTitle: string;
  startedAt: string;
  durationSec?: number;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPosition({ top: rect.bottom + 6, left: rect.right - 176 });
    };

    updatePosition();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target)) {
        const menu = document.getElementById(`history-session-menu-${sessionId}`);
        if (!menu?.contains(target)) {
          setOpen(false);
        }
      }
    };

    const handleViewportChange = () => {
      updatePosition();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, sessionId]);

  return (
    <div className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-white/15 bg-black/20 text-sm text-slate-200 transition-colors hover:bg-black/35"
      >
        ⋯
      </button>

      {open && menuPosition ? createPortal((
        <div
          id={`history-session-menu-${sessionId}`}
          className="fixed z-[80] w-44 rounded-lg border border-white/15 bg-[rgb(var(--surface-rgb)/0.98)] p-1 shadow-xl"
          style={{ top: `${menuPosition.top}px`, left: `${Math.max(8, menuPosition.left)}px` }}
        >
          <Link
            href={`/history/${sessionId}?returnTab=sessions&view=${mode}&edit=1`}
            className="block rounded-md px-3 py-2 text-sm text-slate-100 hover:bg-white/10"
          >
            Edit
          </Link>
          <button type="button" disabled className="block w-full cursor-not-allowed rounded-md px-3 py-2 text-left text-sm text-slate-500">Perform Again (Coming soon)</button>
          <button type="button" disabled className="block w-full cursor-not-allowed rounded-md px-3 py-2 text-left text-sm text-slate-500">Save as Template (Coming soon)</button>
          <div className="px-1 py-1">
            <ConfirmedServerFormButton
              action={deleteCompletedSessionAction}
              hiddenFields={{ sessionId }}
              triggerLabel="Delete"
              triggerAriaLabel="Delete session"
              triggerClassName={getAppButtonClassName({ variant: "destructive", size: "sm", className: "w-full justify-center" })}
              modalTitle="Delete log?"
              modalDescription="This will permanently delete this workout session and all logged sets."
              confirmLabel="Delete"
              contextLines={[routineTitle, `${formatDateShort(startedAt)}${durationSec ? ` • ${formatDurationShort(durationSec)}` : ""}`]}
            />
          </div>
        </div>
      ), document.body) : null}
    </div>
  );
}

function HistorySessionRow({
  session,
  mode,
}: {
  session: SessionSummary;
  mode: ViewMode;
}) {
  const routineTitle = session.routineTitle || "Unknown routine";
  const dateLabel = formatDateShort(session.startedAt);
  const secondaryLine = session.dayTitle && !isWeekdayTitle(session.dayTitle) ? `${session.dayTitle} · ${dateLabel}` : dateLabel;
  const performanceRow = performanceParts(session).join(" • ");

  return (
    <AppPanel clip className={`${mode === "compact" ? "p-2" : "p-3"} transition-colors hover:border-border/70 ${session.prCounts.total > 0 ? "border-l-2 border-l-[rgb(var(--button-primary-border)/0.9)]" : ""}`}>
      <div className={`relative flex ${mode === "compact" ? "min-h-[64px] gap-0.5" : "min-h-[74px] gap-1"} flex-col pr-12`}>
        <Link
          href={`/history/${session.id}?returnTab=sessions&view=${mode}`}
          aria-label={`View session details for ${routineTitle}`}
          className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
        />

        <p className="line-clamp-1 text-sm font-semibold text-slate-100">{routineTitle}</p>
        <p className="line-clamp-1 text-xs text-slate-300">{secondaryLine}</p>
        <p className={`line-clamp-1 ${mode === "compact" ? "text-[11px]" : "text-xs"} text-slate-400`}>{performanceRow}</p>
        {mode === "list" && session.topSet ? (
          <p className="line-clamp-1 text-xs text-slate-400">Top Set: {session.topSet.exerciseName} — {session.topSet.display}</p>
        ) : null}

        <div className="absolute right-0 top-0">
          <SessionCardMenu
            sessionId={session.id}
            mode={mode}
            routineTitle={routineTitle}
            startedAt={session.startedAt}
            durationSec={session.durationSec}
          />
        </div>
      </div>
    </AppPanel>
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
          <ul className={effectiveViewMode === "compact" ? "space-y-1.5 pb-8" : "space-y-3 pb-8"}>
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
