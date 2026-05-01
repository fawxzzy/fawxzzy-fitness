import "server-only";

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { unstable_noStore as noStore } from "next/cache";
import type { MetricDatum } from "@/components/ui/MetricItem";
import { evaluatePrSummaries, formatPrBreakdown } from "@/lib/pr-evaluator";
import { requireUser } from "@/lib/auth";
import { normalizeExerciseCurationTags, type ExerciseCurationTags } from "@/lib/exercise-curation";
import {
  buildCardioDeltaFromBest as buildCardioDeltaFromBestShared,
  buildStrengthDeltaFromBest as buildStrengthDeltaFromBestShared,
  formatSignedDelta as formatSignedDeltaShared,
} from "@/lib/exercise-analytics";
import { listExercises, listExercisesForUser } from "@/lib/exercises";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDistance, formatDurationShort, formatPace, positive } from "@/lib/exercise-stats-formatting";
import { chooseCardioBestMetric, getDisplayPace, isCardioMeasurementType, resolveEffectiveKind, shouldShowCardioBest } from "@/lib/cardio-best";
import { aggregateCardioSessions, groupNormalizedSetsByExercise, type HistoricalSetRow } from "@/lib/exercise-history-aggregation";
import { formatWeight } from "@/lib/formatting";

type ExerciseCatalogRow = {
  id: string;
  name: string;
  slug: string | null;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_path: string | null;
  image_icon_path: string | null;
  image_howto_path: string | null;
  how_to_short: string | null;
  measurement_type: string | null;
  default_unit: string | null;
  curation_tags: ExerciseCurationTags | null;
};

type ExerciseStatsRow = {
  exercise_id: string;
  last_weight: number | null;
  last_reps: number | null;
  last_unit: string | null;
  last_performed_at: string | null;
  pr_weight: number | null;
  pr_reps: number | null;
  pr_est_1rm: number | null;
  actual_pr_weight: number | null;
  actual_pr_reps: number | null;
  actual_pr_at: string | null;
};

export type ExerciseBrowserRow = {
  exerciseId: string;
  name: string;
  slug: string | null;
  image_path: string | null;
  image_icon_path: string | null;
  image_howto_path: string | null;
  how_to_short: string | null;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  curation_tags?: ExerciseCurationTags | null;
  last_performed_at: string | null;
  last_weight: number | null;
  last_reps: number | null;
  last_unit: string | null;
  pr_weight: number | null;
  pr_reps: number | null;
  pr_est_1rm: number | null;
  actual_pr_weight: number | null;
  actual_pr_reps: number | null;
  actual_pr_at: string | null;
  kind: "strength" | "cardio";
  lastSummary: string | null;
  bestSummary: string | null;
  prLabel: string;
  prCount: number;
  sessionCount: number;
  setCount?: number;
  sessionsLast30Days?: number;
  activityRank?: number | null;
  detailedMetrics?: MetricDatum[];
  deltaFromBest: string | null;
  tagsSummary: string | null;
};

function formatCompact(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatStrengthSummary(weight: number | null, reps: number | null, unit: string | null) {
  const safeWeight = positive(weight);
  const safeReps = positive(reps);
  const normalizedUnit = unit === "lb" || unit === "lbs" ? "lb" : unit === "kg" ? "kg" : "";

  if (safeWeight > 0 && safeReps > 0) {
    return `${formatCompact(safeWeight)}${normalizedUnit}x${formatCompact(safeReps)}`;
  }
  if (safeReps > 0) return `${formatCompact(safeReps)} reps`;
  if (safeWeight > 0) return `${formatCompact(safeWeight)}${normalizedUnit}`;
  return null;
}

function formatCardioSummary(args: { durationSeconds?: number | null; distance?: number | null; paceSecondsPerUnit?: number | null; distanceUnit?: string | null }) {
  const parts = [
    formatDurationShort(args.durationSeconds),
    formatDistance(args.distance, args.distanceUnit),
    formatPace(args.paceSecondsPerUnit, args.distanceUnit),
  ].filter((value): value is string => Boolean(value));
  return parts.length ? parts.join(" | ") : null;
}

function resolveCardioPrimaryMetric(measurementType: string | null | undefined): "distance" | "duration" | "calories" | "effort" {
  const normalized = String(measurementType ?? "").trim().toLowerCase();
  if (normalized === "distance") return "distance";
  if (normalized === "duration" || normalized === "time" || normalized === "time_distance") return "duration";
  if (normalized === "calories") return "calories";
  return "effort";
}

function formatTagSummary(exercise: ExerciseCatalogRow) {
  return [exercise.primary_muscle, exercise.movement_pattern, exercise.equipment]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" | ") || null;
}

