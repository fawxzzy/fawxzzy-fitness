import { positive } from "./exercise-stats-formatting";

export type CompletedSessionRow = {
  performed_at: string;
  status: "completed" | "in_progress";
};

export type HistoricalSetRow = {
  set_index: number;
  weight: number | null;
  reps: number | null;
  weight_unit?: "lbs" | "lb" | "kg" | null;
  duration_seconds?: number | null;
  distance?: number | null;
  calories?: number | null;
  distance_unit?: "mi" | "km" | "m" | null;
  session_exercise:
    | {
        session_id: string;
        exercise_id?: string | null;
        session:
          | CompletedSessionRow
          | CompletedSessionRow[]
          | null;
      }
    | Array<{
        session_id: string;
        exercise_id?: string | null;
        session:
          | CompletedSessionRow
          | CompletedSessionRow[]
          | null;
      }>
    | null;
};

export type NormalizedHistoricalSet = {
  exerciseId: string;
  sessionId: string;
  performedAt: string;
  status: "completed" | "in_progress" | null;
  set_index: number;
  weight: number | null;
  reps: number | null;
  weight_unit: "lbs" | "lb" | "kg" | null;
  duration_seconds: number | null;
  distance: number | null;
  calories: number | null;
  distance_unit: "mi" | "km" | "m" | null;
};

export type AggregatedExerciseStats = {
  exercise_id: string;
  last_weight: number | null;
  last_reps: number | null;
  last_unit: string | null;
  last_performed_at: string | null;
  pr_weight: number | null;
  pr_reps: number | null;
  pr_est_1rm: number | null;
  pr_achieved_at: string | null;
  actual_pr_weight: number | null;
  actual_pr_reps: number | null;
  actual_pr_at: string | null;
};

export type CardioSessionAggregate = {
  performedAt: string;
  setIndex: number;
  durationSeconds: number;
  distance: number;
  distanceUnit: "mi" | "km" | "m" | null;
  calories: number;
};

export function computeEstimated1rm(weight: number, reps: number) {
  return weight * (1 + reps / 30);
}

export function normalizeHistoricalSet(row: HistoricalSetRow): NormalizedHistoricalSet | null {
  const sessionExercise = Array.isArray(row.session_exercise)
    ? (row.session_exercise[0] ?? null)
    : (row.session_exercise ?? null);
  const session = Array.isArray(sessionExercise?.session)
    ? (sessionExercise?.session[0] ?? null)
    : (sessionExercise?.session ?? null);

  if (!sessionExercise?.session_id || !session?.performed_at) {
    return null;
  }

  return {
    exerciseId: sessionExercise.exercise_id ?? "",
    sessionId: sessionExercise.session_id,
    performedAt: session.performed_at,
    status: session.status ?? null,
    set_index: row.set_index,
    weight: row.weight ?? null,
    reps: row.reps ?? null,
    weight_unit: row.weight_unit ?? null,
    duration_seconds: row.duration_seconds ?? null,
    distance: row.distance ?? null,
    calories: row.calories ?? null,
    distance_unit: row.distance_unit ?? null,
  };
}

export function groupNormalizedSetsByExercise(rows: HistoricalSetRow[]): Map<string, NormalizedHistoricalSet[]> {
  const grouped = new Map<string, NormalizedHistoricalSet[]>();

  for (const row of rows) {
    const normalized = normalizeHistoricalSet(row);
    if (!normalized?.exerciseId || normalized.status !== "completed") {
      continue;
    }
    const current = grouped.get(normalized.exerciseId) ?? [];
    current.push(normalized);
    grouped.set(normalized.exerciseId, current);
  }

  return grouped;
}

function compareByRecency(a: NormalizedHistoricalSet, b: NormalizedHistoricalSet) {
  if (b.performedAt !== a.performedAt) {
    return b.performedAt.localeCompare(a.performedAt);
  }
  return b.set_index - a.set_index;
}

