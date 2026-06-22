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
import {
  mapExerciseAnalyticsFamilyToPresentationKind,
  resolveExerciseAnalyticsFamily,
  type ExerciseAnalyticsFamily,
} from "@/lib/exercise-analytics-family";
import { listExercises, listExercisesForUser } from "@/lib/exercises";
import { supabaseServer } from "@/lib/supabase/server";
import { formatCalories, formatDistance, formatDurationShort, formatPace, positive } from "@/lib/exercise-stats-formatting";
import { isStepDistanceUnit } from "@/lib/fitness-distance-units";
import { chooseCardioBestMetric, getDisplayPace, isCardioMeasurementType, resolveEffectiveKind, shouldShowCardioBest } from "@/lib/cardio-best";
import { aggregateCardioSessions, aggregateExerciseStatsFromSets, groupNormalizedSetsByExercise, type HistoricalSetRow } from "@/lib/exercise-history-aggregation";
import { resolveHistorySetPlotY } from "@/lib/exercise-info-history-layout";
import { resolveHistoryGraphMetricKey, type HistoryGraphMetricKey } from "@/lib/exercise-info-history-axis";
import { formatWeight } from "@/lib/formatting";
import { buildExerciseProgressionLifelineSummary, type ExerciseProgressionLifelineSummary } from "@/lib/progression-lifeline-summary";
import type { ProgressionEventRow } from "@/types/db";
import {
  normalizeExerciseInfoFilterState,
  type ExerciseInfoAnalyticsScope,
  type ExerciseInfoFilterOptions,
  type ExerciseInfoFilterState,
  type ExerciseInfoRoutineFilterOption,
} from "@/lib/exercise-info-scope";
import { buildCurrentCycleWindow, type CurrentCycleWindow } from "@/lib/current-cycle-window";

type ExerciseCatalogRow = {
  id: string;
  name: string;
  slug: string | null;
  primary_muscle: string | null;
  primary_muscles?: string[] | null;
  secondary_muscles?: string[] | null;
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
  measurement_type?: string | null;
  default_unit?: string | null;
  primary_muscle: string | null;
  primary_muscles?: string[] | null;
  secondary_muscles?: string[] | null;
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
  detailSections?: Array<{
    title: string;
    items: string[];
  }>;
  deltaFromBest: string | null;
  tagsSummary: string | null;
  analyticsFamily?: ExerciseAnalyticsFamily;
  progressionSummary?: ExerciseProgressionLifelineSummary | null;
  trendPreview?: ExerciseBrowserTrendPreview | null;
};

export type ExerciseBrowserTrendPreviewPoint = {
  id: string;
  performedAt: string;
  plotValue?: number;
  value: number;
};

export type ExerciseBrowserTrendPreview = {
  metricKey: HistoryGraphMetricKey;
  label: string;
  points: ExerciseBrowserTrendPreviewPoint[];
};

export type ExerciseBrowserScopePayload = {
  initialRows: ExerciseBrowserRow[];
  filterOptions: ExerciseInfoFilterOptions;
  activeRoutineTitle: string | null;
};

type ExerciseBrowserScopeContext = {
  profileTimeZone: string;
  activeRoutineId: string | null;
  activeRoutineTitle: string | null;
  currentCycleWindow: CurrentCycleWindow | null;
};

type ExerciseBrowserRoutineMeta = {
  id: string;
  title: string;
  cycleLengthDays: number | null;
  startDate: string | null;
  timeZone: string;
  isActive: boolean;
};

