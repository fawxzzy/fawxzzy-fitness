import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MetricDatum } from "@/components/ui/MetricItem";
import {
  buildCardioProgressDelta as buildCardioProgressDeltaShared,
  buildStrengthProgressDelta as buildStrengthProgressDeltaShared,
} from "@/lib/exercise-analytics";
import { chooseCardioBestMetric, getDisplayPace, isCardioMeasurementType, resolveEffectiveKind, shouldShowCardioBest } from "@/lib/cardio-best";
import { normalizeExerciseDisplayName } from "@/lib/exercise-display";
import {
  buildExerciseInfoReviewSections,
  buildExerciseInfoSurfaceMetrics,
  type ExerciseInfoReviewSection,
} from "@/lib/exercise-info-presentation";
import {
  mapExerciseAnalyticsFamilyToPresentationKind,
  resolveExerciseAnalyticsFamily,
  type ExerciseAnalyticsFamily,
} from "@/lib/exercise-analytics-family";
import { EXERCISE_OPTIONS } from "@/lib/exercise-options";
import { getExerciseHowToImageSrc } from "@/lib/exerciseImages";
import { getExerciseStatsForExercise, type ExerciseStatsLookupError } from "@/lib/exercise-stats";
import { formatCalories, formatDistance, formatDurationShort, formatPace, positive } from "@/lib/exercise-stats-formatting";
import { formatDateShort, formatWeight } from "@/lib/formatting";
import { evaluatePrSummaries, formatPrBreakdown, type PrEvaluationSet } from "@/lib/pr-evaluator";
import { supabaseServer } from "@/lib/supabase/server";
import {
  buildBodyweightRepMetric,
  buildCardioPaceMetric,
  buildCardioRecentTotal,
  buildStrengthVolumeMetric,
  formatEstimatedOneRepMax,
  type WorkoutCardPresentationKind,
} from "@/lib/workout-card-view-models";

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

export type ExerciseProgressEntry = {
  label: string;
  value: string;
  context?: string | null;
};

type MetricValueTone = "default" | "success" | "danger" | "muted";

export type ExerciseStatsVM = {
  exercise_id: string;
  kind: ExerciseStatsKind;
  analyticsFamily?: ExerciseAnalyticsFamily;
  presentationKind: WorkoutCardPresentationKind;
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
  prCount: number;
  quickMetrics: MetricDatum[];
  performanceMetrics: MetricDatum[];
  surfaceMetrics: MetricDatum[];
  progress: {
    metrics: MetricDatum[];
    reviewSections: ExerciseInfoReviewSection[];
    performances: ExerciseProgressEntry[];
  };
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
  distance_unit: "mi" | "km" | "m" | "steps" | null;
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
  distanceUnit: "mi" | "km" | "m" | "steps" | null;
  calories: number | null;
  weightUnit: "lbs" | "lb" | "kg" | null;
};

type StrengthSessionPerformance = {
  sessionId: string;
  performedAt: string;
  summary: string | null;
  setSummaries: string[];
  weight: number;
  reps: number;
  unit: "lbs" | "lb" | "kg" | null;
  bodyweightReps: number;
  setCount: number;
};

type CardioSessionPerformance = {
  sessionId: string;
  performedAt: string;
  summary: string | null;
  setSummaries: string[];
  durationSeconds: number;
  distance: number;
  distanceUnit: "mi" | "km" | "m" | "steps" | null;
  calories: number;
  paceSecondsPerUnit: number | null;
  setCount: number;
};

function resolveStrengthPresentationKind(args: {
  bestWeight: number;
  bestBodyweightReps: number;
}): WorkoutCardPresentationKind {
  if (args.bestWeight <= 0 && args.bestBodyweightReps > 0) {
    return "bodyweight";
  }

  return "strength";
}

function resolveCardioPresentationKind(measurementType: string | null | undefined): WorkoutCardPresentationKind {
  const normalized = String(measurementType ?? "").trim().toLowerCase();
  if (normalized === "time" || normalized === "duration") {
    return "timed";
  }

  return "cardio";
}

function buildTimedHoldPerformanceMetrics(args: {
  lastSummary: string | null;
  lastPerformedAt: string | null;
  bestDurationSeconds?: number | null;
  rows: Array<{
    performedAt: string;
    durationSeconds: number;
    distance: number;
    distanceUnit: "mi" | "km" | "m" | "steps" | null;
  }>;
}) {
  const metrics: MetricDatum[] = [];
  const bestHold = formatDurationShort(args.bestDurationSeconds);
  if (bestHold) {
    metrics.push({
      label: "Best Hold",
      value: bestHold,
    });
  }

  const weeklyTotal = buildCardioRecentTotal({ rows: args.rows, recentDays: 7 });
  if (weeklyTotal) {
    metrics.push({
      label: "7 Day Total",
      value: weeklyTotal,
    });
  }

  if (args.lastSummary) {
    metrics.push({
      label: "Last",
      value: args.lastSummary,
      timeframe: args.lastPerformedAt ? formatDateShort(args.lastPerformedAt) : null,
    });
  }

  return metrics.slice(0, 4);
}

