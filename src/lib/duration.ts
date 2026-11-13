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

export function formatDurationPreview(totalSeconds: number): string {
  return `${formatDurationClock(totalSeconds)} s`;
}
