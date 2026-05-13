export type TargetSnapshot = {
  weight?: number | null;
  weightUnit?: "lbs" | "kg" | null;
  reps?: number | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: "mi" | "km" | "m" | null;
  calories?: number | null;
};

export type CapabilityAnchor = {
  exerciseId?: string;
  movementPattern?: string;
  muscleGroup?: string;
  equipmentFamily?: string;
  last?: TargetSnapshot;
  average?: TargetSnapshot;
  best?: TargetSnapshot;
  pr?: TargetSnapshot;
  source: "user_input" | "history" | "routine_target" | "manual_fallback";
};

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function cloneSnapshot(snapshot: TargetSnapshot | null | undefined): TargetSnapshot | undefined {
  return snapshot ? { ...snapshot } : undefined;
}

function scoreSnapshot(snapshot: TargetSnapshot | null | undefined) {
  if (!snapshot) {
    return 0;
  }

  if (isPositiveNumber(snapshot.weight) && isPositiveNumber(snapshot.reps)) {
    return Number((snapshot.weight * (1 + (snapshot.reps / 30))).toFixed(4));
  }

  if (isPositiveNumber(snapshot.weight)) {
    return snapshot.weight;
  }

  if (isPositiveNumber(snapshot.distance)) {
    return snapshot.distance;
  }

  if (isPositiveNumber(snapshot.durationSeconds)) {
    return snapshot.durationSeconds;
  }

  if (isPositiveNumber(snapshot.calories)) {
    return snapshot.calories;
  }

  return 0;
}

function averageSnapshot(rows: TargetSnapshot[]) {
  if (rows.length === 0) {
    return undefined;
  }

  const weightRows = rows.map((row) => row.weight).filter(isPositiveNumber);
  const repRows = rows.map((row) => row.reps).filter(isPositiveNumber);
  const durationRows = rows.map((row) => row.durationSeconds).filter(isPositiveNumber);
  const distanceRows = rows.map((row) => row.distance).filter(isPositiveNumber);
  const calorieRows = rows.map((row) => row.calories).filter(isPositiveNumber);

  const first = rows[0];
  return {
    weight: weightRows.length > 0 ? Number((weightRows.reduce((sum, value) => sum + value, 0) / weightRows.length).toFixed(4)) : null,
    weightUnit: first?.weightUnit ?? null,
    reps: repRows.length > 0 ? Number((repRows.reduce((sum, value) => sum + value, 0) / repRows.length).toFixed(2)) : null,
    durationSeconds: durationRows.length > 0 ? Math.round(durationRows.reduce((sum, value) => sum + value, 0) / durationRows.length) : null,
    distance: distanceRows.length > 0 ? Number((distanceRows.reduce((sum, value) => sum + value, 0) / distanceRows.length).toFixed(3)) : null,
    distanceUnit: first?.distanceUnit ?? null,
    calories: calorieRows.length > 0 ? Number((calorieRows.reduce((sum, value) => sum + value, 0) / calorieRows.length).toFixed(1)) : null,
  } satisfies TargetSnapshot;
}

export function estimateOneRepMax(args: {
  weight?: number | null;
  reps?: number | null;
}) {
  if (!isPositiveNumber(args.weight) || !isPositiveNumber(args.reps)) {
    return null;
  }

  return Number((args.weight * (1 + (args.reps / 30))).toFixed(4));
}

export function resolveCapabilityAnchor(args: {
  exerciseId?: string;
  movementPattern?: string;
  muscleGroup?: string;
  equipmentFamily?: string;
  recentLogs?: TargetSnapshot[] | null;
  routineTarget?: TargetSnapshot | null;
  userAnchor?: Partial<CapabilityAnchor> | null;
}): CapabilityAnchor {
  const recentLogs = Array.isArray(args.recentLogs)
    ? args.recentLogs.map((row) => ({ ...row }))
    : [];
  const routineTarget = cloneSnapshot(args.routineTarget);
  const userAnchor = args.userAnchor ?? null;

  if (recentLogs.length > 0) {
    const best = recentLogs.reduce((currentBest, row) => (
      scoreSnapshot(row) > scoreSnapshot(currentBest) ? row : currentBest
    ), recentLogs[0]);

    return {
      exerciseId: args.exerciseId,
      movementPattern: args.movementPattern,
      muscleGroup: args.muscleGroup,
      equipmentFamily: args.equipmentFamily,
      last: cloneSnapshot(recentLogs[0]),
      average: averageSnapshot(recentLogs),
      best: cloneSnapshot(best),
      pr: cloneSnapshot(best),
      source: "history",
    };
  }

  if (routineTarget) {
    return {
      exerciseId: args.exerciseId,
      movementPattern: args.movementPattern,
      muscleGroup: args.muscleGroup,
      equipmentFamily: args.equipmentFamily,
      last: cloneSnapshot(routineTarget),
      average: cloneSnapshot(routineTarget),
      best: cloneSnapshot(routineTarget),
      pr: cloneSnapshot(routineTarget),
      source: "routine_target",
    };
  }

  if (userAnchor) {
    return {
      exerciseId: args.exerciseId,
      movementPattern: args.movementPattern,
      muscleGroup: args.muscleGroup,
      equipmentFamily: args.equipmentFamily,
      last: cloneSnapshot(userAnchor.last),
      average: cloneSnapshot(userAnchor.average),
      best: cloneSnapshot(userAnchor.best),
      pr: cloneSnapshot(userAnchor.pr ?? userAnchor.best ?? userAnchor.last),
      source: "user_input",
    };
  }

  return {
    exerciseId: args.exerciseId,
    movementPattern: args.movementPattern,
    muscleGroup: args.muscleGroup,
    equipmentFamily: args.equipmentFamily,
    source: "manual_fallback",
  };
}