function formatWeightReps(weight: number | null, reps: number | null, unit: string | null) {
  const weightValue = positive(weight);
  const repsValue = positive(reps);
  const weightLabel = formatWeight(weightValue > 0 ? weightValue : null, unit);

  if (weightLabel && repsValue > 0) {
    const repsLabel = Number.isInteger(repsValue) ? String(repsValue) : repsValue.toFixed(1).replace(/\.0$/, "");
    return `${weightLabel} x ${repsLabel}`;
  }

  if (weightLabel) {
    return weightLabel;
  }

  if (repsValue > 0) {
    const repsLabel = Number.isInteger(repsValue) ? String(repsValue) : repsValue.toFixed(1).replace(/\.0$/, "");
    return `${repsLabel} reps`;
  }

  return null;
}

function formatCardioSummary(args: {
  family?: ExerciseAnalyticsFamily | null;
  durationSeconds?: number | null;
  distance?: number | null;
  calories?: number | null;
  paceSecondsPerUnit?: number | null;
  distanceUnit?: string | null;
}) {
  const family = args.family ?? null;
  const durationLabel = formatDurationShort(args.durationSeconds);
  const distanceLabel = formatDistance(args.distance, args.distanceUnit);
  const paceLabel = formatPace(args.paceSecondsPerUnit, args.distanceUnit);
  const caloriesLabel = formatCalories(args.calories);
  const parts = (
    family === "timed-hold"
      ? [durationLabel]
      : family === "cardio-calories"
        ? [caloriesLabel, durationLabel, distanceLabel, paceLabel]
        : family === "cardio-distance"
          ? [distanceLabel, paceLabel, durationLabel, caloriesLabel]
          : family === "cardio-steps"
            ? [durationLabel, distanceLabel, caloriesLabel]
            : [durationLabel, distanceLabel, paceLabel, caloriesLabel]
  ).filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function formatSetMeasurementSummary(args: {
  reps?: number | null;
  weight?: number | null;
  weightUnit?: string | null;
  durationSeconds?: number | null;
  distance?: number | null;
  distanceUnit?: "mi" | "km" | "m" | "steps" | null;
  calories?: number | null;
}) {
  const weightReps = formatWeightReps(args.weight ?? null, args.reps ?? null, args.weightUnit ?? null);
  if (weightReps) {
    return weightReps;
  }

  const parts = [
    formatDurationShort(args.durationSeconds),
    formatDistance(args.distance, args.distanceUnit),
    formatCalories(args.calories),
  ].filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" | ") : "No measurements";
}

function buildTrendMetric(value: string | null, positiveToken: string): MetricDatum | null {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;

  if (/^matched/i.test(normalized)) {
    return {
      label: "Vs Previous",
      value: normalized.replace(/\s+vs previous$/i, ""),
      valuePrefix: "→",
      valueTone: "muted",
    };
  }

  const direction = normalized.startsWith("+") ? "up" : normalized.startsWith("-") ? "down" : null;
  const tone: MetricValueTone = direction === "up"
    ? "success"
    : direction === "down"
      ? "danger"
      : "default";
  const prefix = direction === "up"
    ? "↑"
    : direction === "down"
      ? "↓"
      : null;
  const cleaned = normalized
    .replace(/^[+-]/, "")
    .replace(/\s+vs previous$/i, "")
    .trim();

  return {
    label: "Vs Previous",
    value: cleaned || positiveToken,
    valuePrefix: prefix,
    valueTone: tone,
  };
}

function buildExerciseInfoTrendMetric(
  value: string | null,
  positiveToken: string,
  options?: {
    label?: string;
    stripPattern?: RegExp;
  },
): MetricDatum | null {
  if (!value) return null;

  const normalized = value.trim();
  if (!normalized) return null;

  if (/^matched/i.test(normalized)) {
    return {
      label: "Vs Previous",
      value: positiveToken,
      valuePrefix: "\u2192",
      valueTone: "muted",
    };
  }

  const direction = normalized.startsWith("+") ? "up" : normalized.startsWith("-") ? "down" : null;
  const cleaned = normalized
    .replace(/^[+-]/, "")
    .replace(/\s+vs previous$/i, "")
    .replace(options?.stripPattern ?? /$^/, "")
    .trim();

  return {
    label: options?.label ?? "Vs Previous",
    value: cleaned || positiveToken,
    valuePrefix: direction === "up" ? "\u2191" : direction === "down" ? "\u2193" : null,
    valueTone: direction === "up" ? "success" : direction === "down" ? "danger" : "default",
  };
}

