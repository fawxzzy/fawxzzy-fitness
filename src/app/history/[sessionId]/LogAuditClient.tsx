"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  addLogExerciseSetAction,
  deleteCompletedSessionAction,
  deleteLogExerciseAction,
  deleteLogExerciseSetAction,
  updateLogExerciseNotesAction,
  updateLogExerciseSetAction,
  updateLogMetaAction,
} from "@/app/actions/history";
import { useHideAppTabBar } from "@/components/AppTabBar";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { getBottomActionButtonClassName } from "@/components/layout/bottomActionIntents";
import { BottomActionSingle, BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { HistoryDetailExerciseCard } from "@/components/history/HistoryDetailExerciseCard";
import { HistorySessionDeleteMenu } from "@/components/history/HistorySessionDeleteMenu";
import { buildHistorySessionDetailTitle, formatHistoryDayTitle, formatSetCountAgainstPlan } from "@/components/history/history-session-copy";
import { RepeatWorkoutCard } from "@/components/history/RepeatWorkoutCard";
import type { RepeatWorkoutAvailability } from "@/lib/repeat-workout";
import { computeSessionCompletion, resolvePlannedSetCount } from "@/lib/session-analytics";
import { markProgressionAppliedPinsSourceDeletedInStorage } from "@/lib/progression-applied-pins";
import {
  HistorySessionCard,
  type HistorySessionDetailSection,
} from "@/components/history/HistorySessionCard";
import { AttachedQuickActionStrip } from "@/components/session/SessionExerciseBlock";
import { ChevronRightIcon } from "@/components/ui/Chevrons";
import { ModifyMeasurements, type MeasurementMetrics, type MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";
import { ScreenHeaderBackButton } from "@/components/ui/app/ScreenHeaderBackButton";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { useReturnNavigation } from "@/components/ui/useReturnNavigation";
import { LoggedSetSummaryRow } from "@/components/ui/workout-entry/LoggedSetSummaryRow";
import { appTokens } from "@/components/ui/app/tokens";
import { DetailSectionBadge, DetailSectionBlocks } from "@/components/ui/DetailSectionList";
import { FormField, formFieldControlClassName } from "@/components/ui/FormField";
import { AppButton } from "@/components/ui/AppButton";
import {
  CardChip,
  CardEmptyState,
  CardHeader,
  CardMeta,
  CardSurface,
  StatGrid,
  cardTokens,
  type StatGridItem,
} from "@/components/ui/card-system";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import { type MetricDatum } from "@/components/ui/MetricItem";
import { toastHistoryActionResult } from "@/lib/history-action-feedback";
import { buildHistorySessionDeleteCopy } from "@/lib/history-session-delete-copy";
import { formatDurationClock } from "@/lib/duration";
import { formatDistance, formatDurationShort as formatWorkoutDuration, formatPace } from "@/lib/exercise-stats-formatting";
import { formatDateShort } from "@/lib/formatting";
import { sanitizeEnabledMeasurementValues } from "@/lib/measurement-sanitization";
import { formatMeasurementSummaryItems, formatMeasurementSummaryText, formatSetPositionLabel } from "@/lib/measurement-display";
import { resolveWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";
import { buildSessionCopilotReceiptLabel } from "@/lib/session-feedback-ui";
import { cn } from "@/lib/cn";
import { isFitnessDistanceUnit, type FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { ExerciseProgressionLifelineSummary } from "@/lib/progression-lifeline-summary";
import type { WorkoutRecapArtifact } from "@/lib/workout-recap";
import type { SessionCopilotFeedbackSignal } from "@/lib/session-copilot-feedback";
import { formatExerciseTimerClock } from "@/lib/exercise-timer";
import { buildRecoveryTimingInsight, buildSessionRecoverySummary } from "@/lib/recovery-timing";
import type { SessionSummary } from "../session-summary";

type AuditSet = {
  id: string;
  set_index: number;
  weight: number | null;
  reps: number | null;
  duration_seconds: number | null;
  distance: number | null;
  distance_unit: FitnessDistanceUnit | null;
  calories: number | null;
  weight_unit: "lbs" | "kg" | null;
  logged_at?: string | null;
  is_warmup?: boolean | null;
};

type EditableSet = {
  id: string;
  source: AuditSet;
  values: MeasurementValues;
  activeMetrics: MeasurementMetrics;
  isMetricsExpanded: boolean;
};

type AuditExercise = {
  id: string;
  exercise_id: string;
  exercise_name?: string | null;
  exercise_slug?: string | null;
  exercise_image_path?: string | null;
  exercise_image_icon_path?: string | null;
  exercise_image_howto_path?: string | null;
  notes: string | null;
  copilot_feedback_signal?: SessionCopilotFeedbackSignal | null;
  copilot_feedback_note?: string | null;
  copilot_feedback_effort?: number | null;
  exercise_timer_enabled?: boolean;
  exercise_timer_mode?: "count_up" | "countdown" | null;
  exercise_timer_target_seconds?: number | null;
  exercise_timer_elapsed_seconds?: number;
  exercise_timer_status?: "idle" | "running" | "paused" | "completed";
  exercise_timer_completed_at?: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance" | "none";
  default_unit: string | null;
  target_sets_min?: number | null;
  target_sets_max?: number | null;
  is_skipped?: boolean;
  targetSeriesSummary?: string | null;
  progressionSummary?: ExerciseProgressionLifelineSummary | null;
  sets: AuditSet[];
};

const resolveDistanceUnit = (value: string | null | undefined): FitnessDistanceUnit | null => {
  if (isFitnessDistanceUnit(value)) return value;
  return null;
};

const DELETE_ACTION_BUTTON_CLASS_NAME = getBottomActionButtonClassName({
  intent: "danger",
  fullWidth: true,
  className: "!min-h-0 !h-11 !rounded-none !border-0 !px-4",
});

const SET_CARD_SHELL_CLASS_NAME = "w-full overflow-hidden rounded-[1.05rem] border-0 bg-[rgb(var(--surface-1-rgb)/0.88)] bg-[linear-gradient(90deg,rgb(var(--accent-divider-rgb)/0.14),rgb(var(--accent-divider-rgb)/0.85),rgb(var(--accent-divider-rgb)/0.14))] bg-[length:100%_1px] bg-no-repeat [background-position:0_0] shadow-none [--glass-current-border-alpha:0] [--glass-current-sheen-strength:0] [--glass-shadow:none]";

function formatWeekdayShort(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

const metricsForMeasurementType = (measurementType: AuditExercise["measurement_type"]): MeasurementMetrics => {
  if (measurementType === "reps") return { reps: true, weight: true, time: false, distance: false, calories: false };
  if (measurementType === "none") return { reps: false, weight: false, time: false, distance: false, calories: false };
  if (measurementType === "time") return { reps: false, weight: false, time: true, distance: false, calories: false };
  if (measurementType === "distance") return { reps: false, weight: false, time: false, distance: true, calories: false };
  return { reps: false, weight: false, time: true, distance: true, calories: false };
};

function parseDurationInput(rawValue: string): number | null {
  const value = rawValue.trim();
  if (!value) return null;
  if (value.includes(":")) {
    const [minutesRaw, secondsRaw] = value.split(":");
    if (secondsRaw === undefined) return null;
    const minutes = Number(minutesRaw);
    const seconds = Number(secondsRaw);
    if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || minutes < 0 || seconds < 0 || seconds > 59) {
      return null;
    }
    return (minutes * 60) + seconds;
  }
  const totalSeconds = Number(value);
  if (!Number.isInteger(totalSeconds) || totalSeconds < 0) return null;
  return totalSeconds;
}

function resolveExerciseDisplayNotesValue({
  exercise,
  draftNotesValue,
}: {
  exercise: AuditExercise;
  draftNotesValue?: string | null;
}) {
  const draftedNote = typeof draftNotesValue === "string" ? draftNotesValue.trim() : "";
  if (draftedNote) {
    return draftedNote;
  }

  const exerciseNote = typeof exercise.notes === "string" ? exercise.notes.trim() : "";
  if (exerciseNote) {
    return exerciseNote;
  }

  return typeof exercise.copilot_feedback_note === "string"
    ? exercise.copilot_feedback_note.trim()
    : "";
}

function resolveExerciseDisplayNotesContextLabel({
  exercise,
  draftNotesValue,
}: {
  exercise: AuditExercise;
  draftNotesValue?: string | null;
}) {
  const draftedNote = typeof draftNotesValue === "string" ? draftNotesValue.trim() : "";
  if (draftedNote) {
    return null;
  }

  const exerciseNote = typeof exercise.notes === "string" ? exercise.notes.trim() : "";
  if (exerciseNote) {
    return null;
  }

  const feedbackNote = typeof exercise.copilot_feedback_note === "string"
    ? exercise.copilot_feedback_note.trim()
    : "";
  if (!feedbackNote) {
    return null;
  }

  return buildSessionCopilotReceiptLabel({
    signal: exercise.copilot_feedback_signal ?? null,
    effortValue: exercise.copilot_feedback_effort ?? null,
  });
}

const toEditableSet = (set: AuditSet, unitLabel: "lbs" | "kg", measurementType: AuditExercise["measurement_type"]): EditableSet => ({
  id: set.id,
  source: set,
  values: {
    weight: set.weight === null ? "" : String(set.weight),
    reps: set.reps === null ? "" : String(set.reps),
    duration: set.duration_seconds === null ? "" : formatDurationClock(set.duration_seconds),
    distance: set.distance === null ? "" : String(set.distance),
    distanceUnit: set.distance_unit ?? "mi",
    calories: set.calories === null ? "" : String(set.calories),
    weightUnit: set.weight_unit ?? unitLabel,
  },
  activeMetrics: {
    ...metricsForMeasurementType(measurementType),
    calories: set.calories !== null,
  },
  isMetricsExpanded: false,
});

const toSetPayload = (set: EditableSet) => {
  const sanitizedValues = sanitizeEnabledMeasurementValues(set.activeMetrics, {
    weight: set.values.weight,
    reps: set.values.reps,
    duration: set.values.duration,
    distance: set.values.distance,
    calories: set.values.calories,
  });
  const parsedDuration = parseDurationInput(sanitizedValues.duration);
  const nextDuration = sanitizedValues.duration.trim() ? parsedDuration : null;

  return {
    weight: Number(sanitizedValues.weight),
    reps: Number(sanitizedValues.reps),
    durationSeconds: nextDuration,
    distance: sanitizedValues.distance.trim() ? Number(sanitizedValues.distance) : null,
    distanceUnit: sanitizedValues.distance.trim() ? set.values.distanceUnit : null,
    calories: sanitizedValues.calories.trim() ? Number(sanitizedValues.calories) : null,
    weightUnit: set.values.weightUnit,
    hasDurationError: sanitizedValues.duration.trim().length > 0 && parsedDuration === null,
  };
};

const isSetChanged = (set: EditableSet, payload: ReturnType<typeof toSetPayload>) => (
  payload.weight !== set.source.weight
  || payload.reps !== set.source.reps
  || payload.durationSeconds !== set.source.duration_seconds
  || payload.distance !== set.source.distance
  || payload.distanceUnit !== set.source.distance_unit
  || payload.calories !== set.source.calories
  || payload.weightUnit !== (set.source.weight_unit ?? payload.weightUnit)
);

function buildMeasurementSummary(set: EditableSet, defaultUnit: string | null) {
  return formatMeasurementSummaryText({
    ...sanitizeEnabledMeasurementValues(set.activeMetrics, {
      reps: set.values.reps.trim() ? Number(set.values.reps) : null,
      weight: set.values.weight.trim() ? Number(set.values.weight) : null,
      durationSeconds: parseDurationInput(set.values.duration),
      distance: set.values.distance.trim() ? Number(set.values.distance) : null,
      calories: set.values.calories.trim() ? Number(set.values.calories) : null,
    }),
    weightUnit: set.values.weightUnit,
    distanceUnit: set.values.distanceUnit ?? resolveDistanceUnit(defaultUnit) ?? "mi",
    emptyLabel: "No measurements",
  });
}

function scoreEditableSet(set: EditableSet) {
  const weight = set.values.weight.trim() ? Number(set.values.weight) : 0;
  const reps = set.values.reps.trim() ? Number(set.values.reps) : 0;
  const distance = set.values.distance.trim() ? Number(set.values.distance) : 0;
  const durationSeconds = parseDurationInput(set.values.duration) ?? 0;
  const calories = set.values.calories.trim() ? Number(set.values.calories) : 0;

  return (
    (Number.isFinite(weight) ? weight : 0) * 1_000_000
    + (Number.isFinite(reps) ? reps : 0) * 10_000
    + (Number.isFinite(distance) ? distance : 0) * 100
    + (Number.isFinite(durationSeconds) ? durationSeconds : 0)
    + (Number.isFinite(calories) ? calories : 0)
  );
}

function findBestEditableSet(sets: EditableSet[]) {
  return sets.reduce<EditableSet | null>((best, current) => {
    if (!best) return current;
    return scoreEditableSet(current) > scoreEditableSet(best) ? current : best;
  }, null);
}

function parsePositiveNumber(rawValue: string) {
  const value = Number(rawValue);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function hasMeaningfulSetData(set: EditableSet) {
  return (
    parsePositiveNumber(set.values.weight) > 0
    || parsePositiveNumber(set.values.reps) > 0
    || (parseDurationInput(set.values.duration) ?? 0) > 0
    || parsePositiveNumber(set.values.distance) > 0
    || parsePositiveNumber(set.values.calories) > 0
  );
}

/** Completion of one exercise: logged sets / planned sets, via the shared helper (skipped exercises have no rate). */
function computeExerciseCompletion(exercise: AuditExercise, loggedSets: number) {
  return computeSessionCompletion([{
    plannedSets: resolvePlannedSetCount({ targetSetsMin: exercise.target_sets_min, targetSetsMax: exercise.target_sets_max }),
    loggedSets,
    isSkipped: exercise.is_skipped,
  }]);
}

function buildFocusedExerciseSessionSummary(args: {
  sessionSummary: SessionSummary;
  exercise: AuditExercise;
  exerciseName: string;
  sets: EditableSet[];
  defaultUnit: string | null;
}) {
  const meaningfulSetCount = countMeaningfulSetData(args.sets);
  const totalReps = args.sets.reduce((sum, set) => sum + parsePositiveNumber(set.values.reps), 0);
  const totalDurationSeconds = args.sets.reduce((sum, set) => sum + (parseDurationInput(set.values.duration) ?? 0), 0);
  const totalVolume = args.sets.reduce((sum, set) => {
    const reps = parsePositiveNumber(set.values.reps);
    const weight = parsePositiveNumber(set.values.weight);
    return reps > 0 && weight > 0 ? sum + (weight * reps) : sum;
  }, 0);
  const bestSet = findBestEditableSet(args.sets);
  const bestDisplay = bestSet ? buildMeasurementSummary(bestSet, args.defaultUnit) : undefined;
  const isPrExercise = (args.sessionSummary.prExerciseNames ?? []).includes(args.exerciseName);
  const volumeUnit = args.sets.find((set) => set.values.weightUnit === "lbs" || set.values.weightUnit === "kg")?.values.weightUnit;

  return {
    ...args.sessionSummary,
    exerciseCount: 1,
    setCount: args.sets.length,
    repCount: Math.round(totalReps),
    durationSec: totalDurationSeconds > 0 ? totalDurationSeconds : undefined,
    totalVolume,
    volumeUnit,
    completionRate: computeExerciseCompletion(args.exercise, meaningfulSetCount),
    bestLift: bestDisplay ? { exerciseName: args.exerciseName, display: bestDisplay } : undefined,
    topSet: bestDisplay ? { exerciseName: args.exerciseName, display: bestDisplay } : undefined,
    prExerciseNames: isPrExercise ? [args.exerciseName] : [],
    hasSetData: args.sets.length > 0,
  } satisfies SessionSummary;
}

function buildLoggedSessionSummary(args: {
  sessionSummary: SessionSummary;
  exercises: AuditExercise[];
  editableSets: Record<string, EditableSet[]>;
  exerciseNameMap: Record<string, string>;
}) {
  const exerciseSummaries = args.exercises.map((exercise) => {
    const sets = args.editableSets[exercise.id] ?? [];
    const name = exercise.exercise_name?.trim() || args.exerciseNameMap[exercise.exercise_id] || "Exercise";
    return {
      exercise,
      sets,
      name,
      bestSet: findBestEditableSet(sets),
      score: Math.max(...sets.map(scoreEditableSet), 0),
    };
  });
  const totalSetCount = exerciseSummaries.reduce((sum, entry) => sum + entry.sets.length, 0);
  const totalReps = exerciseSummaries.reduce((sum, entry) => sum + entry.sets.reduce((setSum, set) => setSum + parsePositiveNumber(set.values.reps), 0), 0);
  const totalVolume = exerciseSummaries.reduce((sum, entry) => sum + entry.sets.reduce((setSum, set) => {
    const reps = parsePositiveNumber(set.values.reps);
    const weight = parsePositiveNumber(set.values.weight);
    return reps > 0 && weight > 0 ? setSum + (weight * reps) : setSum;
  }, 0), 0);
  const totalDurationSeconds = exerciseSummaries.reduce((sum, entry) => sum + entry.sets.reduce((setSum, set) => setSum + (parseDurationInput(set.values.duration) ?? 0), 0), 0);
  const bestExercise = exerciseSummaries.reduce<typeof exerciseSummaries[number] | null>((best, current) => {
    if (!current.bestSet) return best;
    if (!best || current.score > best.score) return current;
    return best;
  }, null);
  const bestDisplay = bestExercise?.bestSet ? buildMeasurementSummary(bestExercise.bestSet, bestExercise.exercise.default_unit) : undefined;
  const volumeUnit = exerciseSummaries.flatMap((entry) => entry.sets).find((set) => set.values.weightUnit === "lbs" || set.values.weightUnit === "kg")?.values.weightUnit;
  const visibleExerciseNames = exerciseSummaries.map((entry) => entry.name);

  return {
    ...args.sessionSummary,
    exerciseCount: exerciseSummaries.length,
    setCount: totalSetCount,
    repCount: Math.round(totalReps),
    durationSec: totalDurationSeconds > 0 ? totalDurationSeconds : args.sessionSummary.durationSec,
    totalVolume,
    volumeUnit,
    completionRate: computeSessionCompletion(exerciseSummaries.map((entry) => ({
      plannedSets: resolvePlannedSetCount({ targetSetsMin: entry.exercise.target_sets_min, targetSetsMax: entry.exercise.target_sets_max }),
      loggedSets: entry.sets.filter(hasMeaningfulSetData).length,
      isSkipped: entry.exercise.is_skipped,
    }))),
    exerciseNames: visibleExerciseNames,
    prExerciseNames: (args.sessionSummary.prExerciseNames ?? []).filter((name) => visibleExerciseNames.includes(name)),
    bestLift: bestDisplay && bestExercise ? { exerciseName: bestExercise.name, display: bestDisplay } : undefined,
    topSet: bestDisplay && bestExercise ? { exerciseName: bestExercise.name, display: bestDisplay } : undefined,
    hasSetData: totalSetCount > 0,
  } satisfies SessionSummary;
}


function formatMetricCount(value: number) {
  return Math.max(0, Math.round(value)).toLocaleString();
}

function formatFocusedVolume(totalVolume: number, unit: "lbs" | "kg" | null) {
  const safeVolume = Math.max(0, Math.round(totalVolume));
  if (safeVolume <= 0) {
    return "0";
  }

  return unit ? `${safeVolume.toLocaleString()} ${unit}` : safeVolume.toLocaleString();
}

function resolveFocusedDistanceUnit(sets: EditableSet[], defaultUnit: string | null) {
  return sets.find((set) => parsePositiveNumber(set.values.distance) > 0)?.values.distanceUnit
    ?? resolveDistanceUnit(defaultUnit);
}

function resolveExerciseTargetSetCount(exercise: AuditExercise, loggedSetCount: number) {
  if (typeof exercise.target_sets_max === "number" && exercise.target_sets_max > 0) {
    return exercise.target_sets_max;
  }

  if (typeof exercise.target_sets_min === "number" && exercise.target_sets_min > 0) {
    return exercise.target_sets_min;
  }

  return loggedSetCount;
}


function buildSignalTagItems(args: {
  hasPrInSession?: boolean;
  isBest?: boolean;
  progressionSummary?: ExerciseProgressionLifelineSummary | null;
}) {
  return [
    args.hasPrInSession ? "PR" : null,
    args.isBest ? "BEST" : null,
    (args.progressionSummary?.promotionCount ?? 0) > 0 ? "PROMO" : null,
    ((args.progressionSummary?.deloadCount ?? 0) + (args.progressionSummary?.revertCount ?? 0)) > 0 ? "REG" : null,
    (args.progressionSummary?.watchCount ?? 0) > 0 ? "WATCH" : null,
    (args.progressionSummary?.manualChangeCount ?? 0) > 0 ? "MANUAL" : null,
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
}

function renderMetaTags(items: string[]) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item) => (
        <DetailSectionBadge key={item} label={item} />
      ))}
    </div>
  );
}

function buildFocusedExerciseDetailedMetrics(args: {
  exercise: AuditExercise;
  exerciseName: string;
  sets: EditableSet[];
  defaultUnit: string | null;
  progressionSummary?: ExerciseProgressionLifelineSummary | null;
  hasPrInSession: boolean;
}): MetricDatum[] | null {
  const meaningfulSetCount = countMeaningfulSetData(args.sets);
  const totalReps = args.sets.reduce((sum, set) => sum + parsePositiveNumber(set.values.reps), 0);
  const totalDurationSeconds = args.sets.reduce((sum, set) => sum + (parseDurationInput(set.values.duration) ?? 0), 0);
  const totalDistance = args.sets.reduce((sum, set) => sum + parsePositiveNumber(set.values.distance), 0);
  const totalCalories = args.sets.reduce((sum, set) => sum + parsePositiveNumber(set.values.calories), 0);
  const totalVolume = args.sets.reduce((sum, set) => {
    const reps = parsePositiveNumber(set.values.reps);
    const weight = parsePositiveNumber(set.values.weight);
    return reps > 0 && weight > 0 ? sum + (weight * reps) : sum;
  }, 0);
  const volumeUnit = args.sets.find((set) => set.values.weightUnit === "lbs" || set.values.weightUnit === "kg")?.values.weightUnit ?? null;
  const completionRate = computeExerciseCompletion(args.exercise, meaningfulSetCount);
  const distanceUnit = resolveFocusedDistanceUnit(args.sets, args.defaultUnit);
  const pace = totalDurationSeconds > 0 && totalDistance > 0 && distanceUnit
    ? formatPace(totalDurationSeconds / totalDistance, distanceUnit)
    : null;
  const completionLabel = completionRate !== undefined ? `${Math.round(completionRate * 100)}%` : (args.sets.length > 0 ? "Logged" : "Open");

  if (
    meaningfulSetCount === 0
    && !args.hasPrInSession
    && !(args.progressionSummary?.currentTargetLabel?.trim())
    && (args.progressionSummary?.promotionCount ?? 0) === 0
  ) {
    return null;
  }

  const summaryMetrics: MetricDatum[] = [
    {
      label: "Sets",
      value: formatMetricCount(args.sets.length),
    },
  ];

  // Best is shown once (DESIGN #7): the exercise card above already shows the top set, so the overview does not
  // repeat it as a "Best" stat.

  const detailMetrics: MetricDatum[] = [];

  if (args.exercise.measurement_type === "time" || args.exercise.measurement_type === "time_distance") {
    detailMetrics.push({
      label: "Time",
      value: formatWorkoutDuration(totalDurationSeconds) ?? "0:00",
    });
  }

  if (args.exercise.measurement_type === "distance") {
    detailMetrics.push({
      label: "Distance",
      value: formatDistance(totalDistance, distanceUnit) ?? "0",
    });
  }

  if (args.exercise.measurement_type === "time_distance") {
    detailMetrics.push({
      label: "Pace",
      value: pace ?? "No pace",
    });
  }

  if (args.exercise.measurement_type === "time") {
    detailMetrics.push({
      label: "Tracking",
      value: "Time-based",
    });
  } else if (args.exercise.measurement_type === "distance") {
    detailMetrics.push({
      label: "Tracking",
      value: "Distance-based",
    });
  } else if (args.exercise.measurement_type === "time_distance") {
    detailMetrics.push({
      label: "Tracking",
      value: "Time + Distance",
    });
  }

  if ((args.exercise.measurement_type === "time" || args.exercise.measurement_type === "distance" || args.exercise.measurement_type === "time_distance") && totalCalories > 0) {
    detailMetrics.push({
      label: "Calories",
      value: `${formatMetricCount(totalCalories)} cal`,
    });
  }

  if (args.progressionSummary?.currentTargetLabel) {
    summaryMetrics.push({
      label: "Goal",
      value: args.progressionSummary.currentTargetLabel,
    });
  } else if (args.progressionSummary?.promotionCount) {
    summaryMetrics.push({
      label: "Promotions",
      value: formatMetricCount(args.progressionSummary.promotionCount),
      valueTone: "success",
    });
  }

  summaryMetrics.push(args.hasPrInSession
    ? {
        label: "PR",
        value: "Hit",
        valueTone: "success",
      }
    : {
        label: "Completion",
        value: completionLabel,
      });

  if (args.exercise.measurement_type === "reps") {
    const orderedSummaryMetrics = [
      summaryMetrics.find((metric) => metric.label === "Goal"),
      summaryMetrics.find((metric) => metric.label === "Sets"),
      summaryMetrics.find((metric) => metric.label === "Completion" || metric.label === "PR"),
      {
        label: "Reps",
        value: formatMetricCount(totalReps),
      },
      {
        label: "Volume",
        value: formatFocusedVolume(totalVolume, volumeUnit),
      },
    ].filter((item): item is MetricDatum => Boolean(item));

    return orderedSummaryMetrics.slice(0, 6);
  }

  return [...summaryMetrics, ...detailMetrics.slice(0, 3)].slice(0, 6);
}

function buildLoggedSetSummaryItems(set: EditableSet, defaultUnit: string | null) {
  return formatMeasurementSummaryItems({
    ...sanitizeEnabledMeasurementValues(set.activeMetrics, {
      reps: set.values.reps.trim() ? Number(set.values.reps) : null,
      weight: set.values.weight.trim() ? Number(set.values.weight) : null,
      durationSeconds: parseDurationInput(set.values.duration),
      distance: set.values.distance.trim() ? Number(set.values.distance) : null,
      calories: set.values.calories.trim() ? Number(set.values.calories) : null,
    }),
    weightUnit: set.values.weightUnit,
    distanceUnit: set.values.distanceUnit ?? resolveDistanceUnit(defaultUnit) ?? "mi",
    emptyLabel: "No measurements",
  }).map((item) => item.label);
}

function buildGoalSummaryValuesForSet(set: EditableSet) {
  return {
    sets: 1,
    reps: set.values.reps.trim() ? Number(set.values.reps) : null,
    weight: set.values.weight.trim() ? Number(set.values.weight) : null,
    weightUnit: set.values.weightUnit,
    durationSeconds: parseDurationInput(set.values.duration),
    distance: set.values.distance.trim() ? Number(set.values.distance) : null,
    distanceUnit: set.values.distanceUnit,
    calories: set.values.calories.trim() ? Number(set.values.calories) : null,
    enabledMeasurements: set.activeMetrics,
    emptyLabel: "No measurements",
  };
}

function autoSizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "0px";
  element.style.height = `${Math.max(element.scrollHeight, 52)}px`;
}

