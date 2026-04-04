"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { AppButton } from "@/components/ui/AppButton";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { PickerListViewport } from "@/components/ui/PickerListViewport";
import { type ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { SharedExerciseGoalForm, inferGoalModeFromState } from "@/components/ui/measurements/SharedExerciseGoalForm";
import { ExerciseSearchFilters } from "@/components/exercises/ExerciseSearchFilters";
import { cn } from "@/lib/cn";
import { resolveCanonicalExerciseId, type ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import { deriveGoalMeasurementSelections, resolveGoalModality, validateGoalConfiguration, type GoalModality, type MeasurementSelection } from "@/lib/exercise-goal-validation";

type ExerciseOption = {
  id: string;
  exercise_id?: string | null;
  name: string;
  user_id: string | null;
  is_global: boolean;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance";
  default_unit: string | null;
  calories_estimation_method: string | null;
  image_howto_path: string | null;
  how_to_short?: string | null;
  image_icon_path?: string | null;
  slug?: string | null;
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
  metadata: string;
  onPress: (exerciseId: string, isSelected: boolean) => void;
};

const tagGroupLabels: Record<TagFilterGroup, string> = {
  muscle: "Muscle",
  movement: "Movement",
  equipment: "Equipment",
  other: "Other",
};

const pickerRowMobileDensityClassNames = {
  card: "max-md:min-h-[3.45rem] max-md:rounded-[0.74rem] max-md:border-border/30 max-md:bg-[rgb(var(--surface-2-soft)/0.44)] max-md:px-2.25 max-md:py-1.5 max-md:shadow-none",
  body: "max-md:gap-2",
  title: "max-md:text-[0.89rem] max-md:leading-[1.2] max-md:whitespace-nowrap max-md:overflow-hidden max-md:text-ellipsis",
  titleContainer: "max-md:space-y-0.25",
  subtitle: "max-md:text-[10px] max-md:leading-[1.15] max-md:line-clamp-1",
  content: "max-md:space-y-0.35",
  trailing: "max-md:min-w-[3.05rem]",
  selectPill: "max-md:min-h-5.5 max-md:min-w-[2.95rem] max-md:px-1.5 max-md:text-[10px]",
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

function getDefaultMeasurementType(exercise: ExerciseOption) {
  const tags = normalizeExerciseTags(exercise);
  if (tags.has("cardio")) {
    return "time" as const;
  }

  return "reps" as const;
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

const ExerciseRow = memo(function ExerciseRow({ exercise, isSelected, hasStats, metadata, onPress }: ExerciseRowProps) {
  return (
    <li>
      <StandardExerciseRow
        exercise={exercise}
        summary={metadata || undefined}
        variant="compact"
        state={isSelected ? "selected" : "default"}
        onPress={() => onPress(exercise.id, isSelected)}
        rightIcon={(
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex min-h-7 min-w-[3.75rem] items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold leading-none",
              pickerRowMobileDensityClassNames.selectPill,
              isSelected
                ? "border-emerald-400/35 bg-emerald-400/14 text-[rgb(var(--text)/0.98)] shadow-[0_5px_16px_-14px_rgba(96,200,130,0.88)]"
                : "border-border/45 bg-[rgb(var(--bg)/0.32)] text-muted",
            )}
          >
            {isSelected ? "Selected" : "Select"}
          </span>
        )}
        className={cn(
          "md:rounded-[1.05rem] md:border md:border-[rgb(var(--glass-tint-rgb)/var(--glass-current-border-alpha))] md:bg-[rgb(var(--glass-tint-rgb)/0.74)] md:p-3.5 md:shadow-[0_10px_20px_-14px_rgba(0,0,0,0.88)]",
          pickerRowMobileDensityClassNames.card,
          isSelected ? "max-md:border-emerald-300/28 max-md:bg-emerald-500/7" : undefined,
          hasStats
            ? "border-emerald-400/35 bg-emerald-500/10 hover:bg-emerald-500/14 max-md:border-emerald-400/24 max-md:bg-emerald-500/8 max-md:hover:bg-emerald-500/12"
            : undefined,
        )}
        trailingClassName={cn(
          pickerRowMobileDensityClassNames.trailing,
          isSelected ? "text-[rgb(var(--text)/0.98)]" : "text-muted",
        )}
        bodyClassName={pickerRowMobileDensityClassNames.body}
        titleClassName={pickerRowMobileDensityClassNames.title}
        titleContainerClassName={pickerRowMobileDensityClassNames.titleContainer}
        subtitleClassName={pickerRowMobileDensityClassNames.subtitle}
        contentClassName={pickerRowMobileDensityClassNames.content}
      />
    </li>
  );
});

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

  const availableTagGroups = useMemo(() => {
    const tagsByValue = new Map<string, { label: string; group: TagFilterGroup }>();

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

    return (Object.keys(tagGroupLabels) as TagFilterGroup[])
      .map((group) => ({ key: group, label: tagGroupLabels[group], tags: groupedTags[group].sort((a, b) => a.label.localeCompare(b.label)) }))
      .filter((group) => group.tags.length > 0);
  }, [uniqueExercises]);

  const selectedExercise = uniqueExercises.find((exercise) => exercise.id === selectedId);

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
  const exerciseMetadataById = useMemo(() => new Map(uniqueExercises.map((exercise) => [exercise.id, [exercise.primary_muscle, exercise.movement_pattern, exercise.equipment].filter(Boolean).join(" • ")])), [uniqueExercises]);
  const selectedCanonicalExerciseId = selectedExercise ? resolveCanonicalExerciseId(selectedExercise) : null;
  const selectedStats = selectedCanonicalExerciseId ? statsByExerciseId.get(selectedCanonicalExerciseId) : undefined;
  const hasLast = selectedStats ? (selectedStats.lastWeight != null && selectedStats.lastReps != null) : false;
  const hasPR = selectedStats ? ((selectedStats.prWeight != null && selectedStats.prReps != null) || selectedStats.prEst1rm != null) : false;

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

    const nextMeasurementType = getDefaultMeasurementType(selectedExercise);
    const nextDefaultUnit = selectedExercise.default_unit === "km" || selectedExercise.default_unit === "m"
      ? selectedExercise.default_unit
      : "mi";

    const defaultModality = nextMeasurementType === "time" ? "cardio_time" : "strength";
    setGoalState((current) => ({
      ...current,
      measurements: defaultModality === "cardio_time" ? ["time"] : ["reps", "weight"],
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
      tags: selectedTagSet,
    })
    : "strength";
  const effectiveGoalModality: GoalModality = goalModality === "cardio_time_distance"
    ? inferGoalModeFromState(goalState)
    : goalModality;

  const handleExercisePress = useCallback((exerciseId: string, isSelected: boolean) => {
    if (isSelected) {
      setIsExerciseInfoOpen(true);
      return;
    }
    setSelectedId(exerciseId);
  }, []);

  const openExerciseInfo = useCallback(() => {
    if (!selectedCanonicalExerciseId) return;
    setIsExerciseInfoOpen(true);
  }, [selectedCanonicalExerciseId]);

  const goalValidation = useMemo(() => validateGoalConfiguration({
    modality: effectiveGoalModality,
    sets: goalState.sets,
    repsMin: goalState.repsMin,
    repsMax: goalState.repsMax,
    weight: goalState.weight,
    duration: goalState.duration,
    distance: goalState.distance,
    calories: goalState.calories,
    measurementSelections: new Set(deriveGoalMeasurementSelections(effectiveGoalModality, {
      repsMin: goalState.repsMin,
      weight: goalState.weight,
      duration: goalState.duration,
      distance: goalState.distance,
      calories: goalState.calories,
    })),
  }), [effectiveGoalModality, goalState]);

  useEffect(() => {
    if (goalState.measurements.length > 0) return;
    const defaults: MeasurementSelection[] = goalModality === "cardio_time"
      ? ["time"]
      : goalModality === "cardio_distance"
        ? ["distance"]
        : goalModality === "cardio_time_distance"
          ? ["time"]
          : goalModality === "bodyweight"
            ? ["reps"]
            : ["reps", "weight"];
    setGoalState((current) => ({ ...current, measurements: defaults }));
  }, [goalModality, goalState.measurements.length]);

  const exerciseListContent = (
    <ul
      className={cn(
        "space-y-1 md:space-y-0",
        listShellClasses.viewport,
        "max-md:pr-0.5 md:snap-y md:snap-mandatory md:scroll-py-2",
      )}
    >
      {filteredExercises.map((exercise) => (
        <ExerciseRow
          key={exercise.id}
          exercise={exercise}
          isSelected={exercise.id === selectedId}
          hasStats={hasExerciseStatsSignal(statsByExerciseId.get(resolveCanonicalExerciseId(exercise)))}
          metadata={exerciseMetadataById.get(exercise.id) ?? ""}
          onPress={handleExercisePress}
        />
      ))}
      {filteredExercises.length === 0 ? <li className="rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.68)] px-4 py-4 text-sm text-muted">No exercises match your filters.</li> : null}
    </ul>
  );

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={selectedCanonicalExerciseId ?? selectedId} required />

      <section className="space-y-3.5 rounded-none border-0 bg-transparent p-0 shadow-none md:rounded-[1.35rem] md:border md:border-white/14 md:bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] md:p-3.5 md:shadow-[0_16px_34px_-20px_rgba(0,0,0,0.92)] lg:p-4">
        <ExerciseSearchFilters
          query={search}
          onQueryChange={setSearch}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          groups={availableTagGroups}
        />

        <section className="scroll-mb-24 space-y-2 px-1 md:px-0">
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Exercise Library</p>
            <p className="text-xs text-muted">{filteredExercises.length} shown</p>
          </div>
        </section>

        <PickerListViewport
          className="border-0 bg-transparent p-0 md:border-white/10 md:bg-[rgb(var(--surface-rgb)/0.3)]"
          viewportClassName="pr-0 md:pr-1"
          showFade
          plainOnMobile
          mobileTray
          constrainOnDesktop
        >
          {exerciseListContent}
        </PickerListViewport>
      </section>

      {routineTargetConfig && selectedExercise ? (
        <section className="scroll-mb-24 space-y-2.5 rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.46)] p-4 max-md:space-y-2 max-md:px-3 max-md:py-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Configure goal</p>
          {selectedStats && (hasLast || hasPR) ? (
            <div className={cn("space-y-1 px-0.5 text-xs text-muted max-md:space-y-0.75 max-md:text-[11px]", didApplyLast ? "text-[rgb(var(--text)/0.9)]" : undefined)}>
              {hasLast ? <p>Last: {formatMeasurementStat(selectedStats.lastWeight, selectedStats.lastReps, selectedStats.lastUnit)}{selectedStats.lastPerformedAt ? ` · ${formatStatDate(selectedStats.lastPerformedAt)}` : ""}</p> : null}
              {hasPR ? <p>PR: {selectedStats.prWeight != null && selectedStats.prReps != null ? formatMeasurementStat(selectedStats.prWeight, selectedStats.prReps, null) : null}{selectedStats.prEst1rm != null ? `${selectedStats.prWeight != null && selectedStats.prReps != null ? " · " : ""}Est 1RM ${Math.round(selectedStats.prEst1rm)}` : ""}</p> : null}
              {hasLast ? (
                <div className="pt-0.5">
                  <AppButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setGoalState((current) => ({
                        ...current,
                        weight: String(selectedStats.lastWeight),
                        repsMin: String(selectedStats.lastReps),
                        repsMax: String(selectedStats.lastReps),
                        weightUnit: selectedStats.lastUnit === "kg" || selectedStats.lastUnit === "lbs" ? selectedStats.lastUnit : current.weightUnit,
                        measurements: Array.from(new Set([...current.measurements, "weight", "reps"])),
                      }));
                      setDidApplyLast(true);
                      setTimeout(() => setDidApplyLast(false), 1200);
                    }}
                  >
                    Use last
                  </AppButton>
                </div>
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
          />
          {!goalValidation.isValid ? (
            <p className="rounded-lg border border-amber-300/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200/95 max-md:min-h-8 max-md:px-2.5 max-md:py-1.5 max-md:text-[11px] max-md:leading-4">
              {goalValidation.message}
            </p>
          ) : null}
        </section>
      ) : null}

      {renderFooter ? renderFooter({
        selectedExercise,
        selectedCanonicalExerciseId,
        filteredExercises,
        openExerciseInfo,
        goalValidation: {
          isValid: goalValidation.isValid,
          message: goalValidation.message,
        },
      }) : footerSlot}

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