function buildExerciseInfoRepTrendMetric(args: {
  latest: StrengthSessionPerformance | null;
  previous: StrengthSessionPerformance | null;
}): MetricDatum | null {
  const latestWeightedReps = positive(args.latest?.weight) > 0 ? positive(args.latest?.reps) : 0;
  const previousWeightedReps = positive(args.previous?.weight) > 0 ? positive(args.previous?.reps) : 0;
  const latestBodyweightReps = positive(args.latest?.weight) === 0 ? positive(args.latest?.bodyweightReps) : 0;
  const previousBodyweightReps = positive(args.previous?.weight) === 0 ? positive(args.previous?.bodyweightReps) : 0;

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

function buildExerciseInfoWeightTrendMetric(args: {
  latest: StrengthSessionPerformance | null;
  previous: StrengthSessionPerformance | null;
}): MetricDatum | null {
  const latestWeight = positive(args.latest?.weight);
  const previousWeight = positive(args.previous?.weight);
  const normalizedUnit = args.latest?.unit ?? args.previous?.unit ?? null;

  if (latestWeight <= 0 || previousWeight <= 0) {
    return null;
  }

  const zeroWeightLabel = normalizedUnit === "kg"
    ? "0 kg"
    : normalizedUnit === "lb" || normalizedUnit === "lbs"
      ? "0 lbs"
      : "0";

  if (latestWeight === previousWeight) {
    return {
      label: "Weight",
      value: zeroWeightLabel,
      valuePrefix: "\u2192",
      valueTone: "muted",
    };
  }

  const delta = latestWeight - previousWeight;
  return {
    label: "Weight",
    value: formatWeight(Math.abs(delta), normalizedUnit) ?? `${Math.round(Math.abs(delta))}`,
    valuePrefix: delta > 0 ? "\u2191" : "\u2193",
    valueTone: delta > 0 ? "success" : "danger",
  };
}

function hasMeaningfulCardioSet(measurementType: string | null | undefined, row: NormalizedSet) {
  const normalized = String(measurementType ?? "").trim().toLowerCase();
  const duration = positive(row.durationSeconds);
  const distance = positive(row.distance);
  const calories = positive(row.calories);
  if (normalized === "time") return duration > 0;
  if (normalized === "distance") return distance > 0;
  if (normalized === "time_distance") return duration > 0 || distance > 0;
  if (normalized === "calories") return calories > 0 || duration > 0 || distance > 0;
  return false;
}

function fallbackDistanceUnit(defaultUnit: string | null | undefined): "mi" | "km" | "m" | "steps" | null {
  if (defaultUnit === "miles") return "mi";
  if (defaultUnit === "km") return "km";
  if (defaultUnit === "meters") return "m";
  if (defaultUnit === "steps" || defaultUnit === "step") return "steps";
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

async function loadHistoricalSetRows(userId: string, canonicalExerciseId: string, client?: SupabaseClient) {
  const supabase = client ?? supabaseServer();

  return supabase
    .from("sets")
    .select("set_index, weight, reps, duration_seconds, distance, distance_unit, calories, weight_unit, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(performed_at, status))")
    .eq("user_id", userId)
    .eq("session_exercise.user_id", userId)
    .eq("session_exercise.exercise_id", canonicalExerciseId)
    .eq("session_exercise.session.status", "completed");
}

async function repairMissingExerciseIdLinks(userId: string, canonicalExerciseId: string, client?: SupabaseClient): Promise<void> {
  const supabase = client ?? supabaseServer();
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

function buildFrequencyMetric(performedAtValues: string[]): MetricDatum {
  const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const count = performedAtValues.reduce((total, value) => {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) && timestamp >= cutoff ? total + 1 : total;
  }, 0);

  return {
    label: "30 Days",
    value: `${count} ${count === 1 ? "session" : "sessions"}`,
  };
}

function buildProgressEntries<T extends { performedAt: string; summary: string | null; setCount: number; setSummaries: string[] }>(performances: T[]) {
  return performances.slice(0, 3).map((performance) => ({
    label: formatDateShort(performance.performedAt),
    value: performance.setSummaries.length > 0
      ? performance.setSummaries.join(" | ")
      : (performance.summary ?? "Logged"),
    context: `${performance.setCount} ${performance.setCount === 1 ? "set" : "sets"}`,
  }));
}

function buildStrengthSessionPerformances(rows: NormalizedSet[]): StrengthSessionPerformance[] {
  const rowsBySession = new Map<string, NormalizedSet[]>();
  for (const row of rows) {
    const existing = rowsBySession.get(row.sessionId) ?? [];
    existing.push(row);
    rowsBySession.set(row.sessionId, existing);
  }

  return [...rowsBySession.values()]
    .map((sessionRows) => {
      const rankedRows = [...sessionRows].sort((a, b) => {
        const aWeight = positive(a.weight);
        const bWeight = positive(b.weight);
        if (bWeight !== aWeight) return bWeight - aWeight;
        const aReps = positive(a.reps);
        const bReps = positive(b.reps);
        if (bReps !== aReps) return bReps - aReps;
        return b.setIndex - a.setIndex;
      });

      const bestRow = rankedRows.find((row) => positive(row.weight) > 0 || positive(row.reps) > 0) ?? null;
      const bodyweightReps = rankedRows.reduce((max, row) => Math.max(max, positive(row.weight) === 0 ? positive(row.reps) : 0), 0);

      return {
        sessionId: sessionRows[0]?.sessionId ?? "",
        performedAt: sessionRows[0]?.performedAt ?? "",
        summary: formatWeightReps(bestRow?.weight ?? null, bestRow?.reps ?? null, bestRow?.weightUnit ?? null),
        setSummaries: [...sessionRows]
          .sort((a, b) => a.setIndex - b.setIndex)
          .map((row) => formatSetMeasurementSummary({
            reps: row.reps,
            weight: row.weight,
            weightUnit: row.weightUnit,
          })),
        weight: positive(bestRow?.weight),
        reps: positive(bestRow?.reps),
        unit: bestRow?.weightUnit ?? null,
        bodyweightReps,
        setCount: sessionRows.length,
      } satisfies StrengthSessionPerformance;
    })
    .filter((performance) => Boolean(performance.performedAt))
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt));
}