function countMeaningfulSetData(sets: EditableSet[]) {
  return sets.filter(hasMeaningfulSetData).length;
}

function hasExpandableExerciseContent(args: {
  sets: EditableSet[];
  notesValue: string;
  progressionSummary?: ExerciseProgressionLifelineSummary | null;
  isEditing: boolean;
}) {
  if (args.isEditing) {
    return true;
  }

  return (
    countMeaningfulSetData(args.sets) > 0
    || (args.progressionSummary?.eventCount ?? 0) > 0
    || (args.progressionSummary?.promotionCount ?? 0) > 0
  );
}

function buildFocusedExerciseSetListMeta(args: {
  setCount: number;
  targetSetCount: number;
  isEditing: boolean;
}) {
  if (args.setCount <= 0) {
    return null;
  }

  if (args.isEditing) {
    return `${formatSetCountAgainstPlan(args.setCount, args.targetSetCount)} · Tap a set to edit`;
  }

  return formatSetCountAgainstPlan(args.setCount, args.targetSetCount, "logged");
}

// The collapsed card already leads with "Top set <best set>", so it never adds a BEST chip beside it (one Best, not two).
function buildCollapsedExerciseCardBadgeItems(args: {
  badgeCountLabel: string;
  hasPrInSession: boolean;
  progressionSummary?: ExerciseProgressionLifelineSummary | null;
}) {
  return {
    countLabel: args.badgeCountLabel,
    signalItems: buildSignalTagItems({
      hasPrInSession: args.hasPrInSession,
      progressionSummary: args.progressionSummary,
    }),
  };
}

