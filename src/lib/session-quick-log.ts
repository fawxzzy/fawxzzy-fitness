import { formatDurationPreview } from "./duration";
import type { FitnessDistanceUnit } from "./fitness-distance-units";
import { SESSION_FEEDBACK_SUMMARY_SEPARATOR } from "./session-feedback-ui";

export type SessionQuickLogTarget = {
  repsMin?: number;
  repsMax?: number;
  weightMin?: number;
  weightMax?: number;
  weightUnit?: "lbs" | "kg";
  durationSeconds?: number;
  distance?: number;
  distanceUnit?: FitnessDistanceUnit;
  calories?: number;
  measurementType?: "reps" | "time" | "distance" | "time_distance" | "none";
  allowMeasurementlessLog?: boolean;
};

export type SessionQuickLogSource = "goal" | "next" | "last" | "best";

type QuickLogPayload = {
  weight: number;
  reps: number;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: FitnessDistanceUnit | null;
  calories: number | null;
  weightUnit: "lbs" | "kg";
};

type QuickLogResolution =
  | { ok: true; payload: QuickLogPayload }
  | { ok: false; reason: string };

export type EffectiveSessionQuickLogTarget = {
  source: SessionQuickLogSource;
  target: SessionQuickLogTarget;
};

function hasValue(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function resolveSingleValue(min?: number, max?: number) {
  if (hasValue(max)) return max ?? null;
  if (hasValue(min)) return min ?? null;
  return null;
}

function hasTargetMetrics(target: SessionQuickLogTarget | undefined) {
  if (!target) return false;
  if (target.allowMeasurementlessLog || target.measurementType === "none") {
    return true;
  }

  const measurementType = target.measurementType ?? "reps";
  if (measurementType === "reps") {
    return hasValue(resolveSingleValue(target.repsMin, target.repsMax) ?? undefined)
      || hasValue(resolveSingleValue(target.weightMin, target.weightMax) ?? undefined);
  }

  if (measurementType === "time") {
    return hasValue(target.durationSeconds);
  }

  if (measurementType === "distance" || measurementType === "time_distance") {
    return hasValue(target.durationSeconds) || hasValue(target.distance) || hasValue(target.calories);
  }

  return false;
}

export function toQuickLogTargetFromSuggestedValues(
  values: {
    measurementType: "reps" | "time" | "distance" | "time_distance" | "none";
    weight: number | null;
    reps: number | null;
    durationSeconds: number | null;
    distance: number | null;
    distanceUnit: FitnessDistanceUnit | null;
    calories: number | null;
    weightUnit: "lbs" | "kg" | null;
  } | null | undefined,
): SessionQuickLogTarget | undefined {
  if (!values) {
    return undefined;
  }

  return {
    measurementType: values.measurementType,
    repsMin: values.reps ?? undefined,
    repsMax: values.reps ?? undefined,
    weightMin: values.weight ?? undefined,
    weightMax: values.weight ?? undefined,
    weightUnit: values.weightUnit ?? undefined,
    durationSeconds: values.durationSeconds ?? undefined,
    distance: values.distance ?? undefined,
    distanceUnit: values.distanceUnit ?? undefined,
    calories: values.calories ?? undefined,
  };
}

export function resolveEffectiveQuickLogTarget(args: {
  quickLogTarget?: SessionQuickLogTarget;
  nextTarget?: SessionQuickLogTarget;
  lastTarget?: SessionQuickLogTarget;
  bestTarget?: SessionQuickLogTarget;
}): EffectiveSessionQuickLogTarget | null {
  const candidates: Array<EffectiveSessionQuickLogTarget | null> = [
    args.quickLogTarget ? { source: "goal", target: args.quickLogTarget } : null,
    args.nextTarget ? { source: "next", target: args.nextTarget } : null,
    args.lastTarget ? { source: "last", target: args.lastTarget } : null,
    args.bestTarget ? { source: "best", target: args.bestTarget } : null,
  ];

  return candidates.find((candidate) => candidate !== null && hasTargetMetrics(candidate.target)) ?? null;
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
  const repsValue = resolveSingleValue(target?.repsMin, target?.repsMax);
  const weightValue = resolveSingleValue(target?.weightMin, target?.weightMax);
  const repsSummary = hasValue(repsValue ?? undefined) ? `${repsValue} reps` : null;
  const weightSummary = hasValue(weightValue ?? undefined) ? `${weightValue} ${weightUnit}` : null;
  const durationSummary = hasValue(target?.durationSeconds) ? formatDurationPreview(Number(target?.durationSeconds)) : null;
  const distanceSummary = hasValue(target?.distance) ? `${target?.distance} ${target?.distanceUnit ?? "mi"}` : null;
  const caloriesSummary = hasValue(target?.calories) ? `${target?.calories} cal` : null;

  const measurementType = target?.measurementType ?? "reps";
  if (target?.allowMeasurementlessLog || measurementType === "none") {
    return "";
  }

  const joinSummaryParts = (...parts: Array<string | null>) =>
    parts.filter(Boolean).join(SESSION_FEEDBACK_SUMMARY_SEPARATOR) || null;

  const metricSummaryByType: Record<"reps" | "time" | "distance" | "time_distance" | "none", string | null> = {
    reps: joinSummaryParts(repsSummary, weightSummary),
    time: joinSummaryParts(durationSummary, caloriesSummary),
    distance: joinSummaryParts(distanceSummary, durationSummary, caloriesSummary),
    time_distance: joinSummaryParts(durationSummary, distanceSummary, caloriesSummary),
    none: null,
  };

  const primarySummary = metricSummaryByType[measurementType] ?? null;
  if (primarySummary) {
    return primarySummary;
  }

  void loggedSetCount;
  void targetSetsMin;
  void targetSetsMax;
  return "";
}

export function formatQuickLogPreviewLabelForResolvedTarget({
  resolvedTarget,
  loggedSetCount,
  targetSetsMin,
  targetSetsMax,
  fallbackWeightUnit,
}: {
  resolvedTarget: EffectiveSessionQuickLogTarget | null;
  loggedSetCount: number;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  fallbackWeightUnit: "lbs" | "kg";
}) {
  return formatQuickLogPreviewLabel({
    target: resolvedTarget?.target,
    loggedSetCount,
    targetSetsMin,
    targetSetsMax,
    fallbackWeightUnit,
  });
}

export function resolveQuickLogFromResolvedTarget(
  resolvedTarget: EffectiveSessionQuickLogTarget | null,
  fallbackWeightUnit: "lbs" | "kg",
): QuickLogResolution {
  if (!resolvedTarget) {
    return { ok: false, reason: "No goal, next, last, or best quick log target is available." };
  }

  return resolveQuickLogFromTarget(resolvedTarget.target, fallbackWeightUnit);
}

export function resolveQuickLogFromTarget(target: SessionQuickLogTarget | undefined, fallbackWeightUnit: "lbs" | "kg"): QuickLogResolution {
  if (!target) {
    return { ok: false, reason: "No goal target available for quick log." };
  }

  if (target.allowMeasurementlessLog || target.measurementType === "none") {
    return {
      ok: true,
      payload: {
        weight: 0,
        reps: 0,
        durationSeconds: null,
        distance: null,
        distanceUnit: null,
        calories: null,
        weightUnit: target.weightUnit ?? fallbackWeightUnit,
      },
    };
  }

  const reps = target.repsMax ?? target.repsMin;
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