export function formatSignedDelta(delta: number, suffix = "") {
  return formatSignedDeltaShared(delta, suffix);
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
  return buildStrengthDeltaFromBestShared(args);
}

export function buildCardioDeltaFromBest(args: {
  latest: ReturnType<typeof aggregateCardioSessions>[number] | null;
  best: ReturnType<typeof aggregateCardioSessions>[number] | null;
  measurementType: string | null;
}) {
  return buildCardioDeltaFromBestShared(args);
}

type StrengthSessionSummary = {
  performedAt: string;
  weight: number;
  reps: number;
  unit: "lb" | "lbs" | "kg" | null;
  bodyweightReps: number;
  setCount: number;
};

type CardioSessionSummary = {
  performedAt: string;
  durationSeconds: number;
  distance: number;
  distanceUnit: "mi" | "km" | "m" | null;
  calories: number;
  setCount: number;
};

function buildThirtyDaySessionCount(performedAtValues: string[]) {
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
  return performedAtValues.reduce((total, value) => {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && timestamp >= cutoff ? total + 1 : total;
  }, 0);
}

function buildStrengthSessionSummaries(rows: Array<{
  sessionId: string;
  performedAt: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
  weightUnit?: "lb" | "lbs" | "kg" | null;
  weight_unit?: "lb" | "lbs" | "kg" | null;
}>): StrengthSessionSummary[] {
  const rowsBySession = new Map<string, typeof rows>();
  for (const row of rows) {
    const existing = rowsBySession.get(row.sessionId) ?? [];
    existing.push(row);
    rowsBySession.set(row.sessionId, existing);
  }

  return [...rowsBySession.values()]
    .map((sessionRows) => {
      const rankedRows = [...sessionRows].sort((left, right) => {
        const leftWeight = positive(left.weight);
        const rightWeight = positive(right.weight);
        if (rightWeight !== leftWeight) return rightWeight - leftWeight;
        const leftReps = positive(left.reps);
        const rightReps = positive(right.reps);
        if (rightReps !== leftReps) return rightReps - leftReps;
        return right.set_index - left.set_index;
      });
      const bestRow = rankedRows.find((row) => positive(row.weight) > 0 || positive(row.reps) > 0) ?? null;
      const bodyweightReps = rankedRows.reduce((max, row) => Math.max(max, positive(row.weight) === 0 ? positive(row.reps) : 0), 0);

      return {
        performedAt: sessionRows[0]?.performedAt ?? "",
        weight: positive(bestRow?.weight),
        reps: positive(bestRow?.reps),
        unit: bestRow?.weightUnit ?? bestRow?.weight_unit ?? null,
        bodyweightReps,
        setCount: sessionRows.length,
      } satisfies StrengthSessionSummary;
    })
    .filter((session) => Boolean(session.performedAt))
    .sort((left, right) => right.performedAt.localeCompare(left.performedAt));
}

