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
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { ExerciseSurfaceMetricGrid } from "@/components/exercises/ExerciseSurfaceMetricGrid";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { getBottomActionButtonClassName } from "@/components/layout/bottomActionIntents";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { HistoryDetailExerciseCard } from "@/components/history/HistoryDetailExerciseCard";
import { markProgressionAppliedPinsSourceDeletedInStorage } from "@/lib/progression-applied-pins";
import { HistorySessionCard, type HistorySessionDetailSection } from "@/components/history/HistorySessionCard";
import { AttachedQuickActionStrip } from "@/components/session/SessionExerciseBlock";
import { SignatureDot, SignatureMetaTag } from "@/components/ui/app/SignatureSeparator";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { PickerListViewport } from "@/components/ui/PickerListViewport";
import { GoalSummaryInline } from "@/components/ui/measurements/GoalSummaryInline";
import { ModifyMeasurements, type MeasurementMetrics, type MeasurementValues } from "@/components/ui/measurements/ModifyMeasurements";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { RoutineDayHeaderTitle } from "@/components/ui/app/RoutineDayHeaderTitle";
import { useReturnNavigation } from "@/components/ui/useReturnNavigation";
import { LoggedSetSummaryRow } from "@/components/ui/workout-entry/LoggedSetSummaryRow";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { appTokens } from "@/components/ui/app/tokens";
import { HistoryDetailHeader, HistorySection } from "@/components/history/HistoryShared";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import { type MetricDatum } from "@/components/ui/MetricItem";
import { toastActionResult } from "@/lib/action-feedback";
import { formatDurationClock } from "@/lib/duration";
import { formatDistance, formatDurationShort as formatWorkoutDuration, formatPace } from "@/lib/exercise-stats-formatting";
import { formatDateShort } from "@/lib/formatting";
import { sanitizeEnabledMeasurementValues } from "@/lib/measurement-sanitization";
import { formatMeasurementSummaryItems, formatMeasurementSummaryText, formatSetPositionLabel } from "@/lib/measurement-display";
import { resolveWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";
import { cn } from "@/lib/cn";
import { isFitnessDistanceUnit, type FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { ExerciseProgressionLifelineSummary } from "@/lib/progression-lifeline-summary";
import type { WorkoutRecapArtifact } from "@/lib/workout-recap";
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
  measurement_type: "reps" | "time" | "distance" | "time_distance" | "none";
  default_unit: string | null;
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

const SESSION_HEADER_TITLE_CLASS_NAME = "text-[0.79rem] font-semibold leading-[1.12] tracking-[-0.01em]";
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

function buildFocusedExerciseSessionSummary(args: {
  sessionSummary: SessionSummary;
  exerciseName: string;
  sets: EditableSet[];
  defaultUnit: string | null;
}) {
  const meaningfulSetCount = args.sets.filter(hasMeaningfulSetData).length;
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
    completionRate: args.sets.length > 0 ? meaningfulSetCount / args.sets.length : undefined,
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
  const meaningfulSetCount = exerciseSummaries.reduce((sum, entry) => sum + entry.sets.filter(hasMeaningfulSetData).length, 0);
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
    completionRate: totalSetCount > 0 ? meaningfulSetCount / totalSetCount : undefined,
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

function buildFocusedExerciseDetailedMetrics(args: {
  exercise: AuditExercise;
  exerciseName: string;
  sets: EditableSet[];
  defaultUnit: string | null;
  progressionSummary?: ExerciseProgressionLifelineSummary | null;
  hasPrInSession: boolean;
}): MetricDatum[] | null {
  const bestSet = findBestEditableSet(args.sets);
  const bestDisplay = bestSet ? buildMeasurementSummary(bestSet, args.defaultUnit) : null;
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
  const completionRate = args.sets.length > 0
    ? args.sets.filter(hasMeaningfulSetData).length / args.sets.length
    : undefined;
  const distanceUnit = resolveFocusedDistanceUnit(args.sets, args.defaultUnit);
  const pace = totalDurationSeconds > 0 && totalDistance > 0 && distanceUnit
    ? formatPace(totalDurationSeconds / totalDistance, distanceUnit)
    : null;
  const completionLabel = completionRate !== undefined ? `${Math.round(completionRate * 100)}%` : (args.sets.length > 0 ? "Logged" : "Open");

  const summaryMetrics: MetricDatum[] = [
    {
      label: "Sets",
      value: formatMetricCount(args.sets.length),
    },
  ];

  if (bestDisplay && bestDisplay !== "No measurements") {
    summaryMetrics.push({
      label: "Best",
      value: bestDisplay,
    });
  }

  const detailMetrics: MetricDatum[] = [];

  if (args.exercise.measurement_type === "time" || args.exercise.measurement_type === "time_distance") {
    detailMetrics.push({
      label: "Duration",
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
      label: "Mode",
      value: totalCalories > 0 ? `${formatMetricCount(totalCalories)} cal` : "Timed",
    });
  } else if (args.exercise.measurement_type === "distance") {
    detailMetrics.push({
      label: "Mode",
      value: totalCalories > 0 ? `${formatMetricCount(totalCalories)} cal` : "Distance",
    });
  } else if (args.exercise.measurement_type === "time_distance" && totalCalories > 0) {
    detailMetrics.push({
      label: "Calories",
      value: `${formatMetricCount(totalCalories)} cal`,
    });
  }

  if (args.progressionSummary?.currentTargetLabel) {
    summaryMetrics.push({
      label: "Current",
      value: args.progressionSummary.currentTargetLabel,
    });
  } else if (args.progressionSummary?.promotionCount) {
    summaryMetrics.push({
      label: "Promoted",
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
    return [
      ...summaryMetrics,
      {
        label: "Reps",
        value: formatMetricCount(totalReps),
      },
      {
        label: "Volume",
        value: formatFocusedVolume(totalVolume, volumeUnit),
      },
    ].slice(0, 6);
  }

  return [...summaryMetrics, ...detailMetrics.slice(0, 3)].slice(0, 6);
}

function buildFocusedExerciseTrackingItems(args: {
  exercise: AuditExercise;
  sets: EditableSet[];
  defaultUnit: string | null;
}) {
  const setCount = args.sets.length;
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
  const distanceUnit = resolveFocusedDistanceUnit(args.sets, args.defaultUnit);
  const pace = totalDurationSeconds > 0 && totalDistance > 0 && distanceUnit
    ? formatPace(totalDurationSeconds / totalDistance, distanceUnit)
    : null;

  const items = [`${formatMetricCount(setCount)} ${setCount === 1 ? "set" : "sets"} logged`];

  if (args.exercise.measurement_type === "reps") {
    items.push(`${formatMetricCount(totalReps)} reps across ${formatFocusedVolume(totalVolume, volumeUnit)}`);
  } else if (args.exercise.measurement_type === "time") {
    items.push(`${formatWorkoutDuration(totalDurationSeconds) ?? "0:00"} total time`);
    if (totalCalories > 0) {
      items.push(`${formatMetricCount(totalCalories)} calories logged`);
    }
  } else if (args.exercise.measurement_type === "distance") {
    items.push(`${formatDistance(totalDistance, distanceUnit) ?? "0"} total distance`);
    if (totalCalories > 0) {
      items.push(`${formatMetricCount(totalCalories)} calories logged`);
    }
  } else if (args.exercise.measurement_type === "time_distance") {
    items.push(`${formatWorkoutDuration(totalDurationSeconds) ?? "0:00"} over ${formatDistance(totalDistance, distanceUnit) ?? "0"}`);
    if (pace) {
      items.push(`Pace held at ${pace}`);
    }
  } else if (totalCalories > 0) {
    items.push(`${formatMetricCount(totalCalories)} calories logged`);
  }

  return items.filter((value, index, values) => Boolean(value) && values.indexOf(value) === index).slice(0, 3);
}

function buildFocusedExerciseDetailedSections(args: {
  exercise: AuditExercise;
  exerciseName: string;
  sets: EditableSet[];
  defaultUnit: string | null;
  progressionSummary?: ExerciseProgressionLifelineSummary | null;
  bestDisplay: string | null;
  hasPrInSession: boolean;
  sessionHasOtherPrs: boolean;
}): HistorySessionDetailSection[] {
  const progressionItems = args.progressionSummary
    ? [
        args.progressionSummary.currentTargetLabel ? `Current target: ${args.progressionSummary.currentTargetLabel}` : null,
        args.progressionSummary.latestChangeSummary ? `Latest change: ${args.progressionSummary.latestChangeSummary}` : null,
        args.progressionSummary.lastPromotionAt ? `Last promotion: ${formatDateShort(args.progressionSummary.lastPromotionAt)}` : null,
      ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index)
    : ["No target updates recorded for this exercise yet."];

  const prItems = args.hasPrInSession
    ? ["A PR was recorded for this exercise in this logged session."]
    : args.sessionHasOtherPrs
      ? ["Session PRs landed on other exercises, not this one."]
      : ["No PR was recorded for this exercise in this session."];

  const bestItems = args.bestDisplay && args.bestDisplay !== "No measurements"
    ? [`Top set in this session: ${args.bestDisplay}`]
    : ["No standout set was logged for this exercise yet."];

  return [
    {
      title: "Tracking",
      items: buildFocusedExerciseTrackingItems({
        exercise: args.exercise,
        sets: args.sets,
        defaultUnit: args.defaultUnit,
      }),
    },
    {
      title: "Progression",
      items: progressionItems,
    },
    {
      title: "PRs",
      items: prItems,
    },
    {
      title: "Best",
      items: bestItems,
    },
  ];
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

function renderSignatureMeta(parts: string[]) {
  if (parts.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {parts.map((part, index) => (
        <div key={`${part}-${index}`} className="flex min-w-0 items-center gap-2">
          {index > 0 ? <SignatureDot /> : null}
          <span className="min-w-0 truncate">{part}</span>
        </div>
      ))}
    </div>
  );
}

function WorkoutRecapCard({ recap }: { recap: WorkoutRecapArtifact }) {
  return (
    <HistorySection title="Recap">
      <div className="space-y-3 rounded-[1.05rem] border border-[rgb(var(--accent-divider-rgb)/0.16)] bg-[rgb(var(--surface-1-rgb)/0.32)] px-3 py-3">
        <div>
          <p className="text-sm font-semibold text-[rgb(var(--text-primary)/0.96)]">{recap.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-muted)/0.86)]">
            {recap.metrics.map((metric, index) => (
              <span key={`${metric.label}-${metric.value}`} className="inline-flex items-center gap-2">
                {index > 0 ? <SignatureDot /> : null}
                {metric.label}: {metric.value}
              </span>
            ))}
          </div>
        </div>

        {recap.topEfforts.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--accent-divider-rgb)/0.9)]">Top efforts</p>
            {recap.topEfforts.map((effort) => (
              <p key={`${effort.exerciseName}-${effort.value}`} className="text-xs leading-5 text-[rgb(var(--text-secondary)/0.96)]">
                <span className="font-semibold text-[rgb(var(--text-primary)/0.94)]">{effort.exerciseName}</span>
                {" · "}
                {effort.value}
              </p>
            ))}
          </div>
        ) : null}

        {recap.prMoments.length > 0 ? (
          <p className="rounded-[0.85rem] border border-[rgb(var(--success-rgb)/0.18)] bg-[rgb(var(--success-rgb)/0.1)] px-2.5 py-2 text-xs font-semibold text-[rgb(var(--success-rgb)/0.95)]">
            PRs: {recap.prMoments.join(", ")}
          </p>
        ) : null}

        <pre className="whitespace-pre-wrap rounded-[0.85rem] bg-[rgb(var(--bg-app)/0.42)] px-2.5 py-2 text-[0.72rem] leading-5 text-[rgb(var(--text-secondary)/0.95)]">{recap.shareText}</pre>
      </div>
    </HistorySection>
  );
}

