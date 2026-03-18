"use client";

import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deleteCompletedSessionAction } from "@/app/actions/history";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import { formatCount, formatDateShort, formatDurationShort } from "@/lib/formatting";
import type { SessionSummary } from "./session-summary";

type ViewMode = "list" | "compact";

type HistorySessionsClientProps = {
  sessions: SessionSummary[];
  initialViewMode: ViewMode;
};

const VIEW_MODE_STORAGE_KEY = "history:sessions:view-mode";

function performanceParts(session: SessionSummary) {
  return [
    session.durationSec ? { label: "Time", value: formatDurationShort(session.durationSec) } : null,
    { label: "Exercises", value: formatCount(session.exerciseCount, "exercise") },
    { label: "Sets", value: formatCount(session.setCount, "set") },
    session.prCounts.total > 0 ? { label: "PRs", value: session.prLabel } : null,
  ].filter((part): part is { label: string; value: string | null } => Boolean(part?.value));
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

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, sessionId]);

  return (
    <div className="relative z-20" onClick={(event) => event.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-black/20 text-base text-slate-200 transition-colors hover:bg-black/35"
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

function MetricChip({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        emphasized
          ? "border-[rgb(var(--button-primary-border)/0.45)] bg-[rgb(var(--button-primary-bg)/0.18)] text-slate-100"
          : "border-white/10 bg-white/5 text-slate-300",
      )}
    >
      <span className="text-slate-400">{label}</span>
      <span className="ml-1 text-slate-100">{value}</span>
    </div>
  );
}

function ViewModePills({ value, onChange }: { value: ViewMode; onChange: (next: ViewMode) => void }) {
  const options: Array<{ label: string; value: ViewMode }> = [
    { label: "Details", value: "list" },
    { label: "Compact", value: "compact" },
  ];

  return (
    <div className="flex items-center gap-1 self-start rounded-full border border-white/10 bg-black/15 p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={selected}
            className={cn(
              "min-h-8 rounded-full px-3 text-[11px] font-semibold transition",
              selected
                ? "bg-white/12 text-slate-50 shadow-[inset_0_-1px_0_0_rgb(var(--accent-rgb)/0.85)]"
                : "text-slate-300 hover:bg-white/5 hover:text-white",
            )}
          >
            {option.label}
          </button>
        );
      })}
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
  const dayLabel = session.dayTitle?.trim();
  const showDayLabel = dayLabel && !isWeekdayTitle(dayLabel);
  const metrics = performanceParts(session);

  return (
    <AppPanel
      clip
      className={cn(
        "transition-colors hover:border-border/70",
        mode === "compact" ? "p-3" : "p-3.5",
        session.prCounts.total > 0 ? "border-[rgb(var(--button-primary-border)/0.38)]" : undefined,
      )}
    >
      <div className="relative min-h-[120px]">
        <Link
          href={`/history/${session.id}?returnTab=sessions&view=${mode}`}
          aria-label={`View session details for ${routineTitle}`}
          className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
        />

        <div className="relative z-10 flex items-start gap-3">
          <div className="min-w-0 flex-1 pr-1">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-[15px] font-semibold leading-5 text-slate-50 sm:text-base">{routineTitle}</p>
            </div>
            <p className="mt-1 text-xs leading-4 text-slate-300">
              {showDayLabel ? `${dayLabel} · ` : null}
              <span>{dateLabel}</span>
            </p>
          </div>

          <SessionCardMenu
            sessionId={session.id}
            mode={mode}
            routineTitle={routineTitle}
            startedAt={session.startedAt}
            durationSec={session.durationSec}
          />
        </div>

        <div className="relative z-10 mt-3 flex flex-wrap gap-1.5">
          {metrics.map((metric) => (
            <MetricChip key={metric.label} label={metric.label} value={metric.value ?? ""} emphasized={metric.label === "PRs"} />
          ))}
        </div>

        {session.topSet ? (
          <p
            className={cn(
              "relative z-10 mt-3 overflow-hidden text-ellipsis whitespace-nowrap text-xs leading-4 text-slate-400",
              mode === "compact" ? "max-w-full" : "max-w-full",
            )}
            title={`Top set: ${session.topSet.exerciseName} — ${session.topSet.display}`}
          >
            <span className="text-slate-500">Top set</span>
            <span className="mx-1 text-slate-600">•</span>
            <span className="truncate">{session.topSet.exerciseName} — {session.topSet.display}</span>
          </p>
        ) : null}
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
      <AppPanel className="space-y-2 p-2.5">
        <SegmentedControl
          options={[
            { label: "Sessions", value: "sessions", href: `/history?tab=sessions&view=${effectiveViewMode}` },
            { label: "Exercises", value: "exercises", href: "/history/exercises" },
          ]}
          value="sessions"
          size="sm"
          ariaLabel="History tabs"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-black/10 px-2 py-1.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">Card density</p>
          <ViewModePills value={effectiveViewMode} onChange={setViewMode} />
        </div>
      </AppPanel>

      {sessions.length > 0 ? (
        <div className="relative">
          <ul className={effectiveViewMode === "compact" ? "space-y-2 pb-8" : "space-y-2.5 pb-8"}>
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
