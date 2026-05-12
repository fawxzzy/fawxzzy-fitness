import type { ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { formatDurationPreview } from "@/lib/duration";
import { DEFAULT_PROGRESSION_STEP_OVERRIDES, DEFAULT_SET_FLOW_STEPS } from "@/lib/progression-step-defaults";
import { deriveGoalMeasurementSelections, isFailureGoalSelection, type GoalModality } from "@/lib/exercise-goal-validation";
import {
  DEFAULT_PROGRESSION_PROMOTION_BASIS,
  DEFAULT_REP_PROMOTION_THRESHOLD,
  type ProgressionPromotionBasis,
  type RepPromotionThreshold,
} from "@/lib/progression-promotion";
import { getDefaultProgressionPlaybookConfig, validateProgressionPlaybookSelection, type ProgressionPlaybookId, type ProgressionStallPolicy, type SetFlowId } from "@/lib/progression-playbooks";
import { normalizeSetFlowId } from "@/lib/set-flow";

export type EditDayExerciseDefaults = {
  targetSets?: number | null;
  targetReps?: number | null;
  targetRepsMin?: number | null;
  targetRepsMax?: number | null;
  targetWeight?: number | null;
  targetWeightUnit?: "lbs" | "kg" | null;
  targetDurationSeconds?: number | null;
  targetDistance?: number | null;
  targetDistanceUnit?: "mi" | "km" | "m" | null;
  targetCalories?: number | null;
  progressionPlaybookId?: ProgressionPlaybookId | null;
  progressionPlaybookConfig?: Record<string, unknown> | null;
};

export type EditDayExerciseDraft = {
  goalState: ExerciseGoalFormState;
  manualOrder: string;
  modality: GoalModality;
  progressionPlaybookId: ProgressionPlaybookId | "";
  progressionStallPolicy: ProgressionStallPolicy;
  progressionLoadIncrement: string;
  progressionStallThreshold: string;
  progressionDeloadPercent: string;
  progressionAutoUpdateRoutineGoals: boolean;
  progressionSetFlow: SetFlowId;
  progressionBarbellLoadIncrement: string;
  progressionDumbbellLoadIncrement: string;
  progressionMachineLoadIncrement: string;
  progressionCableLoadIncrement: string;
  progressionBodyweightRepIncrement: string;
  progressionDurationIncrementSeconds: string;
  progressionDistanceIncrement: string;
  progressionSetFlowLoadStep: string;
  progressionSetFlowRepStep: string;
  progressionSetFlowDurationStep: string;
  progressionSetFlowDistanceStep: string;
  progressionPromotionBasis: ProgressionPromotionBasis;
  progressionRepPromotionThreshold: RepPromotionThreshold;
  progressionCustomRepPromotionTarget: string;
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
  distanceUnit: "mi" | "km" | "m";
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
  distanceUnit: "mi" | "km" | "m";
  weightUnit: "lbs" | "kg";
  orderNumber: number;
  modality: GoalModality;
}): EditDayExerciseDraft {
  const failure = isFailureGoalSelection({
    repsMin: defaults.targetRepsMin ?? defaults.targetReps,
    repsMax: defaults.targetRepsMax ?? defaults.targetReps,
  });

  const progressionSelection = validateProgressionPlaybookSelection({
    playbookId: defaults.progressionPlaybookId ?? null,
    config: defaults.progressionPlaybookConfig ?? null,
  });
  const defaultPlaybookConfig = progressionSelection
    ? progressionSelection.config
    : (defaults.progressionPlaybookId ? getDefaultProgressionPlaybookConfig(defaults.progressionPlaybookId) : null);
  const effectiveProgressionPlaybookId = defaults.progressionPlaybookId === "deload_after_stall"
    ? "double_progression"
    : defaults.progressionPlaybookId ?? "";
  const progressionStallPolicy = progressionSelection?.id === "deload_after_stall" || progressionSelection?.config.stallPolicy === "deload_after_stall"
    ? "deload_after_stall"
    : "none";
  const deloadDefaults = progressionSelection?.id === "deload_after_stall"
    ? progressionSelection.config
    : progressionSelection?.config.stallPolicy === "deload_after_stall" && progressionSelection.config.stallThreshold && progressionSelection.config.deloadPercent
      ? {
          version: 1 as const,
          loadIncrement: progressionSelection.config.loadIncrement,
          stallThreshold: progressionSelection.config.stallThreshold,
          deloadPercent: progressionSelection.config.deloadPercent,
        }
    : null;

  return {
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
    progressionPlaybookId: effectiveProgressionPlaybookId,
    progressionStallPolicy,
    progressionLoadIncrement: defaultPlaybookConfig ? formatNumber(defaultPlaybookConfig.loadIncrement) : "5",
    progressionBarbellLoadIncrement: formatNumber(defaultPlaybookConfig?.stepOverrides?.barbellLoadIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.barbellLoadIncrement),
    progressionDumbbellLoadIncrement: formatNumber(defaultPlaybookConfig?.stepOverrides?.dumbbellLoadIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.dumbbellLoadIncrement),
    progressionMachineLoadIncrement: formatNumber(defaultPlaybookConfig?.stepOverrides?.machineLoadIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.machineLoadIncrement),
    progressionCableLoadIncrement: formatNumber(defaultPlaybookConfig?.stepOverrides?.cableLoadIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.cableLoadIncrement),
    progressionBodyweightRepIncrement: formatNumber(defaultPlaybookConfig?.stepOverrides?.bodyweightRepIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.bodyweightRepIncrement),
    progressionDurationIncrementSeconds: formatNumber(defaultPlaybookConfig?.stepOverrides?.durationSecondsIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.durationSecondsIncrement),
    progressionDistanceIncrement: formatNumber(defaultPlaybookConfig?.stepOverrides?.distanceIncrement ?? DEFAULT_PROGRESSION_STEP_OVERRIDES.distanceIncrement),
    progressionSetFlowLoadStep: formatNumber(defaultPlaybookConfig?.setFlowSteps?.loadStep ?? DEFAULT_SET_FLOW_STEPS.loadStep),
    progressionSetFlowRepStep: formatNumber(defaultPlaybookConfig?.setFlowSteps?.repStep ?? DEFAULT_SET_FLOW_STEPS.repStep),
    progressionSetFlowDurationStep: formatNumber(defaultPlaybookConfig?.setFlowSteps?.durationSecondsStep ?? DEFAULT_SET_FLOW_STEPS.durationSecondsStep),
    progressionSetFlowDistanceStep: formatNumber(defaultPlaybookConfig?.setFlowSteps?.distanceStep ?? DEFAULT_SET_FLOW_STEPS.distanceStep),
    progressionPromotionBasis: defaultPlaybookConfig?.promotionBasis ?? DEFAULT_PROGRESSION_PROMOTION_BASIS,
    progressionRepPromotionThreshold: defaultPlaybookConfig?.repPromotionThreshold ?? DEFAULT_REP_PROMOTION_THRESHOLD,
    progressionCustomRepPromotionTarget: typeof defaultPlaybookConfig?.customRepPromotionTarget === "number"
      ? formatNumber(defaultPlaybookConfig.customRepPromotionTarget)
      : "",
    progressionStallThreshold: deloadDefaults
      ? String(deloadDefaults.stallThreshold)
      : "2",
    progressionDeloadPercent: deloadDefaults
      ? formatNumber(deloadDefaults.deloadPercent)
      : "10",
    progressionAutoUpdateRoutineGoals: Boolean(progressionSelection?.id !== "deload_after_stall" && progressionSelection?.config.autoUpdateRoutineGoals),
    progressionSetFlow: normalizeSetFlowId(defaultPlaybookConfig?.setFlow) ?? "straight_sets",
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
