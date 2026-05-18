import { formatDistanceNumber, formatDistanceUnitLabel, normalizeFitnessDistanceUnit } from "@/lib/fitness-distance-units";

export function positive(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function formatNumber(value: number): string {
  return formatDistanceNumber(value);
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
  const normalizedUnit = normalizeFitnessDistanceUnit(unit, "mi");
  return `${formatDistanceNumber(safeDistance, normalizedUnit)} ${formatDistanceUnitLabel(normalizedUnit)}`;
}

export function formatPace(paceSecondsPerUnit?: number | null, unit?: string | null): string | null {
  const safePace = positive(paceSecondsPerUnit);
  const normalizedUnit = normalizeFitnessDistanceUnit(unit, "mi");
  if (safePace <= 0 || !normalizedUnit) return null;

  const minutes = Math.floor(safePace / 60);
  const seconds = Math.floor(safePace % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}/${formatDistanceUnitLabel(normalizedUnit)}`;
}

export function formatCalories(calories?: number | null): string | null {
  const safe = positive(calories);
  if (safe <= 0) return null;
  return `${formatNumber(safe)} cal`;
}
