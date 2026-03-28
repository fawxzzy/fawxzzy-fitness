"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { HistoryControlGroup, HistoryControlPanel, HistoryMetaChip, HistoryMetaRow, HistoryTabs, buildHistorySessionSummaryParts } from "@/components/history/HistoryShared";
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

function compactMetricsSummary(session: SessionSummary) {
  return buildHistorySessionSummaryParts({
    durationSec: session.durationSec,
    exerciseCount: session.exerciseCount,
    setCount: session.setCount,
    prLabel: session.prCounts.total > 0 ? session.prLabel : null,
  });
}

function isWeekdayTitle(value?: string) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "mon", "tue", "wed", "thu", "fri", "sat", "sun"].includes(normalized);
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

function HistorySessionRow({ session, mode }: { session: SessionSummary; mode: ViewMode }) {
  const routineTitle = session.routineTitle || "Unknown routine";
  const dateLabel = formatDateShort(session.startedAt);
  const dayLabel = session.dayTitle?.trim();
  const showDayLabel = dayLabel && !isWeekdayTitle(dayLabel);
  const metrics = performanceParts(session);
  const condensedMetrics = compactMetricsSummary(session).join(" • ");

  return (
    <AppPanel
      clip
      className={cn(
        "group transition-all hover:-translate-y-[1px] hover:border-border/80 hover:bg-[rgb(var(--surface-rgb)/0.46)]",
        mode === "compact" ? "p-3" : "p-3.5",
        session.prCounts.total > 0 ? "border-[rgb(var(--button-primary-border)/0.38)]" : undefined,
      )}
    >
      <div className={cn("relative", mode === "compact" ? "min-h-[102px]" : "min-h-[152px]")}>
        <Link
          href={`/history/${session.id}?returnTab=sessions&view=${mode}`}
          aria-label={`View session details for ${routineTitle}`}
          className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
        />

        <div className="relative z-10 flex items-start gap-2.5">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--text)/0.56)]">Session</p>
              <p className={cn(
                "min-w-0 pr-1 text-slate-50",
                mode === "compact" ? "line-clamp-2 text-[15px] font-semibold leading-5" : "line-clamp-2 text-base font-semibold leading-5",
              )}
              >
                {routineTitle}
              </p>
              <p className={cn(
                "text-slate-300",
                mode === "compact" ? "text-[11px] leading-4" : "text-xs leading-4",
              )}
              >
                {showDayLabel ? `${dayLabel} · ` : null}
                <span>{dateLabel}</span>
              </p>
            </div>

            {mode === "compact" ? (
              <div className="rounded-2xl border border-white/8 bg-black/10 px-3 py-2">
                <p className="line-clamp-2 text-[11px] leading-4 text-slate-300">{condensedMetrics}</p>
              </div>
            ) : (
              <HistoryMetaRow>
                {metrics.map((metric) => (
                  <HistoryMetaChip key={metric.label} label={metric.label} value={metric.value ?? ""} emphasized={metric.label === "PRs"} />
                ))}
              </HistoryMetaRow>
            )}
          </div>
          <div className="pt-1 text-lg leading-none text-[rgb(var(--text)/0.42)] transition-colors group-hover:text-[rgb(var(--text)/0.68)]" aria-hidden="true">›</div>
        </div>

        {mode !== "compact" && session.prCounts.total > 0 ? (
          <div className="relative z-10 mt-3 rounded-2xl border border-[rgb(var(--button-primary-border)/0.26)] bg-[rgb(var(--button-primary-bg)/0.08)] px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">PR summary</p>
            <p className="mt-1 text-sm font-medium leading-5 text-slate-100">{session.prLabel}</p>
          </div>
        ) : null}

        {mode !== "compact" && session.topSet ? (
          <div className="relative z-10 mt-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Top set</p>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-300" title={`Top set: ${session.topSet.exerciseName} — ${session.topSet.display}`}>
              <span className="font-medium text-slate-100">{session.topSet.exerciseName}</span>
              <span className="mx-1 text-slate-600">•</span>
              <span>{session.topSet.display}</span>
            </p>
          </div>
        ) : null}

        <p className="relative z-10 mt-2 text-xs font-medium text-[rgb(var(--text)/0.62)]">Open log</p>
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
      <HistoryControlPanel>
        <HistoryTabs value="sessions" sessionsHref={`/history?tab=sessions&view=${effectiveViewMode}`} exercisesHref="/history/exercises" />
        <HistoryControlGroup label="View" summary={`${sessions.length} ${sessions.length === 1 ? "session" : "sessions"}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[rgb(var(--text)/0.7)]">Choose how much detail each history card shows.</p>
            <ViewModePills value={effectiveViewMode} onChange={setViewMode} />
          </div>
        </HistoryControlGroup>
      </HistoryControlPanel>

      {sessions.length > 0 ? (
        <div className="relative">
          <ul className={effectiveViewMode === "compact" ? "space-y-2 pb-8" : "space-y-2.5 pb-8"}>
            {sessions.map((session) => (
              <li key={session.id} className="relative">
                <HistorySessionRow session={session} mode={effectiveViewMode} />
              </li>
            ))}
          </ul>
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[rgb(var(--surface-2-soft)/0.98)] to-transparent" aria-hidden="true" />
        </div>
      ) : (
        <AppPanel className="rounded-[1.5rem] border-dashed p-5 text-sm text-muted">No completed sessions yet.</AppPanel>
      )}
    </div>
  );
}
