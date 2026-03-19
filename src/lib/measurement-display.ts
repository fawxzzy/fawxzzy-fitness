import { formatDurationClock } from "@/lib/duration";

export type MeasurementMetric = "reps" | "weight" | "time" | "distance" | "calories";

type SummaryItem = {
  metric: MeasurementMetric;
  label: string;
  tone?: "default" | "muted";
};

type GoalSummaryValues = {
  sets?: number | null;
  reps?: number | null;
  repsMax?: number | null;
  weight?: number | null;
  weightUnit?: string | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: string | null;
  calories?: number | null;
  emptyLabel?: string;
};

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
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

function formatGoalSummaryCore(values: GoalSummaryValues) {
  const measurementParts: string[] = [];
  if (Number.isFinite(values.sets ?? null) && (values.sets ?? 0) > 0) {
    measurementParts.push(`${Math.floor(values.sets as number)} sets`);
  }

  const repRange = formatRepRange(values.reps, values.repsMax);
  if (repRange) {
    measurementParts.push(repRange);
  }

  if (Number.isFinite(values.durationSeconds ?? null) && (values.durationSeconds ?? 0) > 0) {
    measurementParts.push(formatDurationClock(values.durationSeconds as number));
  }

  if (Number.isFinite(values.distance ?? null) && (values.distance ?? 0) > 0) {
    measurementParts.push(`${formatNumber(values.distance as number)} ${values.distanceUnit ?? "mi"}`);
  }

  if (Number.isFinite(values.calories ?? null) && (values.calories ?? 0) > 0) {
    measurementParts.push(`${formatNumber(values.calories as number)} cal`);
  }

  const weightPart = Number.isFinite(values.weight ?? null) && (values.weight ?? 0) > 0
    ? `${formatNumber(values.weight as number)} ${values.weightUnit ?? "lbs"}`
    : null;

  return {
    measurementText: measurementParts.join(" • "),
    weightPart,
  };
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
    items.push({ metric: "weight", label: `${formatNumber(values.weight as number)} ${values.weightUnit ?? "lbs"}` });
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

export function formatGoalSummaryText(values: GoalSummaryValues) {
  const { measurementText, weightPart } = formatGoalSummaryCore(values);
  const content = [measurementText || null, weightPart].filter((part): part is string => Boolean(part)).join(" — ");
  return `Goal: ${content || (values.emptyLabel ?? "Open goal")}`;
}
