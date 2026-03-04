import "server-only";

import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
import { getExerciseHowToImageSrc } from "@/lib/exerciseImages";
import { getExerciseStatsForExercise, type ExerciseStatsLookupError } from "@/lib/exercise-stats";
import { evaluatePrSummaries, formatPrBreakdown, type PrEvaluationSet } from "@/lib/pr-evaluator";
import { supabaseServer } from "@/lib/supabase/server";
import { formatCalories, formatDistance, formatDurationShort, formatPace, positive } from "@/lib/exercise-stats-formatting";
import { chooseCardioBestMetric, getDisplayPace, shouldShowCardioBest } from "@/lib/cardio-best";

export type ExerciseInfoExercise = {
  id: string;
  exercise_id: string;
  name: string;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_howto_path: string | null;
  how_to_short: string | null;
  image_icon_path: string | null;
  slug: string | null;
  measurement_type: string | null;
  default_unit: string | null;
};

type ExerciseStatsKind = "strength" | "cardio";

export type ExerciseStatsVM = {
  exercise_id: string;
  kind: ExerciseStatsKind;
  recent: {
    lastPerformedAt: string | null;
    lastSummary: string | null;
    lastDurationSeconds?: number;
    lastDistance?: number;
    lastCalories?: number;
    lastPaceSecondsPerUnit?: number;
    lastDistanceUnit?: string | null;
  };
  totals: {
    sessions: number;
    sets: number;
    reps?: number;
    durationSeconds?: number;
    distance?: number;
    calories?: number;
  };
  bests: {
    bestBodyweightReps?: number;
    bestWeight?: number;
    bestRepsAtBestWeight?: number;
    bestSetSummary?: string;
    bestDurationSeconds?: number;
    bestDistance?: number;
    bestPace?: number;
    bestDistanceUnit?: string | null;
    bestCalories?: number;
  };
  prLabel: string;
};

export type ExerciseInfoPayload = {
  exercise: ExerciseInfoExercise;
  stats: ExerciseStatsVM | null;
};

type HistoricalSetRow = {
  set_index: number;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: "mi" | "km" | "m" | null;
  calories: number | null;
  weight_unit: "lbs" | "lb" | "kg" | null;
  session_exercise:
    | {
      session_id: string;
      exercise_id: string;
      session: { performed_at: string; status: "in_progress" | "completed" } | Array<{ performed_at: string; status: "in_progress" | "completed" }> | null;
    }
    | Array<{
      session_id: string;
      exercise_id: string;
      session: { performed_at: string; status: "in_progress" | "completed" } | Array<{ performed_at: string; status: "in_progress" | "completed" }> | null;
    }>
    | null;
};

type NormalizedSet = {
  sessionId: string;
  performedAt: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: "mi" | "km" | "m" | null;
  calories: number | null;
  weightUnit: "lbs" | "lb" | "kg" | null;
};

type ExerciseMeasurementType = "reps" | "bodyweight" | "weight" | "duration" | "distance" | "calories" | "time" | "time_distance";

function resolveStatsKind(measurementType: string | null | undefined): ExerciseStatsKind {
  const normalized = String(measurementType ?? "").trim().toLowerCase() as ExerciseMeasurementType;
  if (normalized === "distance" || normalized === "time" || normalized === "time_distance") {
    return "cardio";
  }
  return "strength";
}


function formatCompactNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatWeightReps(weight: number | null, reps: number | null, unit: string | null) {
  const weightValue = positive(weight);
  const repsValue = positive(reps);
  const normalizedUnit = unit === "lb" || unit === "lbs" ? "lb" : unit === "kg" ? "kg" : "";

  if (weightValue > 0 && repsValue > 0) {
    return `${formatCompactNumber(weightValue)}${normalizedUnit}×${formatCompactNumber(repsValue)}`;
  }

  if (weightValue > 0) {
    return `${formatCompactNumber(weightValue)}${normalizedUnit}`;
  }

  if (repsValue > 0) {
    return `${formatCompactNumber(repsValue)} reps`;
  }

  return null;
}