function buildStrengthRepTrendMetric(latest: StrengthSessionSummary | null, previous: StrengthSessionSummary | null): MetricDatum | null {
  const latestWeightedReps = positive(latest?.weight) > 0 ? positive(latest?.reps) : 0;
  const previousWeightedReps = positive(previous?.weight) > 0 ? positive(previous?.reps) : 0;
  const latestBodyweightReps = positive(latest?.weight) === 0 ? positive(latest?.bodyweightReps) : 0;
  const previousBodyweightReps = positive(previous?.weight) === 0 ? positive(previous?.bodyweightReps) : 0;
  const latestReps = latestWeightedReps > 0 ? latestWeightedReps : latestBodyweightReps;
  const previousReps = previousWeightedReps > 0 ? previousWeightedReps : previousBodyweightReps;

  if (latestReps <= 0 || previousReps <= 0) {
    return null;
  }

  const delta = latestReps - previousReps;
  return {
    label: "REPS",
    value: `${Math.abs(delta)}`,
    valuePrefix: delta > 0 ? "\u2191" : delta < 0 ? "\u2193" : "\u2192",
    valueTone: delta > 0 ? "success" : delta < 0 ? "danger" : "muted",
  };
}

function buildStrengthWeightTrendMetric(latest: StrengthSessionSummary | null, previous: StrengthSessionSummary | null): MetricDatum | null {
  const latestWeight = positive(latest?.weight);
  const previousWeight = positive(previous?.weight);
  const unit = latest?.unit ?? previous?.unit ?? null;

  if (latestWeight <= 0 || previousWeight <= 0) {
    return null;
  }

  if (latestWeight === previousWeight) {
    return {
      label: "Weight",
      value: unit === "kg" ? "0 kg" : unit === "lb" || unit === "lbs" ? "0 lb" : "0",
      valuePrefix: "\u2192",
      valueTone: "muted",
    };
  }

  const delta = latestWeight - previousWeight;
  return {
    label: "Weight",
    value: formatWeight(Math.abs(delta), unit) ?? `${Math.round(Math.abs(delta))}`,
    valuePrefix: delta > 0 ? "\u2191" : "\u2193",
    valueTone: delta > 0 ? "success" : "danger",
  };
}

function buildCardioProgressMetric(
  latest: CardioSessionSummary | null,
  previous: CardioSessionSummary | null,
  measurementType: string | null,
): MetricDatum | null {
  if (!latest || !previous) {
    return null;
  }

  const primaryMetric = resolveCardioPrimaryMetric(measurementType);
  if (primaryMetric === "distance" && positive(latest.distance) > 0 && positive(previous.distance) > 0) {
    const delta = latest.distance - previous.distance;
    return {
      label: "Vs Previous",
      value: formatDistance(Math.abs(delta), latest.distanceUnit ?? previous.distanceUnit) ?? `${Math.abs(delta)}`,
      valuePrefix: delta > 0 ? "\u2191" : delta < 0 ? "\u2193" : "\u2192",
      valueTone: delta > 0 ? "success" : delta < 0 ? "danger" : "muted",
    };
  }

  if (primaryMetric === "duration" && positive(latest.durationSeconds) > 0 && positive(previous.durationSeconds) > 0) {
    const delta = latest.durationSeconds - previous.durationSeconds;
    return {
      label: "Vs Previous",
      value: formatDurationShort(Math.abs(delta)) ?? `${Math.abs(delta)}s`,
      valuePrefix: delta > 0 ? "\u2191" : delta < 0 ? "\u2193" : "\u2192",
      valueTone: delta > 0 ? "success" : delta < 0 ? "danger" : "muted",
    };
  }

  if (primaryMetric === "calories" && positive(latest.calories) > 0 && positive(previous.calories) > 0) {
    const delta = latest.calories - previous.calories;
    return {
      label: "Vs Previous",
      value: `${Math.abs(Math.round(delta))} cal`,
      valuePrefix: delta > 0 ? "\u2191" : delta < 0 ? "\u2193" : "\u2192",
      valueTone: delta > 0 ? "success" : delta < 0 ? "danger" : "muted",
    };
  }

  return null;
}

