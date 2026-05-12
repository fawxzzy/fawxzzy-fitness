"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseThumb } from "@/components/exercises/ExerciseThumb";
import { BOTTOM_ACTION_SHELL_CLASSNAME } from "@/components/layout/CanonicalBottomActions";
import { appTokens } from "@/components/ui/app/tokens";
import { AppButton } from "@/components/ui/AppButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { PickerListViewport } from "@/components/ui/PickerListViewport";
import { type ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { GoalSummaryInline } from "@/components/ui/measurements/GoalSummaryInline";
import { MeasurementDockSummary, measurementDockSurfaceClassName } from "@/components/ui/measurements/MeasurementDock";
import { SharedExerciseGoalForm, inferGoalModeFromState } from "@/components/ui/measurements/SharedExerciseGoalForm";
import { DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME, ExerciseSearchFilters } from "@/components/exercises/ExerciseSearchFilters";
import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { SignatureDot, SignatureMetaTag, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { cn } from "@/lib/cn";
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
  isFailureGoalSelection,
  resolveGoalModality,
  validateGoalConfiguration,
  type GoalModality,
  type GoalValidationResult,
} from "@/lib/exercise-goal-validation";
import { getStretchHubMetaItems, isStretchHubExercise } from "@/lib/stretch-library";

type ExerciseOption = {
  id: string;
  exercise_id?: string | null;
  name: string;
  user_id: string | null;
  is_global: boolean;
  primary_muscle: string | null;
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
  }) => ReactNode);
  goalBetweenInputsAndPreviewContent?: ReactNode | ((context: {
    selectedExercise: ExerciseOption | undefined;
    goalState: ExerciseGoalFormState;
    goalModality: GoalModality;
    effectiveGoalModality: GoalModality;
  }) => ReactNode);
  footerSlot?: ReactNode;
  onSelectedExerciseChange?: (exercise: ExerciseOption | null) => void;
  customExerciseEnabled?: boolean;
  renderFooter?: (context: {
    selectedExercise: ExerciseOption | undefined;
    selectedCanonicalExerciseId: string | null;
    filteredExercises: ExerciseOption[];
    openExerciseInfo: () => void;
    goalValidation: { isValid: boolean; message: string };
    isCustomExerciseSelected: boolean;
    customExerciseError: string | null;
  }) => ReactNode;
};

 type TagFilterGroup = "muscle" | "movement" | "equipment" | "other";

type ExerciseRowProps = {
  exercise: ExerciseOption;
  isSelected: boolean;
  hasStats: boolean;
  metadataItems: string[];
  selectedPreviewContent?: ReactNode;
  onPress: (exerciseId: string, isSelected: boolean) => void;
};

type CustomExerciseRowProps = {
  isSelected: boolean;
  value: string;
  onValueChange: (nextValue: string) => void;
  fieldLabel: string;
  statusContent?: ReactNode;
  showStatusSeparator?: boolean;
  selectedTags?: string[];
  onPress: () => void;
};

const tagGroupLabels: Record<TagFilterGroup, string> = {
  muscle: "Muscle",
  movement: "Movement",
  equipment: "Equipment",
  other: "Other",
};

const pickerRowMobileDensityClassNames = {
  body: "max-md:gap-1",
  title: "max-md:text-[0.86rem] max-md:leading-[1.15]",
  titleContainer: "max-md:space-y-0.25",
  subtitle: "max-md:text-[11px] max-md:leading-[1.26]",
  content: "max-md:space-y-0.25",
  trailing: "max-md:min-w-[4.3rem]",
  selectPill: "max-md:min-h-[1.65rem] max-md:min-w-[3rem] max-md:px-1.75 max-md:text-[9px]",
} as const;

