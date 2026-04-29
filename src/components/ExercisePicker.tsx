"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { SharedExerciseGoalForm, inferGoalModeFromState } from "@/components/ui/measurements/SharedExerciseGoalForm";
import { ExerciseSearchFilters } from "@/components/exercises/ExerciseSearchFilters";
import { type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { SignatureMetaTag, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
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
  exerciseStats?: ExerciseStatsOption[];
  routineTargetConfig?: {
    weightUnit: "lbs" | "kg";
  };
  footerSlot?: ReactNode;
  onSelectedExerciseChange?: (exercise: ExerciseOption | null) => void;
  renderFooter?: (context: {
    selectedExercise: ExerciseOption | undefined;
    selectedCanonicalExerciseId: string | null;
    filteredExercises: ExerciseOption[];
    openExerciseInfo: () => void;
    goalValidation: { isValid: boolean; message: string };
  }) => ReactNode;
};

 type TagFilterGroup = "muscle" | "movement" | "equipment" | "other";

type ExerciseRowProps = {
  exercise: ExerciseOption;
  isSelected: boolean;
  hasStats: boolean;
  metadata: ReactNode;
  onPress: (exerciseId: string, isSelected: boolean) => void;
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

function ExerciseMetaLine({ items }: { items: string[] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-center justify-start gap-x-2 gap-y-1 text-[11px] font-medium leading-[1.2] text-[rgb(var(--text-secondary)/0.94)]">
      {items.map((item, index) => (
        <span key={`${item}-${index}`} className="inline-flex min-w-0 items-center gap-2">
          {index > 0 ? <span aria-hidden="true" className="h-[4px] w-[4px] rounded-full bg-[rgb(var(--accent)/0.9)]" /> : null}
          <span className="min-w-0 [text-wrap:balance]">{item}</span>
        </span>
      ))}
    </span>
  );
}

function ExercisePickerBleed({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <div className={cn("relative w-full max-w-full overflow-visible", className)}>
      <div className={cn("px-4 md:px-0", innerClassName)}>
        {children}
      </div>
    </div>
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

const ExerciseRow = memo(function ExerciseRow({ exercise, isSelected, hasStats, metadata, onPress }: ExerciseRowProps) {
  const rowState = isSelected ? "selected" : hasStats ? "active" : "default";
  const rightRailClassName = isSelected
    ? "border-l-[rgb(var(--accent)/0.2)] bg-[rgb(var(--accent)/0.12)]"
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
        className="border-[rgb(var(--border-strong)/0.08)] shadow-none"
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
        {metadata ? <div className="pt-0.5">{metadata}</div> : null}
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
  routineTargetConfig,
  exerciseStats = [],
  footerSlot,
  onSelectedExerciseChange,
  renderFooter,
}: ExercisePickerProps) {
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isExerciseInfoOpen, setIsExerciseInfoOpen] = useState(false);

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
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? uniqueExercises[0]?.id ?? "");
  const [goalState, setGoalState] = useState<ExerciseGoalFormState>({
    sets: "3",
    repsMin: "",
    repsMax: "",
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

  const selectedExercise = uniqueExercises.find((exercise) => exercise.id === selectedId);
  const isStretchHubSelected = isStretchHubExercise(selectedExercise);
  const isMeasurementOptionalSelected = isMeasurementOptionalExercise(selectedExercise);

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
    onSelectedExerciseChange?.(selectedExercise ?? null);
  }, [onSelectedExerciseChange, selectedExercise]);
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
  const bestSummaryText = selectedStats
    ? formatLoggedMeasurementStat(selectedStats.actualPrWeight, selectedStats.actualPrReps, selectedStats.lastUnit)
    : null;
  const hasLast = Boolean(lastSummaryText);
  const hasBest = Boolean(bestSummaryText) || selectedStats?.prEst1rm != null;

  const resetMeasurementFields = useCallback(() => {
    setGoalState((current) => ({
      ...current,
      sets: "3",
      repsMin: "",
      repsMax: "",
      weight: "",
      duration: "",
      distance: "",
      calories: "",
      weightUnit: routineTargetConfig?.weightUnit ?? "lbs",
    }));
  }, [routineTargetConfig?.weightUnit]);

  useEffect(() => {
    if (!selectedExercise || !routineTargetConfig || previousExerciseIdRef.current === selectedExercise.id) {
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
      distanceUnit: nextDefaultUnit,
    }));
    resetMeasurementFields();
    setDidApplyLast(false);
    previousExerciseIdRef.current = selectedExercise.id;
  }, [resetMeasurementFields, routineTargetConfig, selectedExercise]);

  const isCardio = selectedExercise ? normalizeExerciseTags(selectedExercise).has("cardio") : false;
  const selectedTagSet = useMemo(() => (selectedExercise ? new Set(normalizeExerciseTags(selectedExercise).keys()) : new Set<string>()), [selectedExercise]);
  const goalModality: GoalModality = selectedExercise
    ? resolveGoalModality({
      measurementType: selectedExercise.measurement_type,
      equipment: selectedExercise.equipment,
      name: selectedExercise.name,
      tags: selectedTagSet,
    })
    : "strength";
  const effectiveGoalModality: GoalModality = goalModality === "cardio_time_distance"
    ? inferGoalModeFromState(goalState)
    : goalModality;
  const goalMeasurementSelections = useMemo(
    () => deriveGoalMeasurementSelections(effectiveGoalModality, {
      repsMin: goalState.repsMin,
      repsMax: goalState.repsMax,
      weight: goalState.weight,
      duration: goalState.duration,
      distance: goalState.distance,
      calories: goalState.calories,
    }),
    [effectiveGoalModality, goalState.calories, goalState.distance, goalState.duration, goalState.repsMax, goalState.repsMin, goalState.weight],
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
  const goalPreviewNode = (
    <div className="mx-0.5 -mt-1.5 border-t border-[rgb(var(--accent)/0.52)] pt-0">
      <div className="flex min-w-0 items-center justify-center gap-1.5 px-1 pb-0.5 pt-0 text-center">
        <SignatureMetaTag className="text-[10px] tracking-[0.16em]">Preview</SignatureMetaTag>
        <SignatureMiniPipe />
        {goalPreviewMissingLabel ? (
          <p className="min-w-0 flex-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent)/0.96)]">
            {goalPreviewMissingLabel}
          </p>
        ) : (
          <GoalSummaryInline
            includeSets={false}
            className="min-w-0 flex-1 px-0 py-0 text-center"
            values={{
              sets: goalState.sets ? Number(goalState.sets) : null,
              reps: goalMeasurementSelections.includes("reps") && goalState.repsMin ? Number(goalState.repsMin) : null,
              repsMax: goalMeasurementSelections.includes("reps") && goalState.repsMax ? Number(goalState.repsMax) : null,
              weight: goalMeasurementSelections.includes("weight") && goalState.weight ? Number(goalState.weight) : null,
              weightUnit: goalState.weightUnit,
              durationSeconds: goalMeasurementSelections.includes("time") ? parseDurationInput(goalState.duration) : null,
              distance: goalMeasurementSelections.includes("distance") && goalState.distance ? Number(goalState.distance) : null,
              distanceUnit: goalState.distanceUnit,
              calories: goalMeasurementSelections.includes("calories") && goalState.calories ? Number(goalState.calories) : null,
              emptyLabel: "Goal missing",
            }}
          />
        )}
      </div>
    </div>
  );

  const footerNode = renderFooter ? renderFooter({
    selectedExercise,
    selectedCanonicalExerciseId,
    filteredExercises,
    openExerciseInfo,
    goalValidation: {
      isValid: goalValidation.isValid,
      message: goalValidation.message,
    },
  }) : footerSlot;

  const configureGoalDockNode = routineTargetConfig && selectedExercise ? (
    <section className={cn(appTokens.exercisePickerGoalPanel, appTokens.exercisePickerGoalCompact, "-mx-2 flex w-[calc(100%+1rem)] min-w-0 max-w-none flex-col space-y-0 overflow-visible rounded-[1.7rem] border-[rgb(var(--accent)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.98)] px-3 pb-1 pt-1 shadow-[0_12px_24px_rgba(3,9,16,0.14)]")}>
      {!isStretchHubSelected && selectedStats && (hasLast || hasBest) ? (
        <div
          className={cn(
            appTokens.exercisePickerStatsStack,
            didApplyLast ? appTokens.exercisePickerStatsEmphasis : undefined,
            appTokens.exercisePickerStatsCompact,
            "pb-0.5",
          )}
        >
          {hasLast ? (
            <div className="flex items-start justify-between gap-3">
              <p className={cn(appTokens.exercisePickerStatsText, "min-w-0 flex-1")}>Last: {lastSummaryText}{selectedStats.lastPerformedAt ? ` \u00b7 ${formatStatDate(selectedStats.lastPerformedAt)}` : ""}</p>
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 self-start"
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
                      weightUnit: selectedStats.lastUnit === "kg" || selectedStats.lastUnit === "lbs" ? selectedStats.lastUnit : current.weightUnit,
                      measurements: Array.from(nextMeasurements),
                    };
                  });
                  setDidApplyLast(true);
                  setTimeout(() => setDidApplyLast(false), 1200);
                }}
              >
                Use last
              </AppButton>
            </div>
          ) : null}
          {hasBest ? (
            <p className={appTokens.exercisePickerStatsText}>
              Best: {bestSummaryText}
              {selectedStats.actualPrAt ? ` \u00b7 ${formatStatDate(selectedStats.actualPrAt)}` : ""}
              {selectedStats.prEst1rm != null ? `${bestSummaryText || selectedStats.actualPrAt ? " \u00b7 " : ""}Est 1RM ${Math.round(selectedStats.prEst1rm)}` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      <SharedExerciseGoalForm
        modality={goalModality}
        state={goalState}
        onStateChange={setGoalState}
        names={{
          sets: "targetSets",
          repsMin: "targetRepsMin",
          repsMax: "targetRepsMax",
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
        footerContent={goalPreviewNode}
        measurementLayoutMode="horizontal-scroll"
        visibleMetrics={isMeasurementOptionalSelected ? [] : undefined}
        visibleMetricOrder={isMeasurementOptionalSelected ? [] : undefined}
      />
    </section>
  ) : null;

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
        "space-y-1 md:space-y-0",
        "pr-0 md:snap-y md:snap-mandatory md:scroll-py-2",
      )}
    >
      {filteredExercises.map((exercise) => (
        <ExerciseRow
          key={exercise.id}
          exercise={exercise}
          isSelected={exercise.id === selectedId}
          hasStats={hasExerciseStatsSignal(statsByExerciseId.get(resolveCanonicalExerciseId(exercise)))}
          metadata={<ExerciseMetaLine items={exerciseMetadataById.get(exercise.id) ?? []} />}
          onPress={handleExercisePress}
        />
      ))}
      {filteredExercises.length === 0 ? <EmptyExerciseRow /> : null}
    </ul>
  );

  return (
    <div className={cn(appTokens.exercisePickerRoot, "relative flex min-h-0 flex-1 flex-col space-y-0 overflow-visible")}>
      <input type="hidden" name={name} value={selectedCanonicalExerciseId ?? selectedId} required />

      <div className="sticky top-0 z-30 bg-[linear-gradient(180deg,rgba(7,14,24,0.985),rgba(7,14,24,0.95)_66%,rgba(7,14,24,0.18)_88%,rgba(7,14,24,0)_100%)] backdrop-blur-md">
        <ExercisePickerBleed className="overflow-visible pb-2 pt-1">
          <section className={cn(appTokens.exercisePickerPanel, "space-y-1 rounded-none border-0 bg-transparent px-4 pb-2 pt-0 shadow-none")}>
          <ExerciseSearchFilters
            query={search}
            onQueryChange={setSearch}
            selectedTags={selectedTags}
            onTagsChange={setSelectedTags}
            groups={availableTagGroups}
            resultCount={filteredExercises.length}
            className="space-y-1.5"
            filterClassName="space-y-1"
          />
          </section>
        </ExercisePickerBleed>
      </div>

      <div className="relative mt-1 flex min-h-0 flex-1 w-full max-w-full overflow-hidden">
        <PickerListViewport
          plainOnMobile
          showFade={false}
          className="flex h-full min-h-0 flex-1"
          viewportClassName="hide-scrollbar h-full min-h-0 overflow-y-auto overscroll-contain px-0 pb-[calc(var(--bottom-actions-height,10.5rem)+11.5rem)] pr-0"
        >
          <div className="min-h-full pl-1.5 pr-0.5 pb-4">
            {exerciseListContent}
          </div>
        </PickerListViewport>
      </div>

      {configureGoalDockNode ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--bottom-actions-height,10.5rem)+0.15rem)] z-50">
          <div className={`${BOTTOM_ACTION_SHELL_CLASSNAME} pointer-events-auto`}>
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