function buildStrengthDetailedMetrics(args: {
  lastSummary: string | null;
  bestSummary: string | null;
  prCount: number;
  sessionCount: number;
  setCount: number;
  prEst1rm?: number | null;
  unit?: string | null;
  sessionsLast30Days: number;
  latestSession: StrengthSessionSummary | null;
  previousSession: StrengthSessionSummary | null;
}) {
  const metrics: MetricDatum[] = [
    { label: "Last", value: args.lastSummary ?? "Not yet" },
    { label: "Best", value: args.bestSummary?.replace(/^Best\s*\|\s*/i, "") ?? "Not yet" },
  ];

  const estimatedMax = positive(args.prEst1rm) > 0
    ? formatWeight(Math.round(positive(args.prEst1rm)), args.unit) ?? `${Math.round(positive(args.prEst1rm))}`
    : null;
  if (estimatedMax) {
    metrics.push({ label: "Max Est.", value: estimatedMax });
  }

  metrics.push(
    { label: "Sessions", value: `${args.sessionCount}` },
    { label: "Sets", value: `${args.setCount}` },
    { label: "PRs", value: `${args.prCount}` },
  );

  const repTrend = buildStrengthRepTrendMetric(args.latestSession, args.previousSession);
  if (repTrend) {
    metrics.push(repTrend);
  }

  const weightTrend = buildStrengthWeightTrendMetric(args.latestSession, args.previousSession);
  if (weightTrend) {
    metrics.push(weightTrend);
  }

  metrics.push({
    label: "30 Days",
    value: `${args.sessionsLast30Days} ${args.sessionsLast30Days === 1 ? "session" : "sessions"}`,
  });

  return metrics;
}

function buildCardioDetailedMetrics(args: {
  lastSummary: string | null;
  bestSummary: string | null;
  sessionCount: number;
  setCount: number;
  sessionsLast30Days: number;
  measurementType: string | null;
  latestSession: CardioSessionSummary | null;
  previousSession: CardioSessionSummary | null;
  bestSession: CardioSessionSummary | null;
}) {
  const metrics: MetricDatum[] = [
    { label: "Last", value: args.lastSummary ?? "Not yet" },
    { label: "Best", value: args.bestSummary?.replace(/^Best\s*\|\s*/i, "") ?? "Not yet" },
    { label: "Sessions", value: `${args.sessionCount}` },
    { label: "Sets", value: `${args.setCount}` },
  ];

  const bestPace = args.bestSession
    ? formatPace(
        getDisplayPace(args.bestSession.durationSeconds, args.bestSession.distance, args.bestSession.distanceUnit)?.paceSecondsPerUnit,
        args.bestSession.distanceUnit,
      )
    : null;
  if (bestPace) {
    metrics.push({ label: "Best Pace", value: bestPace });
  }

  const trendMetric = buildCardioProgressMetric(args.latestSession, args.previousSession, args.measurementType);
  if (trendMetric) {
    metrics.push(trendMetric);
  }

  metrics.push({
    label: "30 Days",
    value: `${args.sessionsLast30Days} ${args.sessionsLast30Days === 1 ? "session" : "sessions"}`,
  });

  return metrics;
}

function applyHistoryExerciseActivityRanks(rows: ExerciseBrowserRow[]) {
  const rankEntries = rows
    .filter((row) => positive(row.setCount) > 0)
    .sort((left, right) => {
      if (right.sessionCount !== left.sessionCount) return right.sessionCount - left.sessionCount;
      if (positive(right.setCount) !== positive(left.setCount)) return positive(right.setCount) - positive(left.setCount);
      if ((right.last_performed_at ?? "") !== (left.last_performed_at ?? "")) {
        return (right.last_performed_at ?? "").localeCompare(left.last_performed_at ?? "");
      }
      return left.name.localeCompare(right.name);
    });
  const rankByExerciseId = new Map(rankEntries.map((row, index) => [row.exerciseId, index + 1]));

  return rows.map((row) => ({
    ...row,
    activityRank: rankByExerciseId.get(row.exerciseId) ?? null,
  }));
}