function formatCardioSummary(args: { durationSeconds?: number | null; distance?: number | null; calories?: number | null; paceSecondsPerUnit?: number | null; distanceUnit?: string | null }) {
  const parts = [
    formatDurationShort(args.durationSeconds),
    formatDistance(args.distance, args.distanceUnit),
    formatPace(args.paceSecondsPerUnit, args.distanceUnit),
    formatCalories(args.calories),
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" • ") : null;
}

function hasMeaningfulCardioSet(measurementType: string | null | undefined, row: NormalizedSet) {
  const normalized = String(measurementType ?? "").trim().toLowerCase();
  const duration = positive(row.durationSeconds);
  const distance = positive(row.distance);
  if (normalized === "time") return duration > 0;
  if (normalized === "distance") return distance > 0;
  if (normalized === "time_distance") return duration > 0 || distance > 0;
  return duration > 0 || distance > 0;
}

function fallbackDistanceUnit(defaultUnit: string | null | undefined): "mi" | "km" | "m" | null {
  if (defaultUnit === "miles") return "mi";
  if (defaultUnit === "km") return "km";
  if (defaultUnit === "meters") return "m";
  if (defaultUnit === "mi" || defaultUnit === "km" || defaultUnit === "m") return defaultUnit;
  return null;
}

function resolveCardioPrimaryMetric(measurementType: string | null | undefined): "distance" | "duration" | "calories" | "effort" {
  const normalized = String(measurementType ?? "").trim().toLowerCase();
  if (normalized === "distance") return "distance";
  if (normalized === "duration" || normalized === "time" || normalized === "time_distance") return "duration";
  if (normalized === "calories") return "calories";
  return "effort";
}

async function loadHistoricalSetRows(userId: string, canonicalExerciseId: string) {
  return supabaseServer()
    .from("sets")
    .select("set_index, weight, reps, duration_seconds, distance, distance_unit, calories, weight_unit, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(performed_at, status))")
    .eq("user_id", userId)
    .eq("session_exercise.user_id", userId)
    .eq("session_exercise.exercise_id", canonicalExerciseId)
    .eq("session_exercise.session.status", "completed");
}

async function repairMissingExerciseIdLinks(userId: string, canonicalExerciseId: string): Promise<void> {
  const supabase = supabaseServer();
  const { data: orphanRows, error: orphanError } = await supabase
    .from("session_exercises")
    .select("id, routine_day_exercise:routine_day_exercises!inner(exercise_id)")
    .eq("user_id", userId)
    .is("exercise_id", null)
    .eq("routine_day_exercise.exercise_id", canonicalExerciseId)
    .limit(250);

  if (orphanError || !orphanRows?.length) {
    return;
  }

  const repairIds = orphanRows
    .map((row) => row.id)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (!repairIds.length) {
    return;
  }

  await supabase
    .from("session_exercises")
    .update({ exercise_id: canonicalExerciseId })
    .eq("user_id", userId)
    .is("exercise_id", null)
    .in("id", repairIds);
}

function isNoRowsError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST116") return true;
  return typeof error.message === "string" && /no rows|0 rows/i.test(error.message);
}


function runDevStatsVerification(exercise: ExerciseInfoExercise, stats: ExerciseStatsVM | null) {
  if (process.env.NODE_ENV !== "development" || !stats) return;

  const name = exercise.name.trim().toLowerCase();
  const checks: Array<{ label: string; ok: boolean; details?: Record<string, unknown> }> = [];

  if (name === "pull-up" || name === "pull up") {
    checks.push({
      label: "Pull-Up hybrid bests",
      ok: typeof stats.bests.bestBodyweightReps === "number" && typeof stats.bests.bestWeight === "number",
      details: { bestBodyweightReps: stats.bests.bestBodyweightReps, bestWeight: stats.bests.bestWeight },
    });
  }

  if (name === "dips") {
    checks.push({
      label: "Dips shows PR reps when reps exist",
      ok: typeof stats.bests.bestBodyweightReps === "number" && stats.bests.bestBodyweightReps > 0,
      details: { bestBodyweightReps: stats.bests.bestBodyweightReps, bestWeight: stats.bests.bestWeight },
    });
    checks.push({
      label: "Dips PR label includes Rep PR when bodyweight reps are present",
      ok: stats.prLabel.includes("Rep PR"),
      details: { prLabel: stats.prLabel },
    });
  }

  if (name === "incline walk") {
    checks.push({
      label: "Incline Walk has populated last cardio effort",
      ok: typeof stats.recent.lastDurationSeconds === "number" && stats.recent.lastDurationSeconds > 0,
      details: {
        sets: stats.totals.sets,
        durationSeconds: stats.totals.durationSeconds,
        lastDurationSeconds: stats.recent.lastDurationSeconds,
      },
    });
  }

  if (stats.kind === "cardio") {
    checks.push({
      label: "Cardio recent summary stays populated when meaningful set history exists",
      ok: !stats.recent.lastPerformedAt || Boolean(stats.recent.lastSummary),
      details: { lastPerformedAt: stats.recent.lastPerformedAt, lastSummary: stats.recent.lastSummary },
    });
  }

  for (const check of checks) {
    if (!check.ok) {
      console.warn("[exercise-info] dev verification failed", { exerciseId: exercise.exercise_id, name: exercise.name, ...check });
    }
  }
}

