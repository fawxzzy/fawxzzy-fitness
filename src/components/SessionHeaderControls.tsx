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
  durationSeconds,
  quickAddAction,
  backHref,
}: {
  sessionTitle: string;
  durationSeconds: number;
  quickAddAction: ReactNode;
  backHref?: string;
}) {
  return (
    <div className="sticky top-0 z-40 border-b border-white/8 bg-[rgb(var(--surface-rgb)/0.92)] backdrop-blur-md">
      <div className="space-y-3 px-1 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1 pr-2">
            <p className="truncate text-base font-semibold leading-tight text-text">{sessionTitle}</p>
            <p className="text-sm font-medium tabular-nums text-muted">{formatDurationClock(durationSeconds)}</p>
          </div>
          <div className="shrink-0">
            <SessionBackButton href={backHref} />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-h-[1.25rem] flex-1">
            <OfflineSyncBadge />
          </div>
          <div className="shrink-0">{quickAddAction}</div>
        </div>
      </div>
    </div>
  );
}
