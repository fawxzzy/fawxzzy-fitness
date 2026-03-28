import { formatSetCountLabel } from "./measurement-display";

export type SessionQuickLogTarget = {
  repsMin?: number;
  repsMax?: number;
  weightMin?: number;
  weightMax?: number;
  weightUnit?: "lbs" | "kg";
  durationSeconds?: number;
  distance?: number;
  distanceUnit?: "mi" | "km" | "m";
  calories?: number;
  measurementType?: "reps" | "time" | "distance" | "time_distance";
};

type QuickLogPayload = {
  weight: number;
  reps: number;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: "mi" | "km" | "m" | null;
  calories: number | null;
  weightUnit: "lbs" | "kg";
};

type QuickLogResolution =
  | { ok: true; payload: QuickLogPayload }
  | { ok: false; reason: string };

function hasValue(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function formatDurationPreview(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatRange(min?: number, max?: number, suffix = "") {
  const hasMin = hasValue(min);
  const hasMax = hasValue(max);
  if (hasMin && hasMax && min !== max) return `${min}–${max}${suffix}`;
  if (hasMin) return `${min}${suffix}`;
  if (hasMax) return `${max}${suffix}`;
  return null;
}

export function formatQuickLogPreviewLabel({
  target,
  loggedSetCount,
  targetSetsMin,
  targetSetsMax,
  fallbackWeightUnit,
}: {
  target: SessionQuickLogTarget | undefined;
  loggedSetCount: number;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  fallbackWeightUnit: "lbs" | "kg";
}) {
  const weightUnit = target?.weightUnit ?? fallbackWeightUnit;
  const repsSummary = formatRange(target?.repsMin, target?.repsMax, " reps");
  const weightSummary = formatRange(target?.weightMin, target?.weightMax, ` ${weightUnit}`);
  const durationSummary = hasValue(target?.durationSeconds) ? formatDurationPreview(Number(target?.durationSeconds)) : null;
  const distanceSummary = hasValue(target?.distance) ? `${target?.distance} ${target?.distanceUnit ?? "mi"}` : null;
  const caloriesSummary = hasValue(target?.calories) ? `${target?.calories} cal` : null;

  const measurementType = target?.measurementType ?? "reps";
  const metricSummaryByType: Record<"reps" | "time" | "distance" | "time_distance", string | null> = {
    reps: [repsSummary, weightSummary].filter(Boolean).join(" • ") || null,
    time: [durationSummary, caloriesSummary].filter(Boolean).join(" • ") || null,
    distance: [distanceSummary, durationSummary, caloriesSummary].filter(Boolean).join(" • ") || null,
    time_distance: [durationSummary, distanceSummary, caloriesSummary].filter(Boolean).join(" • ") || null,
  };

  const primarySummary = metricSummaryByType[measurementType] ?? null;
  if (primarySummary) {
    return primarySummary;
  }

  const nextSet = loggedSetCount + 1;
  const goalSetCount = targetSetsMax ?? targetSetsMin;
  if (goalSetCount && goalSetCount > 0) {
    return `Set ${nextSet} of ${goalSetCount}`;
  }

  return formatSetCountLabel(nextSet) ?? `Set ${nextSet}`;
}

export function resolveQuickLogFromTarget(target: SessionQuickLogTarget | undefined, fallbackWeightUnit: "lbs" | "kg"): QuickLogResolution {
  if (!target) {
    return { ok: false, reason: "No goal target available for quick log." };
  }

  const reps = target.repsMin ?? target.repsMax;
  const weight = target.weightMin ?? target.weightMax ?? 0;
  const durationSeconds = target.durationSeconds ?? null;
  const distance = target.distance ?? null;
  const calories = target.calories ?? null;
  const distanceUnit = target.distanceUnit ?? null;

  if (target.measurementType === "reps") {
    if (!hasValue(reps)) {
      return { ok: false, reason: "Quick Log needs a reps goal for this exercise." };
    }

    const resolvedReps = Number(reps);

    return {
      ok: true,
      payload: {
        weight,
        reps: resolvedReps,
        durationSeconds: null,
        distance: null,
        distanceUnit: null,
        calories: null,
        weightUnit: target.weightUnit ?? fallbackWeightUnit,
      },
    };
  }

  if (target.measurementType === "time") {
    if (!hasValue(durationSeconds ?? undefined)) {
      return { ok: false, reason: "Quick Log needs a duration goal for this exercise." };
    }

    const resolvedDurationSeconds = Number(durationSeconds);

    return {
      ok: true,
      payload: {
        weight: 0,
        reps: 0,
        durationSeconds: resolvedDurationSeconds,
        distance: null,
        distanceUnit: null,
        calories,
        weightUnit: target.weightUnit ?? fallbackWeightUnit,
      },
    };
  }

  if (target.measurementType === "distance" || target.measurementType === "time_distance") {
    if (!hasValue(durationSeconds ?? undefined) && !hasValue(distance ?? undefined)) {
      return { ok: false, reason: "Quick Log needs a duration or distance goal for this exercise." };
    }

    if (distance !== null && !distanceUnit) {
      return { ok: false, reason: "Quick Log needs a distance unit before it can log this goal." };
    }

    const resolvedDurationSeconds = durationSeconds === null ? null : Number(durationSeconds);

    return {
      ok: true,
      payload: {
        weight: 0,
        reps: 0,
        durationSeconds: resolvedDurationSeconds,
        distance,
        distanceUnit,
        calories,
        weightUnit: target.weightUnit ?? fallbackWeightUnit,
      },
    };
  }

  return { ok: false, reason: "Quick Log could not determine a single goal target for this exercise." };
}
