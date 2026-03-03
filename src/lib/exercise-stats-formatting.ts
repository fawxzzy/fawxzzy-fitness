export function positive(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function formatDurationShort(seconds?: number | null): string | null {
  const safe = positive(seconds);
  if (safe <= 0) return null;

  const total = Math.floor(safe);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainderSeconds = total % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${remainderSeconds.toString().padStart(2, "0")}`;
}

export function formatDistance(distance?: number | null, unit?: string | null): string | null {
  const safeDistance = positive(distance);
  if (safeDistance <= 0) return null;
  const normalizedUnit = unit === "mi" || unit === "km" || unit === "m" ? unit : null;
  return normalizedUnit ? `${formatNumber(safeDistance)} ${normalizedUnit}` : formatNumber(safeDistance);
}

export function formatPace(paceSecondsPerUnit?: number | null, unit?: string | null): string | null {
  const safePace = positive(paceSecondsPerUnit);
  const normalizedUnit = unit === "mi" || unit === "km" || unit === "m" ? unit : null;
  if (safePace <= 0 || !normalizedUnit) return null;

  const minutes = Math.floor(safePace / 60);
  const seconds = Math.floor(safePace % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")} / ${normalizedUnit}`;
}

export function formatCalories(calories?: number | null): string | null {
  const safe = positive(calories);
  if (safe <= 0) return null;
  return `${formatNumber(safe)} cal`;
}
