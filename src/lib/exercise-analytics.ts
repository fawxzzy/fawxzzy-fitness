function formatCompactNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatDurationShort(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0m";
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }

  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

function normalizeUnit(unit: string | null | undefined) {
  if (unit === "lb" || unit === "lbs") return "lbs";
  if (unit === "kg") return "kg";
  return "";
}

function resolveCardioPrimaryMetric(measurementType: string | null | undefined): "distance" | "duration" | "calories" | "effort" {
  const normalized = String(measurementType ?? "").trim().toLowerCase();
  if (normalized === "distance") return "distance";
  if (normalized === "duration" || normalized === "time" || normalized === "time_distance") return "duration";
  if (normalized === "calories") return "calories";
  return "effort";
}

export function formatSignedDelta(delta: number, suffix = "") {
  if (Math.abs(delta) < 0.001) return "Matched best";
  return `${delta > 0 ? "+" : "-"}${formatCompactNumber(Math.abs(delta))}${suffix} vs best`;
}

export function buildStrengthDeltaFromBest(args: {
  bestWeight: number;
  bestRepsAtBestWeight: number;
  lastWeight: number;
  lastReps: number;
  unit: string | null;
  bestBodyweightReps: number;
  lastBodyweightReps: number;
}) {
  const normalizedUnit = normalizeUnit(args.unit);

  if (args.bestWeight > 0 && args.lastWeight > 0) {
    if (args.lastWeight !== args.bestWeight) {
      return formatSignedDelta(args.lastWeight - args.bestWeight, normalizedUnit);
    }

    if (args.bestRepsAtBestWeight > 0 && args.lastReps > 0 && args.lastReps !== args.bestRepsAtBestWeight) {
      return formatSignedDelta(args.lastReps - args.bestRepsAtBestWeight, " reps");
    }

    return "Matched best";
  }

  if (args.bestBodyweightReps > 0 && args.lastBodyweightReps > 0) {
    return formatSignedDelta(args.lastBodyweightReps - args.bestBodyweightReps, " reps");
  }

  return null;
}

export function buildCardioDeltaFromBest(args: {
  latest: {
    durationSeconds: number;
    distance: number;
    distanceUnit: string | null;
    calories: number;
  } | null;
  best: {
    durationSeconds: number;
    distance: number;
    distanceUnit: string | null;
    calories: number;
  } | null;
  measurementType: string | null;
}) {
  const { latest, best, measurementType } = args;
  if (!latest || !best) return null;

  const priority = resolveCardioPrimaryMetric(measurementType);
  if (priority === "distance" && latest.distance > 0 && best.distance > 0) {
    return formatSignedDelta(latest.distance - best.distance, latest.distanceUnit ?? best.distanceUnit ?? "");
  }

  if (priority === "calories" && latest.calories > 0 && best.calories > 0) {
    return formatSignedDelta(latest.calories - best.calories, " cal");
  }

  if (latest.durationSeconds > 0 && best.durationSeconds > 0) {
    if (latest.durationSeconds === best.durationSeconds) return "Matched best";
    return `${latest.durationSeconds > best.durationSeconds ? "+" : "-"}${formatDurationShort(Math.abs(latest.durationSeconds - best.durationSeconds))} vs best`;
  }

  return null;
}

export function buildStrengthProgressDelta(
  latest: {
    weight: number;
    reps: number;
    unit: string | null;
    bodyweightReps: number;
  } | null,
  previous: {
    weight: number;
    reps: number;
    unit: string | null;
    bodyweightReps: number;
  } | null,
) {
  if (!latest || !previous) return null;

  const normalizedUnit = normalizeUnit(latest.unit) || normalizeUnit(previous.unit);

  if (latest.weight > 0 && previous.weight > 0) {
    if (latest.weight !== previous.weight) {
      const delta = latest.weight - previous.weight;
      return `${delta > 0 ? "+" : "-"}${formatCompactNumber(Math.abs(delta))}${normalizedUnit} vs previous`;
    }
    if (latest.reps > 0 && previous.reps > 0 && latest.reps !== previous.reps) {
      const delta = latest.reps - previous.reps;
      return `${delta > 0 ? "+" : "-"}${formatCompactNumber(Math.abs(delta))} reps vs previous`;
    }
    return "Matched previous";
  }

  if (latest.bodyweightReps > 0 && previous.bodyweightReps > 0) {
    if (latest.bodyweightReps === previous.bodyweightReps) {
      return "Matched previous";
    }
    const delta = latest.bodyweightReps - previous.bodyweightReps;
    return `${delta > 0 ? "+" : "-"}${formatCompactNumber(Math.abs(delta))} reps vs previous`;
  }

  return null;
}

export function buildCardioProgressDelta(
  latest: {
    durationSeconds: number;
    distance: number;
    distanceUnit: string | null;
    calories: number;
  } | null,
  previous: {
    durationSeconds: number;
    distance: number;
    distanceUnit: string | null;
    calories: number;
  } | null,
  measurementType: string | null | undefined,
) {
  if (!latest || !previous) return null;

  const priority = resolveCardioPrimaryMetric(measurementType);
  if (priority === "distance" && latest.distance > 0 && previous.distance > 0) {
    const delta = latest.distance - previous.distance;
    if (Math.abs(delta) < 0.001) return "Matched previous";
    return `${delta > 0 ? "+" : "-"}${formatCompactNumber(Math.abs(delta))}${latest.distanceUnit ?? previous.distanceUnit ?? ""} vs previous`;
  }

  if (priority === "calories" && latest.calories > 0 && previous.calories > 0) {
    const delta = latest.calories - previous.calories;
    if (Math.abs(delta) < 0.001) return "Matched previous";
    return `${delta > 0 ? "+" : "-"}${formatCompactNumber(Math.abs(delta))} cal vs previous`;
  }

  if (latest.durationSeconds > 0 && previous.durationSeconds > 0) {
    if (latest.durationSeconds === previous.durationSeconds) return "Matched previous";
    const delta = Math.abs(latest.durationSeconds - previous.durationSeconds);
    return `${latest.durationSeconds > previous.durationSeconds ? "+" : "-"}${formatDurationShort(delta)} vs previous`;
  }

  return null;
}
