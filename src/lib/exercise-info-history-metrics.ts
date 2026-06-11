import type { MetricDatum } from "@/components/ui/MetricItem";
import { formatDurationShort } from "@/lib/exercise-stats-formatting";

type HistoryMetricValuePart = {
  label: string;
  value: string;
  numericValue?: number | null;
};

type HistoryMetricPoint = {
  id: string;
  type: "day" | "set" | "progression-event";
  performedAt: string;
  numericValue: number | null;
  values: HistoryMetricValuePart[];
};

function formatCompactNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function resolvePointMetricPart(point: HistoryMetricPoint) {
  if (typeof point.numericValue !== "number" || !Number.isFinite(point.numericValue)) {
    return null;
  }

  return point.values.find((part) => (
    typeof part.numericValue === "number"
    && Number.isFinite(part.numericValue)
    && Math.abs(part.numericValue - point.numericValue!) < 0.001
  )) ?? null;
}

function extractValueSuffix(value: string) {
  const match = value.trim().match(/^-?\d+(?:\.\d+)?\s*([a-zA-Z]+)?/);
  return match?.[1] ? ` ${match[1]}` : "";
}

function formatPointDeltaValue(delta: number, latestPart: HistoryMetricValuePart | null) {
  const absDelta = Math.abs(delta);
  const label = latestPart?.label.trim().toLowerCase() ?? "";

  if (label === "time") {
    return formatDurationShort(absDelta) ?? `${formatCompactNumber(absDelta)}s`;
  }

  if (label === "reps") {
    return `${formatCompactNumber(absDelta)} reps`;
  }

  if (label === "calories") {
    return `${formatCompactNumber(absDelta)} cal`;
  }

  return `${formatCompactNumber(absDelta)}${extractValueSuffix(latestPart?.value ?? "")}`;
}

function sortHistoryMetricPointsAscending(points: HistoryMetricPoint[]) {
  return [...points].sort((left, right) => {
    if (left.performedAt !== right.performedAt) return left.performedAt.localeCompare(right.performedAt);
    return left.id.localeCompare(right.id);
  });
}

export function buildHistoryPointComparisonMetric(args: {
  points: HistoryMetricPoint[];
  selectedPoint?: HistoryMetricPoint | null;
}): MetricDatum | null {
  const selectedPointType = args.selectedPoint?.type;
  const comparablePoints = sortHistoryMetricPointsAscending(
    args.points.filter((point) => {
      if (typeof point.numericValue !== "number" || !Number.isFinite(point.numericValue)) {
        return false;
      }

      if (selectedPointType === "day" || selectedPointType === "set") {
        return point.type === selectedPointType;
      }

      return point.type === "set";
    }),
  );

  if (comparablePoints.length < 2) {
    return null;
  }

  const currentIndex = args.selectedPoint
    ? comparablePoints.findIndex((point) => point.id === args.selectedPoint?.id)
    : comparablePoints.length - 1;
  if (currentIndex < 0) {
    return null;
  }

  const currentPoint = comparablePoints[currentIndex] ?? null;
  const comparisonPoint = comparablePoints[currentIndex - 1] ?? null;
  if (!currentPoint || !comparisonPoint) {
    return null;
  }

  const delta = currentPoint.numericValue! - comparisonPoint.numericValue!;
  const latestPart = resolvePointMetricPart(currentPoint);

  return {
    label: "Vs Previous",
    value: formatPointDeltaValue(delta, latestPart),
    valuePrefix: delta > 0 ? "\u2191" : delta < 0 ? "\u2193" : "\u2192",
    valueTone: delta > 0 ? "success" : delta < 0 ? "danger" : "muted",
  };
}