/**
 * Recap card (History review item 13): the share text is what Copy and Share send, so it is not printed again as a
 * monospace block; the card shows the headline numbers, the top efforts as name/value rows and PR/streak lines.
 */
function WorkoutRecapCard({ recap }: { recap: WorkoutRecapArtifact }) {
  const toast = useToast();
  const prExerciseNames = new Set(recap.prMoments.map((name) => name.trim()).filter(Boolean));

  async function copyRecap() {
    try {
      await navigator.clipboard.writeText(recap.shareText);
      toast.success("Recap copied.");
    } catch {
      toast.error("Could not copy the recap. Try again.");
    }
  }

  async function shareRecap() {
    if (typeof navigator.share !== "function") {
      await copyRecap();
      return;
    }
    try {
      await navigator.share({ title: recap.title, text: recap.shareText });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
      toast.error("Could not share the recap. Try again.");
    }
  }

  return (
    <CardSurface data-history-recap-card="true" showRail={false}>
      <CardHeader
        headingLevel={2}
        title="Recap"
        meta={recap.metrics.length > 0 ? <CardMeta items={recap.metrics.map((metric) => `${metric.label} ${metric.value}`)} /> : undefined}
      />
      <div className="grid gap-3 px-4 pb-4">
        {recap.topEfforts.length > 0 ? (
          <ul aria-label="Top efforts" className="m-0 grid list-none gap-0 p-0">
            {recap.topEfforts.map((effort) => {
              const isPr = prExerciseNames.has(effort.exerciseName.trim());
              return (
                <li
                  key={`${effort.exerciseName}-${effort.value}`}
                  className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-t border-[rgb(var(--border-strong)/0.1)] py-2 first:border-t-0"
                >
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm font-semibold leading-snug text-[rgb(var(--text-primary)/0.96)]">
                    <span className="min-w-0 break-words">{effort.exerciseName}</span>
                    {isPr ? <CardChip tone="success">PR</CardChip> : null}
                  </span>
                  <span className="text-right text-sm font-medium tabular-nums leading-snug text-[rgb(var(--text-secondary)/0.95)]">{effort.value}</span>
                </li>
              );
            })}
          </ul>
        ) : null}

        {recap.streakCallout ? (
          <p className="m-0 text-sm leading-snug text-[rgb(var(--text-secondary)/0.95)]">
            <span className="font-semibold text-[rgb(var(--text-primary)/0.96)]">Streak</span>
            {" · "}
            {recap.streakCallout}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <AppButton type="button" variant="secondary" size="sm" onClick={copyRecap}>Copy recap</AppButton>
          <AppButton type="button" variant="primary" size="sm" onClick={shareRecap}>Share recap</AppButton>
        </div>
      </div>
    </CardSurface>
  );
}

function buildFocusedProgressionMetrics(progressionSummary: ExerciseProgressionLifelineSummary | null | undefined): MetricDatum[] {
  if (!progressionSummary) {
    return [];
  }

  const regressionCount = progressionSummary.deloadCount + progressionSummary.revertCount;
  const metrics: Array<MetricDatum | null> = [
    progressionSummary.currentTargetLabel ? { label: "Goal now", value: progressionSummary.currentTargetLabel } : null,
    progressionSummary.firstTargetLabel ? { label: "First goal", value: progressionSummary.firstTargetLabel } : null,
    { label: "Promotions", value: `${progressionSummary.promotionCount}`, valueTone: progressionSummary.promotionCount > 0 ? "success" : "muted" },
    // Amber like the REGRESSION chip: a step back is attention, not an error (History review item 12).
    regressionCount > 0 ? { label: "Regressions", value: `${regressionCount}`, valueTone: "warning" } : null,
    (progressionSummary.watchCount ?? 0) > 0 ? { label: "Watch", value: `${progressionSummary.watchCount ?? 0}`, valueTone: "warning" } : null,
    progressionSummary.manualChangeCount > 0 ? { label: "Manual", value: `${progressionSummary.manualChangeCount}`, valueTone: "warning" } : null,
    progressionSummary.latestChangeSummary || progressionSummary.latestEventLabel
      ? { label: "Latest", value: progressionSummary.latestChangeSummary ?? progressionSummary.latestEventLabel ?? "" }
      : null,
  ];

  return metrics.filter((item): item is MetricDatum => item !== null);
}

function toStatGridItems(metrics: MetricDatum[]): StatGridItem[] {
  return metrics
    .filter((metric) => metric.value.trim().length > 0 || metric.valueNode)
    .map((metric) => ({
      label: metric.label,
      value: metric.valuePrefix ? `${metric.valuePrefix} ${metric.value}` : metric.value,
      valueNode: metric.valueNode,
      tone: metric.valueTone,
      meta: [metric.delta, metric.timeframe, metric.trend].filter((line): line is string => typeof line === "string" && line.trim().length > 0),
    }));
}

/**
 * One titled card in the session detail (Overview, Progression, Sets, Notes). Content flows with the page: no
 * inner scroller and no sideways metric rail (History review items 1 and 5), so nothing is clipped at 320px.
 */
function HistoryDetailPanel({
  title,
  meta,
  panel,
  children,
}: {
  title: string;
  meta?: string | null;
  panel: string;
  children: ReactNode;
}) {
  return (
    <CardSurface showRail={false} data-history-detail-panel={panel}>
      <CardHeader headingLevel={3} title={title} meta={meta ? <CardMeta items={[meta]} /> : undefined} />
      <div className={cn(cardTokens.body, "pb-4")}>{children}</div>
    </CardSurface>
  );
}

const SESSION_NOTES_PREVIEW_CHARS = 220;
const SESSION_NOTES_PREVIEW_LINES = 4;

/** Session notes, capped at four lines with a 44px "Show all" toggle so a long note never pushes the exercises away. */
function SessionNotesCard({ notes }: { notes: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = notes.length > SESSION_NOTES_PREVIEW_CHARS || notes.split("\n").length > SESSION_NOTES_PREVIEW_LINES;
  const bodyId = "history-session-notes-body";

  return (
    <CardSurface showRail={false} data-history-session-notes="true">
      <CardHeader headingLevel={2} title="Workout notes" />
      <div className={cn(cardTokens.body, isLong ? "pb-1" : "pb-4")}>
        <p
          id={bodyId}
          className={cn(
            "m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-[rgb(var(--text-primary)/0.94)] [text-wrap:pretty]",
            isLong && !expanded ? "line-clamp-4" : undefined,
          )}
        >
          {notes}
        </p>
        {isLong ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={bodyId}
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex min-h-11 items-center !border-0 !bg-transparent px-0 text-sm font-semibold !text-[rgb(var(--accent))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.5)]"
          >
            {expanded ? "Show less" : "Show all"}
          </button>
        ) : null}
      </div>
    </CardSurface>
  );
}

function FocusedExerciseContextPanels({
  overviewMetrics,
  overviewSections,
  progressionSummary,
  showOverview = true,
  showProgression = true,
}: {
  overviewMetrics?: MetricDatum[];
  overviewSections?: HistorySessionDetailSection[];
  progressionSummary?: ExerciseProgressionLifelineSummary | null;
  showOverview?: boolean;
  showProgression?: boolean;
}) {
  const overviewItems = toStatGridItems(overviewMetrics ?? []);
  const resolvedOverviewSections = (overviewSections ?? []).filter((section) => section.items.length > 0);
  const progressionItems = toStatGridItems(buildFocusedProgressionMetrics(progressionSummary));

  return (
    <>
      {showOverview && (overviewItems.length > 0 || resolvedOverviewSections.length > 0) ? (
        <HistoryDetailPanel title="Overview" panel="overview">
          <div className="grid gap-3">
            {overviewItems.length > 0 ? <StatGrid items={overviewItems} /> : null}
            {resolvedOverviewSections.length > 0 ? (
              <DetailSectionBlocks sections={resolvedOverviewSections} titleClassName={cardTokens.statLabel} />
            ) : null}
          </div>
        </HistoryDetailPanel>
      ) : null}

      {showProgression && progressionItems.length > 0 ? (
        <HistoryDetailPanel title="Progression" panel="progression">
          <StatGrid items={progressionItems} />
        </HistoryDetailPanel>
      ) : null}
    </>
  );
}

export function LogAuditClient({
  logId,
  initialDayName,
  initialNotes,
  unitLabel,
  exerciseNameMap,
  exercises,
  sessionSummary,
  recapArtifact,
  backHref,
  initialExpandedExerciseId = null,
  repeatWorkout,
}: {
  logId: string;
  initialDayName: string;
  initialNotes: string | null;
  unitLabel: "lbs" | "kg";
  exerciseNameMap: Record<string, string>;
  exercises: AuditExercise[];
  sessionSummary: SessionSummary;
  recapArtifact?: WorkoutRecapArtifact | null;
  backHref: string;
  initialExpandedExerciseId?: string | null;
  repeatWorkout?: RepeatWorkoutAvailability;
}) {
  const surfacePolicy = resolveWorkoutCardSurfacePolicy("history-detail", "compact");
  const router = useRouter();
  const toast = useToast();
  const { navigateReturn } = useReturnNavigation(backHref);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  // Edit mode is an editor (Cancel / Save dock): the bottom tab bar steps aside until it closes (src/lib/app-tabs.ts).
  useHideAppTabBar(isEditing);
  const [dayName, setDayName] = useState(initialDayName);
  const [sessionNotes, setSessionNotes] = useState(initialNotes ?? "");
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(initialExpandedExerciseId);
  const [exerciseToDelete, setExerciseToDelete] = useState<{ id: string; name: string; setCount: number } | null>(null);
  const [setToDelete, setSetToDelete] = useState<{ exerciseId: string; setId: string; position: number; exerciseName: string } | null>(null);
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.notes ?? ""])));
  const [editableSets, setEditableSets] = useState<Record<string, EditableSet[]>>(
    Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.sets.map((set) => toEditableSet(set, unitLabel, exercise.measurement_type))])),
  );
  const [floatingHeaderContainer, setFloatingHeaderContainer] = useState<HTMLElement | null>(null);
  const detailTopRef = useRef<HTMLDivElement | null>(null);
  const headerSessionNotesRef = useRef<HTMLTextAreaElement | null>(null);
  const exerciseNoteRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    setFloatingHeaderContainer(document.getElementById("history-log-floating-header"));
  }, []);

  const displayExercises = exercises;

  const expandedExercise = useMemo(
    () => displayExercises.find((exercise) => exercise.id === expandedExerciseId) ?? null,
    [displayExercises, expandedExerciseId],
  );

  const visibleExercises = expandedExercise ? [expandedExercise] : displayExercises;

  const focusedSessionSummary = useMemo(() => {
    if (!expandedExercise) {
      return buildLoggedSessionSummary({
        sessionSummary,
        exercises: displayExercises,
        editableSets,
        exerciseNameMap,
      });
    }

    const exerciseName = expandedExercise.exercise_name?.trim() || exerciseNameMap[expandedExercise.exercise_id] || "Exercise";
    return buildFocusedExerciseSessionSummary({
      sessionSummary,
      exercise: expandedExercise,
      exerciseName,
      sets: editableSets[expandedExercise.id] ?? [],
      defaultUnit: expandedExercise.default_unit,
    });
  }, [displayExercises, editableSets, expandedExercise, exerciseNameMap, sessionSummary]);

  const focusedDetailedMetrics = useMemo(() => {
    if (!expandedExercise) {
      return undefined;
    }

    const exerciseName = expandedExercise.exercise_name?.trim() || exerciseNameMap[expandedExercise.exercise_id] || "Exercise";
    return buildFocusedExerciseDetailedMetrics({
      exercise: expandedExercise,
      exerciseName,
      sets: editableSets[expandedExercise.id] ?? [],
      defaultUnit: expandedExercise.default_unit,
      progressionSummary: expandedExercise.progressionSummary ?? null,
      hasPrInSession: (focusedSessionSummary.prExerciseNames ?? []).includes(exerciseName),
    }) ?? undefined;
  }, [editableSets, expandedExercise, exerciseNameMap, focusedSessionSummary.prExerciseNames]);

  // History redesign 2026-11-23 (review item 1/13): the per-exercise recap is not repeated in the summary card. The
  // exercise cards directly below already carry each exercise's sets, top set and PR / Best chips, and the repeated
  // centred recap pushed the exercise list off the first screen.
  const focusedDetailedSections = useMemo(() => {
    if (!expandedExercise) {
      // FF-SESSION-005: session-level observed rest, derived from set timestamps only (separate from the exercise timer).
      const recoverySummary = buildSessionRecoverySummary(
        displayExercises.map((exercise) => (editableSets[exercise.id] ?? []).map((set) => set.source)),
      );
      return recoverySummary
        ? [
            {
              title: "Rest",
              items: [{
                id: "session-observed-rest",
                primary: "Typical rest",
                value: recoverySummary.label,
                meta: recoverySummary.detail,
                layout: "single-column",
              }],
              layout: "inline",
            } satisfies HistorySessionDetailSection,
          ]
        : [];
    }

    return [];
  }, [displayExercises, editableSets, expandedExercise]);

  useEffect(() => {
    if (expandedExerciseId && !expandedExercise) {
      setExpandedExerciseId(null);
    }
  }, [expandedExercise, expandedExerciseId]);

  // Opening or closing one exercise swaps what the page shows, so bring the top of the detail back into view.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    detailTopRef.current?.scrollIntoView({ block: "start", behavior: "instant" as ScrollBehavior });
  }, [expandedExerciseId]);

  const toggleExpandedExercise = useCallback((exerciseId: string) => {
    setExpandedSetId(null);
    setExpandedExerciseId((current) => (current === exerciseId ? null : exerciseId));
  }, []);

  useLayoutEffect(() => {
    if (!isEditing) return;
    autoSizeTextarea(headerSessionNotesRef.current);
    Object.values(exerciseNoteRefs.current).forEach((element) => autoSizeTextarea(element));
  }, [exerciseNotes, expandedExerciseId, isEditing, sessionNotes]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDayName(initialDayName);
    setSessionNotes(initialNotes ?? "");
    setExerciseNotes(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.notes ?? ""])));
    setEditableSets(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.sets.map((set) => toEditableSet(set, unitLabel, exercise.measurement_type))])));
    setExpandedSetId(null);
  }, [exercises, initialDayName, initialNotes, unitLabel]);

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const metaResult = await updateLogMetaAction({ logId, dayNameOverride: dayName, notes: sessionNotes });
      if (!metaResult.ok) {
        toastHistoryActionResult(toast, metaResult, { success: "", error: "Unable to save log details." });
        return;
      }

      for (const exercise of exercises) {
        const notesValue = (exerciseNotes[exercise.id] ?? "").trim();
        if (notesValue === (exercise.notes ?? "").trim()) continue;
        const result = await updateLogExerciseNotesAction({ logId, logExerciseId: exercise.id, notes: notesValue });
        if (!result.ok) {
          toastHistoryActionResult(toast, result, { success: "", error: "Unable to save exercise notes." });
          return;
        }
      }

      for (const exercise of exercises) {
        const setsForExercise = editableSets[exercise.id] ?? [];

        for (const set of setsForExercise) {
          if (set.id.startsWith("temp-")) continue;
          const payload = toSetPayload(set);

          if (payload.hasDurationError) {
            toast.error("Use seconds or mm:ss for duration.");
            return;
          }

          if (!isSetChanged(set, payload)) continue;

          const result = await updateLogExerciseSetAction({
            logId,
            logExerciseId: exercise.id,
            setId: set.id,
            weight: payload.weight,
            reps: payload.reps,
            durationSeconds: payload.durationSeconds,
            distance: payload.distance,
            distanceUnit: payload.distanceUnit,
            calories: payload.calories,
            weightUnit: payload.weightUnit,
          });

          if (!result.ok) {
            toastHistoryActionResult(toast, result, { success: "", error: "Unable to save set changes." });
            return;
          }
        }
      }

      setIsEditing(false);
      toastHistoryActionResult(toast, { ok: true }, { success: "Log details saved.", error: "Unable to save log details." });
      navigateReturn();
    });
  }, [dayName, editableSets, exerciseNotes, exercises, logId, navigateReturn, sessionNotes, toast]);

  const handleStartEditing = useCallback(() => {
    setExpandedSetId(null);
    setIsEditing(true);
  }, []);

  const deleteCopy = buildHistorySessionDeleteCopy({
    dayTitle: formatHistoryDayTitle(sessionSummary.dayTitle),
    dayName: formatHistoryDayTitle(initialDayName),
    dateLabel: formatDateShort(sessionSummary.startedAt),
    exerciseCount: exercises.length,
  });
  const deleteSessionName = deleteCopy.name;
  const deleteSessionConsequence = deleteCopy.consequence;

  const actionsNode = useMemo(() => {
    if (isEditing) {
      return (
        <BottomActionSplit
          secondary={<BottomDockButton type="button" intent="danger" onClick={handleCancel} disabled={isPending}>Cancel</BottomDockButton>}
          primary={<BottomDockButton type="button" intent="positive" onClick={handleSave} disabled={isPending}>{isPending ? "Saving..." : "Save"}</BottomDockButton>}
        />
      );
    }

    // Delete lives in the header kebab (DESIGN #7), so the dock holds only Edit.
    return (
      <BottomActionSingle>
        <BottomDockButton
          type="button"
          intent="positive"
          onClick={handleStartEditing}
        >
          Edit
        </BottomDockButton>
      </BottomActionSingle>
    );
  }, [handleCancel, handleSave, handleStartEditing, isEditing, isPending]);

  usePublishBottomActions(actionsNode);

  const updateEditableSet = (exerciseId: string, setId: string, updater: (set: EditableSet) => EditableSet) => {
    setEditableSets((current) => ({
      ...current,
      [exerciseId]: (current[exerciseId] ?? []).map((set) => (set.id === setId ? updater(set) : set)),
    }));
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const previous = editableSets[exerciseId] ?? [];
    setEditableSets((current) => ({ ...current, [exerciseId]: (current[exerciseId] ?? []).filter((set) => set.id !== setId) }));
    setExpandedSetId((current) => (current === setId ? null : current));

    startTransition(async () => {
      const result = await deleteLogExerciseSetAction({ logId, logExerciseId: exerciseId, setId });
      toastHistoryActionResult(toast, result, { success: "Set deleted.", error: "Unable to delete set." });
      if (!result.ok) {
        setEditableSets((current) => ({ ...current, [exerciseId]: previous }));
      }
    });
  };

  const handleAddSet = (exercise: AuditExercise) => {
    const exerciseId = exercise.id;
    const tempId = `temp-${Date.now()}`;
    const optimisticSet: EditableSet = {
      id: tempId,
      source: { id: tempId, set_index: (editableSets[exerciseId]?.length ?? 0), weight: 0, reps: 0, duration_seconds: null, distance: null, distance_unit: null, calories: null, weight_unit: unitLabel },
      values: {
        weight: "",
        reps: "",
        duration: "",
        distance: "",
        distanceUnit: resolveDistanceUnit(exercise.default_unit) ?? "mi",
        calories: "",
        weightUnit: unitLabel,
      },
      activeMetrics: metricsForMeasurementType(exercise.measurement_type),
      isMetricsExpanded: false,
    };

    setEditableSets((current) => ({ ...current, [exerciseId]: [...(current[exerciseId] ?? []), optimisticSet] }));

    startTransition(async () => {
      const result = await addLogExerciseSetAction({
        logId,
        logExerciseId: exerciseId,
        weight: 0,
        reps: 0,
        durationSeconds: null,
        distance: null,
        distanceUnit: null,
        calories: null,
        weightUnit: unitLabel,
      });
      toastHistoryActionResult(toast, result, { success: "Set added.", error: "Unable to add set." });
      if (!result.ok) {
        setEditableSets((current) => ({ ...current, [exerciseId]: (current[exerciseId] ?? []).filter((set) => set.id !== tempId) }));
        return;
      }

      const createdSet = result.data?.set;
      if (!createdSet) {
        router.refresh();
        return;
      }

      setEditableSets((current) => ({
        ...current,
        [exerciseId]: (current[exerciseId] ?? []).map((set) => (set.id === tempId ? toEditableSet(createdSet, unitLabel, exercise.measurement_type) : set)),
      }));
      setExpandedSetId(createdSet.id);
    });
  };

  const handleDeleteExercise = (logExerciseId: string) => {
    startTransition(async () => {
      const result = await deleteLogExerciseAction({ logId, logExerciseId });
      toastHistoryActionResult(toast, result, { success: "Exercise removed.", error: "Unable to remove exercise." });
      if (result.ok) {
        setExerciseToDelete(null);
        router.refresh();
      }
    });
  };

  // Detail header (DESIGN-CONTRACT.md section 15, DESIGN #7): "Push A · Routine" as the title (the list card leads
  // with the routine, so the detail names both), the date as the one subtitle line, Back on the left and the session
  // kebab (Delete) on the right. With one exercise open, Back first returns to the whole session.
  const sessionHeaderTitle = buildHistorySessionDetailTitle({
    dayTitle: sessionSummary.dayTitle,
    routineTitle: sessionSummary.routineTitle,
  });
  const sessionHeaderSubtitle = [formatWeekdayShort(sessionSummary.startedAt), formatDateShort(sessionSummary.startedAt)]
    .filter(Boolean)
    .join(", ");
  const prExerciseNames = expandedExercise ? (focusedSessionSummary.prExerciseNames ?? []) : (sessionSummary.prExerciseNames ?? []);
  const renderExerciseNoteInput = (exerciseId: string) => (
    <FormField label="Exercise notes">
      {(control) => (
        <textarea
          {...control}
          ref={(element) => {
            exerciseNoteRefs.current[exerciseId] = element;
          }}
          value={exerciseNotes[exerciseId] ?? ""}
          onChange={(event) => {
            const nextValue = event.target.value;
            setExerciseNotes((current) => ({ ...current, [exerciseId]: nextValue }));
            autoSizeTextarea(event.currentTarget);
          }}
          rows={1}
          className={cn(formFieldControlClassName, "min-h-11 resize-none overflow-hidden py-2.5")}
        />
      )}
    </FormField>
  );

  return (
    <>
      {floatingHeaderContainer
        ? createPortal(
          <ScreenHeader
            kind="detail"
            title={sessionHeaderTitle}
            subtitle={sessionHeaderSubtitle}
            trailing={isEditing ? undefined : (
              <HistorySessionDeleteMenu
                sessionId={logId}
                action={deleteCompletedSessionAction}
                onBeforeSubmit={() => markProgressionAppliedPinsSourceDeletedInStorage(logId)}
                sessionName={deleteSessionName}
                // Named confirm (History review item 3): the title is the session and the line says what goes with it.
                title={deleteCopy.title}
                consequence={deleteSessionConsequence}
                failureMessage="Could not delete this workout. Try again."
              />
            )}
            back={(
              <ScreenHeaderBackButton
                href={backHref}
                historyBehavior="history-first"
                label={expandedExercise ? "Back to workout" : "Back to History"}
                onClick={(event) => {
                  if (expandedExercise) {
                    event.preventDefault();
                    setExpandedExerciseId(null);
                  }
                }}
              />
            )}
          />,
          floatingHeaderContainer,
        )
        : null}

      {/*
        One page scroller (History review item 1): the summary, notes, exercises and recap flow in the screen's own
        scroll with 8px gaps. The old layout pinned a measured-height box with its own scroll region inside the page,
        which clipped content and trapped the scroll on phones.
      */}
      <div ref={detailTopRef} data-history-detail-flow="true" className="grid min-w-0 scroll-mt-28 gap-2">
        {isEditing ? (
          <CardSurface showRail={false} data-history-detail-editor="true">
            <CardHeader headingLevel={2} title="Edit workout" meta={<CardMeta items={["Changes save when you tap Save"]} />} />
            <div className={cn(cardTokens.body, "grid gap-2 pb-4")}>
              <FormField label="Day name">
                {(control) => (
                  <input {...control} value={dayName} onChange={(event) => setDayName(event.target.value)} className={formFieldControlClassName} />
                )}
              </FormField>
              <FormField label="Workout notes">
                {(control) => (
                  <textarea
                    {...control}
                    ref={headerSessionNotesRef}
                    value={sessionNotes}
                    onChange={(event) => {
                      setSessionNotes(event.target.value);
                      autoSizeTextarea(event.currentTarget);
                    }}
                    rows={1}
                    className={cn(formFieldControlClassName, "min-h-11 resize-none overflow-hidden py-2.5")}
                  />
                )}
              </FormField>
            </div>
          </CardSurface>
        ) : null}

        {!isEditing && !expandedExercise ? (
          <HistorySessionCard
            session={focusedSessionSummary}
            viewMode="detailed"
            className="mt-0"
            prExerciseNames={prExerciseNames}
            detailedMetrics={focusedDetailedMetrics}
            detailedSections={focusedDetailedSections}
            detailedHeaderMode="hidden"
          />
        ) : null}

        {!isEditing && !expandedExercise && sessionNotes.trim().length > 0 ? (
          <SessionNotesCard notes={sessionNotes.trim()} />
        ) : null}

        {!isEditing && !expandedExercise && repeatWorkout ? (
          <RepeatWorkoutCard
            sessionId={logId}
            dayLabel={formatHistoryDayTitle(sessionSummary.dayTitle) ?? formatHistoryDayTitle(initialDayName) ?? initialDayName}
            available={repeatWorkout.available}
            unavailableReason={repeatWorkout.available ? undefined : repeatWorkout.reason}
          />
        ) : null}

        <section aria-labelledby="history-detail-exercises-heading" data-history-exercise-list="true" className="grid min-w-0 gap-2">
          <h2
            id="history-detail-exercises-heading"
            className={cn(cardTokens.statLabel, expandedExercise ? "sr-only" : "px-1 pt-2")}
          >
            {`Exercises · ${displayExercises.length}`}
          </h2>

          {displayExercises.length === 0 ? (
            <CardEmptyState
              headingLevel={3}
              title="No exercises in this workout"
              body="It was saved without any exercises, so there are no sets to show. If you do not need it, open the menu at the top right and choose Delete workout."
            />
          ) : null}

          {visibleExercises.map((exercise) => {
            const name = exercise.exercise_name?.trim() || exerciseNameMap[exercise.exercise_id] || "Exercise";
            const setsForExercise = editableSets[exercise.id] ?? [];
            const editableNotesValue = exerciseNotes[exercise.id] ?? exercise.notes ?? "";
            const displayNotesValue = resolveExerciseDisplayNotesValue({
              exercise,
              draftNotesValue: editableNotesValue,
            });
            const notesContextLabel = resolveExerciseDisplayNotesContextLabel({
              exercise,
              draftNotesValue: editableNotesValue,
            });
            const isExpanded = expandedExerciseId === exercise.id;
            const isSkipped = Boolean(exercise.is_skipped);
            const bestSet = findBestEditableSet(setsForExercise);
            const bestSummary = bestSet ? buildMeasurementSummary(bestSet, exercise.default_unit) : "";
            const expandedSet = setsForExercise.find((set) => set.id === expandedSetId) ?? null;
            const hasPrInSession = (sessionSummary.prExerciseNames ?? []).includes(name);
            const targetSetCount = resolveExerciseTargetSetCount(exercise, setsForExercise.length);
            const countBadgeLabel = formatSetCountAgainstPlan(setsForExercise.length, targetSetCount);
            const canExpandExercise = hasExpandableExerciseContent({
              sets: setsForExercise,
              notesValue: displayNotesValue,
              progressionSummary: exercise.progressionSummary ?? null,
              isEditing,
            });
            const setListMeta = buildFocusedExerciseSetListMeta({
              setCount: setsForExercise.length,
              targetSetCount,
              isEditing,
            });
            const collapsedCardBadgeItems = buildCollapsedExerciseCardBadgeItems({
              badgeCountLabel: countBadgeLabel,
              hasPrInSession,
              progressionSummary: exercise.progressionSummary ?? null,
            });
            const timerSignalItem = exercise.exercise_timer_enabled
              ? `Timer ${formatExerciseTimerClock(exercise.exercise_timer_elapsed_seconds ?? 0)}${exercise.exercise_timer_status === "completed" ? " complete" : ""}`
              : null;
            const recoveryInsight = buildRecoveryTimingInsight(setsForExercise.map((set) => set.source));
            const expandedSetPosition = expandedSet ? setsForExercise.findIndex((set) => set.id === expandedSet.id) + 1 : 0;
            const showNotesPanel = isExpanded && !expandedSet && (isEditing ? true : displayNotesValue.trim().length > 0);

            return (
              <article key={exercise.id} data-history-exercise-id={exercise.id} className="grid min-w-0 gap-2">
                {!(isEditing && isExpanded && expandedSet) ? (
                  <HistoryDetailExerciseCard
                    exercise={{
                      name,
                      slug: exercise.exercise_slug ?? null,
                      image_path: exercise.exercise_image_path ?? null,
                      image_icon_path: exercise.exercise_image_icon_path ?? null,
                      image_howto_path: exercise.exercise_image_howto_path ?? null,
                    }}
                    // Skipped and empty read differently (History review item 9): a skipped exercise says so in a chip and
                    // in the meta line; one with no sets says "No sets logged" instead of a made-up summary.
                    summary={isSkipped ? "" : bestSummary}
                    summaryLabel="Top set"
                    metaItems={[
                      isSkipped ? "Skipped" : setsForExercise.length === 0 ? "No sets logged" : collapsedCardBadgeItems.countLabel,
                      ...(timerSignalItem ? [timerSignalItem] : []),
                      ...(recoveryInsight ? [recoveryInsight.label] : []),
                    ]}
                    signalCodes={[...(isSkipped ? ["SKIPPED"] : []), ...collapsedCardBadgeItems.signalItems]}
                    onPress={canExpandExercise ? () => toggleExpandedExercise(exercise.id) : undefined}
                    expanded={isExpanded}
                    controlsId={`history-exercise-detail-${exercise.id}`}
                    showLeadingVisual={surfacePolicy.showMedia}
                  />
                ) : null}

                {isExpanded ? (
                  <div id={`history-exercise-detail-${exercise.id}`} className="grid min-w-0 gap-2">
                    {isEditing && !expandedSet ? (
                      <AttachedQuickActionStrip
                        rowContract={{
                          label: "Add set",
                          skipLabel: "Delete",
                          skipActionIntent: "danger",
                          skipActionClassName: cn("!border-r !border-r-[rgb(255,120,120,0.16)]", DELETE_ACTION_BUTTON_CLASS_NAME),
                          actionRowClassName: "",
                          quickLogActionClassName: "",
                          isSkipPending: false,
                          isQuickLogPending: false,
                          isQuickLogDisabled: false,
                          isSkipDisabled: false,
                          quickLogDisabledMessage: "Add set",
                        }}
                        className="overflow-hidden rounded-[var(--card-radius)] border border-[rgb(var(--accent-divider-rgb)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.16)] [grid-template-columns:72px_minmax(0,1fr)]"
                        onPress={() => handleAddSet(exercise)}
                        onSkip={() => setExerciseToDelete({ id: exercise.id, name, setCount: setsForExercise.length })}
                      />
                    ) : null}

                    {!expandedSet ? (
                      <FocusedExerciseContextPanels
                        overviewMetrics={focusedDetailedMetrics}
                        overviewSections={focusedDetailedSections}
                        progressionSummary={exercise.progressionSummary ?? null}
                      />
                    ) : null}

                    {isEditing && expandedSet ? (
                      <HistoryDetailPanel
                        title={`${formatSetPositionLabel(expandedSetPosition)} · ${name}`}
                        meta={buildMeasurementSummary(expandedSet, exercise.default_unit)}
                        panel="set-editor"
                      >
                        <div className="grid gap-3">
                          <ModifyMeasurements
                            values={expandedSet.values}
                            activeMetrics={expandedSet.activeMetrics}
                            isExpanded={expandedSet.isMetricsExpanded}
                            onExpandedChange={(nextExpanded) => updateEditableSet(exercise.id, expandedSet.id, (current) => ({ ...current, isMetricsExpanded: nextExpanded }))}
                            onMetricToggle={(metric) => updateEditableSet(exercise.id, expandedSet.id, (current) => {
                              const nextMetrics = { ...current.activeMetrics, [metric]: !current.activeMetrics[metric] };
                              const sanitizedValues = sanitizeEnabledMeasurementValues(nextMetrics, {
                                reps: current.values.reps,
                                weight: current.values.weight,
                                duration: current.values.duration,
                                distance: current.values.distance,
                                calories: current.values.calories,
                              });
                              return {
                                ...current,
                                activeMetrics: nextMetrics,
                                values: {
                                  ...current.values,
                                  reps: sanitizedValues.reps,
                                  weight: sanitizedValues.weight,
                                  duration: sanitizedValues.duration,
                                  distance: sanitizedValues.distance,
                                  calories: sanitizedValues.calories,
                                },
                              };
                            })}
                            onChange={(patch) => updateEditableSet(exercise.id, expandedSet.id, (current) => ({ ...current, values: { ...current.values, ...patch } }))}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <AppButton
                              type="button"
                              variant="destructive"
                              size="sm"
                              disabled={expandedSet.id.startsWith("temp-")}
                              onClick={() => {
                                setSetToDelete({
                                  exerciseId: exercise.id,
                                  setId: expandedSet.id,
                                  position: expandedSetPosition,
                                  exerciseName: name,
                                });
                              }}
                            >
                              Delete set
                            </AppButton>
                            <AppButton type="button" variant="secondary" size="sm" onClick={() => setExpandedSetId(null)}>
                              Done
                            </AppButton>
                          </div>
                        </div>
                      </HistoryDetailPanel>
                    ) : (
                      <HistoryDetailPanel title="Sets" meta={setListMeta} panel="sets">
                        {setsForExercise.length > 0 ? (
                          <ul className="m-0 grid list-none gap-1.5 p-0 text-sm">
                            {setsForExercise.map((set, index) => {
                              const setSummaryText = buildMeasurementSummary(set, exercise.default_unit);
                              const setLabel = formatSetPositionLabel(index + 1);
                              const setSummaryItems = buildLoggedSetSummaryItems(set, exercise.default_unit);
                              const setTagItems = buildSignalTagItems({
                                hasPrInSession: hasPrInSession && bestSet?.id === set.id,
                                isBest: bestSet?.id === set.id,
                                progressionSummary: null,
                              });
                              const setAction = isEditing
                                ? <div className="flex h-full items-center justify-end"><ChevronRightIcon className="h-4 w-4 text-[rgb(var(--text-muted)/0.84)]" /></div>
                                : renderMetaTags(setTagItems);
                              const rowNode = (
                                <LoggedSetSummaryRow
                                  label={setLabel}
                                  summary={setSummaryText}
                                  summaryItems={setSummaryItems}
                                  contentAlign="center"
                                  action={setAction}
                                  actionClassName="self-stretch items-center justify-end"
                                  className={cn(
                                    isEditing ? appTokens.historySetSummaryInteractive : undefined,
                                    "rounded-none border-0 bg-transparent shadow-none",
                                  )}
                                />
                              );

                              return (
                                <li key={set.id}>
                                  <div className={SET_CARD_SHELL_CLASS_NAME}>
                                    {isEditing ? (
                                      <button
                                        type="button"
                                        aria-label={`Edit ${setLabel.toLowerCase()} of ${name}`}
                                        className="block min-h-11 w-full text-left"
                                        onClick={() => setExpandedSetId(set.id)}
                                      >
                                        {rowNode}
                                      </button>
                                    ) : (
                                      <div>{rowNode}</div>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="m-0 text-sm leading-snug text-[rgb(var(--text-secondary)/0.95)]">
                            {isSkipped
                              ? "Skipped in this workout, so no sets were logged."
                              : isEditing
                                ? "No sets yet. Tap Add set to log one."
                                : "No sets were logged for this exercise."}
                          </p>
                        )}
                      </HistoryDetailPanel>
                    )}

                    {showNotesPanel ? (
                      <HistoryDetailPanel title="Notes" meta={notesContextLabel} panel="exercise-notes">
                        {isEditing
                          ? renderExerciseNoteInput(exercise.id)
                          : (
                            <p className="m-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-[rgb(var(--text-primary)/0.94)] [text-wrap:pretty]">
                              {displayNotesValue}
                            </p>
                          )}
                      </HistoryDetailPanel>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        {!isEditing && !expandedExercise && recapArtifact ? (
          <WorkoutRecapCard recap={recapArtifact} />
        ) : null}
      </div>

      <ConfirmDestructiveModal
        open={exerciseToDelete !== null}
        title={exerciseToDelete ? `Delete ${exerciseToDelete.name}?` : "Delete exercise?"}
        titleVariant="raw"
        showDetailsInDeleteLayout
        consequenceText={exerciseToDelete
          ? `${exerciseToDelete.setCount === 1 ? "Its 1 set is" : `Its ${exerciseToDelete.setCount} sets are`} removed from this session. This cannot be undone.`
          : undefined}
        confirmLabel="Delete"
        onCancel={() => setExerciseToDelete(null)}
        onConfirm={() => {
          if (!exerciseToDelete) return;
          handleDeleteExercise(exerciseToDelete.id);
        }}
      />
      <ConfirmDestructiveModal
        open={setToDelete !== null}
        title={setToDelete ? `Delete set ${setToDelete.position} of ${setToDelete.exerciseName}?` : "Delete set?"}
        titleVariant="raw"
        showDetailsInDeleteLayout
        consequenceText="This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setSetToDelete(null)}
        onConfirm={() => {
          if (!setToDelete) return;
          const { exerciseId, setId } = setToDelete;
          setSetToDelete(null);
          handleDeleteSet(exerciseId, setId);
        }}
      />
    </>
  );
}
