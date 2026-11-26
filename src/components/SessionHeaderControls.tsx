"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { ScreenHeaderBackButton } from "@/components/ui/app/ScreenHeaderBackButton";
import { getPreviousInAppPath } from "@/components/ui/useBackNavigation";
import {
  SESSION_PAUSE_ARIA_LABEL,
  SESSION_PAUSE_LABEL,
  resolveSessionPauseTarget,
  shouldPauseUseHistoryBack,
} from "@/components/sessionBackAction";
import { APP_NOTICE_ANCHOR_ATTRIBUTE } from "@/lib/app-notice-anchor";
import { describeDuration, formatElapsedClock } from "@/components/session/restTimerModel";

/** "Lower A · QA Routine": the day first, then the routine, in plain words. */
export function formatSessionHeaderSubtitle(sessionDayName: string, routineName: string) {
  return [sessionDayName.trim(), routineName.trim()].filter(Boolean).join(" · ");
}

/** Elapsed workout time, "12:34" (h:mm:ss past an hour). role="timer" is not live, so it never chatters. */
export function SessionWorkoutClock({ elapsedSeconds }: { elapsedSeconds: number }) {
  return (
    <span
      role="timer"
      aria-label={`Workout time ${describeDuration(elapsedSeconds)}`}
      data-session-clock="true"
      className="inline-flex h-11 shrink-0 items-center px-1 text-[15px] font-semibold leading-none tabular-nums text-[rgb(var(--text-secondary))]"
    >
      {formatElapsedClock(elapsedSeconds)}
    </span>
  );
}

/**
 * Pause: the one header way out of an in-progress workout (sessionBackAction.ts). A 44px pill, top right where the
 * app menu sits on tab screens, so floating notices anchor under it. It never finishes or discards anything.
 */
export function SessionPauseButton({ backHref }: { backHref?: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <span className="-mr-1 inline-flex" {...{ [APP_NOTICE_ANCHOR_ATTRIBUTE]: "" }}>
      <button
        type="button"
        aria-label={SESSION_PAUSE_ARIA_LABEL}
        data-session-pause="true"
        onClick={() => {
          if (shouldPauseUseHistoryBack(getPreviousInAppPath(pathname ?? ""))) {
            router.back();
            return;
          }
          router.push(resolveSessionPauseTarget(backHref));
        }}
        className="inline-flex h-11 min-w-11 items-center gap-1 rounded-full !border !border-[rgb(var(--border-strong)/0.26)] !bg-[rgb(var(--surface-2)/0.42)] pl-2.5 pr-3.5 text-sm font-semibold leading-none text-[rgb(var(--text-primary))] shadow-none transition-colors hover:!bg-[rgb(var(--surface-2)/0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--button-primary-bg)/0.6)] active:scale-[0.98] motion-reduce:active:scale-100"
      >
        {/* Pause glyph (two bars), not a back chevron: the workout stays open and Today offers Resume. */}
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-[rgb(var(--text-secondary))]" data-session-pause-icon="true">
          <path d="M7.5 5v10M12.5 5v10" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
        </svg>
        <span>{SESSION_PAUSE_LABEL}</span>
      </button>
    </span>
  );
}

// The live workout is a detail screen (DESIGN-CONTRACT.md section 15) with its own exit rules: title "Workout",
// one subtitle line (day · routine), the inline sync status on the title line ("– Offline"), and Pause top right.
// No app menu and no left Back: the only ways out are Pause (back to Today, workout keeps running) and Finish.
// Progress counts live in the exercise list, not in the header. The workout clock (DESIGN #2) sits left of Pause: it is
// derived from the session start time, so it survives a reload, and it is local display only (nothing is saved).
// A completed workout (opened from a link after Finish) has nothing to pause: it shows the plain left Back instead,
// and the dock shows Continue.
export function SessionHeaderControls({
  routineName,
  sessionDayName,
  backHref,
  statusBadge,
  completed = false,
  elapsedSeconds,
}: {
  routineName: string;
  sessionDayName: string;
  backHref?: string;
  statusBadge?: ReactNode;
  completed?: boolean;
  /** Seconds since the workout started; omitted, no clock. */
  elapsedSeconds?: number;
}) {
  const subtitle = formatSessionHeaderSubtitle(sessionDayName, routineName);
  if (completed) {
    return (
      <ScreenHeader
        kind="detail"
        title="Workout"
        subtitle={subtitle}
        back={<ScreenHeaderBackButton href={resolveSessionPauseTarget(backHref)} historyBehavior="history-first" label="Back" />}
        status={statusBadge}
      />
    );
  }
  return (
    <ScreenHeader
      kind="detail"
      title="Workout"
      subtitle={subtitle}
      trailing={(
        <span className="inline-flex items-center gap-1">
          {typeof elapsedSeconds === "number" ? <SessionWorkoutClock elapsedSeconds={elapsedSeconds} /> : null}
          <SessionPauseButton backHref={backHref} />
        </span>
      )}
      status={statusBadge}
    />
  );
}
