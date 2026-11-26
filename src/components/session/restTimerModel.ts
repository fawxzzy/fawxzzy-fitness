/**
 * Rest timer + workout clock model (DESIGN #2, 2026-11-26). LOCAL STATE ONLY: the rest timer lives in React state and
 * a per-session sessionStorage entry so a reload mid-rest keeps the countdown. Nothing here reaches the database (the
 * session timer columns are owner-gated and untouched). Times are absolute (`endsAt`), so a backgrounded tab or a
 * throttled interval never drifts: the remaining time is always recomputed from the wall clock.
 */

export const REST_TIMER_DEFAULT_SECONDS = 90;
export const REST_TIMER_STEP_SECONDS = 15;
export const REST_TIMER_MIN_SECONDS = 15;
export const REST_TIMER_MAX_SECONDS = 600;
/** How long the "Rest done" state stays before the timer hides itself. */
export const REST_TIMER_DONE_LINGER_MS = 8000;

export type RestTimerState = {
  /** Epoch ms when the rest ends. */
  endsAt: number;
  /** The length the countdown was last set to, in seconds (drives the progress bar). */
  totalSeconds: number;
};

export function startRestTimer(now: number, seconds: number = REST_TIMER_DEFAULT_SECONDS): RestTimerState {
  const total = clampSeconds(seconds);
  return { endsAt: now + total * 1000, totalSeconds: total };
}

export function getRestRemainingSeconds(state: RestTimerState | null, now: number): number {
  if (!state) {
    return 0;
  }
  return Math.max(0, Math.ceil((state.endsAt - now) / 1000));
}

/** +15 / -15: changes the time left. -15 below 15s left ends the rest (same as Skip). */
export function adjustRestTimer(state: RestTimerState | null, deltaSeconds: number, now: number): RestTimerState | null {
  if (!state) {
    return deltaSeconds > 0 ? startRestTimer(now, deltaSeconds) : null;
  }
  const remaining = getRestRemainingSeconds(state, now);
  const next = remaining + deltaSeconds;
  if (next <= 0) {
    return null;
  }
  const clamped = Math.min(REST_TIMER_MAX_SECONDS, next);
  return { endsAt: now + clamped * 1000, totalSeconds: Math.max(clamped, Math.min(REST_TIMER_MAX_SECONDS, state.totalSeconds + Math.max(0, deltaSeconds))) };
}

/** 0..1 of the rest still to go (1 = just started). */
export function getRestProgress(state: RestTimerState | null, now: number): number {
  if (!state || state.totalSeconds <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (state.endsAt - now) / (state.totalSeconds * 1000)));
}

/** True once the countdown has reached zero and the "Rest done" linger is over: the timer should hide. */
export function isRestTimerExpired(state: RestTimerState | null, now: number): boolean {
  return !state || now >= state.endsAt + REST_TIMER_DONE_LINGER_MS;
}

/** "1:30", "0:05"; an hour or more reads "1:02:03". */
export function formatElapsedClock(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const ss = seconds.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${minutes.toString().padStart(2, "0")}:${ss}` : `${minutes}:${ss}`;
}

/** Screen-reader words for a duration: "12 minutes", "1 hour 5 minutes", "45 seconds"; `withSeconds` adds the rest under an hour ("1 minute 30 seconds"). */
export function describeDuration(totalSeconds: number, withSeconds = false): string {
  const safe = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours === 0 && minutes === 0) {
    return `${safe} ${safe === 1 ? "second" : "seconds"}`;
  }
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "hour" : "hours"}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? "minute" : "minutes"}`);
  }
  const seconds = safe % 60;
  if (withSeconds && hours === 0 && seconds > 0) {
    parts.push(`${seconds} ${seconds === 1 ? "second" : "seconds"}`);
  }
  return parts.join(" ");
}

function clampSeconds(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.round(seconds) : REST_TIMER_DEFAULT_SECONDS;
  return Math.min(REST_TIMER_MAX_SECONDS, Math.max(REST_TIMER_MIN_SECONDS, safe));
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function getRestTimerStorageKey(sessionId: string) {
  return `fitness:session-rest-timer:${sessionId}`;
}

/** The saved countdown for this session, or null when there is none, it is malformed, or it has already expired. */
export function readStoredRestTimer(storage: StorageLike | null | undefined, sessionId: string, now: number): RestTimerState | null {
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(getRestTimerStorageKey(sessionId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<RestTimerState>;
    if (typeof parsed.endsAt !== "number" || typeof parsed.totalSeconds !== "number" || !Number.isFinite(parsed.endsAt) || !Number.isFinite(parsed.totalSeconds)) {
      return null;
    }
    const state = { endsAt: parsed.endsAt, totalSeconds: parsed.totalSeconds };
    return isRestTimerExpired(state, now) ? null : state;
  } catch {
    return null;
  }
}

export function writeStoredRestTimer(storage: StorageLike | null | undefined, sessionId: string, state: RestTimerState | null) {
  if (!storage) {
    return;
  }
  try {
    if (state) {
      storage.setItem(getRestTimerStorageKey(sessionId), JSON.stringify(state));
    } else {
      storage.removeItem(getRestTimerStorageKey(sessionId));
    }
  } catch {
    // Private mode / quota: the timer still works for this page view.
  }
}

/** True when the total number of logged sets went up since the last render (a set was just logged, or Log all ran). */
export function didLogNewSet(previousTotal: number | null, nextTotal: number): boolean {
  return previousTotal !== null && nextTotal > previousTotal;
}