function formatCompact(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function readTrendMetricValue(row: {
  weight?: number | null;
  reps?: number | null;
  duration_seconds?: number | null;
  distance?: number | null;
  calories?: number | null;
}, metricKey: HistoryGraphMetricKey) {
  const weight = positive(row.weight);
  const reps = positive(row.reps);
  const duration = positive(row.duration_seconds);
  const distance = positive(row.distance);
  const calories = positive(row.calories);

  if (metricKey === "weight") return weight > 0 ? weight : reps > 0 ? reps : null;
  if (metricKey === "reps") return reps > 0 ? reps : weight > 0 ? weight : null;
  if (metricKey === "distance") return distance > 0 ? distance : duration > 0 ? duration : null;
  if (metricKey === "calories") return calories > 0 ? calories : distance > 0 ? distance : duration > 0 ? duration : null;
  return duration > 0 ? duration : distance > 0 ? distance : null;
}

function resolveTrendPreviewPlotValues(
  rows: Array<{
    value: number;
    reps?: number | null;
  }>,
  metricKey: HistoryGraphMetricKey,
) {
  if (metricKey !== "weight" || rows.length === 0) {
    return rows.map((row) => row.value);
  }

  const numericValues = rows
    .map((row) => row.value)
    .filter((value) => Number.isFinite(value) && value > 0);
  const maxSecondaryReps = rows.reduce((max, row) => {
    const reps = positive(row.reps);
    return reps > 0 ? Math.max(max, reps) : max;
  }, 0);
  if (numericValues.length === 0 || maxSecondaryReps <= 1) {
    return rows.map((row) => row.value);
  }

  const primaryLevelsDesc = Array.from(new Set(numericValues.map((value) => Number(value.toFixed(3))))).sort((left, right) => right - left);
  const rawMinValue = Math.min(...numericValues);
  const rawMaxValue = Math.max(...numericValues);
  const rawValueRange = Math.max(rawMaxValue - rawMinValue, 1);
  const valuePadding = rawValueRange * 0.14;
  const minValue = rawMinValue - valuePadding;
  const maxValue = rawMaxValue + valuePadding;
  const valueRange = Math.max(maxValue - minValue, 1);
  const setLaneHeight = 100;

  return rows.map((row) => {
    const y = resolveHistorySetPlotY({
      metricKey,
      maxSecondaryReps,
      minValue,
      primaryLevelsDesc,
      primaryValue: row.value,
      secondaryReps: positive(row.reps),
      setLaneHeight,
      setLaneTop: 0,
      valueRange,
    });

    return setLaneHeight - y;
  });
}

function formatTrendMetricLabel(metricKey: HistoryGraphMetricKey) {
  if (metricKey === "weight") return "Weight";
  if (metricKey === "reps") return "Reps";
  if (metricKey === "distance") return "Distance";
  if (metricKey === "calories") return "Calories";
  return "Time";
}

export function buildExerciseBrowserTrendPreview(args: {
  kind: "strength" | "cardio";
  measurementType?: string | null;
  rows: Array<{
    sessionId: string;
    performedAt: string;
    set_index: number;
    weight?: number | null;
    reps?: number | null;
    duration_seconds?: number | null;
    distance?: number | null;
    calories?: number | null;
  }>;
  latestWeight?: number | null;
  latestDurationSeconds?: number | null;
  latestDistance?: number | null;
  latestCalories?: number | null;
}) {
  const metricKey = resolveHistoryGraphMetricKey({
    kind: args.kind,
    measurementType: args.measurementType,
    latestWeight: args.latestWeight ?? null,
    latestDurationSeconds: args.latestDurationSeconds ?? null,
    latestDistance: args.latestDistance ?? null,
    latestCalories: args.latestCalories ?? null,
  });
  const orderedRows = [...args.rows].sort((left, right) => {
    if (left.performedAt !== right.performedAt) return left.performedAt.localeCompare(right.performedAt);
    if (left.sessionId !== right.sessionId) return left.sessionId.localeCompare(right.sessionId);
    return left.set_index - right.set_index;
  });
  const candidatePoints = orderedRows
    .flatMap((row) => {
      const value = readTrendMetricValue(row, metricKey);
      return typeof value === "number" && Number.isFinite(value) && value > 0
        ? [{
            id: `${row.sessionId}-${row.set_index}`,
            performedAt: row.performedAt,
            reps: row.reps,
            value,
          }]
        : [];
    })
    .slice(-48);
  const plotValues = resolveTrendPreviewPlotValues(candidatePoints, metricKey);
  const points = candidatePoints.map((point, index) => {
    const plotValue = plotValues[index];
    return {
      id: point.id,
      performedAt: point.performedAt,
      ...(typeof plotValue === "number" && Number.isFinite(plotValue) ? { plotValue } : {}),
      value: point.value,
    };
  });

  if (points.length < 2) {
    return null;
  }

  return {
    metricKey,
    label: formatTrendMetricLabel(metricKey),
    points,
  } satisfies ExerciseBrowserTrendPreview;
}

function formatStrengthSummary(weight: number | null, reps: number | null, unit: string | null) {
  const safeWeight = positive(weight);
  const safeReps = positive(reps);
  const normalizedUnit = unit === "lb" || unit === "lbs" ? "lbs" : unit === "kg" ? "kg" : "";

  if (safeWeight > 0 && safeReps > 0) {
    return `${formatCompact(safeWeight)}${normalizedUnit}x${formatCompact(safeReps)}`;
  }
  if (safeReps > 0) return `${formatCompact(safeReps)} reps`;
  if (safeWeight > 0) return `${formatCompact(safeWeight)}${normalizedUnit}`;
  return null;
}

function resolveStrengthPresentationKind(args: {
  last_weight?: number | null;
  actual_pr_weight?: number | null;
  last_reps?: number | null;
  actual_pr_reps?: number | null;
}) {
  const hasWeightedSignal = positive(args.last_weight) > 0 || positive(args.actual_pr_weight) > 0;
  const hasRepSignal = positive(args.last_reps) > 0 || positive(args.actual_pr_reps) > 0;

  if (!hasWeightedSignal && hasRepSignal) {
    return "bodyweight" as const;
  }

  return "strength" as const;
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
  distanceUnit: "mi" | "km" | "m" | "steps" | null;
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

function buildStrengthProgressMetric(latest: StrengthSessionSummary | null, previous: StrengthSessionSummary | null): MetricDatum | null {
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
    label: "Vs Previous",
    value: delta === 0 ? "Matched" : `${Math.abs(delta)} reps`,
    valuePrefix: delta > 0 ? "\u2191" : delta < 0 ? "\u2193" : "\u2192",
    valueTone: delta > 0 ? "success" : delta < 0 ? "danger" : "muted",
  };
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
    metrics.push({ label: "Max Estimate", value: estimatedMax });
  }

  metrics.push(
    { label: "Sessions", value: `${args.sessionCount}` },
    { label: "Sets", value: `${args.setCount}` },
    { label: "PRs", value: `${args.prCount}` },
  );

  const repTrend = buildStrengthProgressMetric(args.latestSession, args.previousSession);
  if (repTrend) {
    metrics.push(repTrend);
  }

  metrics.push({
    label: "Recent Activity",
    value: `${args.sessionsLast30Days} ${args.sessionsLast30Days === 1 ? "session" : "sessions"}`,
  });

  return metrics;
}

