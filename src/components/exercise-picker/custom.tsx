"use client";

import { memo, useId } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { FormField, formFieldControlClassName } from "@/components/ui/FormField";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { cn } from "@/lib/cn";
import { inferCaloriesEstimationMethodFromExercise } from "@/lib/calorie-estimation";
import { getMissingGoalPreviewLabel, type GoalValidationResult } from "@/lib/exercise-goal-validation";
import { type ExerciseOption, type CustomExerciseRowProps } from "./types";
import { normalizeTagValue, toTagArray } from "./filter";
import { pickerRowMobileDensityClassNames, thinPickerRowClassName, thinPickerRowUnselectedBorderClassName, ExerciseTitleInline, ExerciseTitleWithCompanion } from "./list";

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

export function buildCustomExerciseTargetSummary(args: {
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

export function normalizeExerciseNameKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
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

export function buildCustomExerciseDraftOption(
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

export const CustomExerciseRow = memo(function CustomExerciseRow({
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
  // A warning helper is shown only for a blocking name problem (duplicate name), so it marks the field invalid.
  const isDraftNameInvalid = helperTone === "warning" && Boolean(draftHelperText);
  const draftHelperId = `custom-exercise-helper-${useId()}`;
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
              metadataClassName="!flex-nowrap text-[11px] text-[rgb(var(--accent-strong)/0.88)]"
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
                <span className={cn("min-w-0 whitespace-normal break-words text-[11px] tracking-[0.01em] leading-[1.18]", targetSummaryToneClassName)}>
                  {targetSummaryText}
                </span>
              </>
            ) : undefined}
            nameClassName="text-[0.95rem] font-semibold text-[rgb(var(--text)/0.98)]"
            metadataClassName="max-w-full gap-x-2 gap-y-1.5 text-[11px] tracking-[0.01em] text-[rgb(var(--text-secondary)/0.9)]"
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
          <FormField label={fieldLabel} className="w-full" invalid={isDraftNameInvalid}>
            {(control) => (
              <input
                {...control}
                aria-describedby={draftHelperText ? draftHelperId : undefined}
                type="text"
                name="customExerciseNameDisplay"
                value={value}
                onChange={(event) => onValueChange(event.target.value)}
                placeholder="Custom Exercise"
                maxLength={80}
                className={cn(formFieldControlClassName, "font-semibold")}
              />
            )}
          </FormField>
          {draftHelperText ? (
            <div className="flex min-w-0 items-start gap-1.5 pl-0.5">
              {showStatusSeparator ? <SignatureMiniPipe className="mt-[1px] shrink-0 self-start" /> : null}
              <div
                id={draftHelperId}
                className={cn(
                  "min-w-0 text-[11px] leading-[1.22]",
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
