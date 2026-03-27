import { formatDurationClock } from "./duration";
import { sanitizeEnabledMeasurementValues, type EnabledMeasurements } from "./measurement-sanitization";

export type MeasurementMetric = "reps" | "weight" | "time" | "distance" | "calories";

type SummaryItem = {
  metric: MeasurementMetric;
  label: string;
  tone?: "default" | "muted";
};

export type GoalSummaryValues = {
  sets?: number | null;
  reps?: number | null;
  repsMax?: number | null;
  weight?: number | null;
  weightUnit?: string | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: string | null;
  calories?: number | null;
  enabledMeasurements?: Partial<EnabledMeasurements> | null;
  emptyLabel?: string;
};

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function formatSetCountLabel(count: number | null | undefined, noun: "set" | "interval" = "set") {
  if (!Number.isFinite(count ?? null) || (count ?? 0) <= 0) return null;
  const normalizedCount = Math.floor(count as number);
  return `${normalizedCount} ${noun}${normalizedCount === 1 ? "" : "s"}`;
}

export function formatSetPositionLabel(index: number | null | undefined, noun: "Set" | "Interval" = "Set") {
  if (!Number.isFinite(index ?? null) || (index ?? 0) <= 0) return noun;
  return `${noun} ${Math.floor(index as number)}`;
}

function formatRepRange(reps: number | null | undefined, repsMax: number | null | undefined) {
  if (!Number.isFinite(reps ?? null) || (reps ?? 0) <= 0) {
    return null;
  }

  const minReps = Math.floor(reps as number);
  if (Number.isFinite(repsMax ?? null) && (repsMax ?? 0) > 0) {
    const maxReps = Math.floor(repsMax as number);
    return minReps === maxReps ? `${minReps} reps` : `${minReps}–${maxReps} reps`;
  }

  return `${minReps} reps`;
}

function getMetricSummaryParts(values: {
  reps?: number | null;
  repsMax?: number | null;
  weight?: number | null;
  weightUnit?: string | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: string | null;
  calories?: number | null;
}): Array<{ metric: MeasurementMetric; label: string }> {
  const measurementParts: Array<{ metric: MeasurementMetric; label: string }> = [];

  const repRange = formatRepRange(values.reps, values.repsMax);
  if (repRange) {
    measurementParts.push({ metric: "reps", label: repRange });
  }

  if (Number.isFinite(values.weight ?? null) && (values.weight ?? 0) > 0) {
    measurementParts.push({ metric: "weight", label: `${formatNumber(values.weight as number)} ${values.weightUnit ?? "lbs"}` });
  }

  if (Number.isFinite(values.durationSeconds ?? null) && (values.durationSeconds ?? 0) > 0) {
    measurementParts.push({ metric: "time", label: formatDurationClock(values.durationSeconds as number) });
  }

  if (Number.isFinite(values.distance ?? null) && (values.distance ?? 0) > 0) {
    measurementParts.push({ metric: "distance", label: `${formatNumber(values.distance as number)} ${values.distanceUnit ?? "mi"}` });
  }

  if (Number.isFinite(values.calories ?? null) && (values.calories ?? 0) > 0) {
    measurementParts.push({ metric: "calories", label: `${formatNumber(values.calories as number)} cal` });
  }

  return measurementParts;
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
  const items: SummaryItem[] = getMetricSummaryParts(values);

  if (items.length === 0) {
    items.push({ metric: "reps", label: values.emptyLabel ?? "No measurements", tone: "muted" });
  }

  return items;
}

export function formatMeasurementSummaryText(values: Parameters<typeof formatMeasurementSummaryItems>[0]) {
  return formatMeasurementSummaryItems(values).map((item) => item.label).join(" • ");
}

export function formatGoalSummaryText(values: GoalSummaryValues) {
  const enabledMeasurements = values.enabledMeasurements;
  const sanitizedValues = enabledMeasurements
    ? sanitizeEnabledMeasurementValues(
      {
        reps: enabledMeasurements.reps ?? Boolean(values.reps ?? values.repsMax),
        weight: enabledMeasurements.weight ?? Boolean(values.weight),
        time: enabledMeasurements.time ?? Boolean(values.durationSeconds),
        distance: enabledMeasurements.distance ?? Boolean(values.distance),
        calories: enabledMeasurements.calories ?? Boolean(values.calories),
      },
      {
        reps: values.reps,
        weight: values.weight,
        durationSeconds: values.durationSeconds,
        distance: values.distance,
        calories: values.calories,
      },
    )
    : values;

  const metricSummary = getMetricSummaryParts({
    ...values,
    reps: sanitizedValues.reps ?? null,
    weight: sanitizedValues.weight ?? null,
    durationSeconds: sanitizedValues.durationSeconds ?? null,
    distance: sanitizedValues.distance ?? null,
    calories: sanitizedValues.calories ?? null,
  });
  const setCount = formatSetCountLabel(values.sets);
  const content = [setCount, ...metricSummary.map((entry) => entry.label)].filter((part): part is string => Boolean(part)).join(" • ");
  return content ? `Goal: ${content}` : (values.emptyLabel ?? "Goal missing");
}

export function formatGoalInlineSummaryText(values: GoalSummaryValues) {
  const full = formatGoalSummaryText(values);
  return full.startsWith("Goal: ") ? full.slice(6) : full;
}

export function formatCurrentDraftSummaryText(values: GoalSummaryValues) {
  return formatGoalInlineSummaryText(values);
}
