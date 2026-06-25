"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { ExerciseCard, EXERCISE_CARD_SUMMARY_CLASS_NAME } from "@/components/ExerciseCard";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { ContentRail } from "@/components/layout/ContentRail";
import { appTokens } from "@/components/ui/app/tokens";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { PickerListViewport } from "@/components/ui/PickerListViewport";
import { buildFailureToggleInfoPayload, type ExerciseGoalFormState, type RoutineEditorInfoPayload } from "@/components/ui/measurements/ExerciseGoalForm";
import { measurementDockSurfaceClassName } from "@/components/ui/measurements/MeasurementDock";
import type { MeasurementPanelAuxiliaryField } from "@/components/ui/measurements/MeasurementPanelV2";
import { SharedExerciseGoalForm, inferGoalModeFromState } from "@/components/ui/measurements/SharedExerciseGoalForm";
import { DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME, ExerciseSearchFilters } from "@/components/exercises/ExerciseSearchFilters";
import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { SignatureInlineList, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { ACTION_CHROME_CONTROL_CLASS_NAME, ACTION_CHROME_SEGMENTED_CLASS_NAME } from "@/components/ui/actionChrome";
import { GLOW_SWITCH_STANDARD_CLASS_NAME } from "@/components/ui/GlowSwitch";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { VerticalScrollHint } from "@/components/ui/VerticalScrollHint";
import { cn } from "@/lib/cn";
import {
  estimateCaloriesFromExerciseMetrics,
  inferCaloriesEstimationMethodFromExercise,
  resolveCaloriesEstimationMethod,
} from "@/lib/calorie-estimation";
import { normalizeFitnessDistanceUnit, type FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import { resolveCanonicalExerciseId, type ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import { isMeasurementOptionalExercise } from "@/lib/exercise-metadata";
import {
  EXERCISE_CURATION_GROUPS,
  flattenExerciseCurationTagValues,
  formatExerciseTagLabel,
  normalizeExerciseCurationTags,
  buildScopedExerciseCurationTagValue,
  type ExerciseCurationTags,
} from "@/lib/exercise-curation";
import {
  deriveGoalMeasurementSelections,
  getDefaultMeasurementsForGoalModality,
  getMissingGoalPreviewLabel,
  isMissingCardioTimeOrDistance,
  isFailureGoalSelection,
  resolveGoalModality,
  validateGoalConfiguration,
  type GoalModality,
  type GoalValidationResult,
} from "@/lib/exercise-goal-validation";
import { formatGoalInlineSummaryText } from "@/lib/measurement-display";
import { getStretchHubMetaItems, isStretchHubExercise } from "@/lib/stretch-library";

type ExerciseOption = {
  id: string;
  exercise_id?: string | null;
  name: string;
  user_id: string | null;
  is_global: boolean;
  primary_muscle: string | null;
  primary_muscles?: string[] | null;
  secondary_muscles?: string[] | null;
  equipment: string | null;
  movement_pattern: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance" | "none";
  default_unit: string | null;
  calories_estimation_method: string | null;
  image_howto_path: string | null;
  how_to_short?: string | null;
  image_icon_path?: string | null;
  slug?: string | null;
  curation_tags?: ExerciseCurationTags | string | null;
} & {
  tags?: string[] | string | null;
  tag?: string[] | string | null;
  categories?: string[] | string | null;
  category?: string[] | string | null;
  muscles?: string[] | string | null;
  muscle?: string[] | string | null;
};

type ExercisePickerProps = {
  exercises: ExerciseOption[];
  name: string;
  initialSelectedId?: string;
  initialCustomExerciseDraft?: {
    name?: string;
    primaryMuscle?: string | null;
    secondaryMuscle?: string | null;
    movementPattern?: string | null;
    equipment?: string | null;
  };
  selectionSearchParam?: string;
  exerciseStats?: ExerciseStatsOption[];
  routineTargetConfig?: {
    weightUnit: "lbs" | "kg";
  };
  goalExtraContent?: ReactNode | ((context: {
    selectedExercise: ExerciseOption | undefined;
    goalState: ExerciseGoalFormState;
    goalModality: GoalModality;
    effectiveGoalModality: GoalModality;
    failureToggleInfoContent: RoutineEditorInfoPayload | null;
  }) => ReactNode);
  goalBetweenInputsAndPreviewContent?: ReactNode | ((context: {
    selectedExercise: ExerciseOption | undefined;
    goalState: ExerciseGoalFormState;
    goalModality: GoalModality;
    effectiveGoalModality: GoalModality;
    failureToggleInfoContent: RoutineEditorInfoPayload | null;
  }) => ReactNode);
  goalDockViewportMode?: "default" | "compact" | ((context: {
    selectedExercise: ExerciseOption | undefined;
    goalState: ExerciseGoalFormState;
    goalModality: GoalModality;
    effectiveGoalModality: GoalModality;
    failureToggleInfoContent: RoutineEditorInfoPayload | null;
  }) => "default" | "compact");
  goalCompanionToggleCards?: ReactNode[] | ((context: {
    selectedExercise: ExerciseOption | undefined;
    goalState: ExerciseGoalFormState;
    goalModality: GoalModality;
    effectiveGoalModality: GoalModality;
    failureToggleInfoContent: RoutineEditorInfoPayload | null;
  }) => ReactNode[]);
  goalLowerCompanionToggleCards?: ReactNode[] | ((context: {
    selectedExercise: ExerciseOption | undefined;
    goalState: ExerciseGoalFormState;
    goalModality: GoalModality;
    effectiveGoalModality: GoalModality;
    failureToggleInfoContent: RoutineEditorInfoPayload | null;
  }) => ReactNode[]);
  goalAuxiliaryFields?: MeasurementPanelAuxiliaryField[] | ((context: {
    selectedExercise: ExerciseOption | undefined;
    goalState: ExerciseGoalFormState;
    goalModality: GoalModality;
    effectiveGoalModality: GoalModality;
    failureToggleInfoContent: RoutineEditorInfoPayload | null;
  }) => MeasurementPanelAuxiliaryField[]);
  goalInlineFailureToggle?: boolean;
  footerSlot?: ReactNode;
  onSelectedExerciseChange?: (exercise: ExerciseOption | null) => void;
  onApplyLastSelection?: (selection: {
    exerciseId: string;
    progressionPlaybookId: string | null;
    progressionPlaybookConfig: Record<string, unknown> | null;
  }) => void;
  onClearLastSelection?: (selection: { exerciseId: string }) => void;
  customExerciseEnabled?: boolean;
  renderFooter?: (context: {
    selectedExercise: ExerciseOption | undefined;
    selectedCanonicalExerciseId: string | null;
    filteredExercises: ExerciseOption[];
    openExerciseInfo: () => void;
    goalValidation: { isValid: boolean; message: string };
    isCustomExerciseSelected: boolean;
    customExerciseError: string | null;
    canToggleLastSelection: boolean;
    didApplyLastSelection: boolean;
    onToggleLastSelection: () => void;
  }) => ReactNode;
};

function resolveExerciseDistanceUnit(defaultUnit: string | null | undefined, fallback: FitnessDistanceUnit = "mi") {
  return normalizeFitnessDistanceUnit(defaultUnit, fallback);
}

 type TagFilterGroup = "primary_muscle" | "secondary_muscle" | "movement" | "equipment" | "other";

type ExerciseRowProps = {
  exercise: ExerciseOption;
  isSelected: boolean;
  hasStats: boolean;
  metadataItems: string[];
  selectedSummaryText?: string;
  onOpenInfo?: () => void;
  onPress: (exerciseId: string, isSelected: boolean) => void;
};

type CustomExerciseRowProps = {
  isSelected: boolean;
  value: string;
  onValueChange: (nextValue: string) => void;
  fieldLabel: string;
  helperText?: ReactNode;
  helperTone?: "neutral" | "warning" | "accent";
  showStatusSeparator?: boolean;
  selectedTags?: string[];
  targetSummaryText?: string;
  targetSummaryTone?: "neutral" | "warning" | "accent";
  onPress: () => void;
};

type CustomExerciseFilterSectionKey = "primary" | "secondary" | "movement" | "equipment";

const tagGroupLabels: Record<TagFilterGroup, string> = {
  primary_muscle: "Primary Muscle",
  secondary_muscle: "Secondary Muscle",
  movement: "Movement",
  equipment: "Equipment",
  other: "Other",
};

const pickerRowMobileDensityClassNames = {
  body: "max-md:gap-1",
  title: "max-md:text-[0.86rem] max-md:leading-[1.15]",
  titleContainer: "max-md:space-y-0.25 max-md:pb-[1.9rem]",
  subtitle: "max-md:text-[11px] max-md:leading-[1.26]",
  content: "max-md:space-y-0.25",
  trailing: "max-md:min-w-[4.3rem]",
  selectPill: "max-md:min-h-[1.65rem] max-md:min-w-[3rem] max-md:px-1.75 max-md:text-[9px]",
} as const;

const customExerciseFilterRailCardClassName = cn(
  "inline-flex shrink-0 flex-col overflow-hidden shadow-none",
  appTokens.curatedInfoCard,
  appTokens.curatedInfoCardCompact,
  appTokens.curatedInfoCardDefault,
);

const customExerciseFilterStageClassName = cn(
  "w-full max-w-full overflow-visible shadow-none",
  appTokens.curatedInfoCard,
  appTokens.curatedInfoCardCompact,
  appTokens.curatedInfoCardDefault,
);

const thinPickerRowClassName = "appearance-none [box-shadow:none] flex w-full items-center justify-between gap-3 overflow-hidden rounded-none rounded-r-[var(--card-radius)] border-0 bg-[rgb(var(--surface-1-rgb)/0.86)] px-4 py-2.5 text-left shadow-none outline-none ring-0 transition-[filter,transform] duration-75 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.2)]";
const thinPickerRowUnselectedBorderClassName = "!border !border-[rgb(var(--accent-yellow-on)/0.72)] shadow-[inset_0_0_0_1px_rgb(var(--accent-yellow-on)/0.72)]";
export const EXERCISE_PICKER_CUSTOM_EXERCISE_ID = "__custom_exercise__";

function formatRequirementList(parts: string[]) {
  const normalized = parts
    .map((part) => part.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length === 1) {
    return normalized[0];
  }

  if (normalized.length === 2) {
    return `${normalized[0]} and ${normalized[1]}`;
  }

  return `${normalized.slice(0, -1).join(", ")}, and ${normalized[normalized.length - 1]}`;
}

function inferCustomProfileMeasurementType({
  primaryMuscle,
  secondaryMuscle,
  equipment,
  movementPattern,
  bestMatchMeasurementType,
}: {
  primaryMuscle: string | null;
  secondaryMuscle: string | null;
  equipment: string | null;
  movementPattern: string | null;
  bestMatchMeasurementType?: ExerciseOption["measurement_type"] | null;
}): ExerciseOption["measurement_type"] {
  const muscleProfile = [primaryMuscle, secondaryMuscle]
    .map((value) => normalizeTagValue(value))
    .filter(Boolean);
  const equipmentValue = normalizeTagValue(equipment);
  const movementValue = normalizeTagValue(movementPattern);
  const isRecoveryMobility = muscleProfile.some((value) => value.includes("recovery") || value.includes("flexibility"))
    || movementValue.includes("mobility")
    || movementValue.includes("stretch");
  const isCardioLike = muscleProfile.some((value) => value.includes("cardio"))
    || movementValue.includes("gait")
    || movementValue.includes("run")
    || movementValue.includes("ride")
    || movementValue.includes("row")
    || equipmentValue.includes("treadmill")
    || equipmentValue.includes("bike")
    || equipmentValue.includes("rower")
    || equipmentValue.includes("erg")
    || equipmentValue.includes("elliptical")
    || equipmentValue.includes("stair")
    || equipmentValue.includes("ski");

  if (movementValue.includes("carry")) {
    return "distance";
  }

  if (isRecoveryMobility || isCardioLike) {
    return "time";
  }

  return bestMatchMeasurementType ?? "reps";
}

function formatCustomTargetRequirementLabel(args: {
  measurementType: ExerciseOption["measurement_type"];
  requiredFields: GoalValidationResult["requiredFields"];
  fallbackLabel: string;
}) {
  const requiredFieldSet = new Set(args.requiredFields);

  if (requiredFieldSet.has("duration") && requiredFieldSet.has("distance")) {
    return "time or distance";
  }

  if (requiredFieldSet.has("duration")) {
    return "time";
  }

  if (requiredFieldSet.has("distance")) {
    return "distance";
  }

  if (requiredFieldSet.has("repsMin")) {
    return "reps";
  }

  if (requiredFieldSet.has("weight")) {
    return "weight";
  }

  if (requiredFieldSet.has("calories")) {
    return "calories";
  }

  if (requiredFieldSet.has("sets") && args.requiredFields.length === 1) {
    return "sets";
  }

  if (args.measurementType === "time_distance") {
    return "time or distance";
  }

  if (args.measurementType === "time") {
    return "time";
  }

  if (args.measurementType === "distance") {
    return "distance";
  }

  return args.fallbackLabel;
}

function ensureSelectedTagsInGroups(groups: ExerciseTagGroup[], selectedTags: string[]) {
  if (selectedTags.length === 0) {
    return groups;
  }

  return groups.map((group) => {
    const existingTagValues = new Set(group.tags.map((tag) => tag.value));
    const missingSelectedTags = selectedTags
      .filter((value) => !existingTagValues.has(value))
      .map((value) => ({
        value,
        label: formatTagLabel(value.replace(/^[^:]+:/, "")),
      }));

    if (missingSelectedTags.length === 0) {
      return group;
    }

    return {
      ...group,
      tags: [...missingSelectedTags, ...group.tags],
    };
  });
}

function buildCustomExerciseTargetSummary(args: {
  customExerciseName: string;
  duplicateCustomExercise: boolean;
  goalValidation: GoalValidationResult;
  goalPreviewMissingLabel: string | null;
  selectedCardGoalPreviewTextResolved: string;
  customMeasurementType: ExerciseOption["measurement_type"];
  selectedCustomPrimaryMuscle: string;
  selectedCustomSecondaryMuscle: string;
  selectedCustomMovementPattern: string;
  selectedCustomEquipment: string;
}) {
  if (!args.customExerciseName.trim()) {
    return {
      helperText: null,
      helperTone: "warning" as const,
      showStatusSeparator: false,
      targetSummaryText: "Add exercise name",
      targetSummaryTone: "warning" as const,
    };
  }

  if (args.duplicateCustomExercise) {
    return {
      helperText: "Choose a different name before saving this custom exercise.",
      helperTone: "warning" as const,
      showStatusSeparator: false,
      targetSummaryText: "Rename draft",
      targetSummaryTone: "warning" as const,
    };
  }

  if (!args.goalValidation.isValid) {
    const normalizedRequiredFields = args.goalValidation.requiredFields.map((field) => getMissingGoalPreviewLabel(field));
    const baseRequirementLabel = formatRequirementList(normalizedRequiredFields) ?? args.goalPreviewMissingLabel ?? "setup";
    const requirementLabel = formatCustomTargetRequirementLabel({
      measurementType: inferCustomProfileMeasurementType({
        primaryMuscle: args.selectedCustomPrimaryMuscle,
        secondaryMuscle: args.selectedCustomSecondaryMuscle,
        movementPattern: args.selectedCustomMovementPattern,
        equipment: args.selectedCustomEquipment,
        bestMatchMeasurementType: args.customMeasurementType,
      }),
      requiredFields: args.goalValidation.requiredFields,
      fallbackLabel: baseRequirementLabel,
    });

    return {
      helperText: null,
      helperTone: "neutral" as const,
      showStatusSeparator: false,
      targetSummaryText: `Needs ${requirementLabel}`,
      targetSummaryTone: "warning" as const,
    };
  }

  return {
    helperText: null,
    helperTone: "neutral" as const,
    showStatusSeparator: false,
    targetSummaryText: args.selectedCardGoalPreviewTextResolved,
    targetSummaryTone: "accent" as const,
  };
}

function normalizeTagValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function toTagArray(value: string[] | string | null | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }

  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function normalizeExerciseTags(exercise: ExerciseOption) {
  const candidates = [
    ...toTagArray(exercise.tags),
    ...toTagArray(exercise.tag),
    ...toTagArray(exercise.categories),
    ...toTagArray(exercise.category),
    ...toTagArray(exercise.muscles),
    ...toTagArray(exercise.muscle),
    ...toTagArray(exercise.primary_muscle),
    ...toTagArray(exercise.primary_muscles),
    ...toTagArray(exercise.secondary_muscles),
    ...toTagArray(exercise.movement_pattern),
    ...toTagArray(exercise.equipment),
    ...flattenExerciseCurationTagValues(normalizeExerciseCurationTags(exercise.curation_tags)),
  ];

  const deduped = new Map<string, string>();
  for (const rawTag of candidates) {
    const normalized = rawTag.toLowerCase();
    if (!deduped.has(normalized)) {
      deduped.set(normalized, rawTag);
    }
  }

  return deduped;
}

function appendTagsWithGroup(
  groupedTags: Map<string, string>,
  rawValues: string[] | string | null | undefined,
) {
  for (const value of toTagArray(rawValues)) {
    const normalized = value.toLowerCase();
    if (!groupedTags.has(normalized)) {
      groupedTags.set(normalized, value);
    }
  }
}

function buildScopedFilterTagValue(group: TagFilterGroup, value: string) {
  return `${group}:${normalizeTagValue(value)}`;
}

function appendScopedFilterTags(
  target: Set<string>,
  rawValues: string[] | string | null | undefined,
  group: TagFilterGroup,
) {
  for (const value of toTagArray(rawValues)) {
    target.add(buildScopedFilterTagValue(group, value));
  }
}

function formatTagLabel(tag: string) {
  return tag
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeExerciseNameKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function buildSingleSelectTags(nextTags: string[], previousTags: string[]) {
  if (nextTags.length === 0) {
    return [];
  }

  const newlyAdded = nextTags.find((tag) => !previousTags.includes(tag));
  return [newlyAdded ?? nextTags[0]];
}

function buildCustomExerciseTagGroups(exercises: ExerciseOption[]) {
  const muscles = Array.from(new Set(
    exercises
      .flatMap((exercise) => [
        ...toTagArray(exercise.primary_muscle),
        ...toTagArray(exercise.primary_muscles),
        ...toTagArray(exercise.secondary_muscles),
      ])
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  )).sort((left, right) => left.localeCompare(right));

  const movements = Array.from(new Set(
    exercises
      .map((exercise) => exercise.movement_pattern?.trim().toLowerCase() ?? "")
      .filter(Boolean),
  )).sort((left, right) => left.localeCompare(right));

  const equipment = Array.from(new Set(
    exercises
      .map((exercise) => exercise.equipment?.trim().toLowerCase() ?? "")
      .filter(Boolean),
  )).sort((left, right) => left.localeCompare(right));

  return {
    muscleGroups: [{
      key: "primary_muscle",
      label: "Primary Muscle",
      tags: muscles.map((value) => ({ value: `muscle:${value}`, label: formatTagLabel(value) })),
    }] satisfies ExerciseTagGroup[],
    secondaryMuscleGroups: [{
      key: "secondary_muscle",
      label: "Secondary Muscle",
      tags: muscles.map((value) => ({ value: `muscle:${value}`, label: formatTagLabel(value) })),
    }] satisfies ExerciseTagGroup[],
    movementGroups: [{
      key: "movement_pattern",
      label: "Movement",
      tags: movements.map((value) => ({ value: `movement:${value}`, label: formatTagLabel(value) })),
    }] satisfies ExerciseTagGroup[],
    equipmentGroups: [{
      key: "equipment",
      label: "Equipment",
      tags: equipment.map((value) => ({ value: `equipment:${value}`, label: formatTagLabel(value) })),
    }] satisfies ExerciseTagGroup[],
  };
}

function scoreCustomExerciseMatch(
  exercise: ExerciseOption,
  {
    primaryMuscle,
    secondaryMuscle,
    movementPattern,
    equipment,
  }: {
    primaryMuscle: string | null;
    secondaryMuscle: string | null;
    movementPattern: string | null;
    equipment: string | null;
  },
) {
  let score = 0;

  if (primaryMuscle && normalizeTagValue(exercise.primary_muscle) === primaryMuscle) {
    score += 3;
  }

  if (
    secondaryMuscle
    && [
      ...toTagArray(exercise.primary_muscle),
      ...toTagArray(exercise.primary_muscles),
      ...toTagArray(exercise.secondary_muscles),
    ].some((value) => normalizeTagValue(value) === secondaryMuscle)
  ) {
    score += 2;
  }

  if (movementPattern && normalizeTagValue(exercise.movement_pattern) === movementPattern) {
    score += 4;
  }

  if (equipment && normalizeTagValue(exercise.equipment) === equipment) {
    score += 5;
  }

  return score;
}

function inferDominantMeasurementTypeFromLibrary(
  exercises: ExerciseOption[],
  {
    primaryMuscle,
    secondaryMuscle,
    movementPattern,
    equipment,
  }: {
    primaryMuscle: string | null;
    secondaryMuscle: string | null;
    movementPattern: string | null;
    equipment: string | null;
  },
): ExerciseOption["measurement_type"] | null {
  const weightedScores = new Map<ExerciseOption["measurement_type"], number>();

  for (const exercise of exercises) {
    const score = scoreCustomExerciseMatch(exercise, {
      primaryMuscle,
      secondaryMuscle,
      movementPattern,
      equipment,
    });

    if (score <= 0) {
      continue;
    }

    const nextMeasurementType = exercise.measurement_type === "none" ? "reps" : exercise.measurement_type;
    weightedScores.set(nextMeasurementType, (weightedScores.get(nextMeasurementType) ?? 0) + score);
  }

  const ranked = Array.from(weightedScores.entries()).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    const priority: Record<ExerciseOption["measurement_type"], number> = {
      reps: 4,
      time: 3,
      distance: 2,
      time_distance: 1,
      none: 0,
    };
    return priority[right[0]] - priority[left[0]];
  });

  return ranked[0]?.[0] ?? null;
}

function buildCustomExerciseDraftOption(
  exercises: ExerciseOption[],
  {
    name,
    primaryMuscle,
    secondaryMuscle,
    movementPattern,
    equipment,
  }: {
    name: string;
    primaryMuscle: string | null;
    secondaryMuscle: string | null;
    movementPattern: string | null;
    equipment: string | null;
  },
): ExerciseOption {
  const bestMatch = exercises
    .map((exercise) => ({
      exercise,
      score: scoreCustomExerciseMatch(exercise, { primaryMuscle, secondaryMuscle, movementPattern, equipment }),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const leftSpecificity = left.exercise.measurement_type === "time_distance" ? 2 : left.exercise.measurement_type === "time" || left.exercise.measurement_type === "distance" ? 1 : 0;
      const rightSpecificity = right.exercise.measurement_type === "time_distance" ? 2 : right.exercise.measurement_type === "time" || right.exercise.measurement_type === "distance" ? 1 : 0;
      return rightSpecificity - leftSpecificity;
    })[0]?.exercise;
  const dominantLibraryMeasurementType = inferDominantMeasurementTypeFromLibrary(exercises, {
    primaryMuscle,
    secondaryMuscle,
    movementPattern,
    equipment,
  });

  const measurementType = inferCustomProfileMeasurementType({
    primaryMuscle,
    secondaryMuscle,
    equipment,
    movementPattern,
    bestMatchMeasurementType: dominantLibraryMeasurementType ?? bestMatch?.measurement_type,
  });
  const defaultUnit = bestMatch?.default_unit ?? (measurementType === "distance" || measurementType === "time_distance" ? "mi" : null);
  const caloriesEstimationMethod = bestMatch?.calories_estimation_method
    ?? inferCaloriesEstimationMethodFromExercise({
      name,
      equipment,
      movementPattern,
      measurementType,
      defaultUnit,
      caloriesEstimationMethod: null,
    });

  return {
    id: EXERCISE_PICKER_CUSTOM_EXERCISE_ID,
    name: name.trim().replace(/\s+/g, " ") || "Custom Exercise",
    user_id: null,
    is_global: false,
    primary_muscle: primaryMuscle,
    primary_muscles: primaryMuscle ? [primaryMuscle] : null,
    secondary_muscles: secondaryMuscle ? [secondaryMuscle] : null,
    equipment,
    movement_pattern: movementPattern,
    measurement_type: measurementType,
    default_unit: defaultUnit,
    calories_estimation_method: caloriesEstimationMethod,
    image_howto_path: null,
    tags: [primaryMuscle, secondaryMuscle, movementPattern, equipment].filter((value): value is string => Boolean(value)),
    categories: [],
    curation_tags: null,
  };
}

function ExerciseMetaLine({
  items,
  emphasizeLead = false,
  className,
  leadClassName,
}: {
  items: string[];
  emphasizeLead?: boolean;
  className?: string;
  leadClassName?: string;
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <SignatureInlineList
      separator="pipe"
      className={cn(
        "min-w-0 max-w-full gap-x-2 gap-y-1.5 text-[11px] font-medium leading-[1.15] text-[rgb(var(--text-secondary)/0.9)]",
        className,
      )}
      itemClassName="min-w-0 whitespace-nowrap leading-none"
      items={items.map((item, index) => (
        <span
          key={`${item}-${index}`}
          className={cn(
            "inline-flex min-w-0 items-center align-middle",
            emphasizeLead && index === 0 ? leadClassName ?? "text-[rgb(var(--accent-strong)/0.98)]" : undefined,
          )}
        >
          {item}
        </span>
      ))}
    />
  );
}

function ExerciseTitleInline({
  name,
  metadataItems,
  nameClassName,
  metadataClassName,
  emphasizeLeadMetadata = false,
  metadataLeadClassName,
  showUnderline = false,
  underlineClassName,
}: {
  name: string;
  metadataItems: string[];
  nameClassName?: string;
  metadataClassName?: string;
  emphasizeLeadMetadata?: boolean;
  metadataLeadClassName?: string;
  showUnderline?: boolean;
  underlineClassName?: string;
}) {
  return (
    <span className="inline-flex min-w-0 max-w-full flex-col items-start gap-y-1 align-middle">
      <span className="inline-flex min-w-0 w-fit max-w-full flex-col items-start gap-y-[3px]">
        <span className={cn("min-w-0 max-w-full whitespace-normal break-words leading-[1.18]", nameClassName)}>
          {name}
        </span>
        {showUnderline ? <MetricAccentBar variant="thin" className={cn("w-full opacity-80", underlineClassName)} /> : null}
      </span>
      <ExerciseMetaLine
        items={metadataItems}
        emphasizeLead={emphasizeLeadMetadata}
        className={metadataClassName}
        leadClassName={metadataLeadClassName}
      />
    </span>
  );
}

function ExerciseTitleWithCompanion({
  name,
  metadataItems,
  companion,
  nameClassName,
  metadataClassName,
  emphasizeLeadMetadata = false,
  metadataLeadClassName,
  showTitleUnderline = false,
  titleUnderlineClassName,
}: {
  name: string;
  metadataItems: string[];
  companion?: ReactNode;
  nameClassName?: string;
  metadataClassName?: string;
  emphasizeLeadMetadata?: boolean;
  metadataLeadClassName?: string;
  showTitleUnderline?: boolean;
  titleUnderlineClassName?: string;
}) {
  return (
    <span className="inline-flex min-w-0 max-w-full items-start gap-2.5 align-top">
      <span className="inline-flex min-w-0 max-w-[10.9rem] flex-1 basis-0 flex-col">
        <ExerciseTitleInline
          name={name}
          metadataItems={metadataItems}
          nameClassName={nameClassName}
          metadataClassName={metadataClassName}
          emphasizeLeadMetadata={emphasizeLeadMetadata}
          metadataLeadClassName={metadataLeadClassName}
          showUnderline={showTitleUnderline}
          underlineClassName={titleUnderlineClassName}
        />
      </span>
      {companion ? (
        <span className="inline-flex min-w-0 shrink-0 items-start gap-1.5 pt-[1px]">
          <SignatureMiniPipe className="mt-[1px] h-auto self-stretch" barClassName="h-full" />
          <span className="inline-flex max-w-[6.9rem] min-w-0 flex-col items-start gap-y-1 text-left">
            {companion}
          </span>
        </span>
      ) : null}
    </span>
  );
}

function formatMeasurementStat(weight: number | null, reps: number | null, unit: string | null) {
  if (weight === null || reps === null) {
    return null;
  }

  const weightLabel = Number.isInteger(weight) ? String(weight) : weight.toFixed(1).replace(/\.0$/, "");
  return `${weightLabel}${unit ? ` ${unit}` : ""} × ${reps}`;
}

function formatStatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

void formatMeasurementStat;

function formatLoggedMeasurementStat(weight: number | null, reps: number | null, unit: string | null) {
  const hasWeight = typeof weight === "number" && Number.isFinite(weight) && weight > 0;
  const hasReps = typeof reps === "number" && Number.isFinite(reps) && reps > 0;

  if (!hasWeight && !hasReps) {
    return null;
  }

  const weightLabel = hasWeight
    ? `${Number.isInteger(weight) ? String(weight) : weight.toFixed(1).replace(/\.0$/, "")}${unit ? ` ${unit}` : ""}`
    : null;

  if (weightLabel && hasReps) {
    return `${weightLabel} x ${reps}`;
  }

  if (weightLabel) {
    return weightLabel;
  }

  return `${reps} reps`;
}

function formatCompactMetricNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

function formatConfiguredDurationSummary(durationSeconds: number | null) {
  if (typeof durationSeconds !== "number" || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return null;
  }

  if (durationSeconds < 60) {
    return `${durationSeconds} sec`;
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  if (seconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes}m ${seconds}s`;
}

function hasConfiguredSetupSnapshot(stats: ExerciseStatsOption | undefined) {
  if (!stats) return false;
  return Boolean(
    stats.lastConfiguredTargetSets != null
    || stats.lastConfiguredTargetRepsMin != null
    || stats.lastConfiguredTargetRepsMax != null
    || stats.lastConfiguredTargetWeight != null
    || stats.lastConfiguredTargetDurationSeconds != null
    || stats.lastConfiguredTargetDistance != null
    || stats.lastConfiguredTargetCalories != null
    || stats.lastConfiguredAt
    || stats.lastProgressionPlaybookId
    || stats.lastProgressionPlaybookConfig,
  );
}

function buildUseLastInfoPayload(args: {
  stats: ExerciseStatsOption;
  lastSummaryText: string;
  didApplyLast: boolean;
}): RoutineEditorInfoPayload {
  const usesCompletedHistory = Boolean(
    formatLoggedMeasurementStat(args.stats.lastWeight, args.stats.lastReps, args.stats.lastUnit),
  );
  const progressionMode = args.stats.lastProgressionPlaybookId ? "Progression saved" : "No progression saved";

  return {
    title: args.didApplyLast ? "Clear Last Setup" : "Use Last Setup",
    summary: args.didApplyLast
      ? "Clear removes the copied last setup and returns the exercise to a fresh starting draft."
      : "Use copies the most recent target setup for this exercise into the current add flow.",
    rows: [
      { label: "Current action", value: args.didApplyLast ? "Clear copied setup" : "Apply last setup" },
      { label: "Source", value: usesCompletedHistory ? "Latest completed history" : "Latest saved routine setup" },
      { label: "Snapshot", value: args.lastSummaryText },
      { label: "Progression", value: progressionMode },
    ],
    sectionKey: null,
  };
}

function buildConfiguredMeasurementSummaryParts(stats: ExerciseStatsOption | undefined) {
  if (!stats) {
    return [];
  }

  const hasFailureTarget = stats.lastConfiguredTargetRepsMin === 0 && stats.lastConfiguredTargetRepsMax === 0;
  const weightValue = stats.lastConfiguredTargetWeight;
  const weightLabel = typeof weightValue === "number" && Number.isFinite(weightValue) && weightValue >= 0
    ? `${formatCompactMetricNumber(weightValue)}${stats.lastConfiguredTargetWeightUnit ? ` ${stats.lastConfiguredTargetWeightUnit}` : ""}`
    : null;

  const repsMin = stats.lastConfiguredTargetRepsMin;
  const repsMax = stats.lastConfiguredTargetRepsMax;
  const repCountLabel = !hasFailureTarget && typeof repsMin === "number" && Number.isFinite(repsMin) && repsMin > 0
    ? (
      typeof repsMax === "number" && Number.isFinite(repsMax) && repsMax > 0 && repsMax !== repsMin
        ? `${repsMin}-${repsMax}`
        : `${repsMin}`
    )
    : null;

  const parts: string[] = [];
  if (weightLabel) {
    parts.push(weightLabel);
  }

  if (repCountLabel) {
    parts.push(`${repCountLabel} reps`);
  } else if (hasFailureTarget) {
    parts.push("till failure");
  }

  const durationLabel = formatConfiguredDurationSummary(stats.lastConfiguredTargetDurationSeconds);
  if (durationLabel) {
    parts.push(durationLabel);
  }

  if (typeof stats.lastConfiguredTargetDistance === "number" && Number.isFinite(stats.lastConfiguredTargetDistance) && stats.lastConfiguredTargetDistance > 0) {
    parts.push(
      `${formatCompactMetricNumber(stats.lastConfiguredTargetDistance)}${stats.lastConfiguredTargetDistanceUnit ? ` ${stats.lastConfiguredTargetDistanceUnit}` : ""}`,
    );
  }

  if (typeof stats.lastConfiguredTargetCalories === "number" && Number.isFinite(stats.lastConfiguredTargetCalories) && stats.lastConfiguredTargetCalories > 0) {
    parts.push(`${formatCompactMetricNumber(stats.lastConfiguredTargetCalories)} cal`);
  }

  return parts.length > 0 ? parts.join(" • ") : null;
}

function getConfiguredMeasurementSummaryParts(stats: ExerciseStatsOption | undefined) {
  const summary = formatConfiguredMeasurementStat(stats);
  return summary
    ? summary
      .split(" â€¢ ")
      .map((part) => part.trim())
      .filter(Boolean)
    : [];
}

function collectConfiguredMeasurementSummaryParts(stats: ExerciseStatsOption | undefined) {
  if (!stats) {
    return [] as string[];
  }

  const hasFailureTarget = stats.lastConfiguredTargetRepsMin === 0 && stats.lastConfiguredTargetRepsMax === 0;
  const weightValue = stats.lastConfiguredTargetWeight;
  const weightLabel = typeof weightValue === "number" && Number.isFinite(weightValue) && weightValue >= 0
    ? `${formatCompactMetricNumber(weightValue)}${stats.lastConfiguredTargetWeightUnit ? ` ${stats.lastConfiguredTargetWeightUnit}` : ""}`
    : null;

  const repsMin = stats.lastConfiguredTargetRepsMin;
  const repsMax = stats.lastConfiguredTargetRepsMax;
  const repCountLabel = !hasFailureTarget && typeof repsMin === "number" && Number.isFinite(repsMin) && repsMin > 0
    ? (
      typeof repsMax === "number" && Number.isFinite(repsMax) && repsMax > 0 && repsMax !== repsMin
        ? `${repsMin}-${repsMax}`
        : `${repsMin}`
    )
    : null;

  const parts: string[] = [];
  if (weightLabel) {
    parts.push(weightLabel);
  }

  if (repCountLabel) {
    parts.push(`${repCountLabel} reps`);
  } else if (hasFailureTarget) {
    parts.push("till failure");
  }

  const durationLabel = formatConfiguredDurationSummary(stats.lastConfiguredTargetDurationSeconds);
  if (durationLabel) {
    parts.push(durationLabel);
  }

  if (typeof stats.lastConfiguredTargetDistance === "number" && Number.isFinite(stats.lastConfiguredTargetDistance) && stats.lastConfiguredTargetDistance > 0) {
    parts.push(
      `${formatCompactMetricNumber(stats.lastConfiguredTargetDistance)}${stats.lastConfiguredTargetDistanceUnit ? ` ${stats.lastConfiguredTargetDistanceUnit}` : ""}`,
    );
  }

  if (typeof stats.lastConfiguredTargetCalories === "number" && Number.isFinite(stats.lastConfiguredTargetCalories) && stats.lastConfiguredTargetCalories > 0) {
    parts.push(`${formatCompactMetricNumber(stats.lastConfiguredTargetCalories)} cal`);
  }

  return parts;
}

function formatConfiguredMeasurementStat(stats: ExerciseStatsOption | undefined) {
  const parts = collectConfiguredMeasurementSummaryParts(stats);
  return parts.length > 0 ? parts.join(" • ") : null;
}

function hasExerciseStatsSignal(stats: ExerciseStatsOption | undefined) {
  if (!stats) return false;
  return Boolean(
    stats.lastWeight != null
    || stats.lastReps != null
    || stats.lastPerformedAt
    || hasConfiguredSetupSnapshot(stats)
    || stats.prWeight != null
    || stats.prReps != null
    || stats.prEst1rm != null
    || stats.actualPrWeight != null
    || stats.actualPrReps != null
    || stats.actualPrAt,
  );
}

function applyConfiguredSetupToGoalState({
  current,
  stats,
  fallbackWeightUnit,
  fallbackDistanceUnit,
  modality,
}: {
  current: ExerciseGoalFormState;
  stats: ExerciseStatsOption;
  fallbackWeightUnit: "lbs" | "kg";
  fallbackDistanceUnit: FitnessDistanceUnit;
  modality: GoalModality;
}) {
  const hasFailureTarget = stats.lastConfiguredTargetRepsMin === 0 && stats.lastConfiguredTargetRepsMax === 0;
  const repsMin = !hasFailureTarget && typeof stats.lastConfiguredTargetRepsMin === "number" && stats.lastConfiguredTargetRepsMin > 0
    ? String(stats.lastConfiguredTargetRepsMin)
    : "";
  const repsMax = !hasFailureTarget
    ? (
      typeof stats.lastConfiguredTargetRepsMax === "number" && stats.lastConfiguredTargetRepsMax > 0
        ? String(stats.lastConfiguredTargetRepsMax)
        : repsMin
    )
    : "";
  const weight = typeof stats.lastConfiguredTargetWeight === "number" && Number.isFinite(stats.lastConfiguredTargetWeight)
    ? String(stats.lastConfiguredTargetWeight)
    : "";
  const duration = typeof stats.lastConfiguredTargetDurationSeconds === "number" && Number.isFinite(stats.lastConfiguredTargetDurationSeconds)
    ? String(stats.lastConfiguredTargetDurationSeconds)
    : "";
  const distance = typeof stats.lastConfiguredTargetDistance === "number" && Number.isFinite(stats.lastConfiguredTargetDistance)
    ? String(stats.lastConfiguredTargetDistance)
    : "";
  const calories = typeof stats.lastConfiguredTargetCalories === "number" && Number.isFinite(stats.lastConfiguredTargetCalories)
    ? String(stats.lastConfiguredTargetCalories)
    : "";

  return {
    ...current,
    sets: typeof stats.lastConfiguredTargetSets === "number" && Number.isFinite(stats.lastConfiguredTargetSets) && stats.lastConfiguredTargetSets > 0
      ? String(stats.lastConfiguredTargetSets)
      : current.sets,
    repsMin,
    repsMax,
    failure: hasFailureTarget,
    weight,
    duration,
    distance,
    calories,
    weightUnit: stats.lastConfiguredTargetWeightUnit === "kg" || stats.lastConfiguredTargetWeightUnit === "lbs"
      ? stats.lastConfiguredTargetWeightUnit
      : fallbackWeightUnit,
    distanceUnit: normalizeFitnessDistanceUnit(stats.lastConfiguredTargetDistanceUnit, fallbackDistanceUnit),
    measurements: deriveGoalMeasurementSelections(modality, {
      repsMin,
      repsMax,
      failure: hasFailureTarget,
      weight,
      duration,
      distance,
      calories,
    }),
  } satisfies ExerciseGoalFormState;
}

function buildFreshGoalStateForExercise(args: {
  exercise: ExerciseOption | null | undefined;
  fallbackWeightUnit: "lbs" | "kg";
  customGoalModality?: GoalModality | null;
}) {
  const exercise = args.exercise;
  const isStretch = !exercise ? false : isStretchHubExercise(exercise);
  const isOptional = !exercise ? false : isMeasurementOptionalExercise(exercise);
  const modality = exercise
    ? (
      args.customGoalModality
      ?? resolveGoalModality({
        measurementType: exercise.measurement_type,
        equipment: exercise.equipment,
        name: exercise.name,
        tags: new Set(normalizeExerciseTags(exercise).keys()),
      })
    )
    : "strength";

  return {
    sets: isStretch ? "1" : "3",
    repsMin: "",
    repsMax: "",
    failure: false,
    weight: "",
    duration: "",
    distance: "",
    calories: "",
    weightUnit: args.fallbackWeightUnit,
    distanceUnit: resolveExerciseDistanceUnit(exercise?.default_unit),
    measurements: isOptional ? [] : getDefaultMeasurementsForGoalModality(modality),
  } satisfies ExerciseGoalFormState;
}

function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function hasAnyGoalMeasurementValue(state: ExerciseGoalFormState) {
  return [
    state.repsMin,
    state.repsMax,
    state.weight,
    state.duration,
    state.distance,
    state.calories,
  ].some((value) => value.trim().length > 0);
}

type ExerciseRowCueClasses = {
  leadTextClassName: string;
  unselectedRailClassName: string;
  selectedMediaClassName: string;
  selectedSummaryLabelClassName: string;
  dockAccentBarClassName: string;
  dockShellClassName: string;
};

function resolveExerciseRowCueClasses(exercise: ExerciseOption): ExerciseRowCueClasses {
  const equipment = normalizeTagValue(exercise.equipment);
  const movementPattern = normalizeTagValue(exercise.movement_pattern);
  const isCardioLike = exercise.measurement_type === "time"
    || exercise.measurement_type === "distance"
    || exercise.measurement_type === "time_distance"
    || equipment.includes("bike")
    || equipment.includes("treadmill")
    || equipment.includes("rower")
    || movementPattern.includes("gait");
  const isBodyweightLike = equipment.includes("bodyweight")
    || equipment.includes("pull up")
    || equipment.includes("pull-up")
    || movementPattern.includes("brace")
    || movementPattern.includes("mobility")
    || exercise.measurement_type === "none";

  if (isCardioLike) {
    return {
      leadTextClassName: "text-[rgb(var(--accent-strong)/0.98)]",
      unselectedRailClassName: "bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.98),rgb(var(--accent-yellow-on)/0.82))]",
      selectedMediaClassName: "bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.18),rgb(var(--selection-rgb)/0.08))]",
      selectedSummaryLabelClassName: "text-[rgb(var(--accent-strong)/0.96)]",
      dockAccentBarClassName: "bg-[linear-gradient(90deg,rgb(var(--accent-yellow-on)/0.2),rgb(var(--accent-yellow-on)/1),rgb(var(--accent)/0.28))] shadow-[0_0_14px_rgb(var(--accent-yellow-on)/0.22)]",
      dockShellClassName: "shadow-[0_-10px_24px_rgb(var(--accent-yellow-on)/0.08)]",
    };
  }

  if (isBodyweightLike) {
    return {
      leadTextClassName: "text-[rgb(var(--accent-strong)/0.98)]",
      unselectedRailClassName: "bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.98),rgb(var(--accent-yellow-on)/0.82))]",
      selectedMediaClassName: "bg-[linear-gradient(180deg,rgb(var(--accent-divider-rgb)/0.16),rgb(var(--selection-rgb)/0.08))]",
      selectedSummaryLabelClassName: "text-[rgb(var(--accent-strong)/0.96)]",
      dockAccentBarClassName: "bg-[linear-gradient(90deg,rgb(var(--accent-divider-rgb)/0.16),rgb(var(--accent-divider-rgb)/1),rgb(var(--accent)/0.24))] shadow-[0_0_14px_rgb(var(--accent-divider-rgb)/0.2)]",
      dockShellClassName: "shadow-[0_-10px_24px_rgb(var(--accent-divider-rgb)/0.08)]",
    };
  }

  return {
    leadTextClassName: "text-[rgb(var(--accent-strong)/0.98)]",
    unselectedRailClassName: "bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.98),rgb(var(--accent-yellow-on)/0.82))]",
    selectedMediaClassName: "bg-[linear-gradient(180deg,rgb(var(--accent)/0.18),rgb(var(--selection-rgb)/0.08))]",
    selectedSummaryLabelClassName: "text-[rgb(var(--accent-strong)/0.96)]",
    dockAccentBarClassName: "bg-[linear-gradient(90deg,rgb(var(--accent)/0.18),rgb(var(--accent)/1),rgb(var(--accent-divider-rgb)/0.24))] shadow-[0_0_14px_rgb(var(--accent)/0.22)]",
    dockShellClassName: "shadow-[0_-10px_24px_rgb(var(--accent)/0.08)]",
  };
}

const ExerciseRow = memo(function ExerciseRow({ exercise, isSelected, hasStats, metadataItems, selectedSummaryText, onOpenInfo, onPress }: ExerciseRowProps) {
  const rowCue = resolveExerciseRowCueClasses(exercise);

  if (!isSelected) {
    return (
      <li>
        <button
          type="button"
          className={cn(
            thinPickerRowClassName,
            thinPickerRowUnselectedBorderClassName,
            "group relative min-h-[4.15rem] rounded-r-[calc(var(--card-radius)+2px)] pl-3 pr-3.5",
            hasStats ? "bg-[rgb(var(--accent-yellow-on)/0.08)]" : "bg-[rgb(var(--surface-1-rgb)/0.84)]",
            "hover:border-[rgb(var(--accent-yellow-on)/0.9)] hover:bg-[rgb(var(--surface-2-rgb)/0.92)] focus-visible:border-[rgb(var(--accent)/0.64)] focus-visible:bg-[rgb(var(--surface-2-rgb)/0.96)]",
          )}
          onClick={() => onPress(exercise.id, isSelected)}
        >
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute bottom-px left-px top-px w-[4px] rounded-r-full transition-colors",
              rowCue.unselectedRailClassName,
            )}
          />
          <div className="min-w-0 flex-1 pl-2">
            <div className="text-left">
              <ExerciseTitleInline
                name={exercise.name}
                metadataItems={metadataItems}
                nameClassName="text-[0.96rem] font-semibold text-[rgb(var(--text)/0.96)]"
                metadataClassName="text-[10.5px] tracking-[0.01em] text-[rgb(var(--text-secondary)/0.86)]"
                emphasizeLeadMetadata
                metadataLeadClassName={rowCue.leadTextClassName}
              />
            </div>
          </div>
          <span
            aria-hidden="true"
            className={cn(
              "flex min-w-[4.7rem] shrink-0 items-center justify-end whitespace-nowrap text-[0.74rem] font-semibold uppercase tracking-[0.14em] leading-none tabular-nums",
              hasStats ? "text-[rgb(var(--accent-strong)/0.96)]" : "text-[rgb(var(--text-muted)/0.92)]",
            )}
          >
            Select
          </span>
        </button>
      </li>
    );
  }

  const rowState = isSelected ? "selected" : "default";
  const visibleMetadataItems = isSelected ? metadataItems.slice(0, 2) : metadataItems;
  const rightRailClassName = isSelected
    ? "border-l-0 bg-transparent"
    : hasStats
      ? "border-l-[rgb(var(--accent-yellow-on)/0.32)] bg-[rgb(var(--accent-yellow-on)/0.08)]"
      : "border-l-[rgb(var(--accent-yellow-on)/0.32)] bg-[rgb(var(--surface-1-rgb)/0.28)]";
  const selectedInfoButton = isSelected && onOpenInfo ? (
    <button
      type="button"
      aria-label={`Open exercise info for ${exercise.name}`}
      onClick={(event) => {
        event.stopPropagation();
        onOpenInfo();
      }}
      className="pointer-events-auto absolute bottom-[0.3rem] right-[0.3rem] z-[3] inline-flex h-[1.625rem] w-[1.625rem] items-center justify-center rounded-full border border-[rgb(var(--accent-divider-rgb)/0.22)] bg-[rgb(var(--bg-app)/0.84)] text-[0.9rem] font-semibold text-[rgb(var(--accent-strong)/0.96)] shadow-[0_0_10px_rgb(var(--accent)/0.1)] backdrop-blur-[16px] transition-colors hover:border-[rgb(var(--accent)/0.42)] hover:text-[rgb(var(--accent)/0.98)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.2)]"
    >
      <span aria-hidden="true">i</span>
    </button>
  ) : null;
  const selectedOverlayActions = isSelected
    ? (
      <>
        {selectedInfoButton}
      </>
    )
    : undefined;

  return (
    <li>
      <ExerciseCard
          title={(
            <ExerciseTitleWithCompanion
              name={exercise.name}
              metadataItems={visibleMetadataItems}
              companion={isSelected && selectedSummaryText ? (
                <>
                  <span className="inline-flex min-w-0 w-fit max-w-full flex-col items-start gap-y-[3px]">
                    <span className="min-w-0 max-w-full whitespace-nowrap text-[0.9rem] font-semibold leading-[1.18] text-[rgb(var(--text)/0.92)]">
                      Current Target
                    </span>
                    <MetricAccentBar variant="thin" className="w-full opacity-75" />
                  </span>
                  <span className="min-w-0 whitespace-nowrap text-[10.25px] tracking-[0.01em] leading-[1.18] text-[rgb(var(--text-secondary)/0.88)]">
                    {selectedSummaryText}
                  </span>
                </>
              ) : undefined}
              nameClassName="text-[0.98rem] font-semibold text-[rgb(var(--text)/0.98)]"
              metadataClassName="!flex-nowrap text-[10.25px] tracking-[0.01em] text-[rgb(var(--text-secondary)/0.9)]"
              emphasizeLeadMetadata
              metadataLeadClassName={rowCue.leadTextClassName}
              showTitleUnderline={isSelected}
              titleUnderlineClassName="opacity-80"
            />
          )}
          subtitle={undefined}
          subtitleLabel={undefined}
          subtitleTone="plain"
        leadingVisual={(
          <ExerciseThumb
            exercise={exercise}
            detailed={false}
            layout="rail"
            railWidth={72}
            sizes="72px"
            intent="row-card"
          />
          )}
          variant="compact"
          state={rowState}
          onPress={() => onPress(exercise.id, isSelected)}
          className={cn(
            "!border-[rgb(var(--accent-divider-rgb)/0.72)]",
            "ring-0 shadow-none [--glass-current-border-alpha:0] [--glass-current-sheen-strength:0]",
            "[box-shadow:none]",
            "bg-[linear-gradient(180deg,rgb(var(--selection-rgb)/0.14),rgb(var(--surface-1-rgb)/0.98))]",
          )}
          mediaClassName={cn("!border-r-0", rowCue.selectedMediaClassName)}
        rightIcon={isSelected ? null : (
            <span
              aria-hidden="true"
              className={cn(
                "flex h-full min-h-0 min-w-[2.2rem] self-stretch items-center justify-center rounded-none rounded-r-[inherit] border-0 bg-transparent px-1 shadow-none",
                pickerRowMobileDensityClassNames.selectPill,
                isSelected
                  ? "text-[rgb(224_255_248)]"
                : hasStats
                  ? "text-[rgb(var(--text)/0.92)]"
                  : "text-[rgb(var(--text-muted)/0.96)]",
            )}
          >
              {"Select"}
          </span>
        )}
        trailingClassName={cn(
          pickerRowMobileDensityClassNames.trailing,
          isSelected ? "text-[rgb(var(--text)/0.98)]" : "text-muted",
        )}
          overlayActions={selectedOverlayActions}
          overlayActionsClassName={isSelected ? "inset-0 !right-0 !top-0 !translate-y-0 pointer-events-none" : undefined}
          rightRailClassName={cn(
            "-my-[var(--exercise-row-shell-padding-y-compact)] -mr-[calc(var(--exercise-row-shell-padding-x)+1px)] self-stretch overflow-hidden rounded-r-[inherit] border-l border-l-[rgb(var(--accent)/0.16)]",
            rightRailClassName,
          )}
        trailingStackClassName="h-full min-h-0"
          bodyClassName={cn(pickerRowMobileDensityClassNames.body, "min-h-[4.45rem]")}
          titleClassName={pickerRowMobileDensityClassNames.title}
          titleContainerClassName={pickerRowMobileDensityClassNames.titleContainer}
          subtitleClassName="pr-8 text-[11px] leading-[1.25]"
          subtitleLabelClassName={rowCue.selectedSummaryLabelClassName}
          contentClassName={cn("pl-1.5 pr-9", pickerRowMobileDensityClassNames.content)}
        />
    </li>
    );
});

const CustomExerciseRow = memo(function CustomExerciseRow({
  isSelected,
  value,
  onValueChange,
  fieldLabel,
  helperText,
  helperTone = "neutral",
  showStatusSeparator = false,
  selectedTags = [],
  targetSummaryText,
  targetSummaryTone = "neutral",
  onPress,
}: CustomExerciseRowProps) {
  const hasDraftName = value.trim().length > 0;
  const hasDraftTags = selectedTags.length > 0;
  const draftMetaItems = hasDraftTags ? selectedTags : ["Create one not in library"];
  const draftHelperText = helperText;
  const draftHelperToneClassName = helperTone === "warning"
    ? "text-[rgb(var(--accent-yellow-on)/0.94)]"
    : helperTone === "accent"
      ? "text-[rgb(var(--accent-strong)/0.96)]"
      : "text-[rgb(var(--text-secondary)/0.9)]";
  const targetSummaryToneClassName = targetSummaryTone === "warning"
    ? "text-[rgb(var(--accent-yellow-on)/0.96)]"
    : targetSummaryTone === "accent"
      ? "text-[rgb(var(--accent-strong)/0.96)]"
      : "text-[rgb(var(--text-secondary)/0.9)]";

  if (!isSelected) {
    return (
      <li>
        <button
          type="button"
          className={cn(
            thinPickerRowClassName,
            thinPickerRowUnselectedBorderClassName,
            "group relative min-h-[4.15rem] rounded-r-[calc(var(--card-radius)+2px)] border-[rgb(var(--accent-yellow-on)/0.72)] bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.1),rgb(var(--surface-1-rgb)/0.94))] pl-3 pr-3.5 hover:bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/0.14),rgb(var(--surface-2-rgb)/0.96))]",
          )}
          onClick={onPress}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-px left-px top-px w-[4px] rounded-r-full bg-[linear-gradient(180deg,rgb(var(--accent-yellow-on)/1),rgb(var(--accent)/0.82))]"
          />
          <div className="min-w-0 flex-1 pl-2">
            <ExerciseTitleInline
              name="Custom Exercise"
              metadataItems={["Create one not in library"]}
              nameClassName="text-[0.96rem] font-semibold text-[rgb(var(--text)/0.98)]"
              metadataClassName="!flex-nowrap text-[10.5px] text-[rgb(var(--accent-strong)/0.88)]"
              emphasizeLeadMetadata
              metadataLeadClassName="text-[rgb(var(--accent-strong)/0.98)]"
              showUnderline
              underlineClassName="opacity-75"
            />
          </div>
          <span
            aria-hidden="true"
            className="flex min-w-[4.7rem] shrink-0 items-center justify-end whitespace-nowrap text-[0.74rem] font-semibold uppercase tracking-[0.14em] leading-none tabular-nums text-[rgb(var(--accent-strong)/0.98)]"
          >
            Build
          </span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <ExerciseCard
        title={(
          <ExerciseTitleWithCompanion
            name={hasDraftName ? "Custom Exercise Draft" : "Start Custom Exercise"}
            metadataItems={draftMetaItems}
            companion={targetSummaryText ? (
              <>
                <span className="inline-flex min-w-0 w-fit max-w-full flex-col items-start gap-y-[3px]">
                  <span className="min-w-0 max-w-full whitespace-nowrap text-[0.9rem] font-semibold leading-[1.18] text-[rgb(var(--text)/0.92)]">
                    Current Target
                  </span>
                  <MetricAccentBar variant="thin" className="w-full opacity-75" />
                </span>
                <span className={cn("min-w-0 whitespace-normal break-words text-[10.25px] tracking-[0.01em] leading-[1.18]", targetSummaryToneClassName)}>
                  {targetSummaryText}
                </span>
              </>
            ) : undefined}
            nameClassName="text-[0.95rem] font-semibold text-[rgb(var(--text)/0.98)]"
            metadataClassName="max-w-full gap-x-2 gap-y-1.5 text-[10.25px] tracking-[0.01em] text-[rgb(var(--text-secondary)/0.9)]"
            emphasizeLeadMetadata
            metadataLeadClassName="text-[rgb(var(--accent-strong)/0.98)]"
            showTitleUnderline
            titleUnderlineClassName="opacity-75"
          />
        )}
        variant="compact"
        state="selected"
        className="!border-[rgb(var(--accent-divider-rgb)/0.72)] bg-[linear-gradient(180deg,rgb(var(--selection-rgb)/0.14),rgb(var(--surface-1-rgb)/0.98))] shadow-none [--glass-current-border-alpha:0] [--glass-current-sheen-strength:0]"
        bodyClassName={cn(pickerRowMobileDensityClassNames.body, "min-h-[5.4rem]")}
        titleClassName={pickerRowMobileDensityClassNames.title}
        titleContainerClassName={cn("justify-start", pickerRowMobileDensityClassNames.titleContainer)}
        contentClassName={cn("pr-1.5", pickerRowMobileDensityClassNames.content)}
      >
        <div className="space-y-1.5 pr-2">
          <LabeledEditorField label={fieldLabel} className="w-full">
            <input
              type="text"
              name="customExerciseNameDisplay"
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
              placeholder="Custom Exercise"
              maxLength={80}
              className={cn(
                labeledEditorFieldControlClassName,
                "block h-11 w-full min-w-0 px-3 text-[0.95rem] font-semibold leading-tight",
              )}
            />
          </LabeledEditorField>
          {draftHelperText ? (
            <div className="flex min-w-0 items-start gap-1.5 pl-0.5">
              {showStatusSeparator ? <SignatureMiniPipe className="mt-[1px] shrink-0 self-start" /> : null}
              <div
                className={cn(
                  "min-w-0 text-[10.5px] leading-[1.22]",
                  draftHelperToneClassName,
                )}
              >
                {draftHelperText}
              </div>
            </div>
          ) : null}
        </div>
      </ExerciseCard>
    </li>
  );
});

function EmptyExerciseRow() {
  return (
    <li>
      <ExerciseCard
        title="No exercises match your filters"
        subtitle="Clear search or remove a filter to widen the library."
        variant="compact"
        state="empty"
        leadingVisual={(
          <div className="grid h-full w-full place-items-center text-[rgb(var(--text-muted)/0.72)]" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 10a3 3 0 1 1 0 6a3 3 0 0 1 0-6Z" />
              <path d="m14.5 14.5 4 4" />
              <path d="M4 7h10" />
            </svg>
          </div>
        )}
        rightIcon={<span aria-hidden="true" className="block h-5 w-5 opacity-0" />}
        className="shadow-none"
        bodyClassName={pickerRowMobileDensityClassNames.body}
        titleClassName={pickerRowMobileDensityClassNames.title}
        titleContainerClassName={pickerRowMobileDensityClassNames.titleContainer}
        subtitleClassName={pickerRowMobileDensityClassNames.subtitle}
        contentClassName={pickerRowMobileDensityClassNames.content}
      />
    </li>
  );
}

function CustomExerciseFilterRailCard({
  title,
  isOpen,
  onClick,
  buttonRef,
  widthClassName = "w-[10rem] min-w-[10rem]",
}: {
  title: ReactNode;
  isOpen: boolean;
  onClick: () => void;
  buttonRef?: (element: HTMLButtonElement | null) => void;
  widthClassName?: string;
}) {
  return (
    <section className={cn(customExerciseFilterRailCardClassName, "h-auto min-h-0", widthClassName)}>
      <button
        ref={buttonRef}
        type="button"
        className="group block h-auto w-full select-none appearance-none !border-0 !border-transparent !bg-transparent px-3 pb-[4px] pt-[4px] text-center caret-transparent shadow-none outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
        onClick={onClick}
        aria-expanded={isOpen}
      >
        <div className="flex flex-col gap-[1px]">
          <div className="grid grid-cols-[1rem_minmax(0,1fr)_1rem] items-center gap-1.5">
            <span aria-hidden="true" />
            <span
              className={cn(
                appTokens.exercisePickerFilterGroupLabel,
                "min-w-0 text-center leading-none",
                isOpen ? "text-[rgb(var(--text-primary)/0.98)]" : undefined,
              )}
            >
              {title}
            </span>
            <span
              className={cn(
                "flex justify-end transition-colors",
                isOpen ? "text-[rgb(var(--accent-divider-rgb)/0.98)]" : "text-[rgb(var(--text-muted)/0.84)] group-hover:text-[rgb(var(--text-secondary)/0.96)]",
              )}
            >
              {isOpen ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
            </span>
          </div>
          <MetricAccentBar variant="thin" className="mx-auto w-full opacity-80 transition-opacity group-hover:opacity-100" />
        </div>
      </button>
    </section>
  );
}

export function ExercisePicker({
  exercises,
  name,
  initialSelectedId,
  initialCustomExerciseDraft,
  selectionSearchParam,
  routineTargetConfig,
  exerciseStats = [],
  goalExtraContent,
  goalBetweenInputsAndPreviewContent,
  goalDockViewportMode: goalDockViewportModeProp = "default",
  goalCompanionToggleCards: goalCompanionToggleCardsProp,
  goalLowerCompanionToggleCards: goalLowerCompanionToggleCardsProp,
  goalAuxiliaryFields: goalAuxiliaryFieldsProp,
  goalInlineFailureToggle = false,
  footerSlot,
  onSelectedExerciseChange,
  onApplyLastSelection,
  onClearLastSelection,
  customExerciseEnabled = false,
  renderFooter,
}: ExercisePickerProps) {
  const seededCustomExerciseName = initialCustomExerciseDraft?.name?.trim() ?? "";
  const seededCustomExerciseMuscleValue = normalizeTagValue(initialCustomExerciseDraft?.primaryMuscle);
  const seededCustomExerciseSecondaryMuscleValue = normalizeTagValue(initialCustomExerciseDraft?.secondaryMuscle);
  const seededCustomExerciseMovementValue = normalizeTagValue(initialCustomExerciseDraft?.movementPattern);
  const seededCustomExerciseEquipmentValue = normalizeTagValue(initialCustomExerciseDraft?.equipment);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isExerciseInfoOpen, setIsExerciseInfoOpen] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState(seededCustomExerciseName);
  const [customExerciseMuscleTags, setCustomExerciseMuscleTags] = useState<string[]>(
    seededCustomExerciseMuscleValue ? [`muscle:${seededCustomExerciseMuscleValue}`] : [],
  );
  const [customExerciseSecondaryMuscleTags, setCustomExerciseSecondaryMuscleTags] = useState<string[]>(
    seededCustomExerciseSecondaryMuscleValue ? [`muscle:${seededCustomExerciseSecondaryMuscleValue}`] : [],
  );
  const [customExerciseMovementTags, setCustomExerciseMovementTags] = useState<string[]>(
    seededCustomExerciseMovementValue ? [`movement:${seededCustomExerciseMovementValue}`] : [],
  );
  const [customExerciseEquipmentTags, setCustomExerciseEquipmentTags] = useState<string[]>(
    seededCustomExerciseEquipmentValue ? [`equipment:${seededCustomExerciseEquipmentValue}`] : [],
  );
  const [activeCustomExerciseFilterSection, setActiveCustomExerciseFilterSection] = useState<CustomExerciseFilterSectionKey>("primary");
  const uniqueExercises = useMemo(() => {
    const seenNames = new Set<string>();
    return exercises.filter((exercise) => {
      const key = exercise.name.trim().toLowerCase();
      if (seenNames.has(key)) return false;
      seenNames.add(key);
      return true;
    });
  }, [exercises]);

  const statsByExerciseId = useMemo(() => new Map(exerciseStats.map((row) => [row.exerciseId, row])), [exerciseStats]);
  const seededCustomExerciseDraftOption = useMemo(
    () => buildCustomExerciseDraftOption(uniqueExercises, {
      name: seededCustomExerciseName,
      primaryMuscle: seededCustomExerciseMuscleValue || null,
      secondaryMuscle: seededCustomExerciseSecondaryMuscleValue || null,
      movementPattern: seededCustomExerciseMovementValue || null,
      equipment: seededCustomExerciseEquipmentValue || null,
    }),
    [seededCustomExerciseEquipmentValue, seededCustomExerciseMovementValue, seededCustomExerciseMuscleValue, seededCustomExerciseName, seededCustomExerciseSecondaryMuscleValue, uniqueExercises],
  );
  const resolvedInitialSelectedId = customExerciseEnabled && initialSelectedId === EXERCISE_PICKER_CUSTOM_EXERCISE_ID
    ? EXERCISE_PICKER_CUSTOM_EXERCISE_ID
    : initialSelectedId && uniqueExercises.some((exercise) => exercise.id === initialSelectedId)
      ? initialSelectedId
      : uniqueExercises[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(resolvedInitialSelectedId);
  const initialSelectedExerciseForGoal = resolvedInitialSelectedId === EXERCISE_PICKER_CUSTOM_EXERCISE_ID
    ? seededCustomExerciseDraftOption
    : uniqueExercises.find((exercise) => exercise.id === resolvedInitialSelectedId);
  const [goalState, setGoalState] = useState<ExerciseGoalFormState>({
    sets: isStretchHubExercise(initialSelectedExerciseForGoal) ? "1" : "3",
    repsMin: "",
    repsMax: "",
    failure: false,
    weight: "",
    duration: "",
    distance: "",
    calories: "",
    weightUnit: routineTargetConfig?.weightUnit ?? "lbs",
    distanceUnit: resolveExerciseDistanceUnit(initialSelectedExerciseForGoal?.default_unit),
    measurements: [],
  });
  const [didApplyLast, setDidApplyLast] = useState(false);
  const lastAutoEstimatedGoalCaloriesRef = useRef<string | null>(null);
  const didDismissAutoEstimatedGoalCaloriesRef = useRef(false);
  const lastGoalCaloriesAutoSourceKeyRef = useRef<string | null>(null);
  const previousExerciseIdRef = useRef(selectedId);
  const customExerciseFilterRailButtonRefs = useRef<Partial<Record<CustomExerciseFilterSectionKey, HTMLButtonElement | null>>>({});
  const isCustomExerciseSelected = customExerciseEnabled && selectedId === EXERCISE_PICKER_CUSTOM_EXERCISE_ID;
  const {
    muscleGroups: customExerciseMuscleGroups,
    secondaryMuscleGroups: customExerciseSecondaryMuscleGroups,
    movementGroups: customExerciseMovementGroups,
    equipmentGroups: customExerciseEquipmentGroups,
  } = useMemo(
    () => buildCustomExerciseTagGroups(uniqueExercises),
    [uniqueExercises],
  );

  const exerciseTagsById = useMemo(() => {
    const tagsById = new Map<string, Set<string>>();
    for (const exercise of uniqueExercises) {
      const tags = new Set<string>();
      appendScopedFilterTags(tags, exercise.muscles, "primary_muscle");
      appendScopedFilterTags(tags, exercise.muscle, "primary_muscle");
      appendScopedFilterTags(tags, exercise.primary_muscle, "primary_muscle");
      appendScopedFilterTags(tags, exercise.primary_muscles, "primary_muscle");
      appendScopedFilterTags(tags, exercise.secondary_muscles, "secondary_muscle");
      appendScopedFilterTags(tags, exercise.movement_pattern, "movement");
      appendScopedFilterTags(tags, exercise.equipment, "equipment");
      appendScopedFilterTags(tags, exercise.tags, "other");
      appendScopedFilterTags(tags, exercise.tag, "other");
      appendScopedFilterTags(tags, exercise.categories, "other");
      appendScopedFilterTags(tags, exercise.category, "other");
      for (const curationTag of flattenExerciseCurationTagValues(normalizeExerciseCurationTags(exercise.curation_tags))) {
        tags.add(curationTag);
      }
      tagsById.set(exercise.id, tags);
    }
    return tagsById;
  }, [uniqueExercises]);

  const availableTagGroups = useMemo<ExerciseTagGroup[]>(() => {
    const groupedTags: Record<TagFilterGroup, Map<string, string>> = {
      primary_muscle: new Map<string, string>(),
      secondary_muscle: new Map<string, string>(),
      movement: new Map<string, string>(),
      equipment: new Map<string, string>(),
      other: new Map<string, string>(),
    };
    const curationGroups = new Map(
      EXERCISE_CURATION_GROUPS.map((group) => [group.key, { label: group.label, tags: new Map<string, string>() }]),
    );

    for (const exercise of uniqueExercises) {
      appendTagsWithGroup(groupedTags.primary_muscle, exercise.muscles);
      appendTagsWithGroup(groupedTags.primary_muscle, exercise.muscle);
      appendTagsWithGroup(groupedTags.primary_muscle, exercise.primary_muscle);
      appendTagsWithGroup(groupedTags.primary_muscle, exercise.primary_muscles);
      appendTagsWithGroup(groupedTags.secondary_muscle, exercise.muscles);
      appendTagsWithGroup(groupedTags.secondary_muscle, exercise.muscle);
      appendTagsWithGroup(groupedTags.secondary_muscle, exercise.primary_muscle);
      appendTagsWithGroup(groupedTags.secondary_muscle, exercise.primary_muscles);
      appendTagsWithGroup(groupedTags.secondary_muscle, exercise.secondary_muscles);
      appendTagsWithGroup(groupedTags.movement, exercise.movement_pattern);
      appendTagsWithGroup(groupedTags.equipment, exercise.equipment);
      appendTagsWithGroup(groupedTags.other, exercise.tags);
      appendTagsWithGroup(groupedTags.other, exercise.tag);
      appendTagsWithGroup(groupedTags.other, exercise.categories);
      appendTagsWithGroup(groupedTags.other, exercise.category);

      const curationTags = normalizeExerciseCurationTags(exercise.curation_tags);
      if (curationTags) {
        for (const group of EXERCISE_CURATION_GROUPS) {
          const values = curationTags[group.key] ?? [];
          const targetGroup = curationGroups.get(group.key);
          if (!targetGroup) continue;
          for (const value of values) {
            targetGroup.tags.set(buildScopedExerciseCurationTagValue(group.key, value), formatExerciseTagLabel(value));
          }
        }
      }
    }

    const baseGroups: ExerciseTagGroup[] = (Object.keys(tagGroupLabels) as TagFilterGroup[]).map((group) => ({
      key: group,
      label: tagGroupLabels[group],
      tags: Array.from(groupedTags[group], ([value, label]) => ({
        value: buildScopedFilterTagValue(group, value),
        label: formatTagLabel(label),
      })).sort((a, b) => a.label.localeCompare(b.label)),
    }));

    const extraGroups: ExerciseTagGroup[] = EXERCISE_CURATION_GROUPS.map((group) => {
      const targetGroup = curationGroups.get(group.key);
      return {
        key: group.key,
        label: group.label,
        tags: Array.from(targetGroup?.tags ?? [], ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
      };
    });

    return [...baseGroups, ...extraGroups].filter((group) => group.tags.length > 0);
  }, [uniqueExercises]);

  const selectedExercise = isCustomExerciseSelected
    ? undefined
    : uniqueExercises.find((exercise) => exercise.id === selectedId);
  const isStretchHubSelected = !isCustomExerciseSelected && isStretchHubExercise(selectedExercise);
  const isMeasurementOptionalSelected = !isCustomExerciseSelected && isMeasurementOptionalExercise(selectedExercise);
  const normalizedCustomExerciseName = normalizeExerciseNameKey(customExerciseName);
  const duplicateCustomExercise = normalizedCustomExerciseName
    ? uniqueExercises.find((exercise) => (
      exercise.user_id !== null && normalizeExerciseNameKey(exercise.name) === normalizedCustomExerciseName
    )) ?? null
    : null;
  const customExerciseNameError = customExerciseName.trim().length === 0
    ? "Enter a custom exercise title."
    : duplicateCustomExercise
      ? "You already have a custom exercise with this name."
      : null;
  const selectedCustomPrimaryMuscle = customExerciseMuscleTags[0]?.replace(/^muscle:/, "") ?? "";
  const selectedCustomSecondaryMuscle = customExerciseSecondaryMuscleTags[0]?.replace(/^muscle:/, "") ?? "";
  const selectedCustomMovementPattern = customExerciseMovementTags[0]?.replace(/^movement:/, "") ?? "";
  const selectedCustomEquipment = customExerciseEquipmentTags[0]?.replace(/^equipment:/, "") ?? "";
  const filteredCustomExerciseMuscleGroups = useMemo(
    () => ensureSelectedTagsInGroups(
      customExerciseMuscleGroups.map((group) => ({
        ...group,
        tags: group.tags.filter((tag) => tag.value !== `muscle:${selectedCustomSecondaryMuscle}`),
      })),
      customExerciseMuscleTags,
    ),
    [customExerciseMuscleGroups, customExerciseMuscleTags, selectedCustomSecondaryMuscle],
  );
  const filteredCustomExerciseSecondaryMuscleGroups = useMemo(
    () => ensureSelectedTagsInGroups(
      customExerciseSecondaryMuscleGroups.map((group) => ({
        ...group,
        tags: group.tags.filter((tag) => tag.value !== `muscle:${selectedCustomPrimaryMuscle}`),
      })),
      customExerciseSecondaryMuscleTags,
    ),
    [customExerciseSecondaryMuscleGroups, customExerciseSecondaryMuscleTags, selectedCustomPrimaryMuscle],
  );
  const customExerciseDraftOption = useMemo(
    () => buildCustomExerciseDraftOption(uniqueExercises, {
      name: customExerciseName,
      primaryMuscle: selectedCustomPrimaryMuscle || null,
      secondaryMuscle: selectedCustomSecondaryMuscle || null,
      movementPattern: selectedCustomMovementPattern || null,
      equipment: selectedCustomEquipment || null,
    }),
    [customExerciseName, selectedCustomEquipment, selectedCustomMovementPattern, selectedCustomPrimaryMuscle, selectedCustomSecondaryMuscle, uniqueExercises],
  );
  const activeSelectedExercise = isCustomExerciseSelected ? customExerciseDraftOption : selectedExercise;
  const activeSelectedTagSet = useMemo(
    () => (activeSelectedExercise ? new Set(normalizeExerciseTags(activeSelectedExercise).keys()) : new Set<string>()),
    [activeSelectedExercise],
  );
  const inferredCustomGoalModality = useMemo(
    () => resolveGoalModality({
      measurementType: customExerciseDraftOption.measurement_type,
      equipment: customExerciseDraftOption.equipment,
      name: customExerciseDraftOption.name,
      tags: activeSelectedTagSet,
    }),
    [activeSelectedTagSet, customExerciseDraftOption],
  );
  const customExerciseDisplayTags = useMemo(
    () => [selectedCustomPrimaryMuscle, selectedCustomSecondaryMuscle, selectedCustomMovementPattern, selectedCustomEquipment]
      .filter((value): value is string => Boolean(value))
      .map((value) => formatTagLabel(value)),
    [selectedCustomEquipment, selectedCustomMovementPattern, selectedCustomPrimaryMuscle, selectedCustomSecondaryMuscle],
  );
  const customExerciseFilterSections = useMemo(() => ([
    { key: "primary" as const, label: "Primary Muscle" },
    { key: "secondary" as const, label: "Secondary Muscle" },
    { key: "movement" as const, label: "Movement" },
    { key: "equipment" as const, label: "Equipment" },
  ]), []);

  useEffect(() => {
    if (!isCustomExerciseSelected) {
      return;
    }

    customExerciseFilterRailButtonRefs.current[activeCustomExerciseFilterSection]?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: "smooth",
    });
  }, [activeCustomExerciseFilterSection, isCustomExerciseSelected]);

  useEffect(() => {
    if (
      selectedCustomPrimaryMuscle.length > 0
      && selectedCustomPrimaryMuscle === selectedCustomSecondaryMuscle
      && customExerciseSecondaryMuscleTags.length > 0
    ) {
      setCustomExerciseSecondaryMuscleTags([]);
    }
  }, [customExerciseSecondaryMuscleTags.length, selectedCustomPrimaryMuscle, selectedCustomSecondaryMuscle]);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = uniqueExercises.filter((exercise) => {
      const matchesQuery = !query || exercise.name.toLowerCase().includes(query);
      if (!matchesQuery) return false;
      if (!selectedTags.length) return true;
      const tags = exerciseTagsById.get(exercise.id);
      if (!tags || tags.size === 0) return false;
      return selectedTags.every((tag) => tags.has(tag));
    });
    if (selectedExercise && !matches.some((exercise) => exercise.id === selectedExercise.id)) {
      return [selectedExercise, ...matches];
    }
    return matches;
  }, [exerciseTagsById, search, selectedExercise, selectedTags, uniqueExercises]);

  useEffect(() => {
    if (customExerciseEnabled && selectedId === EXERCISE_PICKER_CUSTOM_EXERCISE_ID) {
      return;
    }

    if (selectedId && uniqueExercises.some((exercise) => exercise.id === selectedId)) {
      return;
    }

    if (selectedId === resolvedInitialSelectedId) {
      return;
    }

    setSelectedId(resolvedInitialSelectedId);
  }, [customExerciseEnabled, resolvedInitialSelectedId, selectedId, uniqueExercises]);

  useEffect(() => {
    if (!selectionSearchParam || typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    const currentValue = url.searchParams.get(selectionSearchParam) ?? "";
    const nextValue = customExerciseEnabled && selectedId === EXERCISE_PICKER_CUSTOM_EXERCISE_ID ? "" : (selectedId ?? "");

    if (!nextValue) {
      if (!currentValue) {
        return;
      }
      url.searchParams.delete(selectionSearchParam);
    } else {
      if (currentValue === nextValue) {
        return;
      }
      url.searchParams.set(selectionSearchParam, nextValue);
    }

    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [customExerciseEnabled, selectedId, selectionSearchParam]);

  useEffect(() => {
    onSelectedExerciseChange?.(activeSelectedExercise ?? null);
  }, [activeSelectedExercise, onSelectedExerciseChange]);
  const exerciseMetadataById = useMemo(
    () => new Map(
      uniqueExercises.map((exercise) => [
        exercise.id,
        isStretchHubExercise(exercise)
          ? getStretchHubMetaItems()
          : [exercise.primary_muscle, exercise.movement_pattern, exercise.equipment]
            .filter((value): value is string => Boolean(value?.trim()))
            .map((value) => formatTagLabel(value)),
      ]),
    ),
    [uniqueExercises],
  );
  const selectedCanonicalExerciseId = selectedExercise ? resolveCanonicalExerciseId(selectedExercise) : null;
  const selectedStats = selectedCanonicalExerciseId ? statsByExerciseId.get(selectedCanonicalExerciseId) : undefined;
  const configuredLastSummaryParts = selectedStats ? collectConfiguredMeasurementSummaryParts(selectedStats) : [];
  const lastSummaryText = selectedStats
    ? (
      formatLoggedMeasurementStat(selectedStats.lastWeight, selectedStats.lastReps, selectedStats.lastUnit)
      ?? (configuredLastSummaryParts.length > 0 ? configuredLastSummaryParts.join(" • ") : null)
    )
    : null;
  const hasLast = Boolean(lastSummaryText);
  const useLastInfoContent = selectedStats && lastSummaryText
    ? buildUseLastInfoPayload({
      stats: selectedStats,
      lastSummaryText,
      didApplyLast,
    })
    : null;
  const publishUseLastInfo = useCallback(() => {
    if (!useLastInfoContent) {
      return;
    }

    window.dispatchEvent(new CustomEvent("fitness:routine-editor-info", {
      detail: useLastInfoContent,
    }));
  }, [useLastInfoContent]);
  const clearToFreshGoalState = useCallback(() => {
    setGoalState(buildFreshGoalStateForExercise({
      exercise: activeSelectedExercise,
      fallbackWeightUnit: routineTargetConfig?.weightUnit ?? "lbs",
      customGoalModality: isCustomExerciseSelected ? inferredCustomGoalModality : null,
    }));
  }, [activeSelectedExercise, inferredCustomGoalModality, isCustomExerciseSelected, routineTargetConfig?.weightUnit]);

  useEffect(() => {
    if (!routineTargetConfig) {
      return;
    }

    const nextSelectionKey = isCustomExerciseSelected ? EXERCISE_PICKER_CUSTOM_EXERCISE_ID : selectedExercise?.id;
    if (!nextSelectionKey || previousExerciseIdRef.current === nextSelectionKey) {
      return;
    }

    if (isCustomExerciseSelected) {
      clearToFreshGoalState();
      setDidApplyLast(false);
      previousExerciseIdRef.current = nextSelectionKey;
      return;
    }

    if (!selectedExercise) {
      return;
    }

    clearToFreshGoalState();
    setDidApplyLast(false);
    previousExerciseIdRef.current = nextSelectionKey;
  }, [clearToFreshGoalState, inferredCustomGoalModality, isCustomExerciseSelected, selectedExercise]);

  const previousCustomProfileKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isCustomExerciseSelected) {
      previousCustomProfileKeyRef.current = null;
      return;
    }

    const nextProfileKey = JSON.stringify({
      measurementType: customExerciseDraftOption.measurement_type,
      equipment: customExerciseDraftOption.equipment,
      movementPattern: customExerciseDraftOption.movement_pattern,
      defaultUnit: customExerciseDraftOption.default_unit,
    });

    if (previousCustomProfileKeyRef.current === null) {
      previousCustomProfileKeyRef.current = nextProfileKey;
      return;
    }

    if (previousCustomProfileKeyRef.current === nextProfileKey) {
      return;
    }

    const nextMeasurements = getDefaultMeasurementsForGoalModality(inferredCustomGoalModality);
    setGoalState((current) => ({
      ...current,
      measurements: nextMeasurements,
      failure: false,
      repsMin: nextMeasurements.includes("reps") ? current.repsMin : "",
      repsMax: nextMeasurements.includes("reps") ? current.repsMax : "",
      weight: nextMeasurements.includes("weight") ? current.weight : "",
      duration: nextMeasurements.includes("time") ? current.duration : "",
      distance: nextMeasurements.includes("distance") ? current.distance : "",
      calories: nextMeasurements.includes("calories") ? current.calories : "",
      distanceUnit: resolveExerciseDistanceUnit(customExerciseDraftOption.default_unit),
    }));
    previousCustomProfileKeyRef.current = nextProfileKey;
  }, [customExerciseDraftOption.default_unit, customExerciseDraftOption.equipment, customExerciseDraftOption.measurement_type, customExerciseDraftOption.movement_pattern, inferredCustomGoalModality, isCustomExerciseSelected]);

  const goalModality: GoalModality = isCustomExerciseSelected
    ? (
      goalState.measurements.includes("time") || goalState.measurements.includes("distance")
        ? inferGoalModeFromState(goalState)
        : inferredCustomGoalModality
    )
    : activeSelectedExercise
      ? resolveGoalModality({
        measurementType: activeSelectedExercise.measurement_type,
        equipment: activeSelectedExercise.equipment,
        name: activeSelectedExercise.name,
        tags: activeSelectedTagSet,
      })
      : "strength";
  const effectiveGoalModality: GoalModality = goalModality === "cardio_time_distance"
    ? inferGoalModeFromState(goalState)
    : goalModality;
  const parsedGoalDurationSeconds = useMemo(
    () => parseDurationInput(goalState.duration),
    [goalState.duration],
  );
  const parsedGoalDistance = useMemo(() => {
    const trimmedDistance = goalState.distance.trim();
    if (!trimmedDistance) {
      return null;
    }

    const parsedDistance = Number(trimmedDistance);
    return Number.isFinite(parsedDistance) && parsedDistance > 0 ? parsedDistance : null;
  }, [goalState.distance]);
  const resolvedGoalCaloriesEstimationMethod = useMemo(
    () => activeSelectedExercise
      ? resolveCaloriesEstimationMethod({
        name: activeSelectedExercise.name,
        slug: activeSelectedExercise.slug,
        equipment: activeSelectedExercise.equipment,
        movementPattern: activeSelectedExercise.movement_pattern,
        measurementType: activeSelectedExercise.measurement_type,
        defaultUnit: activeSelectedExercise.default_unit,
        caloriesEstimationMethod: activeSelectedExercise.calories_estimation_method,
      })
      : null,
    [activeSelectedExercise],
  );
  const goalCaloriesAutoResetKey = useMemo(
    () => JSON.stringify({
      exerciseId: activeSelectedExercise?.id ?? null,
      method: resolvedGoalCaloriesEstimationMethod,
    }),
    [activeSelectedExercise?.id, resolvedGoalCaloriesEstimationMethod],
  );
  const estimatedGoalCalories = useMemo(
    () => estimateCaloriesFromExerciseMetrics({
      method: resolvedGoalCaloriesEstimationMethod,
      durationSeconds: parsedGoalDurationSeconds,
      distance: parsedGoalDistance,
      distanceUnit: goalState.distanceUnit,
      context: {
        userProfile: {
          bodyWeightKg: null,
          bodyWeightLbs: null,
        },
      },
    }),
    [goalState.distanceUnit, parsedGoalDistance, parsedGoalDurationSeconds, resolvedGoalCaloriesEstimationMethod],
  );
  const goalMeasurementSelections = useMemo(
    () => deriveGoalMeasurementSelections(effectiveGoalModality, {
      repsMin: goalState.repsMin,
      repsMax: goalState.repsMax,
      failure: goalState.failure,
      weight: goalState.weight,
      duration: goalState.duration,
      distance: goalState.distance,
      calories: goalState.calories,
    }),
    [effectiveGoalModality, goalState.calories, goalState.distance, goalState.duration, goalState.failure, goalState.repsMax, goalState.repsMin, goalState.weight],
  );

  const handleExercisePress = useCallback((exerciseId: string, isSelected: boolean) => {
    if (isSelected) {
      return;
    }
    setSelectedId(exerciseId);
  }, []);

  const openExerciseInfo = useCallback(() => {
    if (!selectedCanonicalExerciseId) return;
    setIsExerciseInfoOpen(true);
  }, [selectedCanonicalExerciseId]);

  const goalValidation = useMemo<GoalValidationResult>(() => {
    if (isMeasurementOptionalSelected) {
      const sets = Number(goalState.sets);
      return Number.isInteger(sets) && sets > 0
        ? { isValid: true, requiredFields: [], message: "Goal is valid." }
        : { isValid: false, requiredFields: ["sets"], message: "Missing Sets" };
    }

    return validateGoalConfiguration({
      modality: effectiveGoalModality,
      sets: goalState.sets,
      repsMin: goalState.repsMin,
      repsMax: goalState.repsMax,
      failure: goalState.failure,
      weight: goalState.weight,
      duration: goalState.duration,
      distance: goalState.distance,
      calories: goalState.calories,
      measurementSelections: new Set(goalMeasurementSelections),
    });
  }, [effectiveGoalModality, goalMeasurementSelections, goalState, isMeasurementOptionalSelected]);
  const goalPreviewMissingLabel = !goalValidation.isValid
    ? (
      !hasAnyGoalMeasurementValue(goalState)
        ? "Set current target"
        : effectiveGoalModality === "cardio_time_distance" && isMissingCardioTimeOrDistance({
            duration: goalState.duration,
            distance: goalState.distance,
          })
          ? "missing time or distance"
          : goalValidation.requiredFields.length > 0
            ? `missing ${getMissingGoalPreviewLabel(goalValidation.requiredFields[0])}`
            : null
    )
    : null;
  const failureToggleInfoContent = buildFailureToggleInfoPayload({
    modality: effectiveGoalModality,
    state: goalState,
    isFailureMode: goalState.failure && (effectiveGoalModality === "strength" || effectiveGoalModality === "bodyweight"),
  });
  const selectedCardGoalPreviewText = formatGoalInlineSummaryText({
    sets: goalState.sets ? Number(goalState.sets) : null,
    reps: goalState.failure ? 0 : (goalMeasurementSelections.includes("reps") && goalState.repsMin ? Number(goalState.repsMin) : null),
    repsMax: goalState.failure ? 0 : (goalMeasurementSelections.includes("reps") && goalState.repsMax ? Number(goalState.repsMax) : null),
    failure: goalState.failure || isFailureGoalSelection({
      repsMin: goalState.repsMin,
      repsMax: goalState.repsMax,
      failure: goalState.failure,
    }),
    weight: goalMeasurementSelections.includes("weight") && goalState.weight ? Number(goalState.weight) : null,
    weightUnit: goalState.weightUnit,
    durationSeconds: goalMeasurementSelections.includes("time") ? parseDurationInput(goalState.duration) : null,
    distance: goalMeasurementSelections.includes("distance") && goalState.distance ? Number(goalState.distance) : null,
    distanceUnit: goalState.distanceUnit,
    calories: goalMeasurementSelections.includes("calories") && goalState.calories ? Number(goalState.calories) : null,
    emptyLabel: "Goal missing",
  });
  const selectedCardGoalPreviewTextResolved = goalPreviewMissingLabel ?? selectedCardGoalPreviewText;
  const customExerciseTargetState = buildCustomExerciseTargetSummary({
    customExerciseName,
    duplicateCustomExercise: Boolean(duplicateCustomExercise),
    goalValidation,
    goalPreviewMissingLabel,
    selectedCardGoalPreviewTextResolved,
    customMeasurementType: customExerciseDraftOption.measurement_type,
    selectedCustomPrimaryMuscle,
    selectedCustomSecondaryMuscle,
    selectedCustomMovementPattern,
    selectedCustomEquipment,
  });
  const customExerciseHelperText = customExerciseTargetState.helperText;
  const customExerciseHelperTone = customExerciseTargetState.helperTone;
  const customExerciseShowStatusSeparator = customExerciseTargetState.showStatusSeparator;

  const renderCustomExerciseFilterStage = () => {
    const resolveSection = () => {
      switch (activeCustomExerciseFilterSection) {
      case "secondary":
        return {
          selectedTags: customExerciseSecondaryMuscleTags,
          onChange: (nextTags: string[]) => setCustomExerciseSecondaryMuscleTags(buildSingleSelectTags(nextTags, customExerciseSecondaryMuscleTags)),
          groups: filteredCustomExerciseSecondaryMuscleGroups,
        };
      case "movement":
        return {
          selectedTags: customExerciseMovementTags,
          onChange: (nextTags: string[]) => setCustomExerciseMovementTags(buildSingleSelectTags(nextTags, customExerciseMovementTags)),
          groups: ensureSelectedTagsInGroups(customExerciseMovementGroups, customExerciseMovementTags),
        };
      case "equipment":
        return {
          selectedTags: customExerciseEquipmentTags,
          onChange: (nextTags: string[]) => setCustomExerciseEquipmentTags(buildSingleSelectTags(nextTags, customExerciseEquipmentTags)),
          groups: ensureSelectedTagsInGroups(customExerciseEquipmentGroups, customExerciseEquipmentTags),
        };
      case "primary":
      default:
        return {
          selectedTags: customExerciseMuscleTags,
          onChange: (nextTags: string[]) => setCustomExerciseMuscleTags(buildSingleSelectTags(nextTags, customExerciseMuscleTags)),
          groups: filteredCustomExerciseMuscleGroups,
        };
      }
    };

    const section = resolveSection();

    return (
      <section className={customExerciseFilterStageClassName}>
        <div className="px-2.5 pb-2.5 pt-2">
          <ExerciseTagFilterControl
            selectedTags={section.selectedTags}
            onChange={section.onChange}
            groups={section.groups}
            variant="compact"
            open
            hideButton
          countDisplayMode="never"
          showScrollEdgeFades={false}
          viewportMode="auto-height"
          showActiveFiltersSection={false}
          hideGroupHeaders
          className="overflow-visible"
          horizontalRailOverrideClassName="max-md:-mx-2 max-md:px-2.5"
          panelClassName="space-y-2 !overflow-visible !rounded-none !border-0 !bg-transparent !p-0 !shadow-none"
          />
        </div>
      </section>
    );
  };

  const customExerciseTagRowsNode = isCustomExerciseSelected ? (
    <div className="space-y-1.5 pt-1">
      <HorizontalScrollHint
        className="-mx-1"
        scrollClassName="pb-0.5 px-1.5"
        contentClassName="mx-auto flex w-max min-w-full flex-nowrap items-stretch justify-center gap-2.5 px-1.5"
      >
        {customExerciseFilterSections.map((section) => (
          <CustomExerciseFilterRailCard
            key={section.key}
            title={section.label}
            isOpen={activeCustomExerciseFilterSection === section.key}
            onClick={() => setActiveCustomExerciseFilterSection(section.key)}
            buttonRef={(element) => {
              customExerciseFilterRailButtonRefs.current[section.key] = element;
            }}
            widthClassName={section.key === "secondary" ? "w-[10.75rem] min-w-[10.75rem]" : "w-[9.75rem] min-w-[9.75rem]"}
          />
        ))}
      </HorizontalScrollHint>
      {renderCustomExerciseFilterStage()}
      <input type="hidden" name="customExerciseMode" value="custom" />
      <input type="hidden" name="customExerciseName" value={customExerciseName.trim().replace(/\s+/g, " ")} />
      <input type="hidden" name="customExercisePrimaryMuscle" value={selectedCustomPrimaryMuscle} />
      <input type="hidden" name="customExerciseSecondaryMuscle" value={selectedCustomSecondaryMuscle} />
      <input type="hidden" name="customExerciseMovementPattern" value={selectedCustomMovementPattern} />
      <input type="hidden" name="customExerciseEquipment" value={selectedCustomEquipment} />
    </div>
  ) : null;

  const goalContentContext = {
    selectedExercise: activeSelectedExercise,
    goalState,
    goalModality,
    effectiveGoalModality,
    failureToggleInfoContent,
  };
  const applyLastToGoalState = useCallback(() => {
    if (!selectedStats) {
      return;
    }

    setGoalState((current) => {
      if (
        !formatLoggedMeasurementStat(selectedStats.lastWeight, selectedStats.lastReps, selectedStats.lastUnit)
        && hasConfiguredSetupSnapshot(selectedStats)
      ) {
        return applyConfiguredSetupToGoalState({
          current,
          stats: selectedStats,
          fallbackWeightUnit: routineTargetConfig?.weightUnit ?? "lbs",
          fallbackDistanceUnit: current.distanceUnit,
          modality: effectiveGoalModality,
        });
      }

      const nextMeasurements = new Set(current.measurements);
      const hasLastWeight = typeof selectedStats.lastWeight === "number" && selectedStats.lastWeight > 0;
      const hasLastReps = typeof selectedStats.lastReps === "number" && selectedStats.lastReps > 0;

      if (hasLastWeight) {
        nextMeasurements.add("weight");
      }
      if (hasLastReps) {
        nextMeasurements.add("reps");
      }

      return {
        ...current,
        weight: hasLastWeight ? String(selectedStats.lastWeight) : current.weight,
        repsMin: hasLastReps ? String(selectedStats.lastReps) : current.repsMin,
        repsMax: hasLastReps ? String(selectedStats.lastReps) : current.repsMax,
        failure: false,
        weightUnit: selectedStats.lastUnit === "kg" || selectedStats.lastUnit === "lbs" ? selectedStats.lastUnit : current.weightUnit,
        measurements: Array.from(nextMeasurements),
      };
    });
    if (selectedCanonicalExerciseId) {
      onApplyLastSelection?.({
        exerciseId: selectedCanonicalExerciseId,
        progressionPlaybookId: selectedStats.lastProgressionPlaybookId,
        progressionPlaybookConfig: selectedStats.lastProgressionPlaybookConfig,
      });
    }
    setDidApplyLast(true);
  }, [effectiveGoalModality, onApplyLastSelection, routineTargetConfig?.weightUnit, selectedCanonicalExerciseId, selectedStats]);
  const clearAppliedLastFromGoalState = useCallback(() => {
    clearToFreshGoalState();
    if (selectedCanonicalExerciseId) {
      onClearLastSelection?.({ exerciseId: selectedCanonicalExerciseId });
    }
    setDidApplyLast(false);
  }, [clearToFreshGoalState, onClearLastSelection, selectedCanonicalExerciseId]);
  const handleGoalStateChange = useCallback((next: ExerciseGoalFormState) => {
    setGoalState((current) => {
      const currentCalories = current.calories.trim();
      const nextCalories = next.calories.trim();
      const lastAutoEstimatedCalories = lastAutoEstimatedGoalCaloriesRef.current;

      if (currentCalories !== nextCalories) {
        if (nextCalories === "" && currentCalories === lastAutoEstimatedCalories) {
          didDismissAutoEstimatedGoalCaloriesRef.current = true;
        } else if (nextCalories.length > 0 && nextCalories !== lastAutoEstimatedCalories) {
          didDismissAutoEstimatedGoalCaloriesRef.current = true;
        } else if (nextCalories === lastAutoEstimatedCalories) {
          didDismissAutoEstimatedGoalCaloriesRef.current = false;
        }
      }

      return next;
    });
  }, []);
  const goalDockViewportMode = typeof goalDockViewportModeProp === "function"
    ? goalDockViewportModeProp(goalContentContext)
    : goalDockViewportModeProp;
  const compactGoalDockViewport = goalDockViewportMode === "compact";
  const betweenInputsAndPreviewNode = goalBetweenInputsAndPreviewContent
    ? (typeof goalBetweenInputsAndPreviewContent === "function"
      ? goalBetweenInputsAndPreviewContent(goalContentContext)
      : goalBetweenInputsAndPreviewContent)
    : null;
  const combinedBetweenInputsAndPreviewNode = customExerciseTagRowsNode || betweenInputsAndPreviewNode
    ? (
      <>
        {betweenInputsAndPreviewNode}
        {customExerciseTagRowsNode}
      </>
    )
    : null;
  const goalExtraNode = goalExtraContent
    ? (typeof goalExtraContent === "function"
      ? goalExtraContent(goalContentContext)
      : goalExtraContent)
    : null;
  const callerCompanionToggleCards = goalCompanionToggleCardsProp
    ? (typeof goalCompanionToggleCardsProp === "function"
      ? goalCompanionToggleCardsProp(goalContentContext)
      : goalCompanionToggleCardsProp)
    : [];
  const callerLowerCompanionToggleCards = goalLowerCompanionToggleCardsProp
    ? (typeof goalLowerCompanionToggleCardsProp === "function"
      ? goalLowerCompanionToggleCardsProp(goalContentContext)
      : goalLowerCompanionToggleCardsProp)
    : [];
  const callerAuxiliaryFields = goalAuxiliaryFieldsProp
    ? (typeof goalAuxiliaryFieldsProp === "function"
      ? goalAuxiliaryFieldsProp(goalContentContext)
      : goalAuxiliaryFieldsProp)
    : [];
  const addFlowSecondaryToggleCardClassName = "relative inline-flex w-[7.35rem] min-w-[7.35rem] max-w-[7.35rem] shrink-0 flex-col text-center";
  const embeddedToggleButtonClassName = cn(
    ACTION_CHROME_CONTROL_CLASS_NAME,
    ACTION_CHROME_SEGMENTED_CLASS_NAME,
    GLOW_SWITCH_STANDARD_CLASS_NAME,
    "relative inline-flex w-full min-w-0 items-center justify-center overflow-visible rounded-full border-[rgb(var(--accent-strong)/0.54)] bg-[linear-gradient(180deg,rgba(71,215,196,0.18),rgba(18,31,48,0.96))] px-[0.42rem] pb-[0.28rem] pt-[0.46rem] text-[10px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-primary))] ring-1 ring-[rgb(var(--accent-strong)/0.18)] shadow-[var(--action-chrome-shadow-hover)] focus-visible:ring-[rgb(var(--accent)/0.2)]",
  );
  const embeddedToggleLabelClassName = "pointer-events-none absolute right-2.5 top-0 z-[2] max-w-[calc(100%-1rem)] -translate-y-[38%] whitespace-nowrap bg-transparent text-right text-[8px] font-semibold uppercase leading-none tracking-[0.06em] text-[rgb(var(--accent-strong))]";
  const useLastToggleCard = !isStretchHubSelected && selectedStats && hasLast ? (
    <div
      className={addFlowSecondaryToggleCardClassName}
      onFocusCapture={publishUseLastInfo}
      onPointerDownCapture={publishUseLastInfo}
    >
      <span className={embeddedToggleLabelClassName}>{didApplyLast ? "Clear Last" : "Use Last"}</span>
      <button
        type="button"
        className={embeddedToggleButtonClassName}
        aria-pressed={didApplyLast}
        aria-label={didApplyLast ? "Clear last setup" : "Apply last setup"}
        onClick={() => {
          publishUseLastInfo();
          if (didApplyLast) {
            clearAppliedLastFromGoalState();
            return;
          }
          applyLastToGoalState();
        }}
        onFocus={publishUseLastInfo}
        onPointerDown={publishUseLastInfo}
      >
        <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
          {didApplyLast ? (
            <span className="measurement-toggle__label">Clear</span>
          ) : (
            <SignatureInlineList
              items={configuredLastSummaryParts.length > 0 ? configuredLastSummaryParts : [lastSummaryText]}
              separator="dot"
              className={cn(
                appTokens.currentSessionLoggerSummaryText,
                "measurement-toggle__label min-w-0 flex-nowrap justify-center whitespace-nowrap text-center text-[10.5px] font-semibold leading-none text-inherit",
                "[&_.signature-inline-list__item]:whitespace-nowrap",
              )}
            />
          )}
          <ChevronDownIcon className="h-3 w-3 text-[rgb(var(--accent-strong)/0.94)]" />
        </span>
      </button>
    </div>
  ) : null;
  const resolvedCompanionToggleCards = [
    ...callerCompanionToggleCards,
  ];
  const handleUseLastSelectionToggle = useCallback(() => {
    publishUseLastInfo();
    if (didApplyLast) {
      clearAppliedLastFromGoalState();
      return;
    }
    applyLastToGoalState();
  }, [applyLastToGoalState, clearAppliedLastFromGoalState, didApplyLast, publishUseLastInfo]);
  const footerNode = renderFooter ? renderFooter({
    selectedExercise,
    selectedCanonicalExerciseId,
    filteredExercises,
    openExerciseInfo,
    goalValidation: {
      isValid: goalValidation.isValid,
      message: goalValidation.message,
    },
    isCustomExerciseSelected,
    customExerciseError: isCustomExerciseSelected ? customExerciseNameError : null,
    canToggleLastSelection: Boolean(useLastToggleCard),
    didApplyLastSelection: didApplyLast,
    onToggleLastSelection: handleUseLastSelectionToggle,
  }) : footerSlot;
  const activeSelectionCue = resolveExerciseRowCueClasses(activeSelectedExercise ?? customExerciseDraftOption);
  const configureGoalDockNode = routineTargetConfig && (selectedExercise || isCustomExerciseSelected) ? (
    <section className={cn(
      appTokens.exercisePickerGoalCompact,
      measurementDockSurfaceClassName,
      "mx-0 -mb-px flex w-full min-w-0 max-w-none flex-col space-y-0 overflow-visible rounded-t-[1.7rem] rounded-b-none px-0 pb-px pt-0",
      activeSelectionCue.dockShellClassName,
    )}>
      <VerticalScrollHint
        className="min-h-0 w-full rounded-[0.65rem]"
        scrollClassName={cn(
          compactGoalDockViewport
            ? "w-full max-h-[min(30dvh,18rem)] pr-1"
            : "w-full max-h-[min(40dvh,24rem)] pr-1",
          goalExtraNode ? (compactGoalDockViewport ? "pb-[3.25rem]" : "pb-[5.25rem]") : undefined,
        )}
        contentClassName="w-full"
        railClassName="left-auto right-0"
        showFade
        showRail
      >
        <div className="sticky top-0 z-0 px-2.5 pb-1 pt-0">
          <div className="bg-[rgb(var(--bg-app))] pt-0.5">
            <MetricAccentBar variant="thin" className={cn("w-full opacity-85", activeSelectionCue.dockAccentBarClassName)} />
          </div>
        </div>
        <div className="min-w-0">
          <SharedExerciseGoalForm
            modality={goalModality}
            state={goalState}
            onStateChange={handleGoalStateChange}
            names={{
              sets: "targetSets",
              repsMin: "targetRepsMin",
              repsMax: "targetRepsMax",
              failure: "targetFailure",
              weight: "targetWeight",
              duration: "targetDuration",
              distance: "targetDistance",
              calories: "targetCalories",
              weightUnit: "targetWeightUnit",
              distanceUnit: "targetDistanceUnit",
            }}
            includeSetsInSummary={false}
            showValidationMessage={false}
            hideEmptySummary
            hideSummary
            measurementLayoutMode="horizontal-scroll"
            visibleMetrics={isMeasurementOptionalSelected ? [] : undefined}
            visibleMetricOrder={isMeasurementOptionalSelected ? [] : undefined}
            betweenInputsAndFooterContent={combinedBetweenInputsAndPreviewNode}
            footerContent={null}
            footerClassName="mt-1"
            companionToggleCards={resolvedCompanionToggleCards}
            lowerCompanionToggleCards={callerLowerCompanionToggleCards}
            auxiliaryFields={callerAuxiliaryFields}
            showInlineStepControls
            inlineFailureToggle={goalInlineFailureToggle}
          />
        </div>
        {goalExtraNode ? (
          <div className="px-1 pb-1.5 pt-1">
            {goalExtraNode}
          </div>
        ) : null}
      </VerticalScrollHint>
    </section>
  ) : null;
  const goalDockRef = useRef<HTMLDivElement | null>(null);
  const listViewportRef = useRef<HTMLDivElement | null>(null);
  const [goalDockHeight, setGoalDockHeight] = useState(0);
  const [listViewportHeight, setListViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    if (!configureGoalDockNode) {
      setGoalDockHeight(0);
      return;
    }

    const dockNode = goalDockRef.current;
    if (!dockNode) {
      return;
    }

    const measureDock = () => {
      setGoalDockHeight(Math.ceil(dockNode.getBoundingClientRect().height));
    };

    measureDock();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureDock);
      return () => window.removeEventListener("resize", measureDock);
    }

    const observer = new ResizeObserver(measureDock);
    observer.observe(dockNode);
    return () => observer.disconnect();
  }, [configureGoalDockNode]);

  useEffect(() => {
    if (!configureGoalDockNode) {
      setListViewportHeight(null);
      return;
    }

    let animationFrame = 0;
    const measureViewport = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        const listNode = listViewportRef.current;
        const dockNode = goalDockRef.current;
        if (!listNode || !dockNode) {
          return;
        }

        const listTop = listNode.getBoundingClientRect().top;
        const dockTop = dockNode.getBoundingClientRect().top;
        const nextHeight = Math.max(150, Math.floor(dockTop - listTop - 8));
        setListViewportHeight((currentHeight) => (
          currentHeight !== null && Math.abs(currentHeight - nextHeight) < 2 ? currentHeight : nextHeight
        ));
      });
    };

    measureViewport();
    window.addEventListener("resize", measureViewport);
    window.addEventListener("orientationchange", measureViewport);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelAnimationFrame(animationFrame);
        window.removeEventListener("resize", measureViewport);
        window.removeEventListener("orientationchange", measureViewport);
      };
    }

    const observer = new ResizeObserver(measureViewport);
    if (listViewportRef.current) {
      observer.observe(listViewportRef.current);
    }
    if (goalDockRef.current) {
      observer.observe(goalDockRef.current);
    }

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("resize", measureViewport);
      window.removeEventListener("orientationchange", measureViewport);
    };
  }, [configureGoalDockNode, goalDockHeight, filteredExercises.length, selectedId]);

  usePublishBottomActions(footerNode ?? null);

  useEffect(() => {
    if (lastGoalCaloriesAutoSourceKeyRef.current === goalCaloriesAutoResetKey) {
      return;
    }

    lastGoalCaloriesAutoSourceKeyRef.current = goalCaloriesAutoResetKey;
    didDismissAutoEstimatedGoalCaloriesRef.current = false;
  }, [goalCaloriesAutoResetKey]);

  useEffect(() => {
    setGoalState((current) => {
      const currentCalories = current.calories.trim();
      const lastAutoEstimatedCalories = lastAutoEstimatedGoalCaloriesRef.current;

      if (estimatedGoalCalories === null) {
        if (currentCalories.length > 0 && currentCalories === lastAutoEstimatedCalories) {
          lastAutoEstimatedGoalCaloriesRef.current = null;
          return {
            ...current,
            calories: "",
          };
        }

        lastAutoEstimatedGoalCaloriesRef.current = null;
        return current;
      }

      const nextCalories = String(estimatedGoalCalories);
      const isAutoControlled = currentCalories.length === 0 || currentCalories === lastAutoEstimatedCalories;

      lastAutoEstimatedGoalCaloriesRef.current = nextCalories;
      if (didDismissAutoEstimatedGoalCaloriesRef.current || !isAutoControlled || currentCalories === nextCalories) {
        return current;
      }

      return {
        ...current,
        calories: nextCalories,
      };
    });
  }, [estimatedGoalCalories]);

  useEffect(() => {
    if (goalState.measurements.length > 0) return;
    if (isMeasurementOptionalSelected) return;
    setGoalState((current) => ({
      ...current,
      measurements: getDefaultMeasurementsForGoalModality(goalModality),
    }));
  }, [goalModality, goalState.measurements.length, isMeasurementOptionalSelected]);

  const exerciseListContent = (
    <ul
      className={cn(
        "space-y-1.5",
        "pr-0 md:snap-y md:snap-mandatory md:scroll-py-2",
      )}
    >
      {customExerciseEnabled ? (
        <CustomExerciseRow
          isSelected={isCustomExerciseSelected}
          value={customExerciseName}
          onValueChange={setCustomExerciseName}
          fieldLabel="Exercise Name"
          helperText={customExerciseHelperText}
          helperTone={customExerciseHelperTone}
          showStatusSeparator={customExerciseShowStatusSeparator}
          selectedTags={customExerciseDisplayTags}
          targetSummaryText={customExerciseTargetState.targetSummaryText}
          targetSummaryTone={customExerciseTargetState.targetSummaryTone}
          onPress={() => setSelectedId(EXERCISE_PICKER_CUSTOM_EXERCISE_ID)}
        />
      ) : null}
      {filteredExercises.map((exercise) => (
        <ExerciseRow
          key={exercise.id}
          exercise={exercise}
          isSelected={exercise.id === selectedId}
          hasStats={hasExerciseStatsSignal(statsByExerciseId.get(resolveCanonicalExerciseId(exercise)))}
          metadataItems={exerciseMetadataById.get(exercise.id) ?? []}
          selectedSummaryText={exercise.id === selectedId && !isStretchHubSelected ? selectedCardGoalPreviewTextResolved : undefined}
          onOpenInfo={exercise.id === selectedId ? openExerciseInfo : undefined}
          onPress={handleExercisePress}
        />
      ))}
      {filteredExercises.length === 0 ? <EmptyExerciseRow /> : null}
    </ul>
  );

  return (
    <div
      className={cn(appTokens.exercisePickerRoot, "relative flex min-h-0 flex-1 flex-col space-y-0 overflow-visible")}
    >
      <input type="hidden" name={name} value={isCustomExerciseSelected ? "" : (selectedCanonicalExerciseId ?? selectedId)} required={!isCustomExerciseSelected} />

      <div className="sticky top-0 z-[55]">
        <div className={cn(appTokens.historyFloatingHeaderRail, "overflow-visible bg-transparent")}>
          <ExerciseSearchFilters
            query={search}
            onQueryChange={setSearch}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            groups={availableTagGroups}
            resultCount={filteredExercises.length}
            className={cn(appTokens.historyExerciseFilterStack, DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME, "space-y-2")}
            filterClassName="space-y-1"
            filterButtonClassName={cn(appTokens.historyExerciseFilterButton, "!border-[rgb(var(--accent)/0.52)] !bg-[rgb(var(--surface-2-rgb)/0.24)]")}
            filterPanelClassName={cn(appTokens.historyExerciseFilterPanel, "!rounded-[calc(var(--card-radius)+2px)] !border-[rgb(var(--accent)/0.42)] !px-1.5 !py-1.5 !space-y-1")}
            searchInputClassName={appTokens.historyExerciseSearchInput}
            clearButtonClassName={appTokens.exercisePickerSearchClearButton}
            searchPlaceholder="Search exercises"
            resultSingularLabel="exercise"
            resultPluralLabel="exercises"
            clearSearchAriaLabel="Clear exercise search"
            toggleFiltersAriaLabel="Toggle exercise filters"
            chromeVariant="history"
            filterCompactDensity="tight"
            filterViewportMode="auto-height"
          />
        </div>
      </div>

      <div
        ref={listViewportRef}
        className={cn(
          "relative mt-1 flex min-h-0 w-full max-w-none overflow-hidden",
          configureGoalDockNode ? "flex-none" : "flex-1",
          "max-w-full",
        )}
        style={configureGoalDockNode && listViewportHeight
          ? ({ height: `${listViewportHeight}px`, maxHeight: `${listViewportHeight}px` } as CSSProperties)
          : undefined}
      >
        <PickerListViewport
          plainOnMobile
          showFade={false}
          className="flex h-full min-h-0 flex-1 !overflow-hidden !border-0 !bg-transparent !px-0 !py-0 md:!border-0 md:!bg-transparent md:!px-0 md:!py-0"
          viewportClassName={cn(
            "hide-scrollbar h-full min-h-0 !overflow-y-auto overscroll-contain touch-pan-y px-0 pr-0 [-webkit-overflow-scrolling:touch]",
            configureGoalDockNode ? "pb-3" : "pb-[calc(var(--bottom-actions-height,10.5rem)+2rem)]",
          )}
          viewportProps={configureGoalDockNode && listViewportHeight
            ? { style: { height: `${listViewportHeight}px`, maxHeight: `${listViewportHeight}px` } }
            : undefined}
        >
          <div className={cn(
            "min-h-full pb-4 pt-2",
            configureGoalDockNode ? "px-2.5" : "px-1.5",
          )}>
            {exerciseListContent}
          </div>
        </PickerListViewport>
      </div>

      {configureGoalDockNode ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[var(--bottom-actions-height,10.5rem)] z-50">
          <ContentRail className="pointer-events-auto">
            <div ref={goalDockRef} className="w-full max-w-full">
              {configureGoalDockNode}
            </div>
          </ContentRail>
        </div>
      ) : null}

      <ExerciseInfo
        exerciseId={selectedCanonicalExerciseId}
        open={isExerciseInfoOpen && Boolean(selectedCanonicalExerciseId)}
        onOpenChange={(open) => setIsExerciseInfoOpen(open)}
        onClose={() => setIsExerciseInfoOpen(false)}
        sourceContext="ExercisePicker"
      />
    </div>
  );
}

