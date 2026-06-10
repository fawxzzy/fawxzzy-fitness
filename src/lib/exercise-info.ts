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
import { buildExerciseProgressionLifelineSummary, type ExerciseProgressionLifelineSummary } from "@/lib/progression-lifeline-summary";
import {
  buildProgressionHistorySessions,
  deriveProgressionReviewCandidate,
  type ProgressionHistorySetRow,
  type ProgressionTargetPlan,
} from "@/lib/progression-playbooks";
import { formatProgressionReviewTargetLabel } from "@/lib/progression-review-display";
import { inferProgressionStepPolicy } from "@/lib/progression-step-policy";
import { evaluatePrSummaries, formatPrBreakdown, type PrEvaluationSet } from "@/lib/pr-evaluator";
import { supabaseServer } from "@/lib/supabase/server";
import {
  buildCardioPaceMetric,
  buildCardioRecentTotal,
  type WorkoutCardPresentationKind,
} from "@/lib/workout-card-view-models";
import type { ProgressionEventRow } from "@/types/db";
import { buildCardioPrReviewItems } from "@/lib/cardio-pr-history";
import { buildObservedMeasurementMetrics } from "@/lib/exercise-info-measurement-metrics";
import type { ExerciseInfoAnalyticsScope } from "@/lib/exercise-info-scope";
import { buildStrengthPerformanceMetrics } from "@/lib/exercise-info-strength-performance";
import { buildStrengthProgressMetrics } from "@/lib/exercise-info-strength-progress";
import { buildCurrentCycleWindow, type CurrentCycleWindow } from "@/lib/current-cycle-window";

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
  sessionId: string;
  performedAt: string;
  label: string;
  value: string;
  context?: string | null;
  summary?: string | null;
  setCount: number;
  setSummaries: string[];
  displayKind: "session-summary" | "set-list" | "condensed-session";
};

type MetricValueTone = "default" | "success" | "danger" | "muted";

export type ExerciseDerivedProgressionSummary = {
  signalLabel: string;
  signalTone: MetricValueTone;
  methodLabel: string;
  currentTargetLabel: string | null;
  nextTargetLabel: string | null;
  reason: string;
  historySessionCount: number;
  historySetCount: number;
  sourcePerformedAt: string | null;
};

