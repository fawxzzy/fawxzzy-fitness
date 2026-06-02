import type { ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { formatDurationPreview } from "@/lib/duration";
import { formatExerciseGoalSummary } from "@/lib/exercise-goal-format";
import { deriveGoalMeasurementSelections, isFailureGoalSelection, type GoalModality } from "@/lib/exercise-goal-validation";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import { applyEffortScheduleToRoutineDayExercise } from "@/lib/progression-effective-target";
import type { ProgressionPlaybookId } from "@/lib/progression-playbooks";
import { buildProgressionPlaybookConfigFromFormState, createProgressionPlaybookFormState, type ProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";
import { applyEditDayAdjustmentDirectionToProgressionConfig } from "@/lib/edit-day-progression";

export type EditDayExerciseDefaults = {
  targetSets?: number | null;
  targetReps?: number | null;
  targetRepsMin?: number | null;
  targetRepsMax?: number | null;
  targetWeight?: number | null;
  targetWeightUnit?: "lbs" | "kg" | null;
  targetDurationSeconds?: number | null;
  targetDistance?: number | null;
  targetDistanceUnit?: FitnessDistanceUnit | null;
  targetCalories?: number | null;
  progressionPlaybookId?: ProgressionPlaybookId | null;
  progressionPlaybookConfig?: Record<string, unknown> | null;
};

export type EditDayExerciseDraft = ProgressionPlaybookFormState & {
  goalState: ExerciseGoalFormState;
  manualOrder: string;
  modality: GoalModality;
};

function formatDuration(seconds: number | null | undefined) {
  if (seconds === null || seconds === undefined) return "";
  if (seconds < 60) return String(seconds);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function parseOptionalNumber(rawValue: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function clampOrderValue(rawValue: number, listLength: number) {
  if (!Number.isFinite(rawValue)) return 1;
  const normalized = Math.trunc(rawValue);
  if (normalized < 1) return 1;
  if (normalized > listLength) return listLength;
  return normalized;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatSetCountLabel(count: number | null) {
  if (!Number.isFinite(count) || (count ?? 0) <= 0) return null;
  const normalizedCount = Math.floor(count as number);
  return `${normalizedCount} set${normalizedCount === 1 ? "" : "s"}`;
}

function formatRepRange(reps: number | null, repsMax: number | null) {
  if (!Number.isFinite(reps) || (reps ?? 0) <= 0) return null;
  const minReps = Math.floor(reps as number);
  if (Number.isFinite(repsMax) && (repsMax ?? 0) > 0) {
    const maxReps = Math.floor(repsMax as number);
    return minReps === maxReps ? `${minReps} reps` : `${minReps}\u2013${maxReps} reps`;
  }
  return `${minReps} reps`;
}

function formatDraftSummary(values: {
  sets: number | null;
  reps: number | null;
  repsMax: number | null;
  failure: boolean;
  weight: number | null;
  weightUnit: "lbs" | "kg";
  durationSeconds: number | null;
  distance: number | null;
  distanceUnit: FitnessDistanceUnit;
  calories: number | null;
}) {
  const parts = [
    formatSetCountLabel(values.sets),
    values.failure ? "Failure" : formatRepRange(values.reps, values.repsMax),
    Number.isFinite(values.weight) && (values.weight ?? 0) > 0 ? `${formatNumber(values.weight as number)} ${values.weightUnit}` : null,
    Number.isFinite(values.durationSeconds) && (values.durationSeconds ?? 0) > 0
      ? formatDurationPreview(values.durationSeconds as number)
      : null,
    Number.isFinite(values.distance) && (values.distance ?? 0) > 0 ? `${formatNumber(values.distance as number)} ${values.distanceUnit}` : null,
    Number.isFinite(values.calories) && (values.calories ?? 0) > 0 ? `${formatNumber(values.calories as number)} cal` : null,
  ].filter((part): part is string => Boolean(part));

  if (parts.length === 0) {
    return "Goal missing";
  }

  if (parts.length === 1) {
    return parts[0];
  }

  const [first, second, ...rest] = parts;
  return [`${first} | ${second}`, ...rest].join(" \u2022 ");
}

export function createEditDayExerciseDraft({
  defaults,
  distanceUnit,
  weightUnit,
  orderNumber,
  modality,
}: {
  defaults: EditDayExerciseDefaults;
  distanceUnit: FitnessDistanceUnit;
  weightUnit: "lbs" | "kg";
  orderNumber: number;
  modality: GoalModality;
}): EditDayExerciseDraft {
  const failure = isFailureGoalSelection({
    repsMin: defaults.targetRepsMin ?? defaults.targetReps,
    repsMax: defaults.targetRepsMax ?? defaults.targetReps,
  });

  const progressionState = createProgressionPlaybookFormState({
    playbookId: defaults.progressionPlaybookId ?? null,
    config: defaults.progressionPlaybookConfig ?? null,
  });

  return {
    ...progressionState,
    goalState: {
      sets: String(defaults.targetSets ?? 1),
      repsMin: failure ? "" : String(defaults.targetRepsMin ?? defaults.targetReps ?? ""),
      repsMax: failure ? "" : String(defaults.targetRepsMax ?? ""),
      failure,
      weight: String(defaults.targetWeight ?? ""),
      duration: formatDuration(defaults.targetDurationSeconds),
      distance: String(defaults.targetDistance ?? ""),
      calories: String(defaults.targetCalories ?? ""),
      weightUnit: defaults.targetWeightUnit ?? weightUnit,
      distanceUnit: defaults.targetDistanceUnit ?? distanceUnit,
      measurements: [
        ...(failure || defaults.targetRepsMin != null || defaults.targetRepsMax != null || defaults.targetReps != null ? ["reps" as const] : []),
        ...(defaults.targetWeight != null ? ["weight" as const] : []),
        ...(defaults.targetDurationSeconds != null ? ["time" as const] : []),
        ...(defaults.targetDistance != null ? ["distance" as const] : []),
        ...(defaults.targetCalories != null ? ["calories" as const] : []),
      ],
    },
    manualOrder: String(orderNumber),
    modality,
  };
}

export function formatEditDayExerciseDraftSummary(draft: EditDayExerciseDraft) {
  const measurementSelections = new Set(deriveGoalMeasurementSelections(draft.modality, {
    repsMin: draft.goalState.repsMin,
    repsMax: draft.goalState.repsMax,
    failure: draft.goalState.failure,
    weight: draft.goalState.weight,
    duration: draft.goalState.duration,
    distance: draft.goalState.distance,
    calories: draft.goalState.calories,
  }));

  return formatDraftSummary({
    sets: parseOptionalNumber(draft.goalState.sets),
    reps: draft.goalState.failure ? 0 : (measurementSelections.has("reps") ? parseOptionalNumber(draft.goalState.repsMin) : null),
    repsMax: draft.goalState.failure ? 0 : (measurementSelections.has("reps") ? parseOptionalNumber(draft.goalState.repsMax) : null),
    failure: draft.goalState.failure,
    weight: measurementSelections.has("weight") ? parseOptionalNumber(draft.goalState.weight) : null,
    durationSeconds: measurementSelections.has("time") ? parseDurationInput(draft.goalState.duration) : null,
    distance: measurementSelections.has("distance") ? parseOptionalNumber(draft.goalState.distance) : null,
    calories: measurementSelections.has("calories") ? parseOptionalNumber(draft.goalState.calories) : null,
    weightUnit: draft.goalState.weightUnit,
    distanceUnit: draft.goalState.distanceUnit,
  });
}

export function resolveEditDayExercisePreview({
  savedSummary,
  savedOrderNumber,
  draft,
  listLength,
}: {
  savedSummary: string;
  savedOrderNumber: number;
  draft?: EditDayExerciseDraft | null;
  listLength: number;
}) {
  if (!draft) {
    return {
      summary: savedSummary,
      orderNumber: savedOrderNumber,
    };
  }

  const parsedOrder = parseOptionalNumber(draft.manualOrder);

  return {
    summary: formatEditDayExerciseDraftSummary(draft),
    orderNumber: parsedOrder === null ? savedOrderNumber : clampOrderValue(parsedOrder, listLength),
  };
}

export function resolveEditDayAdjustedSummary(args: {
  draft: EditDayExerciseDraft;
  measurementType: "reps" | "time" | "distance" | "time_distance" | "none";
  dayIndex: number;
  cycleLengthDays: number;
  direction: "straight" | "up" | "down";
}) {
  if (args.direction === "straight" || !args.draft.progressionPlaybookId) {
    return null;
  }

  const measurementSelections = new Set(deriveGoalMeasurementSelections(args.draft.modality, {
    repsMin: args.draft.goalState.repsMin,
    repsMax: args.draft.goalState.repsMax,
    failure: args.draft.goalState.failure,
    weight: args.draft.goalState.weight,
    duration: args.draft.goalState.duration,
    distance: args.draft.goalState.distance,
    calories: args.draft.goalState.calories,
  }));
  const nextConfig = applyEditDayAdjustmentDirectionToProgressionConfig({
    playbookId: args.draft.progressionPlaybookId,
    config: buildProgressionPlaybookConfigFromFormState(args.draft),
    dayIndex: args.dayIndex,
    cycleLengthDays: args.cycleLengthDays,
    direction: args.direction,
  });

  if (!nextConfig) {
    return null;
  }

  const currentRepsMin = args.draft.goalState.failure ? 0 : (measurementSelections.has("reps") ? parseOptionalNumber(args.draft.goalState.repsMin) : null);
  const currentRepsMax = args.draft.goalState.failure ? 0 : (measurementSelections.has("reps") ? parseOptionalNumber(args.draft.goalState.repsMax) : null);
  const currentSummary = formatExerciseGoalSummary({
    sets: parseOptionalNumber(args.draft.goalState.sets),
    reps: currentRepsMin,
    repsMax: currentRepsMax,
    failure: args.draft.goalState.failure,
    weight: measurementSelections.has("weight") ? parseOptionalNumber(args.draft.goalState.weight) : null,
    weightUnit: args.draft.goalState.weightUnit,
    durationSeconds: measurementSelections.has("time") ? parseDurationInput(args.draft.goalState.duration) : null,
    distance: measurementSelections.has("distance") ? parseOptionalNumber(args.draft.goalState.distance) : null,
    distanceUnit: args.draft.goalState.distanceUnit,
    calories: measurementSelections.has("calories") ? parseOptionalNumber(args.draft.goalState.calories) : null,
    enabledMeasurements: {
      reps: measurementSelections.has("reps"),
      weight: measurementSelections.has("weight"),
      time: measurementSelections.has("time"),
      distance: measurementSelections.has("distance"),
      calories: measurementSelections.has("calories"),
    },
    emptyLabel: "Goal missing",
  });
  const adjusted = applyEffortScheduleToRoutineDayExercise({
    exercise: {
      measurement_type: args.measurementType === "none" ? "reps" : args.measurementType,
      target_sets: parseOptionalNumber(args.draft.goalState.sets),
      target_reps: currentRepsMin,
      target_reps_min: currentRepsMin,
      target_reps_max: currentRepsMax,
      target_weight: measurementSelections.has("weight") ? parseOptionalNumber(args.draft.goalState.weight) : null,
      target_weight_unit: measurementSelections.has("weight") ? args.draft.goalState.weightUnit : null,
      target_duration_seconds: measurementSelections.has("time") ? parseDurationInput(args.draft.goalState.duration) : null,
      target_distance: measurementSelections.has("distance") ? parseOptionalNumber(args.draft.goalState.distance) : null,
      target_distance_unit: measurementSelections.has("distance") ? args.draft.goalState.distanceUnit : null,
      target_calories: measurementSelections.has("calories") ? parseOptionalNumber(args.draft.goalState.calories) : null,
      progression_playbook_id: args.draft.progressionPlaybookId,
      progression_playbook_config: nextConfig,
    },
    routineDayIndex: args.dayIndex,
  });

  const adjustedSummary = formatExerciseGoalSummary({
    sets: null,
    reps: adjusted.target_reps_min ?? adjusted.target_reps,
    repsMax: adjusted.target_reps_max ?? adjusted.target_reps,
    failure: args.draft.goalState.failure,
    weight: adjusted.target_weight,
    weightUnit: adjusted.target_weight_unit ?? args.draft.goalState.weightUnit,
    durationSeconds: adjusted.target_duration_seconds,
    distance: adjusted.target_distance,
    distanceUnit: adjusted.target_distance_unit ?? args.draft.goalState.distanceUnit,
    calories: adjusted.target_calories,
    enabledMeasurements: {
      reps: measurementSelections.has("reps"),
      weight: measurementSelections.has("weight"),
      time: measurementSelections.has("time"),
      distance: measurementSelections.has("distance"),
      calories: measurementSelections.has("calories"),
    },
    emptyLabel: "Goal missing",
  });

  if (adjustedSummary === currentSummary || adjustedSummary === "Goal missing") {
    return null;
  }

  return {
    currentSummary,
    adjustedSummary,
  };
}