function buildCardioDetailedMetrics(args: {
  family: ExerciseAnalyticsFamily;
  sessionCount: number;
  setCount: number;
  sessionsLast30Days: number;
  trackingLabel: string;
}) {
  const recentLabel = args.family === "timed-hold" ? "Active" : "Recent";
  return [
    { label: "Sessions", value: `${args.sessionCount}` },
    { label: "Sets", value: `${args.setCount}` },
    {
      label: recentLabel,
      value: `${args.sessionsLast30Days}`,
      timeframe: "recent window",
      valueTone: args.sessionsLast30Days > 0 ? "default" : "muted",
    },
    {
      label: "Tracked",
      value: args.trackingLabel,
      valueTone: "muted",
    },
  ] satisfies MetricDatum[];
}

function buildCardioTrackingLabel(session: CardioSessionSummary | null) {
  const hasDuration = positive(session?.durationSeconds) > 0;
  const hasDistance = positive(session?.distance) > 0;
  const hasCalories = positive(session?.calories) > 0;
  const distanceLabel = isStepDistanceUnit(session?.distanceUnit) ? "Steps" : "Dist";

  if (hasDuration && hasDistance && hasCalories) return `Time + ${distanceLabel} + Cal`;
  if (hasDuration && hasDistance) return `Time + ${distanceLabel}`;
  if (hasDuration && hasCalories) return "Time + Cal";
  if (hasDistance && hasCalories) return `${distanceLabel} + Cal`;
  if (hasDuration) return "Time";
  if (hasDistance) return distanceLabel === "Steps" ? "Steps" : "Distance";
  if (hasCalories) return "Calories";
  return "Cardio";
}

function buildFamilyTrackingLabel(args: {
  family: ExerciseAnalyticsFamily;
  session: CardioSessionSummary | null;
}) {
  if (args.family === "timed-hold") {
    return "Time";
  }

  return buildCardioTrackingLabel(args.session);
}

function buildCardioSessionDetailItems(session: CardioSessionSummary | null, family: ExerciseAnalyticsFamily) {
  if (!session) return [];

  const pace = getDisplayPace(session.durationSeconds, session.distance, session.distanceUnit);
  const distanceLabel = isStepDistanceUnit(session.distanceUnit) ? "Steps" : "Distance";
  const timeItem = positive(session.durationSeconds) > 0 ? `Time: ${formatDurationShort(session.durationSeconds)}` : null;
  const distanceItem = positive(session.distance) > 0 ? `${distanceLabel}: ${formatDistance(session.distance, session.distanceUnit)}` : null;
  const paceItem = pace ? `Pace: ${formatPace(pace.paceSecondsPerUnit, pace.distanceUnit)}` : null;
  const caloriesItem = positive(session.calories) > 0 ? `Calories: ${formatCalories(session.calories)}` : null;
  return (
    family === "timed-hold"
      ? [timeItem]
      : family === "cardio-calories"
        ? [caloriesItem, timeItem, distanceItem, paceItem]
        : family === "cardio-distance"
          ? [distanceItem, paceItem, timeItem, caloriesItem]
          : family === "cardio-steps"
            ? [timeItem, distanceItem, caloriesItem]
            : [timeItem, distanceItem, paceItem, caloriesItem]
  ).filter((value): value is string => Boolean(value));
}