export function buildStrengthProgressDelta(
  latest: StrengthSessionPerformance | null,
  previous: StrengthSessionPerformance | null,
) {
  return buildStrengthProgressDeltaShared(latest, previous);
}

function buildCardioSessionPerformances(args: {
  sessionAggregates: Array<{
    sessionId: string;
    performedAt: string | null;
    durationSeconds: number;
    distance: number;
    distanceUnit: "mi" | "km" | "m" | "steps" | null;
    calories: number;
    setCount: number;
  }>;
}): CardioSessionPerformance[] {
  const performances: CardioSessionPerformance[] = [];

  for (const aggregate of args.sessionAggregates) {
    if (!aggregate.performedAt) continue;

    const pace = getDisplayPace(aggregate.durationSeconds, aggregate.distance, aggregate.distanceUnit);
    performances.push({
      sessionId: aggregate.sessionId,
      performedAt: aggregate.performedAt,
      summary: formatCardioSummary({
        durationSeconds: aggregate.durationSeconds,
        distance: aggregate.distance,
        calories: aggregate.calories,
        paceSecondsPerUnit: pace?.paceSecondsPerUnit ?? null,
        distanceUnit: pace?.distanceUnit ?? aggregate.distanceUnit,
      }),
      setSummaries: [],
      durationSeconds: aggregate.durationSeconds,
      distance: aggregate.distance,
      distanceUnit: aggregate.distanceUnit,
      calories: aggregate.calories,
      paceSecondsPerUnit: pace?.paceSecondsPerUnit ?? null,
      setCount: aggregate.setCount,
    });
  }

  return performances.sort((a, b) => b.performedAt.localeCompare(a.performedAt));
}

export function buildCardioProgressDelta(
  latest: CardioSessionPerformance | null,
  previous: CardioSessionPerformance | null,
  measurementType: string | null | undefined,
) {
  return buildCardioProgressDeltaShared(latest, previous, measurementType);
}

function buildQuickMetrics(args: {
  kind: ExerciseStatsKind;
  lastPerformedAt: string | null;
  lastSummary: string | null;
  bestSummary: string | null;
  prCount: number;
  totalSessions: number;
  totalSets: number;
}) {
  return [
    {
      label: "Last",
      value: args.lastSummary ?? (args.lastPerformedAt ? formatDateShort(args.lastPerformedAt) : "Not yet"),
    },
    {
      label: "Best",
      value: args.bestSummary ?? "Not yet",
    },
    {
      label: "PRs",
      value: `${args.prCount}`,
    },
    {
      label: "Sessions",
      value: `${args.totalSessions}`,
    },
    {
      label: "Sets",
      value: `${args.totalSets}`,
    },
  ] satisfies MetricDatum[];
}

function buildStrengthPerformanceMetrics(args: {
  family: ExerciseAnalyticsFamily;
  rows: NormalizedSet[];
  prEst1rm?: number | null;
  unit?: string | null;
  bestSetSummary?: string | null;
  bestWeight?: number | null;
  bestBodyweightReps: number;
  lastSummary: string | null;
  lastPerformedAt: string | null;
}) {
  const metrics: MetricDatum[] = [];

  if (args.family === "strength-bodyweight") {
    if (args.bestBodyweightReps > 0) {
      metrics.push({
        label: "Best Reps",
        value: `${args.bestBodyweightReps} reps`,
      });
    }

    if (positive(args.bestWeight) > 0) {
      metrics.push({
        label: "Added Load",
        value: formatWeight(args.bestWeight, args.unit) ?? `${Math.round(positive(args.bestWeight))}`,
      });
    }

    const recentReps = buildBodyweightRepMetric(args.rows, 28);
    if (recentReps) {
      metrics.push({
        label: "28 Day Reps",
        value: recentReps,
      });
    }

    if (args.lastSummary) {
      metrics.push({
        label: "Last Best",
        value: args.lastSummary,
        timeframe: args.lastPerformedAt ? formatDateShort(args.lastPerformedAt) : null,
      });
    }

    return metrics.slice(0, 4);
  }

  if (args.bestSetSummary) {
    metrics.push({
      label: "Top Set",
      value: args.bestSetSummary,
    });
  }

  const estimatedOneRepMax = formatEstimatedOneRepMax(args.prEst1rm, args.unit);
  if (estimatedOneRepMax) {
    metrics.push({
      label: "Max Estimate",
      value: estimatedOneRepMax,
    });
  }

  if (args.lastPerformedAt) {
    metrics.push({
      label: "Last",
      value: formatDateShort(args.lastPerformedAt),
      timeframe: args.lastSummary ?? null,
    });
  }

  return metrics.slice(0, 4);
}

