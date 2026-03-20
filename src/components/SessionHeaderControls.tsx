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
    <div className="sticky top-0 z-40 px-1 pt-[max(0.75rem,env(safe-area-inset-top))]">
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-4 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">In session</p>
            <p className="text-lg font-semibold leading-tight text-text">{sessionTitle}</p>
            {sessionSummary ? <p className="text-sm text-muted">{sessionSummary}</p> : null}
            <p className="text-sm font-medium tabular-nums text-muted" suppressHydrationWarning aria-live={isTimerHydrated ? "off" : undefined}>
              Elapsed {formatDurationClock(durationSeconds)}
            </p>
          </div>
          <div className="shrink-0">
            <SessionBackButton href={backHref} />
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/8 pt-3">
          <div className="min-h-[1.25rem] flex-1">
            <OfflineSyncBadge />
          </div>
          <div className="shrink-0">{quickAddAction}</div>
        </div>
      </section>
    </div>
  );
}