function buildCardioProgressDetailItems(args: {
  family: ExerciseAnalyticsFamily;
  latest: CardioSessionSummary | null;
  previous: CardioSessionSummary | null;
  deltaFromBest: string | null;
}) {
  const items: string[] = [];

  if (args.deltaFromBest) {
    items.push(args.deltaFromBest);
  }

  if (args.latest && args.previous) {
    const distanceLabel = isStepDistanceUnit(args.latest.distanceUnit ?? args.previous.distanceUnit) ? "Steps" : "Distance";
    const durationDelta = positive(args.latest.durationSeconds) > 0 && positive(args.previous.durationSeconds) > 0
      ? args.latest.durationSeconds - args.previous.durationSeconds
      : null;
    const distanceDelta = positive(args.latest.distance) > 0 && positive(args.previous.distance) > 0
      ? args.latest.distance - args.previous.distance
      : null;
    const caloriesDelta = positive(args.latest.calories) > 0 && positive(args.previous.calories) > 0
      ? args.latest.calories - args.previous.calories
      : null;

    const currentPace = getDisplayPace(args.latest.durationSeconds, args.latest.distance, args.latest.distanceUnit);
    const previousPace = getDisplayPace(args.previous.durationSeconds, args.previous.distance, args.previous.distanceUnit);
    if (currentPace && previousPace && args.family !== "cardio-steps" && args.family !== "cardio-calories") {
      const currentText = formatPace(currentPace.paceSecondsPerUnit, currentPace.distanceUnit);
      const previousText = formatPace(previousPace.paceSecondsPerUnit, previousPace.distanceUnit);
      if (currentText && previousText) {
        items.push(currentText === previousText ? `Pace | Matched previous (${currentText})` : `Pace | ${currentText} vs ${previousText}`);
      }
    }

    if (distanceDelta !== null) {
      const distanceText = formatDistance(Math.abs(distanceDelta), args.latest.distanceUnit ?? args.previous.distanceUnit);
      if (distanceText) {
        items.push(distanceDelta === 0 ? `${distanceLabel} | Matched previous` : `${distanceLabel} | ${distanceDelta > 0 ? "+" : "-"}${distanceText} vs previous`);
      }
    }

    if (durationDelta !== null) {
      const durationText = formatDurationShort(Math.abs(durationDelta));
      if (durationText) {
        items.push(durationDelta === 0 ? "Time | Matched previous" : `Time | ${durationDelta > 0 ? "+" : "-"}${durationText} vs previous`);
      }
    }

    if (caloriesDelta !== null) {
      const caloriesText = formatCalories(Math.abs(caloriesDelta));
      if (caloriesText) {
        items.push(caloriesDelta === 0 ? "Calories | Matched previous" : `Calories | ${caloriesDelta > 0 ? "+" : "-"}${caloriesText} vs previous`);
      }
    }
  }

  const uniqueItems = Array.from(new Set(items));
  const orderedItems = args.family === "cardio-calories"
    ? [
        ...uniqueItems.filter((item) => item.startsWith("Calories:")),
        ...uniqueItems.filter((item) => item.startsWith("Time:")),
        ...uniqueItems.filter((item) => item.startsWith("Distance:") || item.startsWith("Steps:")),
        ...uniqueItems.filter((item) => !item.startsWith("Calories:") && !item.startsWith("Time:") && !item.startsWith("Distance:") && !item.startsWith("Steps:")),
      ]
    : args.family === "cardio-distance"
      ? [
          ...uniqueItems.filter((item) => item.startsWith("Distance:")),
          ...uniqueItems.filter((item) => item.startsWith("Pace:")),
          ...uniqueItems.filter((item) => item.startsWith("Time:")),
          ...uniqueItems.filter((item) => !item.startsWith("Distance:") && !item.startsWith("Pace:") && !item.startsWith("Time:")),
        ]
      : args.family === "cardio-steps"
        ? [
            ...uniqueItems.filter((item) => item.startsWith("Steps:")),
            ...uniqueItems.filter((item) => item.startsWith("Time:")),
            ...uniqueItems.filter((item) => item.startsWith("Calories:")),
            ...uniqueItems.filter((item) => !item.startsWith("Steps:") && !item.startsWith("Time:") && !item.startsWith("Calories:")),
          ]
        : uniqueItems;

  return orderedItems.slice(0, 4);
}

