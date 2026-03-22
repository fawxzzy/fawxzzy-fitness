"use client";

import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionBackButton } from "@/components/SessionBackButton";
import { SessionHeaderCard } from "@/components/ui/workout-entry/SessionHeaderCard";

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
  backHref,
  isTimerHydrated = true,
}: {
  sessionTitle: string;
  sessionSummary?: string;
  durationSeconds: number;
  backHref?: string;
  isTimerHydrated?: boolean;
}) {
  return (
    <div className="sticky top-0 z-40 px-1 pt-[max(0.15rem,env(safe-area-inset-top))]">
      <SessionHeaderCard
        eyebrow="Current Session"
        title={sessionTitle}
        subtitle={sessionSummary}
        action={<SessionBackButton href={backHref} />}
        meta={(
          <div
            className="inline-flex min-h-9 items-center rounded-full border border-white/8 bg-white/5 px-2.5 py-1 text-[0.82rem] font-semibold tabular-nums text-text"
            suppressHydrationWarning
            aria-live={isTimerHydrated ? "off" : undefined}
          >
            {formatDurationClock(durationSeconds)}
          </div>
        )}
        footer={<OfflineSyncBadge />}
      />
    </div>
  );
}
