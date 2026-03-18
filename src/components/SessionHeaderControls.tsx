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
}: {
  sessionTitle: string;
  durationSeconds: number;
  quickAddAction: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-50 -mx-4 border-b border-white/8 bg-[rgb(var(--surface)/0.94)] backdrop-blur-md">
      <div className="px-4 pb-2 pt-[max(0.625rem,env(safe-area-inset-top))]">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
          <div className="shrink-0">
            <SessionBackButton />
          </div>
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold leading-tight text-text">{sessionTitle}</p>
            <p className="mt-0.5 text-xs font-medium tabular-nums text-muted">{formatDurationClock(durationSeconds)}</p>
          </div>
          <div className="flex justify-end">{quickAddAction}</div>
        </div>

        <div className="mt-2 flex min-h-[1.25rem] items-center justify-center">
          <OfflineSyncBadge />
        </div>
      </div>
    </div>
  );
}
