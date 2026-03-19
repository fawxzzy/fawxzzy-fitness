import { formatDurationClock } from "@/lib/duration";

export type MeasurementMetric = "reps" | "weight" | "time" | "distance" | "calories";

type SummaryItem = {
  metric: MeasurementMetric;
  label: string;
  tone?: "default" | "muted";
};

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function formatMeasurementSummaryItems(values: {
  reps?: number | null;
  weight?: number | null;
  weightUnit?: string | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: string | null;
  calories?: number | null;
  emptyLabel?: string;
}): SummaryItem[] {
  const items: SummaryItem[] = [];

  if (Number.isFinite(values.reps ?? null) && (values.reps ?? 0) > 0) {
    items.push({ metric: "reps", label: `${Math.floor(values.reps as number)} reps` });
  }

  if (Number.isFinite(values.weight ?? null) && (values.weight ?? 0) > 0) {
    items.push({ metric: "weight", label: `${formatNumber(values.weight as number)} ${values.weightUnit ?? "lb"}` });
  }

  if (Number.isFinite(values.durationSeconds ?? null) && (values.durationSeconds ?? 0) > 0) {
    items.push({ metric: "time", label: formatDurationClock(values.durationSeconds as number) });
  }

  if (Number.isFinite(values.distance ?? null) && (values.distance ?? 0) > 0) {
    items.push({ metric: "distance", label: `${formatNumber(values.distance as number)} ${values.distanceUnit ?? "mi"}` });
  }

  if (Number.isFinite(values.calories ?? null) && (values.calories ?? 0) > 0) {
    items.push({ metric: "calories", label: `${formatNumber(values.calories as number)} cal` });
  }

  if (items.length === 0) {
    items.push({ metric: "reps", label: values.emptyLabel ?? "No measurements", tone: "muted" });
  }

  return items;
}

export function formatMeasurementSummaryText(values: Parameters<typeof formatMeasurementSummaryItems>[0]) {
  return formatMeasurementSummaryItems(values).map((item) => item.label).join(" • ");
}