function FocusedExerciseContextPanels({
  progressionSummary,
  notesValue,
  isEditing,
  canEditNotes,
  noteInput,
}: {
  progressionSummary?: ExerciseProgressionLifelineSummary | null;
  notesValue: string;
  isEditing: boolean;
  canEditNotes: boolean;
  noteInput?: ReactNode;
}) {
  const hasNotes = notesValue.trim().length > 0;
  const shouldRenderNotes = isEditing ? canEditNotes && Boolean(noteInput) : hasNotes;
  const progressionMetrics: MetricDatum[] = progressionSummary ? [
    progressionSummary.currentTargetLabel ? { label: "Current", value: progressionSummary.currentTargetLabel } : null,
    progressionSummary.firstTargetLabel ? { label: "Started", value: progressionSummary.firstTargetLabel } : null,
    { label: "Promoted", value: `${progressionSummary.promotionCount}`, valueTone: progressionSummary.promotionCount > 0 ? "success" : "muted" },
    progressionSummary.latestEventLabel ? {
      label: "Latest",
      value: progressionSummary.latestEventLabel,
      timeframe: progressionSummary.latestChangeAt ? formatDateShort(progressionSummary.latestChangeAt) : null,
    } : null,
  ].filter((item): item is MetricDatum => Boolean(item)).slice(0, 4) : [];
  const progressionItems = progressionSummary ? [
    progressionSummary.latestChangeSummary ? { label: "Latest change", value: progressionSummary.latestChangeSummary } : null,
    progressionSummary.timelineSummary ? { label: "Lifeline", value: progressionSummary.timelineSummary } : null,
    progressionSummary.lastPromotionAt ? { label: "Last promotion", value: formatDateShort(progressionSummary.lastPromotionAt) } : null,
  ].filter((item, index, values): item is { label: string; value: string } => (
    Boolean(item)
    && values.findIndex((entry) => entry?.label === item?.label && entry?.value === item?.value) === index
  )) : [];

  return (
    <div className="space-y-2">
      {progressionMetrics.length > 0 || progressionItems.length > 0 ? (
        <AppPanel className={cn(appTokens.detailSection, "space-y-2 p-2")}>
          <h3 className={cn(appTokens.detailSectionTitle, "px-2 pt-0.5 text-center text-[1.18rem]")}>Progression</h3>
          {progressionMetrics.length > 0 ? <ExerciseSurfaceMetricGrid items={progressionMetrics} /> : null}
          {progressionItems.length > 0 ? (
            <div className="space-y-2">
              {progressionItems.map((item, index) => (
                <div
                  key={`${item.label}-${item.value}-${index}`}
                  className={cn(appTokens.detailHistoryRow, "flex min-w-0 items-start gap-2.5 px-2 py-2")}
                >
                  <div className="flex h-[1.05rem] shrink-0 items-center">
                    <SignatureDot />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className={cn(appTokens.detailSectionTitle, "px-0.5 text-left text-[0.68rem] tracking-[0.15em]")}>
                      {item.label}
                    </p>
                    <p className={cn(appTokens.detailBodyText, "min-w-0 text-[12.5px] leading-[1.24] text-[rgb(var(--text-primary)/0.95)] [text-wrap:pretty]")}>
                      {item.value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </AppPanel>
      ) : null}

      {shouldRenderNotes ? (
        <AppPanel className={cn(appTokens.detailSection, "space-y-2 p-2")}>
          <h3 className={cn(appTokens.detailSectionTitle, "px-2 pt-0.5 text-center text-[1.18rem]")}>Notes</h3>
          <div className={cn(appTokens.detailHistoryRow, "px-2 py-2")}>
            {isEditing
              ? noteInput
              : (
                <p className={cn(appTokens.detailBodyText, "whitespace-pre-wrap text-[12.5px] leading-[1.5] text-[rgb(var(--text-primary)/0.95)] [text-wrap:pretty]")}>
                  {notesValue}
                </p>
              )}
          </div>
        </AppPanel>
      ) : null}
    </div>
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
}) {
  const surfacePolicy = resolveWorkoutCardSurfacePolicy("history-detail", "compact");
  const router = useRouter();
  const toast = useToast();
  const { navigateReturn } = useReturnNavigation(backHref);
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [dayName, setDayName] = useState(initialDayName);
  const [sessionNotes, setSessionNotes] = useState(initialNotes ?? "");
  const [expandedExerciseId, setExpandedExerciseId] = useState<string | null>(initialExpandedExerciseId);
  const [exerciseToDelete, setExerciseToDelete] = useState<{ id: string; name: string } | null>(null);
  const [setToDelete, setSetToDelete] = useState<{ exerciseId: string; setId: string; label: string } | null>(null);
  const [expandedSetId, setExpandedSetId] = useState<string | null>(null);
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>(Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.notes ?? ""])));
  const [editableSets, setEditableSets] = useState<Record<string, EditableSet[]>>(
    Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.sets.map((set) => toEditableSet(set, unitLabel, exercise.measurement_type))])),
  );
  const [floatingHeaderContainer, setFloatingHeaderContainer] = useState<HTMLElement | null>(null);
  const [exerciseViewportHeight, setExerciseViewportHeight] = useState<number | null>(null);
  const exerciseViewportRef = useRef<HTMLDivElement | null>(null);
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

  const focusedDetailedSections = useMemo(() => {
    if (!expandedExercise) {
      return undefined;
    }

    const exerciseName = expandedExercise.exercise_name?.trim() || exerciseNameMap[expandedExercise.exercise_id] || "Exercise";
    const sets = editableSets[expandedExercise.id] ?? [];
    const bestSet = findBestEditableSet(sets);
    const bestDisplay = bestSet ? buildMeasurementSummary(bestSet, expandedExercise.default_unit) : null;

    return buildFocusedExerciseDetailedSections({
      exercise: expandedExercise,
      exerciseName,
      sets,
      defaultUnit: expandedExercise.default_unit,
      progressionSummary: expandedExercise.progressionSummary ?? null,
      bestDisplay,
      hasPrInSession: (focusedSessionSummary.prExerciseNames ?? []).includes(exerciseName),
      sessionHasOtherPrs: (sessionSummary.prExerciseNames ?? []).some((name) => name !== exerciseName),
    });
  }, [editableSets, expandedExercise, exerciseNameMap, focusedSessionSummary.prExerciseNames, sessionSummary.prExerciseNames]);

  const focusedExerciseNotes = expandedExercise ? (exerciseNotes[expandedExercise.id] ?? "") : "";
  const isFocusedSetExpanded = Boolean(expandedSetId);

  const exerciseViewportMeta = useMemo(() => {
    if (expandedExercise) {
      return {
        caption: null,
        prNames: focusedSessionSummary.prExerciseNames ?? [],
      };
    }

    return {
      caption: null,
      prNames: sessionSummary.prExerciseNames ?? [],
    };
  }, [expandedExercise, focusedSessionSummary.prExerciseNames, sessionSummary.prExerciseNames]);

  useEffect(() => {
    if (expandedExerciseId && !expandedExercise) {
      setExpandedExerciseId(null);
    }
  }, [expandedExercise, expandedExerciseId]);

  useLayoutEffect(() => {
    const node = exerciseViewportRef.current;
    if (!node || typeof window === "undefined") {
      return;
    }

    const syncViewportHeight = () => {
      const nextViewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const computedStyle = window.getComputedStyle(node);
      const dockHeightValue = computedStyle.getPropertyValue("--bottom-actions-height");
      const fallbackDockHeightValue = computedStyle.getPropertyValue("--app-mobile-bottom-dock-height");
      const dockHeight = Number.parseFloat(dockHeightValue) || Number.parseFloat(fallbackDockHeightValue) || 0;
      const topOffset = node.getBoundingClientRect().top;
      const dockGap = dockHeight > 0 ? 12 : 4;
      const availableHeight = Math.max(0, Math.floor(nextViewportHeight - topOffset - dockHeight - dockGap));
      setExerciseViewportHeight(availableHeight > 0 ? availableHeight : null);
    };

    syncViewportHeight();

    window.addEventListener("resize", syncViewportHeight);
    window.visualViewport?.addEventListener("resize", syncViewportHeight);
    const layoutObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          syncViewportHeight();
        });

    if (layoutObserver) {
      layoutObserver.observe(node);
      if (node.parentElement) {
        layoutObserver.observe(node.parentElement);
      }
    }

    return () => {
      window.removeEventListener("resize", syncViewportHeight);
      window.visualViewport?.removeEventListener("resize", syncViewportHeight);
      layoutObserver?.disconnect();
    };
  }, [displayExercises.length, expandedExercise, expandedExerciseId, expandedSetId, isEditing, sessionNotes]);

  useEffect(() => {
    const node = exerciseViewportRef.current;
    if (!node) {
      return;
    }

    const scrollRegion = node.querySelector("[data-history-exercise-scroll-region='true']");
    if (!(scrollRegion instanceof HTMLElement)) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollRegion.scrollTo({ top: 0, behavior: "instant" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [expandedExerciseId]);

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
        toastActionResult(toast, metaResult, { success: "", error: "Unable to save log details." });
        return;
      }

      for (const exercise of exercises) {
        const notesValue = (exerciseNotes[exercise.id] ?? "").trim();
        if (notesValue === (exercise.notes ?? "").trim()) continue;
        const result = await updateLogExerciseNotesAction({ logId, logExerciseId: exercise.id, notes: notesValue });
        if (!result.ok) {
          toastActionResult(toast, result, { success: "", error: "Unable to save exercise notes." });
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
            toastActionResult(toast, result, { success: "", error: "Unable to save set changes." });
            return;
          }
        }
      }

      setIsEditing(false);
      toastActionResult(toast, { ok: true }, { success: "Log details saved.", error: "Unable to save log details." });
      navigateReturn();
    });
  }, [dayName, editableSets, exerciseNotes, exercises, logId, navigateReturn, sessionNotes, toast]);

  const handleStartEditing = useCallback(() => {
    setExpandedSetId(null);
    setIsEditing(true);
  }, []);

  const actionsNode = useMemo(() => {
    if (isEditing) {
      return (
        <BottomActionSplit
          secondary={<BottomDockButton type="button" intent="danger" onClick={handleCancel} disabled={isPending}>Cancel</BottomDockButton>}
          primary={<BottomDockButton type="button" intent="positive" onClick={handleSave} disabled={isPending}>{isPending ? "Saving..." : "Save"}</BottomDockButton>}
        />
      );
    }

    return (
      <BottomActionSplit
        secondary={(
          <ConfirmedServerFormButton
            action={deleteCompletedSessionAction}
            onBeforeSubmit={() => markProgressionAppliedPinsSourceDeletedInStorage(logId)}
            hiddenFields={{ sessionId: logId }}
            size="md"
            triggerLabel="Delete"
            triggerAriaLabel="Delete log"
            triggerIntent="danger"
            modalTitle="Delete log?"
            details={`${sessionSummary.routineTitle} - ${formatDateShort(sessionSummary.startedAt)}`}
            confirmLabel="Delete"
          />
        )}
        primary={(
          <BottomDockButton
            type="button"
            intent="positive"
            onClick={handleStartEditing}
          >
            Edit
          </BottomDockButton>
        )}
      />
    );
  }, [handleCancel, handleSave, handleStartEditing, isEditing, isPending, logId, sessionSummary.routineTitle, sessionSummary.startedAt]);

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
      toastActionResult(toast, result, { success: "Set deleted.", error: "Unable to delete set." });
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
      toastActionResult(toast, result, { success: "Set added.", error: "Unable to add set." });
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
      toastActionResult(toast, result, { success: "Exercise removed.", error: "Unable to remove exercise." });
      if (result.ok) {
        setExerciseToDelete(null);
        router.refresh();
      }
    });
  };

  const sessionHeaderWeekday = formatWeekdayShort(sessionSummary.startedAt);
  const sessionHeaderDayLabel = [sessionSummary.dayTitle?.trim() || null, sessionHeaderWeekday].filter(Boolean).join(" \u00B7 ");
  const sessionHeaderTitle = (
    <RoutineDayHeaderTitle
      leadingItems={[sessionSummary.routineTitle]}
      dayLabel={sessionHeaderDayLabel || undefined}
      dayLabelOrder="day-first"
    />
  );
  const sessionHeaderAction = (
    <div className="flex items-center gap-2">
      <SignatureMetaTag className="text-[10px] tracking-[0.08em]">
        {formatDateShort(sessionSummary.startedAt).toUpperCase()}
      </SignatureMetaTag>
      <TopRightBackButton href={backHref} ariaLabel="Back to sessions" />
    </div>
  );

  return (
    <>
      {floatingHeaderContainer
        ? createPortal(
          <>
            <HistoryDetailHeader
              eyebrow={null}
              title={sessionHeaderTitle}
              titleClassName={SESSION_HEADER_TITLE_CLASS_NAME}
              action={sessionHeaderAction}
              align="center"
              className={isEditing ? appTokens.historyEditorHeaderActive : undefined}
              actionClassName="-ml-1 -mr-1 gap-0"
            />
            {isEditing ? (
              <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 px-4 pb-1 pt-2">
                <div className={cn(appTokens.historyEditorStack, "gap-1.5")}>
                  <label className="block">
                    <LabeledEditorField label="Day name">
                      <input value={dayName} onChange={(event) => setDayName(event.target.value)} className={cn(labeledEditorFieldControlClassName, "min-h-[2.65rem] px-3.5 pt-3.5")} />
                    </LabeledEditorField>
                  </label>
                  <label className="block">
                    <LabeledEditorField label="Session notes">
                      <textarea
                        ref={headerSessionNotesRef}
                        value={sessionNotes}
                        onChange={(event) => {
                          setSessionNotes(event.target.value);
                          autoSizeTextarea(event.currentTarget);
                        }}
                        rows={1}
                        className={cn(labeledEditorFieldControlClassName, "min-h-[3.1rem] resize-none overflow-hidden px-3.5 pb-2 pt-4")}
                      />
                    </LabeledEditorField>
                  </label>
                </div>
              </div>
            ) : null}
          </>,
          floatingHeaderContainer,
        )
        : null}

      {!isEditing && recapArtifact ? (
        <WorkoutRecapCard recap={recapArtifact} />
      ) : null}

      {!isEditing && sessionNotes.trim().length > 0 ? (
        <HistorySection title="Session notes">
          <p className={appTokens.detailBodyText}>{sessionNotes}</p>
        </HistorySection>
      ) : null}

      <div
        ref={exerciseViewportRef}
        className={cn(
          "relative left-1/2 w-[calc(100vw-22px)] max-w-[calc(100vw-22px)] -translate-x-1/2 md:left-auto md:w-auto md:max-w-none md:translate-x-0",
          isEditing ? "mt-5" : "mt-3",
        )}
      >
        <div
          className="sticky bottom-[calc(var(--bottom-actions-height,var(--app-mobile-bottom-dock-height,0px))+0.75rem)] relative flex min-h-0 w-full flex-col overflow-hidden border-0 bg-transparent md:static md:rounded-[1.5rem]"
          style={exerciseViewportHeight ? { height: `${exerciseViewportHeight}px` } : undefined}
        >
          {exerciseViewportMeta.caption ? (
            <div className="px-4 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent)/0.92)]">
              {exerciseViewportMeta.caption}
            </div>
          ) : null}
          <div className="relative min-h-0 flex-1">
            <div
              aria-hidden="true"
              className={appTokens.exercisePickerViewportMobileFadeTop}
            />
            <div
              aria-hidden="true"
              className={appTokens.exercisePickerViewportMobileFadeBottom}
            />
            <PickerListViewport
              plainOnMobile
              showFade={false}
              className="h-full min-h-0 !border-0 !bg-transparent !p-0"
              viewportClassName={cn(
                "hide-scrollbar h-full min-h-0 overscroll-contain !pr-0",
                expandedExercise ? "px-0 pb-1" : "px-0 pb-2",
                "overflow-hidden",
              )}
            >
              <div
                data-history-exercise-shell="true"
                className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] pb-1"
              >
                {expandedExercise ? (
                  <div className="sticky top-0 z-20 px-1 pb-2 pt-px [background:linear-gradient(180deg,rgba(var(--bg-app),0.985)_0%,rgba(var(--bg-app),0.94)_74%,rgba(var(--bg-app),0)_100%)] backdrop-blur-[8px]">
                    <HistorySessionCard
                      session={focusedSessionSummary}
                      viewMode="detailed"
                      rightIcon={null}
                      className="mt-0"
                      prExerciseNames={focusedSessionSummary.prExerciseNames}
                      detailedMetrics={focusedDetailedMetrics}
                      detailedSections={focusedDetailedSections}
                      detailedHeaderMode="hidden"
                      showDetailedDivider={false}
                    />
                  </div>
                ) : !isEditing ? (
                  <div className="sticky top-0 z-20 px-1 pb-2 pt-px [background:linear-gradient(180deg,rgba(var(--bg-app),0.985)_0%,rgba(var(--bg-app),0.94)_74%,rgba(var(--bg-app),0)_100%)] backdrop-blur-[8px]">
                    <HistorySessionCard
                      session={focusedSessionSummary}
                      viewMode="detailed"
                      rightIcon={null}
                      className="mt-0"
                      prExerciseNames={exerciseViewportMeta.prNames}
                      detailedMetrics={focusedDetailedMetrics}
                      detailedHeaderMode="hidden"
                      showDetailedDivider={false}
                    />
                  </div>
                ) : null}
                <div className="mx-1 min-h-0 overflow-hidden px-1 pb-2">
                  <div
                    className={cn(
                      appTokens.exercisePickerFilterPanel,
                      "flex h-full min-h-0 flex-col p-2",
                    )}
                  >
                    <div
                      data-history-exercise-scroll-region="true"
                      className={cn(
                        "hide-scrollbar min-h-0 flex-1 overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                        expandedExercise ? "h-full overflow-hidden" : "overflow-y-auto px-0 pb-1 pt-0.5",
                      )}
                    >
                      {!expandedExercise && displayExercises.length === 0 ? (
                        <p className={appTokens.historyEmptyState}>
                          No exercises logged for this session yet.
                        </p>
                      ) : null}
                      <div className={cn(expandedExercise ? "flex h-full min-h-0 flex-col" : "space-y-[0.5rem] px-0")}>
                  {visibleExercises.map((exercise) => {
          const name = exercise.exercise_name?.trim() || exerciseNameMap[exercise.exercise_id] || "Exercise";
          const setsForExercise = editableSets[exercise.id] ?? [];
          const isExpanded = expandedExerciseId === exercise.id;
          const bestSet = findBestEditableSet(setsForExercise);
          const bestSummary = bestSet ? buildMeasurementSummary(bestSet, exercise.default_unit) : "No measurements";
          const expandedSet = setsForExercise.find((set) => set.id === expandedSetId) ?? null;
          return (
            <article
              key={exercise.id}
              className={cn(
                isExpanded ? "grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden space-y-0" : appTokens.historyExerciseDisclosureStack,
              )}
            >
              {!(isEditing && isExpanded && expandedSet) ? (
                <HistoryDetailExerciseCard
                  exercise={{
                    name,
                    slug: exercise.exercise_slug ?? null,
                    image_path: exercise.exercise_image_path ?? null,
                    image_icon_path: exercise.exercise_image_icon_path ?? null,
                    image_howto_path: exercise.exercise_image_howto_path ?? null,
                  }}
                  summary={bestSummary}
                  summaryLabel="Best"
                  badgeText={`${setsForExercise.length} ${setsForExercise.length === 1 ? "set" : "sets"}`}
                  onPress={() => setExpandedExerciseId((current) => (current === exercise.id ? null : exercise.id))}
                  expanded={isExpanded}
                  showLeadingVisual={surfacePolicy.showMedia}
                  className={cn(
                    "!border-0 ring-0 shadow-none [--glass-current-border-alpha:0] [--glass-current-sheen-strength:0] [--glass-shadow:none] before:!bg-transparent after:!shadow-none hover:!border-transparent",
                    isEditing && isExpanded ? "-mb-px rounded-b-none [border-bottom-left-radius:0px] [border-bottom-right-radius:0px]" : undefined,
                  )}
                  mediaClassName="!border-r-0"
                  shellStyle={{
                    borderWidth: 0,
                    boxShadow: "none",
                    ["--glass-current-border-alpha" as string]: "0",
                    ["--glass-current-sheen-strength" as string]: "0",
                    ["--glass-shadow" as string]: "none",
                  }}
                />
              ) : null}

              {isExpanded ? (
                <div className={cn(appTokens.historyExerciseDisclosureBody, "flex h-full min-h-0 flex-1 flex-col overflow-hidden px-0 pb-0 pt-0")}>
                  {isEditing && !expandedSet ? (
                    <AttachedQuickActionStrip
                      rowContract={{
                        label: "Add Set",
                        skipLabel: "Delete",
                        skipActionIntent: "danger",
                        skipActionClassName: cn("!border-r !border-r-[rgb(255,120,120,0.16)]", DELETE_ACTION_BUTTON_CLASS_NAME),
                        actionRowClassName: "",
                        quickLogActionClassName: "",
                        isSkipPending: false,
                        isQuickLogPending: false,
                        isQuickLogDisabled: false,
                        isSkipDisabled: false,
                        quickLogDisabledMessage: "Add Set",
                      }}
                      className="-mt-px overflow-hidden rounded-b-[1.05rem] border border-[rgb(var(--accent-divider-rgb)/0.18)] border-t-0 bg-[rgb(var(--surface-1-rgb)/0.16)] [grid-template-columns:72px_minmax(0,1fr)]"
                      onPress={() => handleAddSet(exercise)}
                      onSkip={() => setExerciseToDelete({ id: exercise.id, name })}
                    />
                  ) : null}

                  {isEditing && expandedSet ? (
                    <div className={cn("w-full shrink-0", SET_CARD_SHELL_CLASS_NAME)}>
                      <button type="button" className="block w-full text-left" onClick={() => setExpandedSetId(null)}>
                        <LoggedSetSummaryRow
                          label={formatSetPositionLabel(setsForExercise.findIndex((set) => set.id === expandedSet.id) + 1)}
                          summary={buildMeasurementSummary(expandedSet, exercise.default_unit)}
                          summaryItems={buildLoggedSetSummaryItems(expandedSet, exercise.default_unit)}
                          action={<div className="flex h-full items-end justify-end pb-0.5"><ChevronDownIcon className="h-4 w-4 text-[rgb(var(--text-muted)/0.84)]" /></div>}
                          contentAlign="center"
                          actionClassName="self-stretch items-end justify-end pb-0.5"
                          className="rounded-none border-0 border-b border-[rgb(var(--accent-divider-rgb)/0.2)] bg-transparent shadow-none"
                        />
                      </button>
                      <button
                        type="button"
                        data-bottom-action-intent="danger"
                        className={DELETE_ACTION_BUTTON_CLASS_NAME}
                        disabled={expandedSet.id.startsWith("temp-")}
                        onClick={() => {
                          setSetToDelete({
                            exerciseId: exercise.id,
                            setId: expandedSet.id,
                            label: `${name} - ${formatSetPositionLabel(setsForExercise.findIndex((set) => set.id === expandedSet.id) + 1)}`,
                          });
                        }}
                      >
                        <span className="bottom-action__label">Delete</span>
                      </button>
                    </div>
                  ) : null}

                  <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
                    <div
                      data-history-exercise-scroll-region="true"
                      className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
                    >
                      {expandedExercise && !expandedSet ? (
                        <div className="px-0 pb-2 pt-2">
                          <FocusedExerciseContextPanels
                            progressionSummary={expandedExercise.progressionSummary ?? null}
                            notesValue={focusedExerciseNotes}
                            isEditing={isEditing}
                            canEditNotes={!isFocusedSetExpanded}
                            noteInput={(
                              <label className="block">
                                <LabeledEditorField label="Exercise notes">
                                  <textarea
                                    ref={(element) => {
                                      if (expandedExercise) {
                                        exerciseNoteRefs.current[expandedExercise.id] = element;
                                      }
                                    }}
                                    value={focusedExerciseNotes}
                                    onChange={(event) => {
                                      const nextValue = event.target.value;
                                      if (!expandedExercise) {
                                        return;
                                      }
                                      setExerciseNotes((current) => ({ ...current, [expandedExercise.id]: nextValue }));
                                      autoSizeTextarea(event.currentTarget);
                                    }}
                                    rows={1}
                                    className={cn(labeledEditorFieldControlClassName, "min-h-[3.1rem] resize-none overflow-hidden px-3.5 pb-2 pt-4")}
                                  />
                                </LabeledEditorField>
                              </label>
                            )}
                          />
                        </div>
                      ) : null}

                      {expandedSet && isEditing ? (
                        <div className="px-0 pb-0 pt-2">
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
                            layoutMode="horizontal-scroll"
                          />
                        </div>
                      ) : (
                        <div className={cn(appTokens.currentSessionLoggerSetList, "min-h-full overflow-hidden rounded-none border-0 bg-transparent px-0 py-2")}>
                          <ul className={cn(appTokens.currentSessionFocusList, "text-sm")}>
                            {setsForExercise.map((set, index) => {
                              const setSummaryText = buildMeasurementSummary(set, exercise.default_unit);
                              const setLabel = formatSetPositionLabel(index + 1);
                              const setSummaryItems = buildLoggedSetSummaryItems(set, exercise.default_unit);

                              return (
                                <li key={set.id}>
                                  <div className={SET_CARD_SHELL_CLASS_NAME}>
                                    <button type="button" className="block w-full text-left" onClick={() => isEditing ? setExpandedSetId((current) => (current === set.id ? null : set.id)) : undefined}>
                                      <LoggedSetSummaryRow
                                        label={setLabel}
                                        summary={setSummaryText}
                                        summaryItems={setSummaryItems}
                                        contentAlign="center"
                                        action={isEditing
                                          ? (expandedSetId === set.id
                                            ? <div className="flex h-full items-end justify-end pb-0.5"><ChevronDownIcon className="h-4 w-4 text-[rgb(var(--text-muted)/0.84)]" /></div>
                                            : <div className="flex h-full items-end justify-end pb-0.5"><ChevronRightIcon className="h-4 w-4 text-[rgb(var(--text-muted)/0.84)]" /></div>)
                                          : undefined}
                                        actionClassName="self-stretch items-end justify-end"
                                        className={cn(
                                          isEditing ? appTokens.historySetSummaryInteractive : undefined,
                                          "rounded-none border-0 bg-transparent shadow-none",
                                        )}
                                      />
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {setsForExercise.length === 0 ? (
                        <p className={appTokens.historyEmptyState}>
                          No sets logged yet
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </PickerListViewport>
          </div>
        </div>
      </div>


      <ConfirmDestructiveModal
        open={exerciseToDelete !== null}
        title="Delete exercise?"
        details={exerciseToDelete?.name}
        confirmLabel="Delete"
        onCancel={() => setExerciseToDelete(null)}
        onConfirm={() => {
          if (!exerciseToDelete) return;
          handleDeleteExercise(exerciseToDelete.id);
        }}
      />
      <ConfirmDestructiveModal
        open={setToDelete !== null}
        title="Delete set?"
        details={setToDelete?.label}
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
