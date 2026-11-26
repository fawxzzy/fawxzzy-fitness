"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import {
  REST_TIMER_STEP_SECONDS,
  adjustRestTimer,
  describeDuration,
  formatElapsedClock,
  getRestProgress,
  getRestRemainingSeconds,
  isRestTimerExpired,
  readStoredRestTimer,
  startRestTimer,
  writeStoredRestTimer,
  type RestTimerState,
} from "@/components/session/restTimerModel";

function getSessionStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Rest timer state for one workout (DESIGN #2). Local only: React state mirrored to sessionStorage so a reload keeps
 * the countdown; nothing is saved to the workout. `start()` runs after a set is logged; the timer hides itself a few
 * seconds after it reaches zero. `enabled=false` (workout finished) clears it.
 */
export function useRestTimer(sessionId: string, enabled: boolean) {
  const [state, setState] = useState<RestTimerState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Restore after mount (sessionStorage is client-only; reading it during render would mismatch the server HTML).
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const stored = readStoredRestTimer(getSessionStorage(), sessionId, Date.now());
    if (stored) {
      setState(stored);
      setNow(Date.now());
    }
  }, [enabled, sessionId]);

  const update = useCallback((next: RestTimerState | null) => {
    setState(next);
    setNow(Date.now());
    writeStoredRestTimer(getSessionStorage(), sessionId, next);
  }, [sessionId]);

  useEffect(() => {
    if (!enabled && state) {
      update(null);
    }
  }, [enabled, state, update]);

  useEffect(() => {
    if (!state) {
      return;
    }
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (isRestTimerExpired(state, current)) {
        update(null);
      }
    };
    const timer = window.setInterval(tick, 500);
    return () => window.clearInterval(timer);
  }, [state, update]);

  const start = useCallback(() => {
    if (enabled) {
      update(startRestTimer(Date.now()));
    }
  }, [enabled, update]);
  const adjust = useCallback((delta: number) => {
    setState((current) => {
      const next = adjustRestTimer(current, delta, Date.now());
      writeStoredRestTimer(getSessionStorage(), sessionId, next);
      return next;
    });
    setNow(Date.now());
  }, [sessionId]);
  const skip = useCallback(() => update(null), [update]);

  return { state, now, start, adjust, skip };
}

const restButtonClassName =
  "inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full !border !border-[rgb(var(--border-strong)/0.26)] !bg-[rgb(var(--surface-2)/0.5)] px-2.5 text-[13px] font-semibold leading-none tabular-nums !text-[rgb(var(--text-primary))] shadow-none transition-colors hover:!bg-[rgb(var(--surface-2)/0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.5)] motion-reduce:transition-none";

/**
 * The rest strip above the dock: "Rest 1:24" with a draining bar, -15 / +15 and Skip. Non-blocking (the page scrolls
 * and logs underneath). At zero it reads "Rest done" (announced politely once) and hides itself shortly after.
 */
export function RestTimer({
  state,
  now,
  onAdjust,
  onSkip,
}: {
  state: RestTimerState;
  now: number;
  onAdjust: (deltaSeconds: number) => void;
  onSkip: () => void;
}) {
  const remaining = getRestRemainingSeconds(state, now);
  const done = remaining <= 0;
  const progress = getRestProgress(state, now);

  return (
    <div
      data-rest-timer={done ? "done" : "running"}
      className={cn(
        "relative flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-[22px] !border py-1 pl-3.5 pr-1",
        done
          ? "border-[rgb(var(--success-rgb)/0.55)] bg-[rgb(var(--success-rgb)/0.16)]"
          : "border-[rgb(var(--border-strong)/0.24)] bg-[rgb(var(--surface-1)/0.92)]",
      )}
    >
      {/* Draining bar: decorative (the time is in text); width steps each tick, no transition under reduced motion. */}
      <span
        aria-hidden="true"
        data-rest-timer-bar="true"
        className="pointer-events-none absolute inset-y-0 left-0 bg-[rgb(var(--accent)/0.14)] transition-[width] duration-500 ease-linear motion-reduce:transition-none"
        style={{ width: `${Math.round(progress * 1000) / 10}%` }}
      />
      <div
        role="timer"
        aria-label={done ? "Rest done" : `Rest, ${describeDuration(remaining, true)} left`}
        className="relative flex min-w-0 flex-1 items-baseline gap-2"
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-secondary))]">Rest</span>
        <span className="truncate text-lg font-bold leading-none tabular-nums text-[rgb(var(--text-primary))]">
          {done ? "Done" : formatElapsedClock(remaining)}
        </span>
      </div>
      <span className="sr-only" aria-live="polite">{done ? "Rest done." : ""}</span>
      {done ? null : (
        <button type="button" className={cn(restButtonClassName, "relative")} aria-label={`${REST_TIMER_STEP_SECONDS} seconds less rest`} data-rest-timer-adjust="-15" onClick={() => onAdjust(-REST_TIMER_STEP_SECONDS)}>
          −{REST_TIMER_STEP_SECONDS}
        </button>
      )}
      <button type="button" className={cn(restButtonClassName, "relative")} aria-label={`${REST_TIMER_STEP_SECONDS} seconds more rest`} data-rest-timer-adjust="15" onClick={() => onAdjust(REST_TIMER_STEP_SECONDS)}>
        +{REST_TIMER_STEP_SECONDS}
      </button>
      <button type="button" className={cn(restButtonClassName, "relative px-3")} data-rest-timer-skip="true" onClick={onSkip}>
        {done ? "Close" : "Skip"}
      </button>
    </div>
  );
}
