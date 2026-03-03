const DEFAULT_LOCALE = "en-US";

export function formatDurationShort(seconds?: number | null): string | null {
  if (!Number.isFinite(seconds ?? null) || (seconds ?? 0) <= 0) return null;
  const safe = Math.max(0, Math.floor(seconds as number));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }

  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

export function formatCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function formatWeight(value?: number | null, unit?: string | null): string | null {
  if (!Number.isFinite(value ?? null) || (value ?? 0) <= 0) return null;
  const normalizedUnit = unit === "lb" || unit === "lbs" ? "lb" : unit === "kg" ? "kg" : null;
  return normalizedUnit ? `${formatNumber(value as number)} ${normalizedUnit}` : formatNumber(value as number);
}

export function formatSetDisplay(set: { weight?: number | null; reps?: number | null; unit?: string | null }): string | null {
  const weightLabel = formatWeight(set.weight, set.unit);
  const reps = Number.isFinite(set.reps ?? null) && (set.reps ?? 0) > 0 ? Math.floor(set.reps as number) : null;

  if (weightLabel && reps) {
    return `${weightLabel.split(" ")[0]} × ${reps}`;
  }

  if (reps) return `${reps} reps`;
  if (weightLabel) return weightLabel;

  return null;
}

export function formatDateShort(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "";

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}