function buildCardioDetailSections(args: {
  family: ExerciseAnalyticsFamily;
  latestSession: CardioSessionSummary | null;
  previousSession: CardioSessionSummary | null;
  bestSession: CardioSessionSummary | null;
  deltaFromBest: string | null;
}) {
  const lastItems = buildCardioSessionDetailItems(args.latestSession, args.family);
  const bestItems = buildCardioSessionDetailItems(args.bestSession, args.family);
  const progressItems = buildCardioProgressDetailItems({
    family: args.family,
    latest: args.latestSession,
    previous: args.previousSession,
    deltaFromBest: args.deltaFromBest,
  });

  return [
    {
      title: "Last",
      items: lastItems.length > 0 ? lastItems : [args.family === "timed-hold" ? "No timed effort logged yet." : "No cardio effort logged yet."],
    },
    {
      title: "Best",
      items: bestItems.length > 0 ? bestItems : [args.family === "timed-hold" ? "No best hold recorded yet." : "No best cardio effort recorded yet."],
    },
    {
      title: "Progress",
      items: progressItems.length > 0 ? progressItems : [args.family === "timed-hold" ? "No timed trend signal yet." : "No cardio trend signal yet."],
    },
  ];
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

function formatCycleDayLabel(dayKey: string) {
  const timestamp = Date.parse(`${dayKey}T12:00:00.000Z`);
  if (!Number.isFinite(timestamp)) {
    return dayKey;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

function buildCycleLabel(startDate: string, endDate: string) {
  return `${formatCycleDayLabel(startDate)} - ${formatCycleDayLabel(endDate)}`;
}

function getDayKey(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

async function loadExerciseBrowserRoutineMeta(args: {
  userId: string;
  routineId: string;
  activeRoutineId: string | null;
  profileTimeZone: string;
  client?: SupabaseClient;
}): Promise<ExerciseBrowserRoutineMeta | null> {
  const supabase = args.client ?? supabaseServer();
  const { data } = await supabase
    .from("routines")
    .select("id, name, cycle_length_days, start_date, timezone")
    .eq("id", args.routineId)
    .eq("user_id", args.userId)
    .maybeSingle();

  const id = typeof data?.id === "string" ? data.id.trim() : "";
  const title = typeof data?.name === "string" && data.name.trim().length > 0
    ? data.name.trim()
    : "";
  if (!id || !title) {
    return null;
  }

  return {
    id,
    title,
    cycleLengthDays: typeof data?.cycle_length_days === "number" ? data.cycle_length_days : null,
    startDate: typeof data?.start_date === "string" ? data.start_date : null,
    timeZone: typeof data?.timezone === "string" && data.timezone.trim().length > 0
      ? data.timezone.trim()
      : args.profileTimeZone,
    isActive: id === args.activeRoutineId,
  };
}

function buildExerciseBrowserRoutineCycleOptions(args: {
  routine: ExerciseBrowserRoutineMeta;
  dayKeys: string[];
}): ExerciseInfoRoutineFilterOption["cycleOptions"] {
  if (!args.routine.startDate || !args.routine.cycleLengthDays || args.routine.cycleLengthDays <= 0) {
    return [];
  }

  const optionsByStartDate = new Map<string, ExerciseInfoRoutineFilterOption["cycleOptions"][number]>();
  for (const dayKey of args.dayKeys) {
    const cycleWindow = buildCurrentCycleWindow({
      cycleLengthDays: args.routine.cycleLengthDays,
      startDate: args.routine.startDate,
      profileTimeZone: args.routine.timeZone,
      referenceDate: dayKey,
    });
    if (!cycleWindow) {
      continue;
    }

    optionsByStartDate.set(cycleWindow.startDate, {
      startDate: cycleWindow.startDate,
      endDate: cycleWindow.endDate,
      label: buildCycleLabel(cycleWindow.startDate, cycleWindow.endDate),
    });
  }

  return [...optionsByStartDate.values()].sort((left, right) => right.startDate.localeCompare(left.startDate));
}

async function buildExerciseBrowserFilterOptions(args: {
  userId: string;
  scopeContext: ExerciseBrowserScopeContext;
  client?: SupabaseClient;
}): Promise<ExerciseInfoFilterOptions> {
  const supabase = args.client ?? supabaseServer();
  const [{ data: routineRows }, { data: sessionRows }, { data: progressionRows }] = await Promise.all([
    supabase
      .from("routines")
      .select("id, name, cycle_length_days, start_date, timezone")
      .eq("user_id", args.userId),
    supabase
      .from("sessions")
      .select("routine_id, performed_at")
      .eq("user_id", args.userId)
      .eq("status", "completed")
      .not("routine_id", "is", null),
    supabase
      .from("progression_events")
      .select("routine_id, created_at")
      .eq("user_id", args.userId)
      .not("routine_id", "is", null),
  ]);

  const dayKeysByRoutineId = new Map<string, Set<string>>();
  for (const row of sessionRows ?? []) {
    const routineId = typeof row?.routine_id === "string" ? row.routine_id.trim() : "";
    const dayKey = getDayKey(typeof row?.performed_at === "string" ? row.performed_at : null);
    if (!routineId || !dayKey) {
      continue;
    }

    const current = dayKeysByRoutineId.get(routineId) ?? new Set<string>();
    current.add(dayKey);
    dayKeysByRoutineId.set(routineId, current);
  }
  for (const row of progressionRows ?? []) {
    const routineId = typeof row?.routine_id === "string" ? row.routine_id.trim() : "";
    const dayKey = getDayKey(typeof row?.created_at === "string" ? row.created_at : null);
    if (!routineId || !dayKey) {
      continue;
    }

    const current = dayKeysByRoutineId.get(routineId) ?? new Set<string>();
    current.add(dayKey);
    dayKeysByRoutineId.set(routineId, current);
  }

  const routines = (routineRows ?? [])
    .map((routine): ExerciseBrowserRoutineMeta | null => {
      const id = typeof routine?.id === "string" ? routine.id.trim() : "";
      const title = typeof routine?.name === "string" && routine.name.trim().length > 0
        ? routine.name.trim()
        : "";
      if (!id || !title) {
        return null;
      }

      return {
        id,
        title,
        cycleLengthDays: typeof routine?.cycle_length_days === "number" ? routine.cycle_length_days : null,
        startDate: typeof routine?.start_date === "string" ? routine.start_date : null,
        timeZone: typeof routine?.timezone === "string" && routine.timezone.trim().length > 0
          ? routine.timezone.trim()
          : args.scopeContext.profileTimeZone,
        isActive: id === args.scopeContext.activeRoutineId,
      };
    })
    .filter((routine): routine is ExerciseBrowserRoutineMeta => Boolean(routine))
    .sort((left, right) => {
      if (left.isActive !== right.isActive) {
        return left.isActive ? -1 : 1;
      }

      return left.title.localeCompare(right.title);
    });

  return {
    routines: routines.map((routine) => ({
      id: routine.id,
      title: routine.title,
      ...(routine.isActive ? { isActive: true } : {}),
      cycleOptions: buildExerciseBrowserRoutineCycleOptions({
        routine,
        dayKeys: [...(dayKeysByRoutineId.get(routine.id) ?? new Set<string>())],
      }),
    })),
  };
}

async function resolveExerciseBrowserScopeContext(userId: string, client?: SupabaseClient): Promise<ExerciseBrowserScopeContext> {
  const supabase = client ?? supabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("timezone, active_routine_id")
    .eq("id", userId)
    .maybeSingle();

  const activeRoutineId = typeof data?.active_routine_id === "string" && data.active_routine_id.trim().length > 0
    ? data.active_routine_id
    : null;
  const profileTimeZone = typeof data?.timezone === "string" && data.timezone.trim().length > 0
    ? data.timezone.trim()
    : "America/New_York";

  if (!activeRoutineId) {
    return {
      profileTimeZone,
      activeRoutineId: null,
      activeRoutineTitle: null,
      currentCycleWindow: null,
    };
  }

  const { data: routineData } = await supabase
    .from("routines")
    .select("name, cycle_length_days, start_date, timezone")
    .eq("id", activeRoutineId)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    profileTimeZone,
    activeRoutineId,
    activeRoutineTitle: typeof routineData?.name === "string" && routineData.name.trim().length > 0
      ? routineData.name.trim()
      : null,
    currentCycleWindow: buildCurrentCycleWindow({
      cycleLengthDays: typeof routineData?.cycle_length_days === "number" ? routineData.cycle_length_days : null,
      startDate: typeof routineData?.start_date === "string" ? routineData.start_date : null,
      profileTimeZone: typeof routineData?.timezone === "string" && routineData.timezone.trim().length > 0
        ? routineData.timezone.trim()
      : profileTimeZone,
    }),
  };
}

async function resolveExerciseBrowserScopedContext(args: {
  userId: string;
  filterState?: Partial<ExerciseInfoFilterState> | null;
  client?: SupabaseClient;
}): Promise<ExerciseBrowserScopeContext> {
  const normalizedFilterState = normalizeExerciseInfoFilterState(args.filterState);
  const scopeContext = await resolveExerciseBrowserScopeContext(args.userId, args.client);
  if (normalizedFilterState.analyticsScope === "all_time") {
    return scopeContext;
  }

  const requestedRoutineId = normalizedFilterState.routineId ?? scopeContext.activeRoutineId;
  if (!requestedRoutineId) {
    return {
      ...scopeContext,
      activeRoutineId: null,
      activeRoutineTitle: null,
      currentCycleWindow: null,
    };
  }

  if (requestedRoutineId === scopeContext.activeRoutineId) {
    if (normalizedFilterState.analyticsScope !== "current_cycle" || !normalizedFilterState.cycleStartDate) {
      return scopeContext;
    }

    if (scopeContext.currentCycleWindow?.startDate === normalizedFilterState.cycleStartDate) {
      return scopeContext;
    }
  }

  const routineMeta = await loadExerciseBrowserRoutineMeta({
    userId: args.userId,
    routineId: requestedRoutineId,
    activeRoutineId: scopeContext.activeRoutineId,
    profileTimeZone: scopeContext.profileTimeZone,
    client: args.client,
  });
  if (!routineMeta) {
    return scopeContext;
  }

  return {
    profileTimeZone: scopeContext.profileTimeZone,
    activeRoutineId: routineMeta.id,
    activeRoutineTitle: routineMeta.title,
    currentCycleWindow: normalizedFilterState.analyticsScope === "current_cycle"
      ? buildCurrentCycleWindow({
          cycleLengthDays: routineMeta.cycleLengthDays,
          startDate: routineMeta.startDate,
          profileTimeZone: routineMeta.timeZone,
          referenceDate: normalizedFilterState.cycleStartDate ?? routineMeta.startDate ?? undefined,
        })
      : null,
  };
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

async function getExercisesWithStats(
  userId: string,
  client?: SupabaseClient,
  options?: {
    analyticsScope?: ExerciseInfoAnalyticsScope;
    scopeContext?: ExerciseBrowserScopeContext | null;
  },
): Promise<ExerciseBrowserRow[]> {
  noStore();
  const supabase = client ?? supabaseServer();
  const analyticsScope = options?.analyticsScope === "current_routine"
    ? "current_routine"
    : options?.analyticsScope === "current_cycle"
      ? "current_cycle"
      : "all_time";
  const shouldUseDerivedHistory = analyticsScope !== "all_time";
  const activeRoutineId = analyticsScope !== "all_time"
    ? (options?.scopeContext?.activeRoutineId ?? null)
    : null;
  const currentCycleWindow = analyticsScope === "current_cycle"
    ? (options?.scopeContext?.currentCycleWindow ?? null)
    : null;

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

  const statsPromise = shouldUseDerivedHistory
    ? Promise.resolve({ data: [] as ExerciseStatsRow[], error: null as PostgrestError | null })
    : supabase
        .from("exercise_stats")
        .select("exercise_id, last_weight, last_reps, last_unit, last_performed_at, pr_weight, pr_reps, pr_est_1rm, actual_pr_weight, actual_pr_reps, actual_pr_at")
        .eq("user_id", userId)
        .in("exercise_id", canonicalIds);

  const historySetPromise = analyticsScope === "current_routine"
    ? activeRoutineId
      ? supabase
          .from("sets")
          .select("set_index, weight, reps, weight_unit, duration_seconds, distance, distance_unit, calories, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(status, performed_at, routine_id))")
          .eq("user_id", userId)
          .eq("session_exercise.user_id", userId)
          .in("session_exercise.exercise_id", canonicalIds)
          .eq("session_exercise.session.status", "completed")
          .eq("session_exercise.session.routine_id", activeRoutineId)
      : Promise.resolve({ data: [] as HistoricalSetRow[], error: null as PostgrestError | null })
    : analyticsScope === "current_cycle"
      ? activeRoutineId && currentCycleWindow
        ? supabase
            .from("sets")
            .select("set_index, weight, reps, weight_unit, duration_seconds, distance, distance_unit, calories, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(status, performed_at, routine_id))")
            .eq("user_id", userId)
            .eq("session_exercise.user_id", userId)
            .in("session_exercise.exercise_id", canonicalIds)
            .eq("session_exercise.session.status", "completed")
            .eq("session_exercise.session.routine_id", activeRoutineId)
            .gte("session_exercise.session.performed_at", currentCycleWindow.queryStartIso)
            .lt("session_exercise.session.performed_at", currentCycleWindow.queryEndExclusiveIso)
        : Promise.resolve({ data: [] as HistoricalSetRow[], error: null as PostgrestError | null })
    : supabase
        .from("sets")
        .select("set_index, weight, reps, weight_unit, duration_seconds, distance, distance_unit, calories, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(status, performed_at, routine_id))")
        .eq("user_id", userId)
        .eq("session_exercise.user_id", userId)
        .in("session_exercise.exercise_id", canonicalIds)
        .eq("session_exercise.session.status", "completed");

  const progressionEventsPromise = analyticsScope === "current_routine"
    ? activeRoutineId
      ? supabase
          .from("progression_events")
          .select("id, user_id, routine_id, routine_day_exercise_id, exercise_id, event_type, from_target, to_target, method, vector, step, reason, source_session_id, created_at")
          .eq("user_id", userId)
          .in("exercise_id", canonicalIds)
          .eq("routine_id", activeRoutineId)
      : Promise.resolve({ data: [] as ProgressionEventRow[], error: null as PostgrestError | null })
    : analyticsScope === "current_cycle"
      ? activeRoutineId && currentCycleWindow
        ? supabase
            .from("progression_events")
            .select("id, user_id, routine_id, routine_day_exercise_id, exercise_id, event_type, from_target, to_target, method, vector, step, reason, source_session_id, created_at")
            .eq("user_id", userId)
            .in("exercise_id", canonicalIds)
            .eq("routine_id", activeRoutineId)
            .gte("created_at", currentCycleWindow.queryStartIso)
            .lt("created_at", currentCycleWindow.queryEndExclusiveIso)
        : Promise.resolve({ data: [] as ProgressionEventRow[], error: null as PostgrestError | null })
    : supabase
        .from("progression_events")
        .select("id, user_id, routine_id, routine_day_exercise_id, exercise_id, event_type, from_target, to_target, method, vector, step, reason, source_session_id, created_at")
        .eq("user_id", userId)
        .in("exercise_id", canonicalIds);

  const [{ data: statsRows, error: statsError }, { data: historySetRows, error: historySetError }, { data: progressionEventRows, error: progressionEventsError }] = await Promise.all([
    statsPromise,
    historySetPromise,
    progressionEventsPromise,
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
  if (progressionEventsError && !isRelationOrColumnMissing(progressionEventsError)) {
    throw new Error(`failed to load exercise progression history: ${progressionEventsError.message}`);
  }

  const scopedStatsByExerciseId = shouldUseDerivedHistory
    ? aggregateExerciseStatsFromSets((historySetRows ?? []) as HistoricalSetRow[])
    : null;
  const statsByExerciseId = shouldUseDerivedHistory
    ? new Map<string, ExerciseStatsRow>()
    : new Map(((statsRows ?? []) as ExerciseStatsRow[]).map((row) => [row.exercise_id, row]));
  const setRowsByExerciseId = groupNormalizedSetsByExercise((historySetRows ?? []) as HistoricalSetRow[]);
  const progressionEventsByExerciseId = new Map<string, ProgressionEventRow[]>();
  for (const event of (progressionEventRows ?? []) as ProgressionEventRow[]) {
    const current = progressionEventsByExerciseId.get(event.exercise_id) ?? [];
    current.push(event);
    progressionEventsByExerciseId.set(event.exercise_id, current);
  }
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
      const stats = shouldUseDerivedHistory
        ? (scopedStatsByExerciseId?.get(exerciseId) ?? null)
        : (statsByExerciseId.get(exerciseId) ?? null);
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
      let kind = resolveEffectiveKind(
        exercise.measurement_type,
        hasDurationSignal,
        hasDistanceSignal,
        sessionAggregates.some((row) => positive(row.calories) > 0),
      );
      if (kind === "strength" && isCardioMeasurementType(exercise.measurement_type)) {
        kind = "cardio";
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
      const strengthPresentationKind = resolveStrengthPresentationKind({
        last_weight: stats?.last_weight ?? null,
        actual_pr_weight: stats?.actual_pr_weight ?? null,
        last_reps: stats?.last_reps ?? null,
        actual_pr_reps: stats?.actual_pr_reps ?? null,
      });
      const basePresentationKind = kind === "cardio"
        ? (exercise.measurement_type === "time" || exercise.measurement_type === "duration" ? "timed" : "cardio")
        : strengthPresentationKind;
      const analyticsFamily = resolveExerciseAnalyticsFamily({
        presentationKind: basePresentationKind,
        measurement_type: exercise.measurement_type,
        defaultUnit: exercise.default_unit,
        distanceUnit: latestCardioTrendSession?.distanceUnit ?? bestCardioSession?.distanceUnit ?? null,
        equipment: exercise.equipment,
        movement_pattern: exercise.movement_pattern,
        primary_muscle: exercise.primary_muscle,
      });
      const presentationKind = mapExerciseAnalyticsFamilyToPresentationKind(analyticsFamily);

      const lastSummary = presentationKind !== "cardio"
        ? (!hasWeightedBest && bodyweightPr > 0
          ? (lastBodyweightReps > 0 ? `${formatCompact(lastBodyweightReps)} reps` : null)
          : formatStrengthSummary(stats?.last_weight ?? null, stats?.last_reps ?? null, stats?.last_unit ?? null))
        : formatCardioSummary({
          family: analyticsFamily,
          durationSeconds: latestCardioSession?.durationSeconds ?? null,
          distance: latestCardioSession?.distance ?? null,
          calories: latestCardioSession?.calories ?? null,
          paceSecondsPerUnit: latestCardioSession
            ? getDisplayPace(latestCardioSession.durationSeconds, latestCardioSession.distance, latestCardioSession.distanceUnit)?.paceSecondsPerUnit
            : null,
          distanceUnit: latestCardioSession
            ? (
                getDisplayPace(latestCardioSession.durationSeconds, latestCardioSession.distance, latestCardioSession.distanceUnit)?.distanceUnit
                ?? latestCardioSession.distanceUnit
              )
            : null,
        });

      const selectedCardioBest = chooseCardioBestMetric({
        durationSeconds: bestCardioSession?.durationSeconds ?? null,
        distance: bestCardioSession?.distance ?? null,
        distanceUnit: bestCardioSession?.distanceUnit ?? null,
      });

      const bestSummary = presentationKind !== "cardio"
        ? (!hasWeightedBest && bodyweightPr > 0
          ? `${formatCompact(bodyweightPr)} reps`
          : formatStrengthSummary(stats?.actual_pr_weight ?? null, stats?.actual_pr_reps ?? null, stats?.last_unit ?? null))
        : (() => {
            if (analyticsFamily === "cardio-calories") {
              return positive(bestCardioSession?.calories) > 0
                ? `Best | ${formatCalories(bestCardioSession?.calories) ?? `${Math.round(positive(bestCardioSession?.calories))} cal`}`
                : null;
            }

            if (!shouldShowCardioBest({
              measurementType: exercise.measurement_type,
              bestDurationSeconds: bestCardioSession?.durationSeconds ?? null,
              bestDistance: bestCardioSession?.distance ?? null,
            })) {
              return null;
            }

            return selectedCardioBest ? `Best | ${selectedCardioBest.value}` : null;
          })();

      const deltaFromBest = presentationKind !== "cardio"
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
      const detailedMetrics = presentationKind !== "cardio"
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
            family: analyticsFamily,
            sessionCount,
            setCount,
            sessionsLast30Days,
            trackingLabel: buildFamilyTrackingLabel({ family: analyticsFamily, session: latestCardioTrendSession ?? bestCardioSession }),
          });
      const detailSections = presentationKind === "cardio"
        ? buildCardioDetailSections({
            family: analyticsFamily,
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
            deltaFromBest,
          })
        : undefined;

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
        measurement_type: exercise.measurement_type,
        default_unit: exercise.default_unit,
        kind,
        lastSummary,
        bestSummary,
        prLabel: kind === "strength" ? formatPrBreakdown(prSummary?.counts ?? { reps: 0, weight: 0, total: 0 }) : "",
        prCount: kind === "strength" ? (prSummary?.counts.total ?? 0) : 0,
        sessionCount,
        setCount,
        sessionsLast30Days,
        detailedMetrics,
        detailSections,
        deltaFromBest,
        tagsSummary: formatTagSummary(exercise),
        analyticsFamily,
        progressionSummary: buildExerciseProgressionLifelineSummary(progressionEventsByExerciseId.get(exerciseId) ?? []),
        trendPreview: buildExerciseBrowserTrendPreview({
          kind,
          measurementType: exercise.measurement_type,
          rows: setRows,
          latestWeight: stats?.last_weight ?? null,
          latestDurationSeconds: latestCardioTrendSession?.durationSeconds ?? latestCardioSession?.durationSeconds ?? null,
          latestDistance: latestCardioTrendSession?.distance ?? latestCardioSession?.distance ?? null,
          latestCalories: latestCardioTrendSession?.calories ?? latestCardioSession?.calories ?? null,
        }),
      };

      runDevExerciseBrowserVerification(nextRow);
      return nextRow;
    })
    .filter((row) => {
      if (!shouldUseDerivedHistory) {
        return true;
      }

      return row.sessionCount > 0 || Boolean(progressionEventsByExerciseId.get(row.exerciseId)?.length);
    })
    .sort(compareExerciseBrowserRows);

  return applyHistoryExerciseActivityRanks(rows);
}

export async function getExercisesWithStatsForUser(): Promise<ExerciseBrowserRow[]> {
  const user = await requireUser();
  return getExercisesWithStats(user.id);
}

export async function getExerciseBrowserScopePayloadForUser(): Promise<ExerciseBrowserScopePayload> {
  const user = await requireUser();
  const [scopeContext, initialRows] = await Promise.all([
    resolveExerciseBrowserScopeContext(user.id),
    getExercisesWithStats(user.id),
  ]);
  const filterOptions = await buildExerciseBrowserFilterOptions({
    userId: user.id,
    scopeContext,
  });

  return {
    initialRows,
    filterOptions,
    activeRoutineTitle: scopeContext.activeRoutineTitle,
  };
}

export async function getExercisesWithStatsForExplicitUser(userId: string, client?: SupabaseClient): Promise<ExerciseBrowserRow[]> {
  return getExercisesWithStats(userId, client);
}

export async function getExerciseBrowserRowsForUserFilter(
  filterState?: Partial<ExerciseInfoFilterState> | null,
): Promise<ExerciseBrowserRow[]> {
  const user = await requireUser();
  const normalizedFilterState = normalizeExerciseInfoFilterState(filterState);
  const scopeContext = await resolveExerciseBrowserScopedContext({
    userId: user.id,
    filterState: normalizedFilterState,
  });

  return getExercisesWithStats(user.id, undefined, {
    analyticsScope: normalizedFilterState.analyticsScope,
    scopeContext,
  });
}
