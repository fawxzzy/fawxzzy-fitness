import { formatDurationPreview } from "./duration";
import { normalizeWeightDisplayUnit } from "./formatting";
import { formatDistanceNumber, formatDistanceUnitLabel } from "./fitness-distance-units";
import { sanitizeEnabledMeasurementValues, type EnabledMeasurements } from "./measurement-sanitization";

export type MeasurementMetric = "reps" | "weight" | "time" | "distance" | "calories";
export type GoalSummaryMetric = MeasurementMetric | "sets";

type SummaryItem = {
  metric: MeasurementMetric;
  label: string;
  tone?: "default" | "muted";
};

export type GoalSummaryItem = {
  metric: GoalSummaryMetric;
  label: string;
  tone?: "default" | "muted";
};

export type GoalSummaryValues = {
  sets?: number | null;
  reps?: number | null;
  repsMax?: number | null;
  failure?: boolean;
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
  return formatDistanceNumber(value);
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
  if (Number.isFinite(repsMax ?? null) && (repsMax ?? 0) >= 0) {
    const maxReps = Math.floor(repsMax as number);
    return minReps === maxReps ? `${minReps} reps` : `${minReps}–${maxReps} reps`;
  }

  return `${minReps} reps`;
}

function getMetricSummaryParts(values: {
  reps?: number | null;
  repsMax?: number | null;
  failure?: boolean;
  weight?: number | null;
  weightUnit?: string | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: string | null;
  calories?: number | null;
}): SummaryItem[] {
  const measurementParts: SummaryItem[] = [];

  if (values.failure) {
    measurementParts.push({ metric: "reps", label: "Failure" });
  }

  const repRange = values.failure ? null : formatRepRange(values.reps, values.repsMax);
  if (repRange) {
    measurementParts.push({ metric: "reps", label: repRange });
  }

  if (Number.isFinite(values.weight ?? null) && (values.weight ?? 0) > 0) {
    measurementParts.push({
      metric: "weight",
      label: `${formatNumber(values.weight as number)} ${normalizeWeightDisplayUnit(values.weightUnit) ?? "lbs"}`,
    });
  }

  if (Number.isFinite(values.durationSeconds ?? null) && (values.durationSeconds ?? 0) > 0) {
    measurementParts.push({ metric: "time", label: formatDurationPreview(values.durationSeconds as number) });
  }

  if (Number.isFinite(values.distance ?? null) && (values.distance ?? 0) > 0) {
    measurementParts.push({
      metric: "distance",
      label: `${formatDistanceNumber(values.distance as number, values.distanceUnit)} ${formatDistanceUnitLabel(values.distanceUnit) ?? "mi"}`,
    });
  }

  if (Number.isFinite(values.calories ?? null) && (values.calories ?? 0) > 0) {
    measurementParts.push({ metric: "calories", label: `${formatNumber(values.calories as number)} cal` });
  }

  return measurementParts;
}

function getSanitizedGoalMeasurementValues(values: GoalSummaryValues) {
  const enabledMeasurements = values.enabledMeasurements;
  return enabledMeasurements
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
  const items = getMetricSummaryParts(values);

  if (items.length === 0) {
    items.push({ metric: "reps", label: values.emptyLabel ?? "No measurements", tone: "muted" });
  }

  return items;
}

export function formatMeasurementSummaryText(values: Parameters<typeof formatMeasurementSummaryItems>[0]) {
  return formatMeasurementSummaryItems(values).map((item) => item.label).join(" • ");
}

export function formatGoalSummaryItems(values: GoalSummaryValues): GoalSummaryItem[] {
  const sanitizedValues = getSanitizedGoalMeasurementValues(values);
  const metricSummary = getMetricSummaryParts({
    ...values,
    failure: values.failure,
    reps: sanitizedValues.reps ?? null,
    weight: sanitizedValues.weight ?? null,
    durationSeconds: sanitizedValues.durationSeconds ?? null,
    distance: sanitizedValues.distance ?? null,
    calories: sanitizedValues.calories ?? null,
  });
  const setCount = formatSetCountLabel(values.sets);
  const items: GoalSummaryItem[] = [];

  if (setCount) {
    items.push({ metric: "sets", label: setCount });
  }

  items.push(...metricSummary);

  if (items.length === 0) {
    items.push({ metric: "sets", label: values.emptyLabel ?? "Goal missing", tone: "muted" });
  }

  return items;
}

export function formatGoalSummaryText(values: GoalSummaryValues) {
  const items = formatGoalSummaryItems(values);
  const content = items.map((item) => item.label).join(" • ");
  return items[0]?.tone === "muted" ? content : `Goal: ${content}`;
}

export function formatGoalInlineSummaryText(values: GoalSummaryValues) {
  const full = formatGoalSummaryText(values);
  return full.startsWith("Goal: ") ? full.slice(6) : full;
}

export function formatCurrentDraftSummaryText(values: GoalSummaryValues) {
  return formatGoalInlineSummaryText(values);
}