function buildCardioPerformanceMetrics(args: {
  family: ExerciseAnalyticsFamily;
  lastSummary: string | null;
  lastPerformedAt: string | null;
  bestDurationSeconds?: number | null;
  bestDistance?: number | null;
  bestDistanceUnit?: "mi" | "km" | "m" | "steps" | null;
  rows: Array<{
    performedAt: string;
    durationSeconds: number;
    distance: number;
    distanceUnit: "mi" | "km" | "m" | "steps" | null;
    calories?: number | null;
  }>;
}) {
  const metrics: MetricDatum[] = [];
  const weeklyDistance = buildCardioRecentTotal({ rows: args.rows, recentDays: 7 });
  const weeklyDurationSeconds = args.rows.reduce((sum, row) => sum + positive(row.durationSeconds), 0);
  const weeklyDuration = formatDurationShort(weeklyDurationSeconds);
  const weeklyCalories = args.rows.reduce((sum, row) => sum + positive(row.calories), 0);
  const weeklySteps = args.family === "cardio-steps"
    ? formatDistance(
        args.rows.reduce((sum, row) => sum + (row.distanceUnit === "steps" ? positive(row.distance) : 0), 0),
        "steps",
      )
    : null;

  if (args.family === "timed-hold") {
    return buildTimedHoldPerformanceMetrics({
      lastSummary: args.lastSummary,
      lastPerformedAt: args.lastPerformedAt,
      bestDurationSeconds: args.bestDurationSeconds,
      rows: args.rows,
    });
  }

  if (args.family === "cardio-calories") {
    const bestCalories = args.rows.reduce((max, row) => Math.max(max, positive((row as { calories?: number | null }).calories)), 0);
    if (bestCalories > 0) {
      metrics.push({
        label: "Best Calories",
        value: formatCalories(bestCalories) ?? `${Math.round(bestCalories)}`,
      });
    }
    if (weeklyCalories > 0) {
      metrics.push({
        label: "7 Day Calories",
        value: formatCalories(weeklyCalories) ?? `${Math.round(weeklyCalories)}`,
      });
    }
    if (weeklyDuration) {
      metrics.push({
        label: "7 Day Time",
        value: weeklyDuration,
      });
    }
    return metrics.slice(0, 4);
  }

  if (args.family === "cardio-steps") {
    const longestSteps = formatDistance(args.bestDistance, "steps");
    if (longestSteps) {
      metrics.push({
        label: "Best Steps",
        value: longestSteps,
      });
    }
    const longestDuration = formatDurationShort(args.bestDurationSeconds);
    if (longestDuration) {
      metrics.push({
        label: "Longest Time",
        value: longestDuration,
      });
    }
    if (weeklySteps) {
      metrics.push({
        label: "7 Day Steps",
        value: weeklySteps,
      });
    }
    return metrics.slice(0, 4);
  }

  if (args.family === "cardio-distance" || args.family === "cardio-endurance") {
    const bestPace = buildCardioPaceMetric(args.bestDurationSeconds, args.bestDistance, args.bestDistanceUnit);
    if (bestPace) {
      metrics.push({
        label: "Best Pace",
        value: bestPace,
      });
    }
  }

  if (args.family === "cardio-endurance") {
    const longestDuration = formatDurationShort(args.bestDurationSeconds);
    if (longestDuration) {
      metrics.push({
        label: "Longest Time",
        value: longestDuration,
      });
    }
  }

  const longestDistance = formatDistance(args.bestDistance, args.bestDistanceUnit);
  if (longestDistance) {
    metrics.push({
      label: "Longest Distance",
      value: longestDistance,
    });
  }

  const longestDuration = formatDurationShort(args.bestDurationSeconds);
  if (longestDuration && args.family !== "cardio-endurance") {
    metrics.push({
      label: "Longest Time",
      value: longestDuration,
    });
  }

  if (weeklyDistance) {
    metrics.push({
      label: "7 Day Total",
      value: weeklyDistance,
    });
  }

  return metrics.slice(0, 4);
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

  if (stats.quickMetrics.length < 3) {
    checks.push({
      label: "Exercise info quick metrics stay populated",
      ok: false,
      details: { quickMetrics: stats.quickMetrics },
    });
  }

  for (const check of checks) {
    if (!check.ok) {
      console.warn("[exercise-info] dev verification failed", { exerciseId: exercise.exercise_id, name: exercise.name, ...check });
    }
  }
}

