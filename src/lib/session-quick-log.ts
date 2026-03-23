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
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
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
