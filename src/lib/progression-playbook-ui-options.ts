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