export type ExerciseStatsVM = {
  exercise_id: string;
  activeRoutineTitle?: string | null;
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
  progression?: ExerciseProgressionLifelineSummary | null;
  progressionDerived?: ExerciseDerivedProgressionSummary | null;
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
        session: { performed_at: string; status: "in_progress" | "completed"; routine_id?: string | null } | Array<{ performed_at: string; status: "in_progress" | "completed"; routine_id?: string | null }> | null;
      }
    | Array<{
        session_id: string;
        exercise_id: string;
        session: { performed_at: string; status: "in_progress" | "completed"; routine_id?: string | null } | Array<{ performed_at: string; status: "in_progress" | "completed"; routine_id?: string | null }> | null;
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

type ExerciseInfoScopeContext = {
  analyticsScope: ExerciseInfoAnalyticsScope;
  activeRoutineId: string | null;
  activeRoutineTitle: string | null;
  currentCycleWindow: CurrentCycleWindow | null;
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

function normalizeProgressionMeasurementType(
  value: unknown,
): ProgressionTargetPlan["measurementType"] {
  return value === "time" || value === "distance" || value === "time_distance" || value === "none"
    ? value
    : "reps";
}

function resolveRoutineExerciseRepTargetFromPlan(plan: ProgressionTargetPlan | null) {
  if (!plan) {
    return null;
  }

  return plan.repsTarget ?? plan.repsMax ?? plan.repsMin ?? null;
}

function buildProgressionTargetPlanFromStatsRow(
  statsRow: Awaited<ReturnType<typeof getExerciseStatsForExercise>>["row"],
  exerciseMetadata?: Pick<ExerciseInfoExercise, "measurement_type" | "default_unit"> | null,
): ProgressionTargetPlan | null {
  if (!statsRow) {
    return null;
  }

  const hasConfiguredTarget = [
    statsRow.last_configured_target_sets,
    statsRow.last_configured_target_reps_min,
    statsRow.last_configured_target_reps_max,
    statsRow.last_configured_target_weight,
    statsRow.last_configured_target_duration_seconds,
    statsRow.last_configured_target_distance,
    statsRow.last_configured_target_calories,
  ].some((value) => typeof value === "number" && Number.isFinite(value) && value > 0);
  const measurementType = normalizeProgressionMeasurementType(
    statsRow.last_configured_measurement_type ?? exerciseMetadata?.measurement_type ?? null,
  );

  if (!hasConfiguredTarget && !statsRow.last_progression_playbook_id && measurementType === "none") {
    return null;
  }

  return {
    measurementType,
    setsMin: statsRow.last_configured_target_sets ?? null,
    setsMax: statsRow.last_configured_target_sets ?? null,
    repsMin: statsRow.last_configured_target_reps_min ?? null,
    repsMax: statsRow.last_configured_target_reps_max ?? null,
    repsTarget: statsRow.last_configured_target_reps_max ?? statsRow.last_configured_target_reps_min ?? null,
    weightMin: statsRow.last_configured_target_weight ?? null,
    weightMax: statsRow.last_configured_target_weight ?? null,
    weightUnit: statsRow.last_configured_target_weight_unit ?? null,
    durationSeconds: statsRow.last_configured_target_duration_seconds ?? null,
    distance: statsRow.last_configured_target_distance ?? null,
    distanceUnit: (statsRow.last_configured_target_distance_unit as ProgressionTargetPlan["distanceUnit"]) ?? null,
    calories: statsRow.last_configured_target_calories ?? null,
  };
}

function buildProgressionHistoryRows(rows: NormalizedSet[]): ProgressionHistorySetRow[] {
  return rows.map((row) => ({
    sessionId: row.sessionId,
    sessionRecordId: row.sessionId,
    performedAt: row.performedAt,
    setIndex: row.setIndex,
    weight: row.weight,
    reps: row.reps,
    weightUnit: row.weightUnit === "kg" ? "kg" : row.weightUnit ? "lbs" : null,
    durationSeconds: row.durationSeconds,
    distance: row.distance,
    distanceUnit: row.distanceUnit ?? null,
    calories: row.calories,
    isWarmup: false,
  }));
}

function resolveDerivedProgressionSignal(args: {
  candidateType: "none" | "promote" | "review" | "deload";
  hasPlaybook: boolean;
  historySessionCount: number;
}) {
  if (args.candidateType === "promote") {
    return { label: "Promote Ready", tone: "success" as const };
  }

  if (args.candidateType === "review") {
    return { label: "Review Ready", tone: "default" as const };
  }

  if (args.candidateType === "deload") {
    return { label: "Regression Ready", tone: "danger" as const };
  }

  if (!args.hasPlaybook) {
    return { label: "Manual Target", tone: "muted" as const };
  }

  if (args.historySessionCount === 0) {
    return { label: "Awaiting History", tone: "muted" as const };
  }

  return { label: "Building", tone: "default" as const };
}

function buildExerciseDerivedProgressionSummary(args: {
  statsRow: Awaited<ReturnType<typeof getExerciseStatsForExercise>>["row"];
  activeRows: NormalizedSet[];
  exerciseMetadata?: Pick<ExerciseInfoExercise, "measurement_type" | "default_unit" | "equipment" | "movement_pattern"> | null;
  fallbackWeightUnit: "lbs" | "kg";
}): ExerciseDerivedProgressionSummary | null {
  const plan = buildProgressionTargetPlanFromStatsRow(args.statsRow, args.exerciseMetadata);
  const playbookId = args.statsRow?.last_progression_playbook_id ?? null;
  const playbookConfig = args.statsRow?.last_progression_playbook_config ?? null;

  if (!plan && !playbookId) {
    return null;
  }

  const historyRows = buildProgressionHistoryRows(args.activeRows);
  const history = buildProgressionHistorySessions({
    rows: historyRows,
    targetSetCount: plan?.setsMax ?? plan?.setsMin ?? null,
    topRepTarget: resolveRoutineExerciseRepTargetFromPlan(plan),
    limit: 8,
  });
  const progressionStepPolicy = playbookId && plan
    ? inferProgressionStepPolicy({
        measurementType: plan.measurementType,
        equipment: args.exerciseMetadata?.equipment ?? null,
        movementPattern: args.exerciseMetadata?.movement_pattern ?? null,
        defaultUnit: args.exerciseMetadata?.default_unit ?? null,
        weightUnit: plan.weightUnit ?? args.fallbackWeightUnit,
        distanceUnit: plan.distanceUnit === "km" ? "km" : "mi",
        targetWeight: plan.weightMax ?? plan.weightMin ?? null,
        exerciseOverrideValue: typeof playbookConfig?.loadIncrement === "number" ? playbookConfig.loadIncrement : null,
        stepOverrides: typeof playbookConfig?.stepOverrides === "object" && playbookConfig.stepOverrides
          ? playbookConfig.stepOverrides as Record<string, unknown>
          : null,
      })
    : null;
  const candidate = deriveProgressionReviewCandidate({
    playbookId,
    config: playbookConfig,
    plan,
    history,
    historyRows,
    fallbackWeightUnit: args.fallbackWeightUnit,
    progressionStepPolicy,
  });
  const signal = resolveDerivedProgressionSignal({
    candidateType: candidate.type,
    hasPlaybook: Boolean(playbookId),
    historySessionCount: history.length,
  });
  const currentTargetLabel = formatProgressionReviewTargetLabel(candidate.currentTarget ?? plan);
  const proposedTargetLabel = formatProgressionReviewTargetLabel(candidate.proposedTarget ?? null);

  return {
    signalLabel: signal.label,
    signalTone: signal.tone,
    methodLabel: candidate.label ?? "Manual",
    currentTargetLabel,
    nextTargetLabel: proposedTargetLabel && proposedTargetLabel !== currentTargetLabel ? proposedTargetLabel : null,
    reason: candidate.reason,
    historySessionCount: history.length,
    historySetCount: historyRows.length,
    sourcePerformedAt: candidate.sourceSession?.performedAt ?? null,
  };
}

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
  let query = supabase
    .from("sets")
    .select("set_index, weight, reps, duration_seconds, distance, distance_unit, calories, weight_unit, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(performed_at, status, routine_id))")
    .eq("user_id", userId)
    .eq("session_exercise.user_id", userId)
    .eq("session_exercise.exercise_id", canonicalExerciseId)
    .eq("session_exercise.session.status", "completed");

  return query;
}

async function loadHistoricalSetRowsForRoutine(
  userId: string,
  canonicalExerciseId: string,
  routineId: string,
  client?: SupabaseClient,
) {
  const supabase = client ?? supabaseServer();
  return supabase
    .from("sets")
    .select("set_index, weight, reps, duration_seconds, distance, distance_unit, calories, weight_unit, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(performed_at, status, routine_id))")
    .eq("user_id", userId)
    .eq("session_exercise.user_id", userId)
    .eq("session_exercise.exercise_id", canonicalExerciseId)
    .eq("session_exercise.session.status", "completed")
    .eq("session_exercise.session.routine_id", routineId);
}

async function loadHistoricalSetRowsForCycle(
  userId: string,
  canonicalExerciseId: string,
  routineId: string,
  cycleWindow: CurrentCycleWindow,
  client?: SupabaseClient,
) {
  const supabase = client ?? supabaseServer();
  return supabase
    .from("sets")
    .select("set_index, weight, reps, duration_seconds, distance, distance_unit, calories, weight_unit, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(performed_at, status, routine_id))")
    .eq("user_id", userId)
    .eq("session_exercise.user_id", userId)
    .eq("session_exercise.exercise_id", canonicalExerciseId)
    .eq("session_exercise.session.status", "completed")
    .eq("session_exercise.session.routine_id", routineId)
    .gte("session_exercise.session.performed_at", cycleWindow.queryStartIso)
    .lt("session_exercise.session.performed_at", cycleWindow.queryEndExclusiveIso);
}

async function loadExerciseProgressionEvents(userId: string, canonicalExerciseId: string, client?: SupabaseClient) {
  const supabase = client ?? supabaseServer();

  return supabase
    .from("progression_events")
    .select("id, user_id, routine_id, routine_day_exercise_id, exercise_id, event_type, from_target, to_target, method, vector, step, reason, source_session_id, created_at")
    .eq("user_id", userId)
    .eq("exercise_id", canonicalExerciseId);
}

async function loadExerciseProgressionEventsForRoutine(
  userId: string,
  canonicalExerciseId: string,
  routineId: string,
  client?: SupabaseClient,
) {
  const supabase = client ?? supabaseServer();

  return supabase
    .from("progression_events")
    .select("id, user_id, routine_id, routine_day_exercise_id, exercise_id, event_type, from_target, to_target, method, vector, step, reason, source_session_id, created_at")
    .eq("user_id", userId)
    .eq("exercise_id", canonicalExerciseId)
    .eq("routine_id", routineId);
}

async function loadExerciseProgressionEventsForCycle(
  userId: string,
  canonicalExerciseId: string,
  routineId: string,
  cycleWindow: CurrentCycleWindow,
  client?: SupabaseClient,
) {
  const supabase = client ?? supabaseServer();

  return supabase
    .from("progression_events")
    .select("id, user_id, routine_id, routine_day_exercise_id, exercise_id, event_type, from_target, to_target, method, vector, step, reason, source_session_id, created_at")
    .eq("user_id", userId)
    .eq("exercise_id", canonicalExerciseId)
    .eq("routine_id", routineId)
    .gte("created_at", cycleWindow.queryStartIso)
    .lt("created_at", cycleWindow.queryEndExclusiveIso);
}

async function loadExerciseAnalyticsScopeContext(userId: string, client?: SupabaseClient) {
  const supabase = client ?? supabaseServer();
  const { data } = await supabase
    .from("profiles")
    .select("timezone, active_routine_id")
    .eq("id", userId)
    .maybeSingle();

  const activeRoutineId = typeof data?.active_routine_id === "string" && data.active_routine_id.trim().length > 0
    ? data.active_routine_id.trim()
    : null;
  const profileTimeZone = typeof data?.timezone === "string" && data.timezone.trim().length > 0
    ? data.timezone.trim()
    : "America/New_York";

  if (!activeRoutineId) {
    return {
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

  const activeRoutineTitle = typeof routineData?.name === "string" && routineData.name.trim().length > 0
    ? routineData.name.trim()
    : null;
  const routineTimeZone = typeof routineData?.timezone === "string" && routineData.timezone.trim().length > 0
    ? routineData.timezone.trim()
    : profileTimeZone;

  return {
    activeRoutineId,
    activeRoutineTitle,
    currentCycleWindow: buildCurrentCycleWindow({
      cycleLengthDays: typeof routineData?.cycle_length_days === "number" ? routineData.cycle_length_days : null,
      startDate: typeof routineData?.start_date === "string" ? routineData.start_date : null,
      profileTimeZone: routineTimeZone,
    }),
  };
}

async function resolveExerciseInfoScopeContext(
  userId: string,
  analyticsScope: ExerciseInfoAnalyticsScope | null | undefined,
  client?: SupabaseClient,
): Promise<ExerciseInfoScopeContext> {
  const baseContext = await loadExerciseAnalyticsScopeContext(userId, client);
  return {
    analyticsScope: analyticsScope === "current_routine"
      ? "current_routine"
      : analyticsScope === "current_cycle"
        ? "current_cycle"
        : "all_time",
    activeRoutineId: baseContext.activeRoutineId,
    activeRoutineTitle: baseContext.activeRoutineTitle,
    currentCycleWindow: baseContext.currentCycleWindow,
  };
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

function buildCardioSessionAggregates(
  rows: NormalizedSet[],
  defaultUnit: string | null | undefined,
) {
  const rowsBySessionId = new Map<string, NormalizedSet[]>();
  for (const row of rows) {
    const existing = rowsBySessionId.get(row.sessionId) ?? [];
    existing.push(row);
    rowsBySessionId.set(row.sessionId, existing);
  }

  const sessionAggregates = [...rowsBySessionId.values()]
    .map((sessionRows) => {
      const durationSeconds = sessionRows.reduce((sum, row) => sum + positive(row.durationSeconds), 0);
      const calories = sessionRows.reduce((sum, row) => sum + positive(row.calories), 0);
      const distanceByUnit = new Map<"mi" | "km" | "m" | "steps", number>();
      for (const row of sessionRows) {
        const unit = row.distanceUnit;
        const distance = positive(row.distance);
        if (!unit || distance <= 0) continue;
        distanceByUnit.set(unit, (distanceByUnit.get(unit) ?? 0) + distance);
      }
      const preferredUnit = ["steps", "mi", "km", "m"].find((candidate) => distanceByUnit.has(candidate as "mi" | "km" | "m" | "steps")) as "mi" | "km" | "m" | "steps" | undefined;
      const distanceUnit = preferredUnit ?? fallbackDistanceUnit(defaultUnit);
      const distance = distanceUnit ? (distanceByUnit.get(distanceUnit) ?? 0) : 0;
      return {
        performedAt: sessionRows[0]?.performedAt ?? null,
        sessionId: sessionRows[0]?.sessionId ?? "",
        setIndex: Math.max(...sessionRows.map((row) => row.setIndex), 0),
        durationSeconds,
        distance,
        distanceUnit,
        calories,
        setCount: sessionRows.length,
      };
    })
    .filter((row) => row.performedAt);

  return {
    rowsBySessionId,
    sessionAggregates,
  };
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

function summarizeRecentPerformanceValues(summary: string | null, setSummaries: string[]) {
  const uniqueSetSummaries = Array.from(new Set(
    setSummaries
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  ));

  if (uniqueSetSummaries.length === 0) {
    return summary ?? "Logged";
  }

  if (uniqueSetSummaries.length === 1) {
    return uniqueSetSummaries[0]!;
  }

  return uniqueSetSummaries.join(" | ");
}

function resolveExerciseProgressEntryDisplayKind(args: {
  summary: string | null;
  setSummaries: string[];
}) {
  const uniqueSetSummaries = Array.from(new Set(
    args.setSummaries
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  ));

  if (uniqueSetSummaries.length === 0) {
    return "session-summary" as const;
  }

  if (uniqueSetSummaries.length <= 3) {
    return "set-list" as const;
  }

  if (uniqueSetSummaries.length <= 6 || !args.summary?.trim()) {
    return "condensed-session" as const;
  }

  return "session-summary" as const;
}

function buildProgressEntries<T extends {
  sessionId: string;
  performedAt: string;
  summary: string | null;
  setCount: number;
  setSummaries: string[];
}>(performances: T[]) {
  return performances.map((performance) => ({
    sessionId: performance.sessionId,
    performedAt: performance.performedAt,
    label: formatDateShort(performance.performedAt),
    value: summarizeRecentPerformanceValues(performance.summary ?? null, performance.setSummaries),
    context: `${performance.setCount} ${performance.setCount === 1 ? "set" : "sets"}`,
    summary: performance.summary ?? null,
    setCount: performance.setCount,
    setSummaries: performance.setSummaries,
    displayKind: resolveExerciseProgressEntryDisplayKind({
      summary: performance.summary ?? null,
      setSummaries: performance.setSummaries,
    }),
  }));
}

function buildStrengthPrReviewItems(rows: NormalizedSet[]) {
  const orderedRows = [...rows].sort((a, b) => {
    if (a.performedAt !== b.performedAt) return a.performedAt.localeCompare(b.performedAt);
    if (a.sessionId !== b.sessionId) return a.sessionId.localeCompare(b.sessionId);
    return a.setIndex - b.setIndex;
  });
  const items: string[] = [];
  let bestWeight = 0;
  let bestBodyweightReps = 0;

  for (const row of orderedRows) {
    const weight = positive(row.weight);
    const reps = positive(row.reps);

    if (weight > 0 && weight > bestWeight) {
      bestWeight = weight;
      items.push(
        `Weight PR | ${formatWeightReps(row.weight, row.reps, row.weightUnit) ?? formatWeight(row.weight, row.weightUnit) ?? `${Math.round(weight)}`} | ${formatDateShort(row.performedAt)}`,
      );
    }

    if (weight === 0 && reps > bestBodyweightReps) {
      bestBodyweightReps = reps;
      items.push(`Rep PR | ${reps} reps | ${formatDateShort(row.performedAt)}`);
    }
  }

  return items.reverse();
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

function normalizeExerciseInfoMetricComparisonValue(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function curateExerciseInfoPerformanceMetrics(args: {
  metrics: MetricDatum[];
  lastSummary: string | null;
  bestSummary: string | null;
}) {
  const deduped: MetricDatum[] = [];
  const seen = new Set<string>();

  for (const metric of args.metrics) {
    const signature = `${metric.label.trim().toLowerCase()}::${normalizeExerciseInfoMetricComparisonValue(metric.value)}`;
    if (seen.has(signature)) {
      continue;
    }
    seen.add(signature);
    deduped.push(metric);
  }

  const normalizedLastSummary = normalizeExerciseInfoMetricComparisonValue(args.lastSummary);
  const normalizedBestSummary = normalizeExerciseInfoMetricComparisonValue(args.bestSummary);
  const curated = deduped.filter((metric) => {
    const normalizedValue = normalizeExerciseInfoMetricComparisonValue(metric.value);
    if (!normalizedValue) {
      return false;
    }

    if (normalizedLastSummary && normalizedValue === normalizedLastSummary) {
      return false;
    }

    if (normalizedBestSummary && normalizedValue === normalizedBestSummary) {
      return false;
    }

    return true;
  });

  return curated.length > 0 ? curated : deduped;
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
  options?: {
    analyticsScope?: ExerciseInfoAnalyticsScope;
  },
  client?: SupabaseClient,
): Promise<ExerciseStatsVM | null> {
  try {
    const scopeContext = await resolveExerciseInfoScopeContext(userId, options?.analyticsScope, client);
    const [statsLookup, historicalSetRows, progressionEventRows, scopedHistoricalSetRows, scopedProgressionEventRows] = await Promise.all([
      getExerciseStatsForExercise(userId, canonicalExerciseId, client, { skipCanonicalValidation: true }),
      loadHistoricalSetRows(userId, canonicalExerciseId, client),
      loadExerciseProgressionEvents(userId, canonicalExerciseId, client),
      scopeContext.analyticsScope === "current_routine" && scopeContext.activeRoutineId
        ? loadHistoricalSetRowsForRoutine(userId, canonicalExerciseId, scopeContext.activeRoutineId, client)
        : scopeContext.analyticsScope === "current_cycle" && scopeContext.activeRoutineId && scopeContext.currentCycleWindow
          ? loadHistoricalSetRowsForCycle(userId, canonicalExerciseId, scopeContext.activeRoutineId, scopeContext.currentCycleWindow, client)
          : Promise.resolve({ data: [], error: null }),
      scopeContext.analyticsScope === "current_routine" && scopeContext.activeRoutineId
        ? loadExerciseProgressionEventsForRoutine(userId, canonicalExerciseId, scopeContext.activeRoutineId, client)
        : scopeContext.analyticsScope === "current_cycle" && scopeContext.activeRoutineId && scopeContext.currentCycleWindow
          ? loadExerciseProgressionEventsForCycle(userId, canonicalExerciseId, scopeContext.activeRoutineId, scopeContext.currentCycleWindow, client)
          : Promise.resolve({ data: [], error: null }),
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
    const scopedRows = normalizeRows((scopedHistoricalSetRows.data ?? []) as HistoricalSetRow[]);
    const progressionSummary = buildExerciseProgressionLifelineSummary(
      ((scopeContext.analyticsScope !== "all_time"
        ? scopedProgressionEventRows.data
        : progressionEventRows.data) ?? []) as ProgressionEventRow[],
    );
    if (!normalizedRows.length && !statsLookup.row) return null;

    const sortedRows = [...normalizedRows].sort((a, b) => {
      if (b.performedAt !== a.performedAt) return b.performedAt.localeCompare(a.performedAt);
      return b.setIndex - a.setIndex;
    });
    const activeRows = scopeContext.analyticsScope === "all_time" ? normalizedRows : scopedRows;
    const activeSortedRows = [...activeRows].sort((a, b) => {
      if (b.performedAt !== a.performedAt) return b.performedAt.localeCompare(a.performedAt);
      return b.setIndex - a.setIndex;
    });
    const activeLastSet = activeSortedRows[0] ?? null;

    const activeTotals = {
      sessions: new Set(activeRows.map((row) => row.sessionId)).size,
      sets: activeRows.length,
    };
    const derivedProgressionSummary = buildExerciseDerivedProgressionSummary({
      statsRow: statsLookup.row,
      activeRows,
      exerciseMetadata,
      fallbackWeightUnit: (
        statsLookup.row?.last_configured_target_weight_unit === "kg"
        || statsLookup.row?.last_unit === "kg"
      ) ? "kg" : "lbs",
    });

    const meaningfulRows = normalizedRows.filter((row) => hasMeaningfulCardioSet(exerciseMetadata?.measurement_type, row));
    const scopedMeaningfulRows = scopedRows.filter((row) => hasMeaningfulCardioSet(exerciseMetadata?.measurement_type, row));
    const { rowsBySessionId, sessionAggregates } = buildCardioSessionAggregates(meaningfulRows, exerciseMetadata?.default_unit);
    const { rowsBySessionId: scopedRowsBySessionId, sessionAggregates: scopedSessionAggregates } = buildCardioSessionAggregates(scopedMeaningfulRows, exerciseMetadata?.default_unit);

    const hasDurationSignal = sessionAggregates.some((row) => positive(row.durationSeconds) > 0);
    const hasDistanceSignal = sessionAggregates.some((row) => positive(row.distance) > 0);
    const kind = resolveEffectiveKind(
      exerciseMetadata?.measurement_type,
      hasDurationSignal,
      hasDistanceSignal,
      meaningfulRows.some((row) => positive(row.calories) > 0),
    ) as ExerciseStatsKind;

    if (kind === "strength") {
      const prSets: PrEvaluationSet[] = activeRows.map((row) => ({
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
      const prReviewItems = buildStrengthPrReviewItems(activeRows);

      const totalReps = activeRows.reduce((sum, row) => sum + positive(row.reps), 0);
      const weightedRows = activeRows.filter((row) => positive(row.weight) > 0);
      const bodyweightRows = activeRows.filter((row) => positive(row.weight) === 0 && positive(row.reps) > 0);
      const bestWeight = weightedRows.reduce((max, row) => Math.max(max, positive(row.weight)), 0);
      const bestWeightedReps = weightedRows.reduce((max, row) => Math.max(max, positive(row.reps)), 0);
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
      const lastPerformedAt = activeLastSet?.performedAt ?? null;
      const lastSummary = formatWeightReps(
        activeLastSet?.weight ?? null,
        activeLastSet?.reps ?? null,
        activeLastSet?.weightUnit ?? null,
      );
      const performances = buildStrengthSessionPerformances(activeRows);
      const progressDelta = buildStrengthProgressDelta(performances[0] ?? null, performances[1] ?? null);
      const strengthProgressMetrics = buildStrengthProgressMetrics({
        latest: performances[0] ?? null,
        previous: performances[1] ?? null,
      });
      const trendMetric = strengthProgressMetrics[0]
        ?? buildExerciseInfoTrendMetric(progressDelta, "0", {
          label: "Reps",
          stripPattern: /\s+reps?$/i,
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
        rows: activeRows,
        prEst1rm: statsLookup.row?.pr_est_1rm ?? null,
        unit: statsLookup.row?.last_unit ?? bestWeightedSet?.weightUnit ?? null,
        bestSetSummary,
        bestWeight,
        bestWeightedReps,
        bestBodyweightReps,
      });
      const reflectedPerformanceMetrics = curateExerciseInfoPerformanceMetrics({
        metrics: [
          ...performanceMetrics,
          ...buildObservedMeasurementMetrics({
            rows: activeRows.map((row) => ({
              reps: row.reps,
              weight: row.weight,
              weightUnit: row.weightUnit,
              durationSeconds: row.durationSeconds,
              distance: row.distance,
              distanceUnit: row.distanceUnit,
              calories: row.calories,
            })),
            existingMetrics: performanceMetrics,
          }),
        ],
        lastSummary,
        bestSummary: bestSetSummary,
      });
      const progressMetrics = [
        ...(trendMetric ? [trendMetric] : []),
        ...strengthProgressMetrics.slice(trendMetric ? 1 : 0),
        buildFrequencyMetric(performances.map((performance) => performance.performedAt)),
      ];
      const quickMetrics = buildQuickMetrics({
        kind,
        lastPerformedAt,
        lastSummary,
        bestSummary: bestSetSummary,
        prCount: prCounts.total,
        totalSessions: activeTotals.sessions,
        totalSets: activeTotals.sets,
      });
      const surfaceMetrics = buildExerciseInfoSurfaceMetrics({
        quickMetrics,
        performanceMetrics: reflectedPerformanceMetrics,
        progressMetrics,
      });
      const reviewSections = buildExerciseInfoReviewSections({
        prLabel,
        prCount: prCounts.total,
        prItems: prReviewItems,
      });
      return {
        exercise_id: canonicalExerciseId,
        activeRoutineTitle: scopeContext.activeRoutineTitle,
        kind,
        analyticsFamily: family,
        presentationKind,
        recent: {
          lastPerformedAt,
          lastSummary,
        },
        totals: {
          ...activeTotals,
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
        performanceMetrics: reflectedPerformanceMetrics,
        surfaceMetrics,
        progress: {
          metrics: progressMetrics,
          reviewSections,
          performances: buildProgressEntries(performances),
        },
        progression: progressionSummary,
        progressionDerived: derivedProgressionSummary,
      };
    }

    const activeMeaningfulRows = scopeContext.analyticsScope === "all_time" ? meaningfulRows : scopedMeaningfulRows;
    const activeRowsBySessionId = scopeContext.analyticsScope === "all_time" ? rowsBySessionId : scopedRowsBySessionId;
    const activeSessionAggregates = scopeContext.analyticsScope === "all_time" ? sessionAggregates : scopedSessionAggregates;
    const totalDuration = activeMeaningfulRows.reduce((sum, row) => sum + positive(row.durationSeconds), 0);
    const totalCalories = activeMeaningfulRows.reduce((sum, row) => sum + positive(row.calories), 0);
    const latestSessionAggregate = [...activeSessionAggregates].sort((a, b) => (b.performedAt ?? "").localeCompare(a.performedAt ?? ""))[0] ?? null;

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

    const bestAggregate = selectBestAggregate(activeSessionAggregates);
    const paceValues = activeSessionAggregates
      .map((row) => aggregatePace(row)?.paceSecondsPerUnit ?? 0)
      .filter((value) => value > 0);
    const bestPace = paceValues.length ? Math.min(...paceValues) : 0;
    const totalDistance = activeSessionAggregates.reduce((sum, row) => sum + row.distance, 0);
    const bestDurationSeconds = activeSessionAggregates.reduce((max, row) => Math.max(max, row.durationSeconds), 0);
    const bestDistance = activeSessionAggregates.reduce((max, row) => Math.max(max, row.distance), 0);
    const bestCalories = activeSessionAggregates.reduce((max, row) => Math.max(max, row.calories), 0);
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
    const lastPerformedAt = latestSessionAggregate?.performedAt ?? activeLastSet?.performedAt ?? null;
    const lastSummary = formatCardioSummary({
      family,
      durationSeconds: latestSessionAggregate?.durationSeconds ?? null,
      distance: latestSessionAggregate?.distance ?? null,
      calories: latestSessionAggregate?.calories ?? null,
      paceSecondsPerUnit: latestSessionAggregate ? aggregatePace(latestSessionAggregate)?.paceSecondsPerUnit : null,
      distanceUnit: distanceUnitForPace,
    });
    const performances = buildCardioSessionPerformances({ sessionAggregates: activeSessionAggregates }).map((performance) => ({
      ...performance,
      setSummaries: (activeRowsBySessionId.get(performance.sessionId) ?? [])
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
    const reflectedPerformanceMetrics = curateExerciseInfoPerformanceMetrics({
      metrics: [
        ...performanceMetrics,
        ...buildObservedMeasurementMetrics({
          rows: activeRows.map((row) => ({
            reps: row.reps,
            weight: row.weight,
            weightUnit: row.weightUnit,
            durationSeconds: row.durationSeconds,
            distance: row.distance,
            distanceUnit: row.distanceUnit,
            calories: row.calories,
          })),
          existingMetrics: performanceMetrics,
        }),
      ],
      lastSummary,
      bestSummary: bestSetSummary,
    });
    const prReviewItems = buildCardioPrReviewItems({
      family,
      sessionAggregates: activeSessionAggregates,
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
      prCount: prReviewItems.length,
      totalSessions: activeSessionAggregates.length,
      totalSets: activeMeaningfulRows.length,
    });
    const surfaceMetrics = buildExerciseInfoSurfaceMetrics({
      quickMetrics,
      performanceMetrics: reflectedPerformanceMetrics,
      progressMetrics,
    });
    const reviewSections = buildExerciseInfoReviewSections({
      prLabel: prReviewItems.length > 0 ? `${prReviewItems.length} ${prReviewItems.length === 1 ? "PR" : "PRs"}` : "",
      prCount: prReviewItems.length,
      prItems: prReviewItems,
    });
    return {
      exercise_id: canonicalExerciseId,
      activeRoutineTitle: scopeContext.activeRoutineTitle,
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
        ...activeTotals,
        sessions: activeSessionAggregates.length,
        sets: activeMeaningfulRows.length,
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
      prLabel: prReviewItems.length > 0 ? `${prReviewItems.length} ${prReviewItems.length === 1 ? "PR" : "PRs"}` : "",
      prCount: prReviewItems.length,
      quickMetrics,
      performanceMetrics: reflectedPerformanceMetrics,
      surfaceMetrics,
      progress: {
        metrics: progressMetrics,
        reviewSections,
        performances: buildProgressEntries(performances),
      },
      progression: progressionSummary,
      progressionDerived: derivedProgressionSummary,
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
  options?: {
    analyticsScope?: ExerciseInfoAnalyticsScope;
  },
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
    options,
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