function compareExerciseBrowserRows(a: ExerciseBrowserRow, b: ExerciseBrowserRow) {
  const aLast = a.last_performed_at;
  const bLast = b.last_performed_at;
  const aHasLast = Boolean(aLast);
  const bHasLast = Boolean(bLast);

  if (aHasLast !== bHasLast) {
    return aHasLast ? -1 : 1;
  }

  if (aLast && bLast && aLast !== bLast) {
    return bLast.localeCompare(aLast);
  }

  return a.name.localeCompare(b.name);
}

function isRelationOrColumnMissing(error: PostgrestError | null) {
  return error?.code === "42P01" || error?.code === "42703";
}

function runDevExerciseBrowserVerification(row: ExerciseBrowserRow) {
  if (process.env.NODE_ENV !== "development") return;
  const name = row.name.trim().toLowerCase();
  const checks: Array<{ label: string; ok: boolean; details?: Record<string, unknown> }> = [];

  if (name === "incline walk") {
    checks.push({
      label: "Incline Walk cardio card has last effort",
      ok: !row.last_performed_at || Boolean(row.lastSummary),
      details: { lastPerformedAt: row.last_performed_at, lastSummary: row.lastSummary },
    });
  }

  if (row.kind === "cardio") {
    checks.push({
      label: "Cardio card ignores empty session exercise rows",
      ok: !row.last_performed_at || Boolean(row.lastSummary),
      details: { lastPerformedAt: row.last_performed_at, lastSummary: row.lastSummary },
    });
  }

  if (name === "dips") {
    checks.push({
      label: "Dips card PR line has bodyweight signal",
      ok: !row.prLabel || Boolean(row.bestSummary || row.prLabel),
      details: { bestSummary: row.bestSummary, prLabel: row.prLabel },
    });
  }

  for (const check of checks) {
    if (!check.ok) {
      console.warn("[history/exercises] dev verification failed", { exerciseId: row.exerciseId, name: row.name, ...check });
    }
  }
}