const thinPickerRowClassName = "appearance-none [box-shadow:none] flex w-full items-center justify-between gap-3 overflow-hidden rounded-none rounded-r-[var(--card-radius)] border-0 bg-[rgb(var(--surface-1-rgb)/0.86)] px-4 py-2.5 text-left shadow-none outline-none ring-0 transition-[filter,transform] duration-75 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.2)]";
export const EXERCISE_PICKER_CUSTOM_EXERCISE_ID = "__custom_exercise__";

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
  groupedTags: Map<string, { label: string; group: TagFilterGroup }>,
  rawValues: string[] | string | null | undefined,
  group: TagFilterGroup,
) {
  for (const value of toTagArray(rawValues)) {
    const normalized = value.toLowerCase();
    if (!groupedTags.has(normalized)) {
      groupedTags.set(normalized, { label: value, group });
    }
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
      .map((exercise) => exercise.primary_muscle?.trim().toLowerCase() ?? "")
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

function inferFallbackMeasurementType({
  equipment,
  movementPattern,
}: {
  equipment: string | null;
  movementPattern: string | null;
}): ExerciseOption["measurement_type"] {
  const equipmentValue = normalizeTagValue(equipment);
  const movementValue = normalizeTagValue(movementPattern);

  if (movementValue.includes("carry")) {
    return "distance";
  }

  if (
    equipmentValue.includes("treadmill")
    || equipmentValue.includes("bike")
    || equipmentValue.includes("rower")
    || equipmentValue.includes("erg")
    || equipmentValue.includes("elliptical")
    || equipmentValue.includes("stair")
    || equipmentValue.includes("ski")
  ) {
    return "time";
  }

  return "reps";
}

function scoreCustomExerciseMatch(
  exercise: ExerciseOption,
  {
    primaryMuscle,
    movementPattern,
    equipment,
  }: {
    primaryMuscle: string | null;
    movementPattern: string | null;
    equipment: string | null;
  },
) {
  let score = 0;

  if (primaryMuscle && normalizeTagValue(exercise.primary_muscle) === primaryMuscle) {
    score += 3;
  }

  if (movementPattern && normalizeTagValue(exercise.movement_pattern) === movementPattern) {
    score += 4;
  }

  if (equipment && normalizeTagValue(exercise.equipment) === equipment) {
    score += 5;
  }

  return score;
}

function buildCustomExerciseDraftOption(
  exercises: ExerciseOption[],
  {
    name,
    primaryMuscle,
    movementPattern,
    equipment,
  }: {
    name: string;
    primaryMuscle: string | null;
    movementPattern: string | null;
    equipment: string | null;
  },
): ExerciseOption {
  const bestMatch = exercises
    .map((exercise) => ({
      exercise,
      score: scoreCustomExerciseMatch(exercise, { primaryMuscle, movementPattern, equipment }),
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

  const measurementType = bestMatch?.measurement_type ?? inferFallbackMeasurementType({ equipment, movementPattern });
  const defaultUnit = bestMatch?.default_unit ?? (measurementType === "distance" || measurementType === "time_distance" ? "mi" : null);

  return {
    id: EXERCISE_PICKER_CUSTOM_EXERCISE_ID,
    name: name.trim().replace(/\s+/g, " ") || "Custom Exercise",
    user_id: null,
    is_global: false,
    primary_muscle: primaryMuscle,
    equipment,
    movement_pattern: movementPattern,
    measurement_type: measurementType,
    default_unit: defaultUnit,
    calories_estimation_method: null,
    image_howto_path: null,
    tags: [primaryMuscle, movementPattern, equipment].filter((value): value is string => Boolean(value)),
    categories: [],
    curation_tags: null,
  };
}

function ExerciseMetaLine({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-start gap-x-2 gap-y-1 text-[11px] font-medium leading-[1.2] text-[rgb(var(--text-secondary)/0.94)]">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="inline-flex min-w-0 items-center gap-2">
          {index > 0 ? <SignatureDot /> : null}
          <span className="min-w-0 [text-wrap:balance]">{item}</span>
        </span>
      ))}
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

function hasExerciseStatsSignal(stats: ExerciseStatsOption | undefined) {
  if (!stats) return false;
  return Boolean(
    stats.lastWeight != null
    || stats.lastReps != null
    || stats.lastPerformedAt
    || stats.prWeight != null
    || stats.prReps != null
    || stats.prEst1rm != null
    || stats.actualPrWeight != null
    || stats.actualPrReps != null
    || stats.actualPrAt,
  );
}

function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

const ExerciseRow = memo(function ExerciseRow({ exercise, isSelected, hasStats, metadataItems, selectedPreviewContent, onPress }: ExerciseRowProps) {
  if (!isSelected) {
    return (
      <li>
        <button
          type="button"
          className={thinPickerRowClassName}
          onClick={() => onPress(exercise.id, isSelected)}
        >
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
              <p className="min-w-0 whitespace-normal break-words text-[0.95rem] font-semibold leading-[1.2] text-[rgb(var(--text)/0.96)]">
                {exercise.name}
              </p>
              {metadataItems.length > 0 ? (
                <>
                  <SignatureMiniPipe className="self-center" />
                  <ExerciseMetaLine items={metadataItems} />
                </>
              ) : null}
            </div>
          </div>
          <span
            aria-hidden="true"
            className={cn(
              "flex min-w-[4.75rem] shrink-0 items-center justify-end whitespace-nowrap text-[0.85rem] font-semibold leading-none tabular-nums",
              hasStats ? "text-[rgb(var(--text-muted)/0.94)]" : "text-[rgb(var(--text-muted)/0.88)]",
            )}
          >
            Select
          </span>
        </button>
      </li>
    );
  }

  const rowState = hasStats ? "active" : "default";
  const rightRailClassName = isSelected
    ? "border-l-0 bg-[rgb(var(--selection-rgb)/0.12)]"
    : hasStats
      ? "border-l-[rgb(var(--success-rgb)/0.18)] bg-[rgb(var(--success-rgb)/0.08)]"
      : "border-l-[rgb(var(--border-strong)/0.1)] bg-[rgb(var(--surface-1-rgb)/0.28)]";

  return (
    <li>
        <ExerciseCard
          title={exercise.name}
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
            "!border-0 ring-0 shadow-none [--glass-current-border-alpha:0] [--glass-current-sheen-strength:0]",
            "[box-shadow:none]",
            isSelected
              ? "bg-[linear-gradient(180deg,rgb(var(--selection-rgb)/0.12),rgb(var(--surface-1-rgb)/0.96))]"
              : undefined,
          )}
          mediaClassName={isSelected ? "!border-r-0 bg-[rgb(var(--selection-rgb)/0.08)]" : undefined}
          rightIcon={(
            <span
            aria-hidden="true"
              className={cn(
                "flex h-full min-h-0 min-w-[4.4rem] self-stretch items-center justify-center rounded-none rounded-r-[inherit] border-0 bg-transparent px-3.5 shadow-none",
                pickerRowMobileDensityClassNames.selectPill,
                isSelected
                  ? "text-[rgb(224_255_248)]"
                : hasStats
                  ? "text-[rgb(var(--text)/0.92)]"
                  : "text-[rgb(var(--text-muted)/0.96)]",
            )}
          >
            {isSelected ? "Selected" : "Select"}
          </span>
        )}
        trailingClassName={cn(
          pickerRowMobileDensityClassNames.trailing,
          isSelected ? "text-[rgb(var(--text)/0.98)]" : "text-muted",
        )}
          rightRailClassName={cn(
            "-my-[var(--exercise-row-shell-padding-y-compact)] -mr-[calc(var(--exercise-row-shell-padding-x)+1px)] self-stretch overflow-hidden rounded-r-[inherit] border-l",
            rightRailClassName,
          )}
        trailingStackClassName="h-full min-h-0"
          bodyClassName={pickerRowMobileDensityClassNames.body}
          titleClassName={pickerRowMobileDensityClassNames.title}
          titleContainerClassName={pickerRowMobileDensityClassNames.titleContainer}
          contentClassName={cn("pl-1.5", pickerRowMobileDensityClassNames.content)}
        >
          {selectedPreviewContent ? (
            <div className="pt-0.5">
              {selectedPreviewContent}
            </div>
          ) : metadataItems.length > 0 ? (
            <div className="pt-0.5"><ExerciseMetaLine items={metadataItems} /></div>
          ) : null}
        </ExerciseCard>
      </li>
    );
});

const CustomExerciseRow = memo(function CustomExerciseRow({
  isSelected,
  value,
  onValueChange,
  fieldLabel,
  statusContent,
  showStatusSeparator = false,
  selectedTags = [],
  onPress,
}: CustomExerciseRowProps) {
  if (!isSelected) {
    return (
      <li>
        <button
          type="button"
          className={thinPickerRowClassName}
          onClick={onPress}
        >
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
              <p className="min-w-0 whitespace-normal break-words text-[0.95rem] font-semibold leading-[1.2] text-[rgb(var(--text)/0.96)]">
                Custom Exercise
              </p>
            </div>
          </div>
          <span
            aria-hidden="true"
            className="flex min-w-[4.75rem] shrink-0 items-center justify-end whitespace-nowrap text-[0.85rem] font-semibold leading-none tabular-nums text-[rgb(var(--text-muted)/0.88)]"
          >
            Select
          </span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <ExerciseCard
        title={(
          <span className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            <span className="min-w-0 whitespace-normal break-words">Custom Exercise</span>
            {selectedTags.length > 0 ? (
              <>
                <SignatureMiniPipe className="self-center" />
                <ExerciseMetaLine items={selectedTags} />
              </>
            ) : null}
          </span>
        )}
        variant="compact"
        state="selected"
        className="!border-0 shadow-none [--glass-current-border-alpha:0] [--glass-current-sheen-strength:0]"
        rightIcon={(
          <span
            aria-hidden="true"
            className={cn(
              "flex h-full min-h-0 min-w-[4.4rem] self-stretch items-center justify-center rounded-none rounded-r-[inherit] border-0 bg-transparent px-3.5 shadow-none",
              pickerRowMobileDensityClassNames.selectPill,
              "text-[rgb(224_255_248)]",
            )}
          >
            Selected
          </span>
        )}
        trailingClassName={cn(
          pickerRowMobileDensityClassNames.trailing,
          "text-[rgb(var(--text)/0.98)]",
        )}
        rightRailClassName="-my-[var(--exercise-row-shell-padding-y-compact)] -mr-[calc(var(--exercise-row-shell-padding-x)+1px)] self-stretch overflow-hidden rounded-r-[inherit] border-l border-l-0 bg-[rgb(var(--selection-rgb)/0.12)]"
        trailingStackClassName="h-full min-h-0"
        bodyClassName={pickerRowMobileDensityClassNames.body}
        titleContainerClassName={pickerRowMobileDensityClassNames.titleContainer}
        contentClassName={cn("pl-1.5", pickerRowMobileDensityClassNames.content)}
      >
        <div className="space-y-1.5 pt-0.5">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div
              className="min-w-0 max-w-full shrink"
              style={{
                width: `${Math.min(Math.max((value.trim() || "Custom Exercise").length + 4, 18), 30)}ch`,
                maxWidth: "calc(100vw - 12.5rem)",
              } satisfies CSSProperties}
            >
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
            </div>
            {statusContent ? (
              <>
                {showStatusSeparator ? <SignatureMiniPipe className="shrink-0 self-center" /> : null}
                <div className="min-w-0 flex-1 pt-0.5 text-right">
                  {statusContent}
                </div>
              </>
            ) : null}
          </div>
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
  footerSlot,
  onSelectedExerciseChange,
  customExerciseEnabled = false,
  renderFooter,
}: ExercisePickerProps) {
  const seededCustomExerciseName = initialCustomExerciseDraft?.name?.trim() ?? "";
  const seededCustomExerciseMuscleValue = normalizeTagValue(initialCustomExerciseDraft?.primaryMuscle);
  const seededCustomExerciseMovementValue = normalizeTagValue(initialCustomExerciseDraft?.movementPattern);
  const seededCustomExerciseEquipmentValue = normalizeTagValue(initialCustomExerciseDraft?.equipment);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isExerciseInfoOpen, setIsExerciseInfoOpen] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState(seededCustomExerciseName);
  const [customExerciseMuscleTags, setCustomExerciseMuscleTags] = useState<string[]>(
    seededCustomExerciseMuscleValue ? [`muscle:${seededCustomExerciseMuscleValue}`] : [],
  );
  const [customExerciseMovementTags, setCustomExerciseMovementTags] = useState<string[]>(
    seededCustomExerciseMovementValue ? [`movement:${seededCustomExerciseMovementValue}`] : [],
  );
  const [customExerciseEquipmentTags, setCustomExerciseEquipmentTags] = useState<string[]>(
    seededCustomExerciseEquipmentValue ? [`equipment:${seededCustomExerciseEquipmentValue}`] : [],
  );

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
      movementPattern: seededCustomExerciseMovementValue || null,
      equipment: seededCustomExerciseEquipmentValue || null,
    }),
    [seededCustomExerciseEquipmentValue, seededCustomExerciseMovementValue, seededCustomExerciseMuscleValue, seededCustomExerciseName, uniqueExercises],
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
    distanceUnit: "mi",
    measurements: [],
  });
  const [didApplyLast, setDidApplyLast] = useState(false);
  const previousExerciseIdRef = useRef(selectedId);
  const isCustomExerciseSelected = customExerciseEnabled && selectedId === EXERCISE_PICKER_CUSTOM_EXERCISE_ID;
  const {
    muscleGroups: customExerciseMuscleGroups,
    movementGroups: customExerciseMovementGroups,
    equipmentGroups: customExerciseEquipmentGroups,
  } = useMemo(
    () => buildCustomExerciseTagGroups(uniqueExercises),
    [uniqueExercises],
  );

  const exerciseTagsById = useMemo(() => {
    const tagsById = new Map<string, Set<string>>();
    for (const exercise of uniqueExercises) {
      tagsById.set(exercise.id, new Set(normalizeExerciseTags(exercise).keys()));
    }
    return tagsById;
  }, [uniqueExercises]);

  const availableTagGroups = useMemo<ExerciseTagGroup[]>(() => {
    const tagsByValue = new Map<string, { label: string; group: TagFilterGroup }>();
    const curationGroups = new Map(
      EXERCISE_CURATION_GROUPS.map((group) => [group.key, { label: group.label, tags: new Map<string, string>() }]),
    );

    for (const exercise of uniqueExercises) {
      appendTagsWithGroup(tagsByValue, exercise.muscles, "muscle");
      appendTagsWithGroup(tagsByValue, exercise.muscle, "muscle");
      appendTagsWithGroup(tagsByValue, exercise.primary_muscle, "muscle");
      appendTagsWithGroup(tagsByValue, exercise.movement_pattern, "movement");
      appendTagsWithGroup(tagsByValue, exercise.equipment, "equipment");
      appendTagsWithGroup(tagsByValue, exercise.tags, "other");
      appendTagsWithGroup(tagsByValue, exercise.tag, "other");
      appendTagsWithGroup(tagsByValue, exercise.categories, "other");
      appendTagsWithGroup(tagsByValue, exercise.category, "other");

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

      const normalizedTags = normalizeExerciseTags(exercise);
      for (const [tag, label] of normalizedTags) {
        if (!tagsByValue.has(tag)) {
          tagsByValue.set(tag, { label, group: "other" });
        }
      }
    }

    const groupedTags: Record<TagFilterGroup, Array<{ value: string; label: string }>> = {
      muscle: [], movement: [], equipment: [], other: [],
    };

    for (const [value, { label, group }] of tagsByValue.entries()) {
      groupedTags[group].push({ value, label: formatTagLabel(label) });
    }

    const baseGroups: ExerciseTagGroup[] = (Object.keys(tagGroupLabels) as TagFilterGroup[]).map((group) => ({
      key: group,
      label: tagGroupLabels[group],
      tags: groupedTags[group].sort((a, b) => a.label.localeCompare(b.label)),
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
  const selectedCustomMovementPattern = customExerciseMovementTags[0]?.replace(/^movement:/, "") ?? "";
  const selectedCustomEquipment = customExerciseEquipmentTags[0]?.replace(/^equipment:/, "") ?? "";
  const customExerciseDraftOption = useMemo(
    () => buildCustomExerciseDraftOption(uniqueExercises, {
      name: customExerciseName,
      primaryMuscle: selectedCustomPrimaryMuscle || null,
      movementPattern: selectedCustomMovementPattern || null,
      equipment: selectedCustomEquipment || null,
    }),
    [customExerciseName, selectedCustomEquipment, selectedCustomMovementPattern, selectedCustomPrimaryMuscle, uniqueExercises],
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
    () => [selectedCustomPrimaryMuscle, selectedCustomMovementPattern, selectedCustomEquipment]
      .filter((value): value is string => Boolean(value))
      .map((value) => formatTagLabel(value)),
    [selectedCustomEquipment, selectedCustomMovementPattern, selectedCustomPrimaryMuscle],
  );

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
  const lastSummaryText = selectedStats
    ? formatLoggedMeasurementStat(selectedStats.lastWeight, selectedStats.lastReps, selectedStats.lastUnit)
    : null;
  const hasLast = Boolean(lastSummaryText);

  const resetMeasurementFields = useCallback((nextSets = "3") => {
    setGoalState((current) => ({
      ...current,
      sets: nextSets,
      repsMin: "",
      repsMax: "",
      failure: false,
      weight: "",
      duration: "",
      distance: "",
      calories: "",
      weightUnit: routineTargetConfig?.weightUnit ?? "lbs",
    }));
  }, [routineTargetConfig?.weightUnit]);

  useEffect(() => {
    if (!routineTargetConfig) {
      return;
    }

    const nextSelectionKey = isCustomExerciseSelected ? EXERCISE_PICKER_CUSTOM_EXERCISE_ID : selectedExercise?.id;
    if (!nextSelectionKey || previousExerciseIdRef.current === nextSelectionKey) {
      return;
    }

    if (isCustomExerciseSelected) {
      setGoalState((current) => ({
        ...current,
        measurements: getDefaultMeasurementsForGoalModality(inferredCustomGoalModality),
        failure: false,
        distanceUnit: customExerciseDraftOption.default_unit === "km" ? "km" : "mi",
      }));
      resetMeasurementFields("3");
      setDidApplyLast(false);
      previousExerciseIdRef.current = nextSelectionKey;
      return;
    }

    if (!selectedExercise) {
      return;
    }

    const nextDefaultUnit = selectedExercise.default_unit === "km" || selectedExercise.default_unit === "m"
      ? selectedExercise.default_unit
      : "mi";
    const selectedExerciseTags = normalizeExerciseTags(selectedExercise);
    const defaultModality = resolveGoalModality({
      measurementType: selectedExercise.measurement_type,
      equipment: selectedExercise.equipment,
      name: selectedExercise.name,
      tags: new Set(selectedExerciseTags.keys()),
    });
    setGoalState((current) => ({
      ...current,
      measurements: isMeasurementOptionalExercise(selectedExercise) ? [] : getDefaultMeasurementsForGoalModality(defaultModality),
      failure: false,
      distanceUnit: nextDefaultUnit,
    }));
    resetMeasurementFields(isStretchHubExercise(selectedExercise) ? "1" : "3");
    setDidApplyLast(false);
    previousExerciseIdRef.current = nextSelectionKey;
  }, [customExerciseDraftOption.default_unit, inferredCustomGoalModality, isCustomExerciseSelected, resetMeasurementFields, routineTargetConfig, selectedExercise]);

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
      distanceUnit: customExerciseDraftOption.default_unit === "km" ? "km" : "mi",
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
  const goalPreviewMissingLabel = !goalValidation.isValid && goalValidation.requiredFields.length > 0
    ? `missing ${getMissingGoalPreviewLabel(goalValidation.requiredFields[0])}`
    : null;
  const selectedCardGoalPreviewNode = goalPreviewMissingLabel ? (
    <p className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-divider-rgb)/0.96)]">
      {goalPreviewMissingLabel}
    </p>
  ) : (
    <GoalSummaryInline
      includeSets={false}
      className="min-w-0 px-0 py-0 text-left"
      values={{
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
      }}
    />
  );
  const customExerciseStatusNode = customExerciseName.trim().length === 0 ? (
    <p className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-divider-rgb)/0.96)]">
      add exercise name
    </p>
  ) : duplicateCustomExercise ? (
    <p className="min-w-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-divider-rgb)/0.96)]">
      rename duplicate custom exercise
    </p>
  ) : (
    selectedCardGoalPreviewNode
  );
  const customExerciseShowStatusSeparator = customExerciseName.trim().length > 0 && !duplicateCustomExercise && !goalPreviewMissingLabel;

  const customExerciseTagRowsNode = isCustomExerciseSelected ? (
    <div className="space-y-2 px-1 pt-1">
      <ExerciseTagFilterControl
        selectedTags={customExerciseMuscleTags}
        onChange={(nextTags) => setCustomExerciseMuscleTags(buildSingleSelectTags(nextTags, customExerciseMuscleTags))}
        groups={customExerciseMuscleGroups}
        variant="compact"
        hideButton
        open
        countDisplayMode="never"
        showScrollEdgeFades={false}
        panelClassName="space-y-2 !rounded-none !border-0 !bg-transparent !p-0 !shadow-none"
      />
      <ExerciseTagFilterControl
        selectedTags={customExerciseMovementTags}
        onChange={(nextTags) => setCustomExerciseMovementTags(buildSingleSelectTags(nextTags, customExerciseMovementTags))}
        groups={customExerciseMovementGroups}
        variant="compact"
        hideButton
        open
        countDisplayMode="never"
        showScrollEdgeFades={false}
        panelClassName="space-y-2 !rounded-none !border-0 !bg-transparent !p-0 !shadow-none"
      />
      <ExerciseTagFilterControl
        selectedTags={customExerciseEquipmentTags}
        onChange={(nextTags) => setCustomExerciseEquipmentTags(buildSingleSelectTags(nextTags, customExerciseEquipmentTags))}
        groups={customExerciseEquipmentGroups}
        variant="compact"
        hideButton
        open
        countDisplayMode="never"
        showScrollEdgeFades={false}
        panelClassName="space-y-2 !rounded-none !border-0 !bg-transparent !p-0 !shadow-none"
      />
      <input type="hidden" name="customExerciseMode" value="custom" />
      <input type="hidden" name="customExerciseName" value={customExerciseName.trim().replace(/\s+/g, " ")} />
      <input type="hidden" name="customExercisePrimaryMuscle" value={selectedCustomPrimaryMuscle} />
      <input type="hidden" name="customExerciseMovementPattern" value={selectedCustomMovementPattern} />
      <input type="hidden" name="customExerciseEquipment" value={selectedCustomEquipment} />
    </div>
  ) : null;

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
  }) : footerSlot;
  const goalContentContext = {
    selectedExercise: activeSelectedExercise,
    goalState,
    goalModality,
    effectiveGoalModality,
  };
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

  const configureGoalDockNode = routineTargetConfig && (selectedExercise || isCustomExerciseSelected) ? (
    <section className={cn(appTokens.exercisePickerGoalCompact, measurementDockSurfaceClassName, "-mx-1 -mb-px flex w-[calc(100%+0.5rem)] min-w-0 max-w-none flex-col space-y-0 overflow-visible rounded-t-[1.7rem] rounded-b-none px-1 pb-px pt-0")}>
      {!isStretchHubSelected && selectedStats && hasLast ? (
        <div
          className={cn(
            appTokens.exercisePickerStatsStack,
            didApplyLast ? appTokens.exercisePickerStatsEmphasis : undefined,
            appTokens.exercisePickerStatsCompact,
            "px-2 pb-1.5",
          )}
        >
          {hasLast ? (
            <MeasurementDockSummary
              className="min-h-0 gap-1 pb-0.5"
              barClassName="opacity-65"
              rowClassName="min-h-[1.75rem]"
              centerClassName="px-2"
              lead={(
                <div className="inline-flex items-center gap-1.5">
                  <SignatureMetaTag className="text-[10px] tracking-[0.16em]">Last</SignatureMetaTag>
                  <SignatureMiniPipe />
                </div>
              )}
              summary={(
                <p className={cn(appTokens.exercisePickerStatsText, "min-w-0 text-center text-[rgb(var(--text-primary)/0.98)]")}>
                  {lastSummaryText}
                </p>
              )}
              trailing={(
                <AppButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0 self-center"
                  onClick={() => {
                    setGoalState((current) => {
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
                    setDidApplyLast(true);
                    setTimeout(() => setDidApplyLast(false), 1200);
                  }}
                >
                  Use
                </AppButton>
              )}
            />
          ) : null}
        </div>
      ) : null}

      <div className="min-w-0">
        <SharedExerciseGoalForm
          modality={goalModality}
          state={goalState}
          onStateChange={setGoalState}
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
        />
      </div>
      {goalExtraNode ? (
        <div className="px-1 pb-1.5 pt-1">
          {goalExtraNode}
        </div>
      ) : null}
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
          statusContent={customExerciseStatusNode}
          showStatusSeparator={customExerciseShowStatusSeparator}
          selectedTags={customExerciseDisplayTags}
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
          selectedPreviewContent={exercise.id === selectedId && !isStretchHubSelected ? selectedCardGoalPreviewNode : undefined}
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

      <div className="sticky top-0 z-30">
        <div className={cn(appTokens.historyFloatingHeaderRail, "overflow-visible bg-transparent")}>
          <ExerciseSearchFilters
            query={search}
            onQueryChange={setSearch}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            groups={availableTagGroups}
            resultCount={filteredExercises.length}
            className={cn(appTokens.historyExerciseFilterStack, DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME)}
            filterClassName="space-y-1.5"
            filterButtonClassName={appTokens.historyExerciseFilterButton}
            filterPanelClassName={appTokens.historyExerciseFilterPanel}
            searchInputClassName={appTokens.historyExerciseSearchInput}
            clearButtonClassName={appTokens.exercisePickerSearchClearButton}
            searchPlaceholder="Search exercises"
            resultSingularLabel="exercise"
            resultPluralLabel="exercises"
            clearSearchAriaLabel="Clear exercise search"
            toggleFiltersAriaLabel="Toggle exercise filters"
            chromeVariant="history"
          />
        </div>
      </div>

      <div
        ref={listViewportRef}
        className={cn(
          "relative mt-1 flex min-h-0 max-w-none overflow-hidden",
          configureGoalDockNode ? "flex-none" : "flex-1",
          configureGoalDockNode ? "-mx-2 w-[calc(100%+1rem)]" : "w-full max-w-full",
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
            configureGoalDockNode ? "pl-3.5 pr-2.5" : "pl-1.5 pr-0.5",
          )}>
            {exerciseListContent}
          </div>
        </PickerListViewport>
      </div>

      {configureGoalDockNode ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[var(--bottom-actions-height,10.5rem)] z-50">
          <div ref={goalDockRef} className={`${BOTTOM_ACTION_SHELL_CLASSNAME} pointer-events-auto`}>
            {configureGoalDockNode}
          </div>
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

