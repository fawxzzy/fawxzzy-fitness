"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { ContentRail } from "@/components/layout/ContentRail";
import { appTokens } from "@/components/ui/app/tokens";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { PickerListViewport } from "@/components/ui/PickerListViewport";
import { buildFailureToggleInfoPayload, type ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { measurementDockSurfaceClassName } from "@/components/ui/measurements/MeasurementDock";
import { SharedExerciseGoalForm, inferGoalModeFromState } from "@/components/ui/measurements/SharedExerciseGoalForm";
import { DEFAULT_EXERCISE_SEARCH_FILTERS_STACK_CLASSNAME, ExerciseSearchFilters } from "@/components/exercises/ExerciseSearchFilters";
import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { SignatureInlineList } from "@/components/ui/app/SignatureSeparator";
import { ChevronDownIcon } from "@/components/ui/Chevrons";
import { ACTION_CHROME_CONTROL_CLASS_NAME, ACTION_CHROME_SEGMENTED_CLASS_NAME } from "@/components/ui/actionChrome";
import { GLOW_SWITCH_STANDARD_CLASS_NAME } from "@/components/ui/GlowSwitch";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { VerticalScrollHint } from "@/components/ui/VerticalScrollHint";
import { cn } from "@/lib/cn";
import { estimateCaloriesFromExerciseMetrics, resolveCaloriesEstimationMethod } from "@/lib/calorie-estimation";
import { resolveCanonicalExerciseId } from "@/lib/exercise-picker-stats";
import { isMeasurementOptionalExercise } from "@/lib/exercise-metadata";
import { EXERCISE_CURATION_GROUPS, flattenExerciseCurationTagValues, formatExerciseTagLabel, normalizeExerciseCurationTags, buildScopedExerciseCurationTagValue } from "@/lib/exercise-curation";
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
import { type ExercisePickerProps, type TagFilterGroup, type CustomExerciseFilterSectionKey } from "./exercise-picker/types";
import { tagGroupLabels, customExerciseFilterStageClassName, ensureSelectedTagsInGroups, normalizeTagValue, normalizeExerciseTags, appendTagsWithGroup, buildScopedFilterTagValue, appendScopedFilterTags, formatTagLabel, buildSingleSelectTags, buildCustomExerciseTagGroups, CustomExerciseFilterRailCard } from "./exercise-picker/filter";
import { EXERCISE_PICKER_CUSTOM_EXERCISE_ID, buildCustomExerciseTargetSummary, normalizeExerciseNameKey, buildCustomExerciseDraftOption, CustomExerciseRow } from "./exercise-picker/custom";
import { resolveExerciseDistanceUnit, buildUseLastInfoPayload, applyConfiguredSetupToGoalState, buildFreshGoalStateForExercise, parseDurationInput, hasAnyGoalMeasurementValue } from "./exercise-picker/goal";
import { formatLoggedMeasurementStat, hasConfiguredSetupSnapshot, collectConfiguredMeasurementSummaryParts, hasExerciseStatsSignal, resolveExerciseRowCueClasses, ExerciseRow, EmptyExerciseRow } from "./exercise-picker/list";

export { EXERCISE_PICKER_CUSTOM_EXERCISE_ID } from "./exercise-picker/custom";

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
  }, [clearToFreshGoalState, isCustomExerciseSelected, routineTargetConfig, selectedExercise]);

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
        ? "Set your goal"
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

  const renderCustomExerciseFilterStage = useCallback(() => {
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
  }, [
    activeCustomExerciseFilterSection,
    customExerciseEquipmentGroups,
    customExerciseEquipmentTags,
    customExerciseMovementGroups,
    customExerciseMovementTags,
    customExerciseMuscleTags,
    customExerciseSecondaryMuscleTags,
    filteredCustomExerciseMuscleGroups,
    filteredCustomExerciseSecondaryMuscleGroups,
  ]);

  const customExerciseTagRowsNode = useMemo(() => isCustomExerciseSelected ? (
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
  ) : null, [
    activeCustomExerciseFilterSection,
    customExerciseFilterSections,
    customExerciseName,
    isCustomExerciseSelected,
    renderCustomExerciseFilterStage,
    selectedCustomEquipment,
    selectedCustomMovementPattern,
    selectedCustomPrimaryMuscle,
    selectedCustomSecondaryMuscle,
  ]);

  const goalContentContext = useMemo(() => ({
    selectedExercise: activeSelectedExercise,
    goalState,
    goalModality,
    effectiveGoalModality,
    failureToggleInfoContent,
  }), [activeSelectedExercise, effectiveGoalModality, failureToggleInfoContent, goalModality, goalState]);
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
  const betweenInputsAndPreviewNode = useMemo(() => goalBetweenInputsAndPreviewContent
    ? (typeof goalBetweenInputsAndPreviewContent === "function"
      ? goalBetweenInputsAndPreviewContent(goalContentContext)
      : goalBetweenInputsAndPreviewContent)
    : null, [goalBetweenInputsAndPreviewContent, goalContentContext]);
  const combinedBetweenInputsAndPreviewNode = useMemo(() => customExerciseTagRowsNode || betweenInputsAndPreviewNode
    ? (
      <>
        {betweenInputsAndPreviewNode}
        {customExerciseTagRowsNode}
      </>
    )
    : null, [betweenInputsAndPreviewNode, customExerciseTagRowsNode]);
  const goalExtraNode = useMemo(() => goalExtraContent
    ? (typeof goalExtraContent === "function"
      ? goalExtraContent(goalContentContext)
      : goalExtraContent)
    : null, [goalContentContext, goalExtraContent]);
  const callerCompanionToggleCards = useMemo(() => goalCompanionToggleCardsProp
    ? (typeof goalCompanionToggleCardsProp === "function"
      ? goalCompanionToggleCardsProp(goalContentContext)
      : goalCompanionToggleCardsProp)
    : [], [goalCompanionToggleCardsProp, goalContentContext]);
  const callerLowerCompanionToggleCards = useMemo(() => goalLowerCompanionToggleCardsProp
    ? (typeof goalLowerCompanionToggleCardsProp === "function"
      ? goalLowerCompanionToggleCardsProp(goalContentContext)
      : goalLowerCompanionToggleCardsProp)
    : [], [goalContentContext, goalLowerCompanionToggleCardsProp]);
  const callerAuxiliaryFields = useMemo(() => goalAuxiliaryFieldsProp
    ? (typeof goalAuxiliaryFieldsProp === "function"
      ? goalAuxiliaryFieldsProp(goalContentContext)
      : goalAuxiliaryFieldsProp)
    : [], [goalAuxiliaryFieldsProp, goalContentContext]);
  const addFlowSecondaryToggleCardClassName = "relative inline-flex w-[7.35rem] min-w-[7.35rem] max-w-[7.35rem] shrink-0 flex-col text-center";
  const embeddedToggleButtonClassName = cn(
    ACTION_CHROME_CONTROL_CLASS_NAME,
    ACTION_CHROME_SEGMENTED_CLASS_NAME,
    GLOW_SWITCH_STANDARD_CLASS_NAME,
    "relative inline-flex w-full min-w-0 items-center justify-center overflow-visible rounded-full border-[rgb(var(--accent-strong)/0.54)] bg-[linear-gradient(180deg,rgba(71,215,196,0.18),rgba(18,31,48,0.96))] px-[0.42rem] pb-[0.28rem] pt-[0.46rem] text-[length:var(--type-caption)] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-primary))] ring-1 ring-[rgb(var(--accent-strong)/0.18)] shadow-[var(--action-chrome-shadow-hover)] focus-visible:ring-[rgb(var(--accent)/0.2)]",
  );
  const embeddedToggleLabelClassName = "pointer-events-none absolute right-2.5 top-0 z-[2] max-w-[calc(100%-1rem)] -translate-y-[38%] whitespace-nowrap bg-transparent text-right text-[length:var(--type-caption)] font-semibold uppercase leading-none tracking-[0.06em] text-[rgb(var(--accent-strong))]";
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
                "measurement-toggle__label min-w-0 flex-nowrap justify-center whitespace-nowrap text-center text-[length:var(--type-caption)] font-semibold leading-none text-inherit",
                "[&_.signature-inline-list__item]:whitespace-nowrap",
              )}
            />
          )}
          <ChevronDownIcon className="h-3 w-3 text-[rgb(var(--accent-strong)/0.94)]" />
        </span>
      </button>
    </div>
  ) : null;
  const resolvedCompanionToggleCards = useMemo(
    () => [
      ...callerCompanionToggleCards,
    ],
    [callerCompanionToggleCards],
  );
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
  const configureGoalDockNode = useMemo(() => routineTargetConfig && (selectedExercise || isCustomExerciseSelected) ? (
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
            : goalExtraNode
              ? "w-full max-h-[min(46dvh,26rem)] pr-1"
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
            wrapMeasurementFields
          />
        </div>
        {goalExtraNode ? (
          <div className="px-1 pb-1.5 pt-1">
            {goalExtraNode}
          </div>
        ) : null}
      </VerticalScrollHint>
    </section>
  ) : null, [
    activeSelectionCue.dockAccentBarClassName,
    activeSelectionCue.dockShellClassName,
    callerAuxiliaryFields,
    callerLowerCompanionToggleCards,
    combinedBetweenInputsAndPreviewNode,
    compactGoalDockViewport,
    goalExtraNode,
    goalInlineFailureToggle,
    goalModality,
    goalState,
    handleGoalStateChange,
    isCustomExerciseSelected,
    isMeasurementOptionalSelected,
    resolvedCompanionToggleCards,
    routineTargetConfig,
    selectedExercise,
  ]);
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
      {filteredExercises.length === 0 ? (
        <EmptyExerciseRow
          libraryEmpty={uniqueExercises.length === 0}
          onClearFilters={search.trim().length > 0 || selectedTags.length > 0
            ? () => {
              setSearch("");
              setSelectedTags([]);
            }
            : undefined}
        />
      ) : null}
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