function normalizeRows(historicalRows: HistoricalSetRow[]): NormalizedSet[] {
  return historicalRows.flatMap((row) => {
    const sessionExercise = Array.isArray(row.session_exercise)
      ? (row.session_exercise[0] ?? null)
      : (row.session_exercise ?? null);
    const session = Array.isArray(sessionExercise?.session)
      ? (sessionExercise?.session[0] ?? null)
      : (sessionExercise?.session ?? null);

    if (!sessionExercise?.session_id || !session?.performed_at || session.status !== "completed") {
      return [];
    }

    return [{
      sessionId: sessionExercise.session_id,
      performedAt: session.performed_at,
      setIndex: row.set_index,
      weight: row.weight,
      reps: row.reps,
      durationSeconds: row.duration_seconds,
      distance: row.distance,
      distanceUnit: row.distance_unit,
      calories: row.calories,
      weightUnit: row.weight_unit,
    }];
  });
}

export async function getExerciseInfoBase(exerciseId: string, userId: string): Promise<ExerciseInfoExercise | null> {
  const supabase = supabaseServer();

  const { data, error } = await supabase
    .from("exercises")
    .select("id, name, how_to_short, primary_muscle, movement_pattern, equipment, image_howto_path, measurement_type, default_unit")
    .eq("id", exerciseId)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .maybeSingle();

  if (error) {
    if (isNoRowsError(error)) {
      return null;
    }

    throw new Error(`failed to load exercise info base: ${error.message}`);
  }

  if (!data || !data.id) {
    const fallbackExercise = EXERCISE_OPTIONS.find((exercise) => exercise.id === exerciseId);
    if (!fallbackExercise) {
      return null;
    }

    return {
      id: fallbackExercise.id,
      exercise_id: fallbackExercise.id,
      name: fallbackExercise.name,
      primary_muscle: fallbackExercise.primary_muscle,
      equipment: fallbackExercise.equipment,
      movement_pattern: fallbackExercise.movement_pattern,
      image_howto_path: null,
      how_to_short: fallbackExercise.how_to_short,
      image_icon_path: null,
      slug: null,
      measurement_type: "reps",
      default_unit: null,
    };
  }

  return {
    id: data.id,
    exercise_id: data.id,
    name: data.name,
    primary_muscle: data.primary_muscle,
    equipment: data.equipment,
    movement_pattern: data.movement_pattern,
    image_howto_path: data.image_howto_path,
    how_to_short: data.how_to_short,
    image_icon_path: null,
    slug: null,
    measurement_type: data.measurement_type ?? null,
    default_unit: data.default_unit ?? null,
  };
}

