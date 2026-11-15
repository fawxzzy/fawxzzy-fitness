/** Idle time allowed between the last logged set and tapping Finish before it stops counting as workout time. */
export const SESSION_IDLE_CAP_SECONDS = 30 * 60;

/** Stored durations above this are treated as wall-clock artefacts (a session left open for days) and are not shown. */
export const MAX_DISPLAYABLE_SESSION_DURATION_SECONDS = 24 * 60 * 60;

/**
 * Clamps the client-reported session duration at write time: it may not exceed
 * (last logged set - session start) + idle cap. Without logged sets there is nothing to clamp against,
 * so the reported value is kept (read-side hiding still applies). Never returns a negative or non-integer value.
 */
export function clampSessionDurationSeconds(args: {
  reportedSeconds: number | null;
  startedAtMs: number | null;
  lastLoggedAtMs: number | null;
  idleCapSeconds?: number;
}): number | null {
  const { reportedSeconds, startedAtMs, lastLoggedAtMs } = args;
  if (reportedSeconds === null || !Number.isFinite(reportedSeconds)) {
    return null;
  }

  const reported = Math.max(0, Math.floor(reportedSeconds));
  if (
    startedAtMs === null
    || lastLoggedAtMs === null
    || !Number.isFinite(startedAtMs)
    || !Number.isFinite(lastLoggedAtMs)
  ) {
    return reported;
  }

  const idleCap = Math.max(0, Math.floor(args.idleCapSeconds ?? SESSION_IDLE_CAP_SECONDS));
  const activeSeconds = Math.max(0, Math.floor((lastLoggedAtMs - startedAtMs) / 1000));
  return Math.min(reported, activeSeconds + idleCap);
}

/** Read side: returns the stored duration, or undefined when it is missing, non-positive or longer than 24 hours. */
export function sanitizeStoredSessionDurationSeconds(value: number | null | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value > MAX_DISPLAYABLE_SESSION_DURATION_SECONDS ? undefined : value;
}
