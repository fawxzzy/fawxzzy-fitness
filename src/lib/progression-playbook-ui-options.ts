import { resolveCardioVectorMode } from "@/lib/cardio-progression-vectors";
import {
  inferMeasurementTypeFromGoalModality,
  type GoalModality,
} from "@/lib/exercise-goal-validation";
import {
  detectActiveMeasurementsFromTargets,
  getPromotionMeasurementKey,
  sortPromotionMeasurementsByHierarchy,
  type ProgressionMeasurementKey,
} from "@/lib/progression-active-measurements";
import {
  describePromotionBasis,
  normalizePromotionBasis,
  usesRepsForPromotion,
  type ProgressionPromotionBasis,
} from "@/lib/progression-promotion";
import type { ProgressionStepPolicy } from "@/lib/progression-step-policy";
import {
  getDefaultStrengthTargetMutationForPromotionBasis,
  normalizeTargetMutation,
  type ProgressionTargetMutationId,
} from "@/lib/progression-target-mutation";

export type PromotionStepFieldId =
  | "barbellLoad"
  | "dumbbellLoad"
  | "machineLoad"
  | "cableLoad"
  | "genericLoad"
  | "bodyweightReps"
  | "duration"
  | "distance";

export type SetStepFieldId = "load" | "reps" | "duration" | "distance";

export type ProgressionPromotionUiOptionId =
  | "weight_only"
  | "reps_only"
  | "weight_and_reps"
  | "time_only"
  | "distance_only"
  | "time_and_distance";

export type ProgressionPromotionUiOption = {
  id: ProgressionPromotionUiOptionId;
  label: string;
  isSelectable: boolean;
};

export type ProgressionPromotionUiModel = {
  activeMeasurements: ProgressionMeasurementKey[];
  visibleOptions: ProgressionPromotionUiOption[];
  selectedOptionId: ProgressionPromotionUiOptionId | null;
  summary: string | null;
  showsRepThresholdControls: boolean;
  hasDeferredCalories: boolean;
};

export type ProgressionTargetMutationUiOption = {
  id: ProgressionTargetMutationId;
  label: string;
  isSelectable: boolean;
};

export type ProgressionTargetMutationUiModel = {
  activeMeasurements: ProgressionMeasurementKey[];
  visibleOptions: ProgressionTargetMutationUiOption[];
  selectedOptionId: ProgressionTargetMutationId | null;
  summary: string | null;
  hasDeferredCalories: boolean;
};

export const QUALIFICATION_SESSION_COUNT_OPTIONS = [1, 2, 3] as const;

type GoalLikeValues = {
  repsMin: string;
  repsMax?: string;
  failure?: boolean;
  weight: string;
  duration: string;
  distance: string;
  calories: string;
};

function parsePositiveNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseDurationSeconds(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d+$/.test(trimmed)) {
    const parsed = Number(trimmed);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (!match) {
    return null;
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (!Number.isInteger(minutes) || !Number.isInteger(seconds) || seconds > 59) {
    return null;
  }

  const totalSeconds = (minutes * 60) + seconds;
  return totalSeconds > 0 ? totalSeconds : null;
}

function buildActiveMeasurementInput(args: {
  modality: GoalModality;
  values: GoalLikeValues;
}) {
  return {
    measurementType: inferMeasurementTypeFromGoalModality(args.modality),
    repsMin: parsePositiveNumber(args.values.repsMin),
    repsMax: parsePositiveNumber(args.values.repsMax ?? ""),
    weightMin: parsePositiveNumber(args.values.weight),
    weightMax: parsePositiveNumber(args.values.weight),
    durationSeconds: parseDurationSeconds(args.values.duration),
    distance: parsePositiveNumber(args.values.distance),
    calories: parsePositiveNumber(args.values.calories),
  };
}

export function detectActiveProgressionMeasurementsFromGoal(args: {
  modality: GoalModality;
  values: GoalLikeValues;
}) {
  const activeMeasurements = detectActiveMeasurementsFromTargets(buildActiveMeasurementInput(args));
  if (args.values.failure && !activeMeasurements.includes("reps")) {
    activeMeasurements.unshift("reps");
  }

  return activeMeasurements;
}

function getCardioPromotionOptionId(measurements: ProgressionMeasurementKey[]) {
  if (measurements.includes("time") && measurements.includes("distance")) {
    return "time_and_distance" as const;
  }

  if (measurements.includes("time")) {
    return "time_only" as const;
  }

  if (measurements.includes("distance")) {
    return "distance_only" as const;
  }

  return null;
}

function getCardioPromotionOptionLabel(optionId: Exclude<ProgressionPromotionUiOptionId, ProgressionPromotionBasis>) {
  switch (optionId) {
  case "time_only":
    return "Time only";
  case "distance_only":
    return "Distance only";
  case "time_and_distance":
    return "Time + distance";
  }
}

function getTargetMutationLabel(optionId: ProgressionTargetMutationId) {
  switch (optionId) {
  case "increase_load":
    return "Load only";
  case "increase_reps":
    return "Reps only";
  case "increase_load_reset_reps":
    return "Load + reset reps";
  case "increase_load_and_reps":
    return "Load + reps";
  case "increase_duration":
    return "Time only";
  case "increase_distance":
    return "Distance only";
  case "increase_duration_and_distance":
    return "Time + distance";
  case "none":
    return "None / Manual";
  }
}

function describeTargetMutation(optionId: ProgressionTargetMutationId) {
  switch (optionId) {
  case "increase_load":
    return "Target changes: Increase load when readiness is earned.";
  case "increase_reps":
    return "Target changes: Increase reps when readiness is earned.";
  case "increase_load_reset_reps":
    return "Target changes: Increase load and reset reps to the floor of the range.";
  case "increase_load_and_reps":
    return "Target changes: Increase load and reps together after a qualifying update.";
  case "increase_duration":
    return "Target changes: Increase time when readiness is earned.";
  case "increase_distance":
    return "Target changes: Increase distance when readiness is earned.";
  case "increase_duration_and_distance":
    return "Target changes: Increase time and distance together after a qualifying update.";
  case "none":
    return "Target changes: Keep the current target and review manually.";
  }
}

function buildTargetMutationOption(optionId: ProgressionTargetMutationId, isSelectable = true): ProgressionTargetMutationUiOption {
  return {
    id: optionId,
    label: getTargetMutationLabel(optionId),
    isSelectable,
  };
}

function getStrengthTargetMutationOptions(measurements: ProgressionMeasurementKey[]) {
  if (measurements.includes("reps") && measurements.includes("weight")) {
    return [
      buildTargetMutationOption("increase_load"),
      buildTargetMutationOption("increase_reps"),
      buildTargetMutationOption("increase_load_reset_reps"),
      buildTargetMutationOption("increase_load_and_reps"),
    ];
  }

  if (measurements.includes("reps")) {
    return [buildTargetMutationOption("increase_reps", false)];
  }

  if (measurements.includes("weight")) {
    return [buildTargetMutationOption("increase_load", false)];
  }

  return [] as ProgressionTargetMutationUiOption[];
}

function getCardioTargetMutationOptions(measurements: ProgressionMeasurementKey[]) {
  if (measurements.includes("time") && measurements.includes("distance")) {
    return [
      buildTargetMutationOption("increase_duration"),
      buildTargetMutationOption("increase_distance"),
      buildTargetMutationOption("increase_duration_and_distance"),
    ];
  }

  if (measurements.includes("time")) {
    return [buildTargetMutationOption("increase_duration", false)];
  }

  if (measurements.includes("distance")) {
    return [buildTargetMutationOption("increase_distance", false)];
  }

  return [] as ProgressionTargetMutationUiOption[];
}

function resolveTargetMutationSelection(args: {
  targetMutation?: unknown;
  promotionBasis?: unknown;
  visibleOptions: ProgressionTargetMutationUiOption[];
}) {
  const fallback = getDefaultStrengthTargetMutationForPromotionBasis(args.promotionBasis);
  const selectedOptionId = normalizeTargetMutation(args.targetMutation, fallback);
  return args.visibleOptions.some((option) => option.id === selectedOptionId)
    ? selectedOptionId
    : null;
}

function getCardioPromotionSummary(optionId: Exclude<ProgressionPromotionUiOptionId, ProgressionPromotionBasis>) {
  switch (optionId) {
  case "time_only":
    return "Time only: Active duration targets determine auto-promotion.";
  case "distance_only":
    return "Distance only: Active distance targets determine auto-promotion.";
  case "time_and_distance":
    return "Time + distance: Both active cardio targets participate in auto-promotion.";
  }
}

export function buildProgressionPromotionUiModel(args: {
  context: "routine-default" | "exercise";
  promotionBasis: ProgressionPromotionBasis;
  modality?: GoalModality | null;
  values?: GoalLikeValues | null;
}) : ProgressionPromotionUiModel {
  const normalizedBasis = normalizePromotionBasis(args.promotionBasis);
  const legacyStrengthOptions: ProgressionPromotionUiOption[] = [
    { id: "weight_only", label: "Weight only", isSelectable: true },
    { id: "reps_only", label: "Reps only", isSelectable: true },
    { id: "weight_and_reps", label: "Reps + weight", isSelectable: true },
  ];

  if (args.context === "routine-default" || !args.modality || !args.values) {
    return {
      activeMeasurements: [],
      visibleOptions: legacyStrengthOptions,
      selectedOptionId: normalizedBasis,
      summary: describePromotionBasis(normalizedBasis),
      showsRepThresholdControls: usesRepsForPromotion(normalizedBasis),
      hasDeferredCalories: false,
    };
  }

  const activeMeasurements = sortPromotionMeasurementsByHierarchy({
    measurements: detectActiveProgressionMeasurementsFromGoal({
      modality: args.modality,
      values: args.values,
    }),
    cardioVectorMode: resolveCardioVectorMode(buildActiveMeasurementInput({
      modality: args.modality,
      values: args.values,
    })),
  });
  const hasDeferredCalories = activeMeasurements.includes("calories");
  const supportedMeasurements = activeMeasurements.filter((measurement) => measurement !== "calories");
  const promotionKey = getPromotionMeasurementKey({
    measurements: supportedMeasurements,
    cardioVectorMode: resolveCardioVectorMode(buildActiveMeasurementInput({
      modality: args.modality,
      values: args.values,
    })),
  });

  switch (promotionKey) {
  case "reps_weight":
      return {
        activeMeasurements,
        visibleOptions: legacyStrengthOptions,
        selectedOptionId: normalizedBasis,
        summary: describePromotionBasis(normalizedBasis),
        showsRepThresholdControls: usesRepsForPromotion(normalizedBasis),
        hasDeferredCalories,
      };
  case "reps":
      return {
        activeMeasurements,
        visibleOptions: [{ id: "reps_only", label: "Reps only", isSelectable: false }],
        selectedOptionId: "reps_only",
        summary: "Reps only: Active rep targets determine auto-promotion.",
        showsRepThresholdControls: true,
        hasDeferredCalories,
      };
  case "weight":
      return {
        activeMeasurements,
        visibleOptions: [{ id: "weight_only", label: "Weight only", isSelectable: false }],
        selectedOptionId: "weight_only",
        summary: "Weight only: Active load targets determine auto-promotion.",
        showsRepThresholdControls: false,
        hasDeferredCalories,
      };
  case "time":
  case "distance":
  case "time_distance": {
      const optionId = getCardioPromotionOptionId(supportedMeasurements);
      if (!optionId) {
        break;
      }

      return {
        activeMeasurements,
        visibleOptions: [{ id: optionId, label: getCardioPromotionOptionLabel(optionId), isSelectable: false }],
        selectedOptionId: optionId,
        summary: getCardioPromotionSummary(optionId),
        showsRepThresholdControls: false,
        hasDeferredCalories,
      };
    }
  case "none":
  case "custom":
  default:
      return {
        activeMeasurements,
        visibleOptions: [],
        selectedOptionId: null,
        summary: hasDeferredCalories
          ? "Calories targets are detected, but calories-aware promotion controls stay deferred."
          : null,
        showsRepThresholdControls: false,
        hasDeferredCalories,
      };
  }

  return {
    activeMeasurements,
    visibleOptions: [],
    selectedOptionId: null,
    summary: hasDeferredCalories
      ? "Calories targets are detected, but calories-aware promotion controls stay deferred."
      : null,
    showsRepThresholdControls: false,
    hasDeferredCalories,
  };
}

export function buildProgressionTargetMutationUiModel(args: {
  context: "routine-default" | "exercise";
  targetMutation?: unknown;
  promotionBasis?: unknown;
  modality?: GoalModality | null;
  values?: GoalLikeValues | null;
}) : ProgressionTargetMutationUiModel {
  const resolvedTargetMutation = normalizeTargetMutation(
    args.targetMutation,
    getDefaultStrengthTargetMutationForPromotionBasis(args.promotionBasis),
  );
  const buildResult = (visibleOptions: ProgressionTargetMutationUiOption[], activeMeasurements: ProgressionMeasurementKey[], hasDeferredCalories = false) => ({
    activeMeasurements,
    visibleOptions,
    selectedOptionId: resolveTargetMutationSelection({
      targetMutation: resolvedTargetMutation,
      promotionBasis: args.promotionBasis,
      visibleOptions,
    }),
    summary: visibleOptions.length > 0 && resolveTargetMutationSelection({
      targetMutation: resolvedTargetMutation,
      promotionBasis: args.promotionBasis,
      visibleOptions,
    })
      ? describeTargetMutation(resolveTargetMutationSelection({
        targetMutation: resolvedTargetMutation,
        promotionBasis: args.promotionBasis,
        visibleOptions,
      })!)
      : hasDeferredCalories
        ? "Calories targets are detected, but calories-aware target changes stay deferred."
        : null,
    hasDeferredCalories,
  });

  if (args.context === "routine-default" || !args.modality || !args.values) {
    switch (resolvedTargetMutation) {
    case "increase_duration":
    case "increase_distance":
    case "increase_duration_and_distance":
      return buildResult([
        buildTargetMutationOption("increase_duration"),
        buildTargetMutationOption("increase_distance"),
        buildTargetMutationOption("increase_duration_and_distance"),
      ], []);
    case "none":
      return buildResult([buildTargetMutationOption("none", false)], []);
    case "increase_load":
    case "increase_reps":
    case "increase_load_reset_reps":
    case "increase_load_and_reps":
    default:
      return buildResult([
        buildTargetMutationOption("increase_load"),
        buildTargetMutationOption("increase_reps"),
        buildTargetMutationOption("increase_load_reset_reps"),
        buildTargetMutationOption("increase_load_and_reps"),
      ], []);
    }
  }

  const activeMeasurements = sortPromotionMeasurementsByHierarchy({
    measurements: detectActiveProgressionMeasurementsFromGoal({
      modality: args.modality,
      values: args.values,
    }),
    cardioVectorMode: resolveCardioVectorMode(buildActiveMeasurementInput({
      modality: args.modality,
      values: args.values,
    })),
  });
  const hasDeferredCalories = activeMeasurements.includes("calories");
  const supportedMeasurements = activeMeasurements.filter((measurement) => measurement !== "calories");

  if (supportedMeasurements.includes("reps") || supportedMeasurements.includes("weight")) {
    return buildResult(getStrengthTargetMutationOptions(supportedMeasurements), activeMeasurements, hasDeferredCalories);
  }

  if (supportedMeasurements.includes("time") || supportedMeasurements.includes("distance")) {
    return buildResult(getCardioTargetMutationOptions(supportedMeasurements), activeMeasurements, hasDeferredCalories);
  }

  return buildResult([], activeMeasurements, hasDeferredCalories);
}

export function getVisiblePromotionStepFieldsForGoal(args: {
  modality: GoalModality;
  values: GoalLikeValues;
  policy: ProgressionStepPolicy;
}) : PromotionStepFieldId[] {
  const activeMeasurements = new Set(
    detectActiveProgressionMeasurementsFromGoal({
      modality: args.modality,
      values: args.values,
    }),
  );

  if (activeMeasurements.has("time") || activeMeasurements.has("distance")) {
    const fields: PromotionStepFieldId[] = [];
    if (activeMeasurements.has("time")) {
      fields.push("duration");
    }
    if (activeMeasurements.has("distance")) {
      fields.push("distance");
    }
    if (fields.length > 0) {
      return fields;
    }
  }

  if (args.policy.kind === "load" && activeMeasurements.has("weight")) {
    switch (args.policy.equipmentFamily) {
    case "barbell":
      return ["barbellLoad"];
    case "dumbbell":
      return ["dumbbellLoad"];
    case "machine":
      return ["machineLoad"];
    case "cable":
      return ["cableLoad"];
    default:
      return ["genericLoad"];
    }
  }

  if (activeMeasurements.has("reps")) {
    return ["bodyweightReps"];
  }

  return [];
}

export function getVisibleSetStepFieldsForGoal(args: {
  modality: GoalModality;
  values: GoalLikeValues;
}) : SetStepFieldId[] {
  const activeMeasurements = new Set(
    detectActiveProgressionMeasurementsFromGoal({
      modality: args.modality,
      values: args.values,
    }),
  );
  const isCardioTarget = args.modality === "cardio_time"
    || args.modality === "cardio_distance"
    || args.modality === "cardio_time_distance";

  if (isCardioTarget) {
    return [
      ...(activeMeasurements.has("time") ? ["duration" as const] : []),
      ...(activeMeasurements.has("distance") ? ["distance" as const] : []),
      ...(activeMeasurements.has("reps") ? ["reps" as const] : []),
      ...(activeMeasurements.has("weight") ? ["load" as const] : []),
    ];
  }

  return [
    ...(activeMeasurements.has("weight") ? ["load" as const] : []),
    ...(activeMeasurements.has("reps") ? ["reps" as const] : []),
    ...(activeMeasurements.has("time") ? ["duration" as const] : []),
    ...(activeMeasurements.has("distance") ? ["distance" as const] : []),
  ];
}
