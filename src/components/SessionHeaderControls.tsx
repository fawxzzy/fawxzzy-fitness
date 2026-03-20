"use client";

import type { ReactNode } from "react";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionBackButton } from "@/components/SessionBackButton";

function formatDurationClock(totalSeconds: number) {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function SessionHeaderControls({
  sessionTitle,
  sessionSummary,
  durationSeconds,
  quickAddAction,
  backHref,
  isTimerHydrated = true,
}: {
  sessionTitle: string;
  sessionSummary?: string;
  durationSeconds: number;
  quickAddAction: ReactNode;
  backHref?: string;
  isTimerHydrated?: boolean;
}) {
  return (
    <div className="sticky top-0 z-40 px-1 pt-[max(0.65rem,env(safe-area-inset-top))]">
      <section className="overflow-hidden rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] px-4 py-3 shadow-[0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">In session</p>
            <p className="text-lg font-semibold leading-tight text-text">{sessionTitle}</p>
            {sessionSummary ? <p className="text-sm text-muted">{sessionSummary}</p> : null}
          </div>
          <div className="shrink-0 pt-0.5">
            <SessionBackButton href={backHref} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <div className="inline-flex min-h-10 min-w-[7.5rem] items-center rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-sm font-medium tabular-nums text-text" suppressHydrationWarning aria-live={isTimerHydrated ? "off" : undefined}>
            Elapsed {formatDurationClock(durationSeconds)}
          </div>
          <div className="min-w-0 flex-1">{quickAddAction}</div>
        </div>

        <div className="mt-2 min-h-[1.25rem] px-0.5 text-xs text-muted">
          <OfflineSyncBadge />
        </div>
      </section>
    </div>
  );
}