export function aggregateExerciseStatsFromSets(rows: HistoricalSetRow[]): Map<string, AggregatedExerciseStats> {
  const grouped = groupNormalizedSetsByExercise(rows);
  const aggregates = new Map<string, AggregatedExerciseStats>();

  for (const [exerciseId, sets] of grouped.entries()) {
    const ordered = [...sets].sort(compareByRecency);
    const lastSet = ordered[0] ?? null;

    const prSet = ordered
      .filter((set) => positive(set.weight) > 0 && positive(set.reps) > 0)
      .map((set) => ({
        set,
        est1rm: computeEstimated1rm(set.weight ?? 0, set.reps ?? 0),
      }))
      .sort((a, b) => {
        if (b.est1rm !== a.est1rm) return b.est1rm - a.est1rm;
        if (b.set.performedAt !== a.set.performedAt) {
          return b.set.performedAt.localeCompare(a.set.performedAt);
        }
        return b.set.set_index - a.set.set_index;
      })[0] ?? null;

    const actualPrSet = ordered
      .filter((set) => positive(set.weight) > 0 || positive(set.reps) > 0)
      .sort((a, b) => {
        const aWeight = positive(a.weight);
        const bWeight = positive(b.weight);
        if (bWeight !== aWeight) return bWeight - aWeight;

        const aReps = positive(a.reps);
        const bReps = positive(b.reps);
        if (bReps !== aReps) return bReps - aReps;

        if (b.performedAt !== a.performedAt) {
          return b.performedAt.localeCompare(a.performedAt);
        }

        return b.set_index - a.set_index;
      })[0] ?? null;

    if (!lastSet && !prSet) {
      continue;
    }

    aggregates.set(exerciseId, {
      exercise_id: exerciseId,
      last_weight: positive(lastSet?.weight) > 0 ? lastSet?.weight ?? null : null,
      last_reps: positive(lastSet?.reps) > 0 ? lastSet?.reps ?? null : null,
      last_unit: lastSet?.weight_unit ?? null,
      last_performed_at: lastSet?.performedAt ?? null,
      pr_weight: prSet?.set.weight ?? null,
      pr_reps: prSet?.set.reps ?? null,
      pr_est_1rm: prSet?.est1rm ?? null,
      pr_achieved_at: prSet?.set.performedAt ?? null,
      actual_pr_weight: actualPrSet?.weight ?? null,
      actual_pr_reps: actualPrSet?.reps ?? null,
      actual_pr_at: actualPrSet?.performedAt ?? null,
    });
  }

  return aggregates;
}

export function hasMeaningfulCardioSet(measurementType: string | null | undefined, row: NormalizedHistoricalSet) {
  const normalized = String(measurementType ?? "").trim().toLowerCase();
  const duration = positive(row.duration_seconds);
  const distance = positive(row.distance);
  if (normalized === "time") return duration > 0;
  if (normalized === "distance") return distance > 0;
  if (normalized === "time_distance") return duration > 0 || distance > 0;
  return false;
}

export function fallbackDistanceUnit(defaultUnit: string | null | undefined): "mi" | "km" | "m" | null {
  if (defaultUnit === "miles") return "mi";
  if (defaultUnit === "km") return "km";
  if (defaultUnit === "meters") return "m";
  if (defaultUnit === "mi" || defaultUnit === "km" || defaultUnit === "m") return defaultUnit;
  return null;
}

export function aggregateCardioSessions(args: {
  rows: Array<HistoricalSetRow | NormalizedHistoricalSet>;
  measurementType: string | null | undefined;
  defaultUnit: string | null | undefined;
}): CardioSessionAggregate[] {
  const normalizedRows = args.rows
    .map((row) => ("sessionId" in row ? row : normalizeHistoricalSet(row)))
    .filter((row): row is NormalizedHistoricalSet => Boolean(row?.sessionId && row.status === "completed"));

  const latestSetBySession = new Map<string, { performedAt: string; sets: NormalizedHistoricalSet[] }>();
  for (const row of normalizedRows) {
    const current = latestSetBySession.get(row.sessionId) ?? { performedAt: row.performedAt, sets: [] };
    current.sets.push(row);
    latestSetBySession.set(row.sessionId, current);
  }

  return [...latestSetBySession.values()]
    .map((entry) => {
      const meaningfulRows = entry.sets.filter((row) => hasMeaningfulCardioSet(args.measurementType, row));
      if (!meaningfulRows.length) return null;

      const durationSeconds = meaningfulRows.reduce((sum, row) => sum + positive(row.duration_seconds), 0);
      const calories = meaningfulRows.reduce((sum, row) => sum + positive(row.calories), 0);
      const distanceByUnit = new Map<"mi" | "km" | "m", number>();
      for (const row of meaningfulRows) {
        if (!row.distance_unit) continue;
        const distance = positive(row.distance);
        if (distance <= 0) continue;
        distanceByUnit.set(row.distance_unit, (distanceByUnit.get(row.distance_unit) ?? 0) + distance);
      }

      const distanceUnit = (["mi", "km", "m"].find((candidate) => distanceByUnit.has(candidate as "mi" | "km" | "m")) as "mi" | "km" | "m" | undefined)
        ?? fallbackDistanceUnit(args.defaultUnit);

      return {
        performedAt: entry.performedAt,
        setIndex: Math.max(...entry.sets.map((row) => row.set_index), 0),
        durationSeconds,
        distance: distanceUnit ? (distanceByUnit.get(distanceUnit) ?? 0) : 0,
        distanceUnit,
        calories,
      } satisfies CardioSessionAggregate;
    })
    .filter((entry): entry is CardioSessionAggregate => Boolean(entry))
    .sort((a, b) => {
      if (b.performedAt !== a.performedAt) {
        return b.performedAt.localeCompare(a.performedAt);
      }
      return b.setIndex - a.setIndex;
    });
}