export async function getExerciseInfoStats(userId: string, canonicalExerciseId: string, measurementType?: string | null, defaultUnit?: string | null, requestId?: string): Promise<ExerciseStatsVM | null> {
  try {
    const kind = resolveStatsKind(measurementType);

    const [statsLookup, historicalSetRows] = await Promise.all([
      getExerciseStatsForExercise(userId, canonicalExerciseId),
      loadHistoricalSetRows(userId, canonicalExerciseId),
    ]);

    const statsLookupError: ExerciseStatsLookupError | null = statsLookup.error;
    if (statsLookupError) {
      console.warn("[exercise-info:getExerciseInfoStats] stats lookup warning", {
        requestId,
        exerciseId: canonicalExerciseId,
        code: statsLookupError.code,
      });
    }

    let historicalRows = historicalSetRows.data ?? [];
    if (!historicalRows.length) {
      await repairMissingExerciseIdLinks(userId, canonicalExerciseId);
      const repairedRows = await loadHistoricalSetRows(userId, canonicalExerciseId);
      historicalRows = repairedRows.data ?? historicalRows;
    }

    const normalizedRows = normalizeRows(historicalRows as HistoricalSetRow[]);
    if (!normalizedRows.length && !statsLookup.row) return null;

    const sortedRows = [...normalizedRows].sort((a, b) => {
      if (b.performedAt !== a.performedAt) return b.performedAt.localeCompare(a.performedAt);
      return b.setIndex - a.setIndex;
    });
    const lastSet = sortedRows[0] ?? null;

    const totals = {
      sessions: new Set(normalizedRows.map((row) => row.sessionId)).size,
      sets: normalizedRows.length,
    };

    if (kind === "strength") {
      const prSets: PrEvaluationSet[] = normalizedRows.map((row) => ({
        exerciseId: canonicalExerciseId,
        sessionId: row.sessionId,
        performedAt: row.performedAt,
        setIndex: row.setIndex,
        weight: row.weight,
        reps: row.reps,
      }));
      const { exerciseSummaryById } = evaluatePrSummaries(prSets);
      const exerciseSummary = exerciseSummaryById.get(canonicalExerciseId);
      const prCounts = exerciseSummary?.counts ?? { reps: 0, weight: 0, total: 0 };

      const totalReps = normalizedRows.reduce((sum, row) => sum + positive(row.reps), 0);
      const weightedRows = normalizedRows.filter((row) => positive(row.weight) > 0);
      const bodyweightRows = normalizedRows.filter((row) => positive(row.weight) === 0 && positive(row.reps) > 0);
      const bestWeight = weightedRows.reduce((max, row) => Math.max(max, positive(row.weight)), 0);
      const bestRepsAtBestWeight = bestWeight > 0
        ? weightedRows.filter((row) => positive(row.weight) === bestWeight).reduce((max, row) => Math.max(max, positive(row.reps)), 0)
        : 0;
      const bestWeightedSet = bestWeight > 0
        ? weightedRows
          .filter((row) => positive(row.weight) === bestWeight)
          .sort((a, b) => positive(b.reps) - positive(a.reps))[0] ?? null
        : null;
      const bestBodyweightReps = bodyweightRows.reduce((max, row) => Math.max(max, positive(row.reps)), 0);
      const bestBodyweightSet = bestBodyweightReps > 0
        ? bodyweightRows.filter((row) => positive(row.reps) === bestBodyweightReps).sort((a, b) => positive(b.reps) - positive(a.reps))[0] ?? null
        : null;

      return {
        exercise_id: canonicalExerciseId,
        kind,
        recent: {
          lastPerformedAt: statsLookup.row?.last_performed_at ?? lastSet?.performedAt ?? null,
          lastSummary: formatWeightReps(statsLookup.row?.last_weight ?? lastSet?.weight ?? null, statsLookup.row?.last_reps ?? lastSet?.reps ?? null, statsLookup.row?.last_unit ?? lastSet?.weightUnit ?? null),
        },
        totals: {
          ...totals,
          ...(totalReps > 0 ? { reps: totalReps } : {}),
        },
        bests: {
          ...(bestBodyweightReps > 0 ? { bestBodyweightReps } : {}),
          ...(bestWeight > 0 ? { bestWeight } : {}),
          ...(bestRepsAtBestWeight > 0 ? { bestRepsAtBestWeight } : {}),
          ...(bestWeight > 0
            ? { bestSetSummary: formatWeightReps(bestWeightedSet?.weight ?? null, bestWeightedSet?.reps ?? null, bestWeightedSet?.weightUnit ?? null) ?? undefined }
            : { bestSetSummary: formatWeightReps(0, bestBodyweightSet?.reps ?? null, null) ?? undefined }),
        },
        prLabel: formatPrBreakdown(prCounts),
      };
    }

    const meaningfulRows = normalizedRows.filter((row) => hasMeaningfulCardioSet(measurementType, row));
    const totalDuration = meaningfulRows.reduce((sum, row) => sum + positive(row.durationSeconds), 0);
    const totalCalories = meaningfulRows.reduce((sum, row) => sum + positive(row.calories), 0);

    const bySession = new Map<string, NormalizedSet[]>();
    for (const row of meaningfulRows) {
      const existing = bySession.get(row.sessionId) ?? [];
      existing.push(row);
      bySession.set(row.sessionId, existing);
    }
    const toSessionAggregate = (rows: NormalizedSet[]) => {
      const durationSeconds = rows.reduce((sum, row) => sum + positive(row.durationSeconds), 0);
      const calories = rows.reduce((sum, row) => sum + positive(row.calories), 0);
      const distanceByUnit = new Map<"mi" | "km" | "m", number>();
      for (const row of rows) {
        const unit = row.distanceUnit;
        const distance = positive(row.distance);
        if (!unit || distance <= 0) continue;
        distanceByUnit.set(unit, (distanceByUnit.get(unit) ?? 0) + distance);
      }
      const preferredUnit = ["mi", "km", "m"].find((candidate) => distanceByUnit.has(candidate as "mi" | "km" | "m")) as "mi" | "km" | "m" | undefined;
      const distanceUnit = preferredUnit ?? fallbackDistanceUnit(defaultUnit);
      const distance = distanceUnit ? (distanceByUnit.get(distanceUnit) ?? 0) : 0;
      return {
        performedAt: rows[0]?.performedAt ?? null,
        setIndex: Math.max(...rows.map((row) => row.setIndex), 0),
        durationSeconds,
        distance,
        distanceUnit,
        calories,
      };
    };

    const sessionAggregates = [...bySession.values()]
      .map((rows) => toSessionAggregate(rows))
      .filter((row) => row.performedAt);
    const latestSessionAggregate = [...sessionAggregates].sort((a, b) => (b.performedAt ?? "").localeCompare(a.performedAt ?? ""))[0] ?? null;

    const aggregatePace = (row: { durationSeconds: number; distance: number; distanceUnit: "mi" | "km" | "m" | null }) => getDisplayPace(
      row.durationSeconds,
      row.distance,
      row.distanceUnit,
    );

    const selectBestAggregate = (rows: typeof sessionAggregates) => {
      const priority = resolveCardioPrimaryMetric(measurementType);
      const score = (row: (typeof sessionAggregates)[number]) => {
        const duration = row.durationSeconds;
        const distance = row.distance;
        const calories = row.calories;
        if (priority === "distance") return [distance, duration, calories];
        if (priority === "duration") return [duration, distance, calories];
        if (priority === "calories") return [calories, distance, duration];
        return [distance, duration, calories];
      };
      return [...rows].sort((a, b) => {
        const sa = score(a);
        const sb = score(b);
        if (sb[0] !== sa[0]) return sb[0] - sa[0];
        if (sb[1] !== sa[1]) return sb[1] - sa[1];
        if (sb[2] !== sa[2]) return sb[2] - sa[2];
        return b.setIndex - a.setIndex;
      })[0] ?? null;
    };

    const bestAggregate = selectBestAggregate(sessionAggregates);
    const paceValues = sessionAggregates
      .map((row) => aggregatePace(row)?.paceSecondsPerUnit ?? 0)
      .filter((value) => value > 0);
    const bestPace = paceValues.length ? Math.min(...paceValues) : 0;
    const totalDistance = sessionAggregates.reduce((sum, row) => sum + row.distance, 0);
    const bestDurationSeconds = sessionAggregates.reduce((max, row) => Math.max(max, row.durationSeconds), 0);
    const bestDistance = sessionAggregates.reduce((max, row) => Math.max(max, row.distance), 0);
    const bestCalories = sessionAggregates.reduce((max, row) => Math.max(max, row.calories), 0);
    const distanceUnitForPace = (latestSessionAggregate ? aggregatePace(latestSessionAggregate)?.distanceUnit : null)
      ?? (bestAggregate ? aggregatePace(bestAggregate)?.distanceUnit : null)
      ?? fallbackDistanceUnit(defaultUnit);
    const selectedCardioBest = chooseCardioBestMetric({
      durationSeconds: bestAggregate?.durationSeconds ?? null,
      distance: bestAggregate?.distance ?? null,
      distanceUnit: bestAggregate?.distanceUnit ?? distanceUnitForPace,
    });

    return {
      exercise_id: canonicalExerciseId,
      kind,
      recent: {
        lastPerformedAt: latestSessionAggregate?.performedAt ?? statsLookup.row?.last_performed_at ?? lastSet?.performedAt ?? null,
        lastSummary: formatCardioSummary({
          durationSeconds: latestSessionAggregate?.durationSeconds ?? null,
          distance: latestSessionAggregate?.distance ?? null,
          calories: latestSessionAggregate?.calories ?? null,
          paceSecondsPerUnit: latestSessionAggregate ? aggregatePace(latestSessionAggregate)?.paceSecondsPerUnit : null,
          distanceUnit: distanceUnitForPace,
        }),
        ...(positive(latestSessionAggregate?.durationSeconds) > 0 ? { lastDurationSeconds: positive(latestSessionAggregate?.durationSeconds) } : {}),
        ...(positive(latestSessionAggregate?.distance) > 0 ? { lastDistance: positive(latestSessionAggregate?.distance) } : {}),
        ...(positive(latestSessionAggregate?.calories) > 0 ? { lastCalories: positive(latestSessionAggregate?.calories) } : {}),
        ...(latestSessionAggregate && aggregatePace(latestSessionAggregate)?.paceSecondsPerUnit
          ? { lastPaceSecondsPerUnit: aggregatePace(latestSessionAggregate)?.paceSecondsPerUnit ?? undefined }
          : {}),
        lastDistanceUnit: distanceUnitForPace,
      },
      totals: {
        ...totals,
        sessions: sessionAggregates.length,
        sets: meaningfulRows.length,
        ...(totalDuration > 0 ? { durationSeconds: totalDuration } : {}),
        ...(totalDistance > 0 ? { distance: totalDistance } : {}),
        ...(totalCalories > 0 ? { calories: totalCalories } : {}),
      },
      bests: {
        ...(bestDurationSeconds > 0 ? { bestDurationSeconds } : {}),
        ...(bestDistance > 0 ? { bestDistance } : {}),
        ...(bestPace > 0 ? { bestPace } : {}),
        ...(bestCalories > 0 ? { bestCalories } : {}),
        bestDistanceUnit: distanceUnitForPace,
        ...(shouldShowCardioBest({
          measurementType,
          bestDurationSeconds: bestAggregate?.durationSeconds ?? null,
          bestDistance: bestAggregate?.distance ?? null,
        }) && selectedCardioBest
          ? { bestSetSummary: selectedCardioBest.value }
          : {}),
      },
      prLabel: "",
    };
  } catch (error) {
    console.warn("[exercise-info] non-fatal stats failure", {
      requestId,
      step: "payload:stats",
      userId,
      canonicalExerciseId,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export function resolveExerciseInfoImages(exercise: ExerciseInfoExercise): ExerciseInfoExercise {
  const resolvedHowToPath = getExerciseHowToImageSrc(exercise);
  return {
    ...exercise,
    image_howto_path: resolvedHowToPath,
  };
}

export async function getExerciseInfoPayload(exerciseId: string, userId: string): Promise<ExerciseInfoPayload | null> {
  const exercise = await getExerciseInfoBase(exerciseId, userId);
  if (!exercise) {
    return null;
  }

  const stats = await getExerciseInfoStats(userId, exercise.exercise_id, exercise.measurement_type, exercise.default_unit);
  const exerciseWithImages = resolveExerciseInfoImages(exercise);
  runDevStatsVerification(exerciseWithImages, stats ?? null);

  return {
    exercise: exerciseWithImages,
    stats: stats ?? null,
  };
}