export async function getExerciseInfoBase(
  exerciseId: string,
  userId: string,
  client?: SupabaseClient,
): Promise<ExerciseInfoExercise | null> {
  const supabase = client ?? supabaseServer();

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
    name: normalizeExerciseDisplayName({ exerciseId: data.id, name: data.name }),
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

export async function getExerciseInfoStats(
  userId: string,
  canonicalExerciseId: string,
  exerciseMetadata?: Pick<ExerciseInfoExercise, "name" | "equipment" | "movement_pattern" | "primary_muscle" | "measurement_type" | "default_unit"> | null,
  requestId?: string,
  client?: SupabaseClient,
): Promise<ExerciseStatsVM | null> {
  try {
    const [statsLookup, historicalSetRows] = await Promise.all([
      getExerciseStatsForExercise(userId, canonicalExerciseId, client),
      loadHistoricalSetRows(userId, canonicalExerciseId, client),
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
      await repairMissingExerciseIdLinks(userId, canonicalExerciseId, client);
      const repairedRows = await loadHistoricalSetRows(userId, canonicalExerciseId, client);
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

    const meaningfulRows = normalizedRows.filter((row) => hasMeaningfulCardioSet(exerciseMetadata?.measurement_type, row));
    const rowsBySessionId = new Map<string, NormalizedSet[]>();
    for (const row of meaningfulRows) {
      const existing = rowsBySessionId.get(row.sessionId) ?? [];
      existing.push(row);
      rowsBySessionId.set(row.sessionId, existing);
    }

    const sessionAggregates = [...rowsBySessionId.values()]
      .map((rows) => {
        const durationSeconds = rows.reduce((sum, row) => sum + positive(row.durationSeconds), 0);
        const calories = rows.reduce((sum, row) => sum + positive(row.calories), 0);
        const distanceByUnit = new Map<"mi" | "km" | "m" | "steps", number>();
        for (const row of rows) {
          const unit = row.distanceUnit;
          const distance = positive(row.distance);
          if (!unit || distance <= 0) continue;
          distanceByUnit.set(unit, (distanceByUnit.get(unit) ?? 0) + distance);
        }
        const preferredUnit = ["steps", "mi", "km", "m"].find((candidate) => distanceByUnit.has(candidate as "mi" | "km" | "m" | "steps")) as "mi" | "km" | "m" | "steps" | undefined;
        const distanceUnit = preferredUnit ?? fallbackDistanceUnit(exerciseMetadata?.default_unit);
        const distance = distanceUnit ? (distanceByUnit.get(distanceUnit) ?? 0) : 0;
        return {
          performedAt: rows[0]?.performedAt ?? null,
          sessionId: rows[0]?.sessionId ?? "",
          setIndex: Math.max(...rows.map((row) => row.setIndex), 0),
          durationSeconds,
          distance,
          distanceUnit,
          calories,
          setCount: rows.length,
        };
      })
      .filter((row) => row.performedAt);

    const hasDurationSignal = sessionAggregates.some((row) => positive(row.durationSeconds) > 0);
    const hasDistanceSignal = sessionAggregates.some((row) => positive(row.distance) > 0);
    const kind = resolveEffectiveKind(
      exerciseMetadata?.measurement_type,
      hasDurationSignal,
      hasDistanceSignal,
      meaningfulRows.some((row) => positive(row.calories) > 0),
    ) as ExerciseStatsKind;

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
      const prLabel = formatPrBreakdown(prCounts);

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
        ? bodyweightRows
            .filter((row) => positive(row.reps) === bestBodyweightReps)
            .sort((a, b) => positive(b.reps) - positive(a.reps))[0] ?? null
        : null;
      const bestSetSummary = bestWeight > 0
        ? formatWeightReps(bestWeightedSet?.weight ?? null, bestWeightedSet?.reps ?? null, bestWeightedSet?.weightUnit ?? null)
        : formatWeightReps(0, bestBodyweightSet?.reps ?? null, null);
      const lastPerformedAt = statsLookup.row?.last_performed_at ?? lastSet?.performedAt ?? null;
      const lastSummary = formatWeightReps(
        statsLookup.row?.last_weight ?? lastSet?.weight ?? null,
        statsLookup.row?.last_reps ?? lastSet?.reps ?? null,
        statsLookup.row?.last_unit ?? lastSet?.weightUnit ?? null,
      );
      const performances = buildStrengthSessionPerformances(normalizedRows);
      const progressDelta = buildStrengthProgressDelta(performances[0] ?? null, performances[1] ?? null);
      const trendMetric = buildExerciseInfoRepTrendMetric({
        latest: performances[0] ?? null,
        previous: performances[1] ?? null,
      }) ?? buildExerciseInfoTrendMetric(progressDelta, "0", {
        label: "REPS",
        stripPattern: /\s+reps?$/i,
      });
      const weightTrendMetric = buildExerciseInfoWeightTrendMetric({
        latest: performances[0] ?? null,
        previous: performances[1] ?? null,
      });
      const strengthPresentationKind = resolveStrengthPresentationKind({ bestWeight, bestBodyweightReps });
      const family = resolveExerciseAnalyticsFamily({
        presentationKind: strengthPresentationKind,
        name: exerciseMetadata?.name,
        measurement_type: exerciseMetadata?.measurement_type,
        defaultUnit: exerciseMetadata?.default_unit,
        equipment: exerciseMetadata?.equipment,
        movement_pattern: exerciseMetadata?.movement_pattern,
        primary_muscle: exerciseMetadata?.primary_muscle,
      });
      const presentationKind = mapExerciseAnalyticsFamilyToPresentationKind(family);
      const performanceMetrics = buildStrengthPerformanceMetrics({
        family,
        rows: normalizedRows,
        prEst1rm: statsLookup.row?.pr_est_1rm ?? null,
        unit: statsLookup.row?.last_unit ?? bestWeightedSet?.weightUnit ?? null,
        bestSetSummary,
        bestWeight,
        bestBodyweightReps,
        lastSummary,
        lastPerformedAt,
      });
      const progressMetrics = [
        ...(trendMetric ? [trendMetric] : []),
        ...(weightTrendMetric ? [weightTrendMetric] : []),
        buildFrequencyMetric(performances.map((performance) => performance.performedAt)),
      ];
      const quickMetrics = buildQuickMetrics({
        kind,
        lastPerformedAt,
        lastSummary,
        bestSummary: bestSetSummary,
        prCount: prCounts.total,
        totalSessions: totals.sessions,
        totalSets: totals.sets,
      });
      const surfaceMetrics = buildExerciseInfoSurfaceMetrics({
        quickMetrics,
        performanceMetrics,
        progressMetrics,
      });
      const reviewSections = buildExerciseInfoReviewSections({
        kind,
        family,
        lastSummary,
        bestSummary: bestSetSummary,
        prLabel,
        prCount: prCounts.total,
        progressMetrics,
      });

      return {
        exercise_id: canonicalExerciseId,
        kind,
        analyticsFamily: family,
        presentationKind,
        recent: {
          lastPerformedAt,
          lastSummary,
        },
        totals: {
          ...totals,
          ...(totalReps > 0 ? { reps: totalReps } : {}),
        },
        bests: {
          ...(bestBodyweightReps > 0 ? { bestBodyweightReps } : {}),
          ...(bestWeight > 0 ? { bestWeight } : {}),
          ...(bestRepsAtBestWeight > 0 ? { bestRepsAtBestWeight } : {}),
          ...(bestSetSummary ? { bestSetSummary } : {}),
        },
        prLabel,
        prCount: prCounts.total,
        quickMetrics,
        performanceMetrics,
        surfaceMetrics,
        progress: {
          metrics: progressMetrics,
          reviewSections,
          performances: buildProgressEntries(performances),
        },
      };
    }

    const totalDuration = meaningfulRows.reduce((sum, row) => sum + positive(row.durationSeconds), 0);
    const totalCalories = meaningfulRows.reduce((sum, row) => sum + positive(row.calories), 0);
    const latestSessionAggregate = [...sessionAggregates].sort((a, b) => (b.performedAt ?? "").localeCompare(a.performedAt ?? ""))[0] ?? null;

    const aggregatePace = (row: { durationSeconds: number; distance: number; distanceUnit: "mi" | "km" | "m" | "steps" | null }) => getDisplayPace(
      row.durationSeconds,
      row.distance,
      row.distanceUnit,
    );

    const selectBestAggregate = (rows: typeof sessionAggregates) => {
      const priority = resolveCardioPrimaryMetric(exerciseMetadata?.measurement_type);
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
      ?? fallbackDistanceUnit(exerciseMetadata?.default_unit);
    const selectedCardioBest = chooseCardioBestMetric({
      durationSeconds: bestAggregate?.durationSeconds ?? null,
      distance: bestAggregate?.distance ?? null,
      distanceUnit: bestAggregate?.distanceUnit ?? distanceUnitForPace,
    });
    const basePresentationKind = resolveCardioPresentationKind(exerciseMetadata?.measurement_type);
    const family = resolveExerciseAnalyticsFamily({
      presentationKind: basePresentationKind,
      name: exerciseMetadata?.name,
      measurement_type: exerciseMetadata?.measurement_type,
      defaultUnit: exerciseMetadata?.default_unit,
      distanceUnit: distanceUnitForPace,
      equipment: exerciseMetadata?.equipment,
      movement_pattern: exerciseMetadata?.movement_pattern,
      primary_muscle: exerciseMetadata?.primary_muscle,
    });
    const bestSetSummary = family === "cardio-calories"
      ? (bestCalories > 0 ? (formatCalories(bestCalories) ?? `${Math.round(bestCalories)} cal`) : null)
      : shouldShowCardioBest({
          measurementType: exerciseMetadata?.measurement_type,
          bestDurationSeconds: bestAggregate?.durationSeconds ?? null,
          bestDistance: bestAggregate?.distance ?? null,
        }) && selectedCardioBest
        ? selectedCardioBest.value
        : null;
    const lastPerformedAt = latestSessionAggregate?.performedAt ?? statsLookup.row?.last_performed_at ?? lastSet?.performedAt ?? null;
    const lastSummary = formatCardioSummary({
      family,
      durationSeconds: latestSessionAggregate?.durationSeconds ?? null,
      distance: latestSessionAggregate?.distance ?? null,
      calories: latestSessionAggregate?.calories ?? null,
      paceSecondsPerUnit: latestSessionAggregate ? aggregatePace(latestSessionAggregate)?.paceSecondsPerUnit : null,
      distanceUnit: distanceUnitForPace,
    });
    const performances = buildCardioSessionPerformances({ sessionAggregates }).map((performance) => ({
      ...performance,
      setSummaries: (rowsBySessionId.get(performance.sessionId) ?? [])
        .sort((a, b) => a.setIndex - b.setIndex)
        .map((row) => formatSetMeasurementSummary({
          reps: row.reps,
          weight: row.weight,
          weightUnit: row.weightUnit,
          durationSeconds: row.durationSeconds,
          distance: row.distance,
          distanceUnit: row.distanceUnit,
          calories: row.calories,
        })),
    }));
    const progressDelta = buildCardioProgressDelta(performances[0] ?? null, performances[1] ?? null, exerciseMetadata?.measurement_type);
    const trendMetric = buildExerciseInfoTrendMetric(progressDelta, "0");
    const presentationKind = mapExerciseAnalyticsFamilyToPresentationKind(family);
    const performanceMetrics = buildCardioPerformanceMetrics({
      family,
      lastSummary,
      lastPerformedAt,
      bestDurationSeconds,
      bestDistance,
      bestDistanceUnit: distanceUnitForPace,
      rows: performances.map((performance) => ({
        performedAt: performance.performedAt,
        durationSeconds: performance.durationSeconds,
        distance: performance.distance,
        distanceUnit: performance.distanceUnit,
        calories: performance.calories,
      })),
    });
    const progressMetrics = [
      ...(trendMetric ? [trendMetric] : []),
      buildFrequencyMetric(performances.map((performance) => performance.performedAt)),
    ];
    const quickMetrics = buildQuickMetrics({
      kind,
      lastPerformedAt,
      lastSummary,
      bestSummary: bestSetSummary,
      prCount: 0,
      totalSessions: sessionAggregates.length,
      totalSets: meaningfulRows.length,
    });
    const surfaceMetrics = buildExerciseInfoSurfaceMetrics({
      quickMetrics,
      performanceMetrics,
      progressMetrics,
    });
    const reviewSections = buildExerciseInfoReviewSections({
      kind,
      family,
      lastSummary,
      bestSummary: bestSetSummary,
      prLabel: "",
      prCount: 0,
      progressMetrics,
    });

    return {
      exercise_id: canonicalExerciseId,
      kind,
      analyticsFamily: family,
      presentationKind,
      recent: {
        lastPerformedAt,
        lastSummary,
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
        ...(bestSetSummary ? { bestSetSummary } : {}),
      },
      prLabel: "",
      prCount: 0,
      quickMetrics,
      performanceMetrics,
      surfaceMetrics,
      progress: {
        metrics: progressMetrics,
        reviewSections,
        performances: buildProgressEntries(performances),
      },
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

export async function getExerciseInfoPayload(
  exerciseId: string,
  userId: string,
  client?: SupabaseClient,
): Promise<ExerciseInfoPayload | null> {
  const exercise = await getExerciseInfoBase(exerciseId, userId, client);
  if (!exercise) {
    return null;
  }

  const stats = await getExerciseInfoStats(
    userId,
    exercise.exercise_id,
    exercise,
    undefined,
    client,
  );
  const exerciseWithImages = resolveExerciseInfoImages(exercise);

  if (process.env.NODE_ENV === "development"
    && isCardioMeasurementType(exercise.measurement_type)
    && stats?.kind === "strength") {
    console.warn("[exercise-info] cardio measurement_type resolved to strength due to missing cardio signal", {
      exerciseId: exercise.exercise_id,
      name: exercise.name,
      measurement_type: exercise.measurement_type,
    });
  }

  runDevStatsVerification(exerciseWithImages, stats ?? null);

  return {
    exercise: exerciseWithImages,
    stats: stats ?? null,
  };
}
