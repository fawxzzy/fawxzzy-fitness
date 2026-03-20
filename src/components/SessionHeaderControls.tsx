"use client";

import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionBackButton } from "@/components/SessionBackButton";
import { EyebrowText, SubtitleText, TitleText } from "@/components/ui/text-roles";

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
    <div className="sticky top-0 z-40 px-1 pt-[max(0.35rem,env(safe-area-inset-top))]">
      <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.045))] px-3.5 py-3 shadow-[0_16px_32px_rgba(0,0,0,0.2)] backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <EyebrowText>Current Session</EyebrowText>
            <TitleText as="h1" className="text-[1.08rem]">{sessionTitle}</TitleText>
            {sessionSummary ? <SubtitleText>{sessionSummary}</SubtitleText> : null}
          </div>
          <div className="shrink-0 pt-0.5">
            <SessionBackButton href={backHref} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="inline-flex min-h-10 min-w-[7.4rem] items-center rounded-2xl border border-white/8 bg-white/5 px-3 py-2 text-sm font-medium tabular-nums text-text" suppressHydrationWarning aria-live={isTimerHydrated ? "off" : undefined}>
            Elapsed {formatDurationClock(durationSeconds)}
          </div>
        </div>

        <div className="mt-2 min-h-[1.1rem] px-0.5 text-xs text-muted">
          <OfflineSyncBadge />
        </div>
      </section>
    </div>
  );
}
