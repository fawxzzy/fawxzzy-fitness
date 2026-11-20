/**
 * "m:ss" clock. Minutes keep counting past an hour ("60:00", "61:01"), never "h:mm:ss": the result is prefilled into
 * duration inputs whose parsers accept only "m:ss" or plain seconds, so it must round-trip.
 */
export function formatDurationClock(totalSeconds: number): string {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Whole minutes in a duration, floored like the clock above (2670s -> 44, not 45). */
export function getDurationWholeMinutes(totalSeconds: number): number {
  const safeSeconds = Number.isFinite(totalSeconds) ? Math.max(0, Math.floor(totalSeconds)) : 0;
  return Math.floor(safeSeconds / 60);
}

/**
 * Target/preview duration as a plain clock ("0:45", "18:00"). The colon already says minutes:seconds; a trailing
 * unit ("18:00 s") read as eighteen hundred seconds on Today, so there is none.
 */
export function formatDurationPreview(totalSeconds: number): string {
  return formatDurationClock(totalSeconds);
}