async function getExercisesWithStats(userId: string, client?: SupabaseClient): Promise<ExerciseBrowserRow[]> {
  noStore();
  const supabase = client ?? supabaseServer();

  const exerciseRows = client ? await listExercisesForUser(userId, client) : await listExercises();

  const exercises: ExerciseCatalogRow[] = exerciseRows
    .filter((row) => row.id && row.name)
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: "slug" in row && typeof row.slug === "string" ? row.slug : null,
      primary_muscle: row.primary_muscle ?? null,
      equipment: row.equipment ?? null,
      movement_pattern: row.movement_pattern ?? null,
      image_path: "image_path" in row ? row.image_path ?? null : null,
      image_icon_path: "image_icon_path" in row ? row.image_icon_path ?? null : null,
      image_howto_path: row.image_howto_path ?? null,
      how_to_short: row.how_to_short ?? null,
      measurement_type: row.measurement_type ?? null,
      default_unit: row.default_unit ?? null,
      curation_tags: normalizeExerciseCurationTags("curation_tags" in row ? row.curation_tags : null),
    }));

  const canonicalIds = Array.from(new Set(exercises.map((row) => row.id)));
  if (!canonicalIds.length) {
    return [];
  }

  const [{ data: statsRows, error: statsError }, { data: historySetRows, error: historySetError }] = await Promise.all([
    supabase
      .from("exercise_stats")
      .select("exercise_id, last_weight, last_reps, last_unit, last_performed_at, pr_weight, pr_reps, pr_est_1rm, actual_pr_weight, actual_pr_reps, actual_pr_at")
      .eq("user_id", userId)
      .in("exercise_id", canonicalIds),
    supabase
      .from("sets")
      .select("set_index, weight, reps, duration_seconds, distance, distance_unit, calories, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(status, performed_at))")
      .eq("user_id", userId)
      .eq("session_exercise.user_id", userId)
      .in("session_exercise.exercise_id", canonicalIds)
      .eq("session_exercise.session.status", "completed"),
  ]);

  if (statsError) {
    if (isRelationOrColumnMissing(statsError)) {
      console.error("[history/exercises] exercise_stats schema mismatch", {
        code: statsError.code,
        message: statsError.message,
      });
    } else {
      throw new Error(`failed to load exercise stats: ${statsError.message}`);
    }
  }

  if (historySetError && !isRelationOrColumnMissing(historySetError)) {
    throw new Error(`failed to load exercise history sets: ${historySetError.message}`);
  }

  const statsByExerciseId = new Map(((statsRows ?? []) as ExerciseStatsRow[]).map((row) => [row.exercise_id, row]));
  const setRowsByExerciseId = groupNormalizedSetsByExercise((historySetRows ?? []) as HistoricalSetRow[]);
  const prSets = [...setRowsByExerciseId.entries()].flatMap(([exerciseId, rows]) => (
    rows.map((row) => ({
      exerciseId,
      sessionId: row.sessionId,
      performedAt: row.performedAt,
      setIndex: row.set_index,
      weight: row.weight,
      reps: row.reps,
    }))
  ));
  const { exerciseSummaryById } = evaluatePrSummaries(prSets);

  const rows = exercises
    .map((exercise) => {
      const exerciseId = exercise.id;
      const stats = statsByExerciseId.get(exerciseId);
      const setRows = setRowsByExerciseId.get(exerciseId) ?? [];
      const prSummary = exerciseSummaryById.get(exerciseId);
      const sessionCount = new Set(setRows.map((row) => row.sessionId)).size;
      const setCount = setRows.length;
      const sessionsLast30Days = buildThirtyDaySessionCount(
        Array.from(new Set(setRows.map((row) => row.performedAt))),
      );

      const latestSetBySession = new Map<string, { performedAt: string; sets: typeof setRows }>();
      for (const row of setRows) {
        const current = latestSetBySession.get(row.sessionId) ?? { performedAt: row.performedAt, sets: [] as typeof setRows };
        current.sets.push(row);
        latestSetBySession.set(row.sessionId, current);
      }

      const latestSession = [...latestSetBySession.values()].sort((a, b) => b.performedAt.localeCompare(a.performedAt))[0] ?? null;
      const sessionAggregates = aggregateCardioSessions({
        rows: setRows,
        measurementType: exercise.measurement_type,
        defaultUnit: exercise.default_unit,
      });
      const latestCardioSession = [...sessionAggregates].sort((a, b) => (b.performedAt ?? "").localeCompare(a.performedAt ?? ""))[0] ?? null;

      const cardioPriority = resolveCardioPrimaryMetric(exercise.measurement_type);
      const cardioScore = (row: (typeof sessionAggregates)[number]) => {
        const duration = row.durationSeconds;
        const distance = row.distance;
        const calories = row.calories;
        if (cardioPriority === "distance") return [distance, duration, calories];
        if (cardioPriority === "duration") return [duration, distance, calories];
        if (cardioPriority === "calories") return [calories, distance, duration];
        return [distance, duration, calories];
      };
      const bestCardioSession = sessionAggregates.length
        ? [...sessionAggregates].sort((a, b) => {
            const sa = cardioScore(a);
            const sb = cardioScore(b);
            if (sb[0] !== sa[0]) return sb[0] - sa[0];
            if (sb[1] !== sa[1]) return sb[1] - sa[1];
            if (sb[2] !== sa[2]) return sb[2] - sa[2];
            return b.setIndex - a.setIndex;
          })[0]
        : null;

      const hasDurationSignal = positive(bestCardioSession?.durationSeconds) > 0
        || sessionAggregates.some((row) => positive(row.durationSeconds) > 0);
      const hasDistanceSignal = positive(bestCardioSession?.distance) > 0
        || sessionAggregates.some((row) => positive(row.distance) > 0);
      const kind = resolveEffectiveKind(exercise.measurement_type, hasDurationSignal, hasDistanceSignal);

      if (process.env.NODE_ENV === "development"
        && isCardioMeasurementType(exercise.measurement_type)
        && kind === "strength") {
        console.warn("[history/exercises] cardio measurement_type resolved to strength due to missing cardio signal", {
          exerciseId,
          name: exercise.name,
          measurement_type: exercise.measurement_type,
        });
      }

      const hasWeightedBest = positive(stats?.actual_pr_weight) > 0;
      const bodyweightPr = setRows.reduce((max, row) => Math.max(max, positive(row.weight) === 0 ? positive(row.reps) : 0), 0);
      const lastBodyweightReps = latestSession ? latestSession.sets.reduce((max, row) => Math.max(max, positive(row.weight) === 0 ? positive(row.reps) : 0), 0) : 0;
      const bestRepsAtBestWeight = hasWeightedBest
        ? setRows
            .filter((row) => positive(row.weight) === positive(stats?.actual_pr_weight))
            .reduce((max, row) => Math.max(max, positive(row.reps)), 0)
        : 0;
      const strengthSessions = buildStrengthSessionSummaries(setRows);
      const latestStrengthSession = strengthSessions[0] ?? null;
      const previousStrengthSession = strengthSessions[1] ?? null;
      const cardioSessions = [...sessionAggregates]
        .map((row) => ({
          performedAt: row.performedAt ?? "",
          durationSeconds: row.durationSeconds,
          distance: row.distance,
          distanceUnit: row.distanceUnit,
          calories: row.calories,
          setCount: row.setCount,
        }))
        .filter((row) => Boolean(row.performedAt))
        .sort((left, right) => right.performedAt.localeCompare(left.performedAt));
      const latestCardioTrendSession = cardioSessions[0] ?? null;
      const previousCardioTrendSession = cardioSessions[1] ?? null;

      const lastSummary = kind === "strength"
        ? (!hasWeightedBest && bodyweightPr > 0
          ? (lastBodyweightReps > 0 ? `${formatCompact(lastBodyweightReps)} reps` : null)
          : formatStrengthSummary(stats?.last_weight ?? null, stats?.last_reps ?? null, stats?.last_unit ?? null))
        : formatCardioSummary({
          durationSeconds: latestCardioSession?.durationSeconds ?? null,
          distance: latestCardioSession?.distance ?? null,
          paceSecondsPerUnit: latestCardioSession
            ? getDisplayPace(latestCardioSession.durationSeconds, latestCardioSession.distance, latestCardioSession.distanceUnit)?.paceSecondsPerUnit
            : null,
          distanceUnit: latestCardioSession
            ? getDisplayPace(latestCardioSession.durationSeconds, latestCardioSession.distance, latestCardioSession.distanceUnit)?.distanceUnit
            : null,
        });

      const selectedCardioBest = chooseCardioBestMetric({
        durationSeconds: bestCardioSession?.durationSeconds ?? null,
        distance: bestCardioSession?.distance ?? null,
        distanceUnit: bestCardioSession?.distanceUnit ?? null,
      });

      const bestSummary = kind === "strength"
        ? (!hasWeightedBest && bodyweightPr > 0
          ? `${formatCompact(bodyweightPr)} reps`
          : formatStrengthSummary(stats?.actual_pr_weight ?? null, stats?.actual_pr_reps ?? null, stats?.last_unit ?? null))
        : (() => {
            if (!shouldShowCardioBest({
              measurementType: exercise.measurement_type,
              bestDurationSeconds: bestCardioSession?.durationSeconds ?? null,
              bestDistance: bestCardioSession?.distance ?? null,
            })) {
              return null;
            }

            return selectedCardioBest ? `Best | ${selectedCardioBest.value}` : null;
          })();

      const deltaFromBest = kind === "strength"
        ? buildStrengthDeltaFromBest({
            bestWeight: positive(stats?.actual_pr_weight),
            bestRepsAtBestWeight,
            lastWeight: positive(stats?.last_weight),
            lastReps: positive(stats?.last_reps),
            unit: stats?.last_unit ?? null,
            bestBodyweightReps: bodyweightPr,
            lastBodyweightReps,
          })
        : buildCardioDeltaFromBest({
            latest: latestCardioSession,
            best: bestCardioSession,
            measurementType: exercise.measurement_type,
          });
      const detailedMetrics = kind === "strength"
        ? buildStrengthDetailedMetrics({
            lastSummary,
            bestSummary,
            prCount: prSummary?.counts.total ?? 0,
            sessionCount,
            setCount,
            prEst1rm: stats?.pr_est_1rm ?? null,
            unit: stats?.last_unit ?? null,
            sessionsLast30Days,
            latestSession: latestStrengthSession,
            previousSession: previousStrengthSession,
          })
        : buildCardioDetailedMetrics({
            lastSummary,
            bestSummary,
            sessionCount,
            setCount,
            sessionsLast30Days,
            measurementType: exercise.measurement_type,
            latestSession: latestCardioTrendSession,
            previousSession: previousCardioTrendSession,
            bestSession: bestCardioSession
              ? {
                  performedAt: bestCardioSession.performedAt ?? "",
                  durationSeconds: bestCardioSession.durationSeconds,
                  distance: bestCardioSession.distance,
                  distanceUnit: bestCardioSession.distanceUnit,
                  calories: bestCardioSession.calories,
                  setCount: bestCardioSession.setCount,
                }
              : null,
          });

      const nextRow: ExerciseBrowserRow = {
        exerciseId,
        name: exercise.name,
        slug: exercise.slug,
        image_path: exercise.image_path,
        image_icon_path: exercise.image_icon_path,
        image_howto_path: exercise.image_howto_path,
        how_to_short: exercise.how_to_short,
        primary_muscle: exercise.primary_muscle,
        equipment: exercise.equipment,
        movement_pattern: exercise.movement_pattern,
        curation_tags: exercise.curation_tags,
        last_performed_at: kind === "cardio"
          ? (latestCardioSession?.performedAt ?? stats?.last_performed_at ?? latestSession?.performedAt ?? null)
          : (stats?.last_performed_at ?? latestSession?.performedAt ?? null),
        last_weight: stats?.last_weight ?? null,
        last_reps: stats?.last_reps ?? null,
        last_unit: stats?.last_unit ?? null,
        pr_weight: stats?.pr_weight ?? null,
        pr_reps: stats?.pr_reps ?? null,
        pr_est_1rm: stats?.pr_est_1rm ?? null,
        actual_pr_weight: stats?.actual_pr_weight ?? null,
        actual_pr_reps: stats?.actual_pr_reps ?? null,
        actual_pr_at: stats?.actual_pr_at ?? null,
        kind,
        lastSummary,
        bestSummary,
        prLabel: kind === "strength" ? formatPrBreakdown(prSummary?.counts ?? { reps: 0, weight: 0, total: 0 }) : "",
        prCount: kind === "strength" ? (prSummary?.counts.total ?? 0) : 0,
        sessionCount,
        setCount,
        sessionsLast30Days,
        detailedMetrics,
        deltaFromBest,
        tagsSummary: formatTagSummary(exercise),
      };

      runDevExerciseBrowserVerification(nextRow);
      return nextRow;
    })
    .sort(compareExerciseBrowserRows);

  return applyHistoryExerciseActivityRanks(rows);
}

export async function getExercisesWithStatsForUser(): Promise<ExerciseBrowserRow[]> {
  const user = await requireUser();
  return getExercisesWithStats(user.id);
}

export async function getExercisesWithStatsForExplicitUser(userId: string, client?: SupabaseClient): Promise<ExerciseBrowserRow[]> {
  return getExercisesWithStats(userId, client);
}
