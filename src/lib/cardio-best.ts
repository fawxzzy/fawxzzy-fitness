import { formatDistance, formatDurationShort, formatPace, positive } from "@/lib/exercise-stats-formatting";

type DistanceUnit = "mi" | "km" | "m";

type CardioBestInput = {
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: string | null;
};

export type CardioBestMetric = {
  kind: "pace" | "duration" | "distance";
  label: "Best pace" | "Best duration" | "Best distance";
  value: string;
};

export function isCardioMeasurementType(measurementType: string | null | undefined) {
  const normalized = String(measurementType ?? "").trim().toLowerCase();
  return normalized === "time"
    || normalized === "distance"
    || normalized === "time_distance"
    || normalized === "duration";
}

export function resolveEffectiveKind(
  measurementType: string | null | undefined,
  hasDurationSignal: boolean,
  hasDistanceSignal: boolean,
): "strength" | "cardio" {
  const hasCardioSignal = hasDurationSignal || hasDistanceSignal;
  const isExplicitCardio = isCardioMeasurementType(measurementType);

  if (isExplicitCardio) {
    return hasCardioSignal ? "cardio" : "strength";
  }

  return hasCardioSignal ? "cardio" : "strength";
}

export function getDisplayPace(durationSeconds: number, distance: number, distanceUnit: DistanceUnit | null) {
  const safeDuration = positive(durationSeconds);
  const safeDistance = positive(distance);
  if (safeDuration <= 0 || safeDistance <= 0 || !distanceUnit) return null;

  if (distanceUnit === "m") {
    const distanceKm = safeDistance / 1000;
    if (distanceKm <= 0) return null;
    return { paceSecondsPerUnit: safeDuration / distanceKm, distanceUnit: "km" as const };
  }

  return { paceSecondsPerUnit: safeDuration / safeDistance, distanceUnit };
}

export function chooseCardioBestMetric(args: CardioBestInput): CardioBestMetric | null {
  const duration = positive(args.durationSeconds);
  const distance = positive(args.distance);
  const normalizedDistanceUnit = args.distanceUnit === "mi" || args.distanceUnit === "km" || args.distanceUnit === "m"
    ? args.distanceUnit
    : null;

  if (duration <= 0 && distance > 0) {
    const value = formatDistance(distance, normalizedDistanceUnit);
    return value ? { kind: "distance", label: "Best distance", value } : null;
  }

  if (duration > 0 && distance > 0) {
    const pace = getDisplayPace(duration, distance, normalizedDistanceUnit);
    const value = formatPace(pace?.paceSecondsPerUnit, pace?.distanceUnit);
    return value ? { kind: "pace", label: "Best pace", value } : null;
  }

  if (duration > 0) {
    const value = formatDurationShort(duration);
    return value ? { kind: "duration", label: "Best duration", value } : null;
  }

  if (distance > 0) {
    const value = formatDistance(distance, normalizedDistanceUnit);
    return value ? { kind: "distance", label: "Best distance", value } : null;
  }

  return null;
}

export function shouldShowCardioBest(args: {
  measurementType?: string | null;
  bestDurationSeconds?: number | null;
  bestDistance?: number | null;
}) {
  const normalized = String(args.measurementType ?? "").trim().toLowerCase();
  const isExplicitStrength = normalized === "reps";
  if (isExplicitStrength) return false;

  const hasCardioMetrics = positive(args.bestDurationSeconds) > 0 || positive(args.bestDistance) > 0;
  return hasCardioMetrics;
}

if (process.env.NODE_ENV === "development") {
  const sanityCases: Array<{ input: CardioBestInput; expected: CardioBestMetric["kind"] | null }> = [
    { input: { durationSeconds: 600, distance: 2, distanceUnit: "mi" }, expected: "pace" },
    { input: { durationSeconds: 600, distance: null, distanceUnit: "mi" }, expected: "duration" },
    { input: { durationSeconds: null, distance: 2, distanceUnit: "mi" }, expected: "distance" },
    { input: { durationSeconds: null, distance: null, distanceUnit: "mi" }, expected: null },
  ];

  for (const testCase of sanityCases) {
    const actual = chooseCardioBestMetric(testCase.input)?.kind ?? null;
    if (actual !== testCase.expected) {
      console.warn("[cardio-best] invariant warning", { testCase, actual });
    }
  }
}
