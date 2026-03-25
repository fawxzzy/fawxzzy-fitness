"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/Input";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { PickerListViewport } from "@/components/ui/PickerListViewport";
import { MeasurementConfigurator } from "@/components/ui/measurements/MeasurementConfigurator";
import { GoalSummaryInline } from "@/components/ui/measurements/GoalSummaryInline";
import { ExerciseTagFilterControl } from "@/components/ExerciseTagFilterControl";
import { cn } from "@/lib/cn";
import { resolveCanonicalExerciseId, type ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import { getExerciseIconSrc } from "@/lib/exerciseImages";
import { sanitizeEnabledMeasurementValues } from "@/lib/measurement-sanitization";

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
  }) => ReactNode;
};

type TagFilterGroup = "muscle" | "movement" | "equipment" | "other";

type ExerciseRowProps = {
  exercise: ExerciseOption;
  isSelected: boolean;
  metadata: string;
  iconSrc: string;
  onPress: (exerciseId: string, isSelected: boolean) => void;
};

const tagGroupLabels: Record<TagFilterGroup, string> = {
  muscle: "Muscle",
  movement: "Movement",
  equipment: "Equipment",
  other: "Other",
};

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

function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function ExerciseThumbnail({ exercise, iconSrc }: { exercise: ExerciseOption; iconSrc: string }) {
  return (
    <ExerciseAssetImage
      src={iconSrc}
      alt={`${exercise.name} icon`}
      className="h-10 w-10 rounded-md border border-border/40"
      imageClassName="object-cover object-center"
      sizes="40px"
    />
  );
}

const ExerciseRow = memo(function ExerciseRow({ exercise, isSelected, metadata, iconSrc, onPress }: ExerciseRowProps) {
  return (
    <li>
      <ExerciseCard
        title={exercise.name}
        subtitle={metadata || undefined}
        variant="compact"
        state={isSelected ? "selected" : "default"}
        onPress={() => onPress(exercise.id, isSelected)}
        leadingVisual={<ExerciseThumbnail exercise={exercise} iconSrc={iconSrc} />}
        className={cn(listShellClasses.card, "items-center")}
        trailingClassName={cn("self-center", isSelected ? "text-[rgb(var(--text)/0.98)]" : "text-muted")}
        rightIcon={(
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex min-h-7 min-w-[3.75rem] items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold leading-none",
              isSelected
                ? "border-emerald-400/40 bg-emerald-400/18 text-[rgb(var(--text)/0.98)] shadow-[0_6px_18px_-14px_rgba(96,200,130,0.95)]"
                : "border-border/45 bg-[rgb(var(--bg)/0.32)] text-muted",
            )}
          >
            {isSelected ? "Selected" : "Select"}
          </span>
        )}
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
  const [isMeasurementsOpen, setIsMeasurementsOpen] = useState(true);
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
  const [selectedDefaultUnit, setSelectedDefaultUnit] = useState<"mi" | "km" | "m">("mi");
  const [selectedMeasurements, setSelectedMeasurements] = useState<Array<"reps" | "weight" | "time" | "distance" | "calories">>([]);
  const [targetRepsMin, setTargetRepsMin] = useState("");
  const [targetRepsMax, setTargetRepsMax] = useState("");
  const [targetSets, setTargetSets] = useState("3");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetWeightUnit, setTargetWeightUnit] = useState<"lbs" | "kg">(routineTargetConfig?.weightUnit ?? "lbs");
  const [targetDuration, setTargetDuration] = useState("");
  const [targetDistance, setTargetDistance] = useState("");
  const [targetCalories, setTargetCalories] = useState("");
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

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    return uniqueExercises.filter((exercise) => {
      const matchesQuery = !query || exercise.name.toLowerCase().includes(query);
      if (!matchesQuery) return false;
      if (!selectedTags.length) return true;
      const tags = exerciseTagsById.get(exercise.id);
      if (!tags || tags.size === 0) return false;
      return selectedTags.every((tag) => tags.has(tag));
    });
  }, [exerciseTagsById, search, selectedTags, uniqueExercises]);

  const selectedExercise = uniqueExercises.find((exercise) => exercise.id === selectedId);
  useEffect(() => {
    onSelectedExerciseChange?.(selectedExercise ?? null);
  }, [onSelectedExerciseChange, selectedExercise]);
  const exerciseMetadataById = useMemo(() => new Map(uniqueExercises.map((exercise) => [exercise.id, [exercise.primary_muscle, exercise.movement_pattern, exercise.equipment].filter(Boolean).join(" • ")])), [uniqueExercises]);
  const exerciseIconSrcById = useMemo(() => new Map(uniqueExercises.map((exercise) => [exercise.id, getExerciseIconSrc(exercise)])), [uniqueExercises]);
  const selectedCanonicalExerciseId = selectedExercise ? resolveCanonicalExerciseId(selectedExercise) : null;
  const selectedStats = selectedCanonicalExerciseId ? statsByExerciseId.get(selectedCanonicalExerciseId) : undefined;
  const hasLast = selectedStats ? (selectedStats.lastWeight != null && selectedStats.lastReps != null) : false;
  const hasPR = selectedStats ? ((selectedStats.prWeight != null && selectedStats.prReps != null) || selectedStats.prEst1rm != null) : false;

  const resetMeasurementFields = useCallback(() => {
    setTargetSets("3");
    setTargetRepsMin("");
    setTargetRepsMax("");
    setTargetWeight("");
    setTargetWeightUnit(routineTargetConfig?.weightUnit ?? "lbs");
    setTargetDuration("");
    setTargetDistance("");
    setTargetCalories("");
  }, [routineTargetConfig?.weightUnit]);

  useEffect(() => {
    if (!selectedExercise || !routineTargetConfig || previousExerciseIdRef.current === selectedExercise.id) {
      return;
    }

    const nextMeasurementType = getDefaultMeasurementType(selectedExercise);
    const nextDefaultUnit = selectedExercise.default_unit === "km" || selectedExercise.default_unit === "m"
      ? selectedExercise.default_unit
      : "mi";

    setSelectedMeasurements(nextMeasurementType === "time" ? ["time"] : ["reps", "weight"]);
    setSelectedDefaultUnit(nextDefaultUnit);
    resetMeasurementFields();
    setDidApplyLast(false);
    previousExerciseIdRef.current = selectedExercise.id;
  }, [resetMeasurementFields, routineTargetConfig, selectedExercise]);

  const isCardio = selectedExercise ? normalizeExerciseTags(selectedExercise).has("cardio") : false;

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

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search exercises" className="pr-9" />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear exercise search"
              className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2-soft hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/25"
            >
              ×
            </button>
          ) : null}
        </div>
        <ExerciseTagFilterControl selectedTags={selectedTags} onChange={setSelectedTags} groups={availableTagGroups} className="space-y-2" />
      </div>

      <input type="hidden" name={name} value={selectedCanonicalExerciseId ?? selectedId} required />

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Selected exercise</p>
          <p className="text-xs text-muted">{filteredExercises.length} shown</p>
        </div>
        {selectedExercise ? (
          <ExerciseCard
            title={selectedExercise.name}
            subtitle={exerciseMetadataById.get(selectedExercise.id) || "No details"}
            variant="summary"
            state="selected"
            leadingVisual={<ExerciseThumbnail exercise={selectedExercise} iconSrc={exerciseIconSrcById.get(selectedExercise.id) ?? getExerciseIconSrc(selectedExercise)} />}
            badgeText="Selected"
            rightIcon={null}
            className="shadow-[0_10px_24px_-18px_rgba(96,200,130,0.95)]"
          />
        ) : (
          <div className="rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.66)] px-4 py-3 text-sm text-muted">
            Select an exercise to continue.
          </div>
        )}
      </section>


      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Exercises</p>
        </div>
        <PickerListViewport className={listShellClasses.card}>
          <ul
            className={cn(listShellClasses.viewport, listShellClasses.list)}
          >
            {filteredExercises.map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                isSelected={exercise.id === selectedId}
                metadata={exerciseMetadataById.get(exercise.id) ?? ""}
                iconSrc={exerciseIconSrcById.get(exercise.id) ?? getExerciseIconSrc(exercise)}
                onPress={handleExercisePress}
              />
            ))}
            {filteredExercises.length === 0 ? <li className="rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.68)] px-4 py-4 text-sm text-muted">No exercises match your filters.</li> : null}
          </ul>
        </PickerListViewport>
      </section>

      {routineTargetConfig && selectedExercise ? (
        <section className="space-y-3 rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.46)] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Configure goal</p>
          {selectedMeasurements.map((metric) => <input key={`selected-measurement-${metric}`} type="hidden" name="measurementSelections" value={metric} />)}

          <div className="space-y-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">Sets</p>
            <Input type="number" min={1} name="targetSets" value={targetSets} onChange={(event) => setTargetSets(event.target.value)} placeholder={isCardio ? "Intervals" : "Sets"} required className="min-h-10 rounded-lg border-border/45 bg-[rgb(var(--bg)/0.24)]" />
          </div>

          {selectedStats && (hasLast || hasPR) ? (
            <div className={cn("space-y-1 px-0.5 text-xs text-muted", didApplyLast ? "text-[rgb(var(--text)/0.9)]" : undefined)}>
              {hasLast ? <p>Last: {formatMeasurementStat(selectedStats.lastWeight, selectedStats.lastReps, selectedStats.lastUnit)}{selectedStats.lastPerformedAt ? ` · ${formatStatDate(selectedStats.lastPerformedAt)}` : ""}</p> : null}
              {hasPR ? <p>PR: {selectedStats.prWeight != null && selectedStats.prReps != null ? formatMeasurementStat(selectedStats.prWeight, selectedStats.prReps, null) : null}{selectedStats.prEst1rm != null ? `${selectedStats.prWeight != null && selectedStats.prReps != null ? " · " : ""}Est 1RM ${Math.round(selectedStats.prEst1rm)}` : ""}</p> : null}
              {hasLast ? (
                <div className="pt-0.5">
                  <AppButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTargetWeight(String(selectedStats.lastWeight));
                      setTargetRepsMin(String(selectedStats.lastReps));
                      setTargetRepsMax(String(selectedStats.lastReps));
                      if (selectedStats.lastUnit === "kg" || selectedStats.lastUnit === "lbs") setTargetWeightUnit(selectedStats.lastUnit);
                      setSelectedMeasurements((current) => Array.from(new Set([...current, "weight", "reps"])));
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

          <MeasurementConfigurator
            values={{ reps: targetRepsMin, repsMax: targetRepsMax, weight: targetWeight, duration: targetDuration, distance: targetDistance, calories: targetCalories, weightUnit: targetWeightUnit, distanceUnit: selectedDefaultUnit }}
            activeMetrics={{ reps: selectedMeasurements.includes("reps"), weight: selectedMeasurements.includes("weight"), time: selectedMeasurements.includes("time"), distance: selectedMeasurements.includes("distance"), calories: selectedMeasurements.includes("calories") }}
            isExpanded={isMeasurementsOpen}
            onExpandedChange={setIsMeasurementsOpen}
            onMetricToggle={(metric) => setSelectedMeasurements((current) => {
              const nextMeasurements = current.includes(metric) ? current.filter((value) => value !== metric) : [...current, metric];
              const sanitizedValues = sanitizeEnabledMeasurementValues({
                reps: nextMeasurements.includes("reps"),
                weight: nextMeasurements.includes("weight"),
                time: nextMeasurements.includes("time"),
                distance: nextMeasurements.includes("distance"),
                calories: nextMeasurements.includes("calories"),
              }, {
                reps: targetRepsMin,
                weight: targetWeight,
                duration: targetDuration,
                distance: targetDistance,
                calories: targetCalories,
              });
              setTargetRepsMin(sanitizedValues.reps);
              setTargetRepsMax(nextMeasurements.includes("reps") ? targetRepsMax : "");
              setTargetWeight(sanitizedValues.weight);
              setTargetDuration(sanitizedValues.duration);
              setTargetDistance(sanitizedValues.distance);
              setTargetCalories(sanitizedValues.calories);
              return nextMeasurements;
            })}
            onChange={(patch) => {
              if (patch.reps !== undefined) setTargetRepsMin(patch.reps);
              if (patch.repsMax !== undefined) setTargetRepsMax(patch.repsMax);
              if (patch.weight !== undefined) setTargetWeight(patch.weight);
              if (patch.duration !== undefined) setTargetDuration(patch.duration);
              if (patch.distance !== undefined) setTargetDistance(patch.distance);
              if (patch.calories !== undefined) setTargetCalories(patch.calories);
              if (patch.weightUnit !== undefined) setTargetWeightUnit(patch.weightUnit);
              if (patch.distanceUnit !== undefined) setSelectedDefaultUnit(patch.distanceUnit);
            }}
            names={{ reps: "targetRepsMin", repsMax: "targetRepsMax", weight: "targetWeight", duration: "targetDuration", distance: "targetDistance", calories: "targetCalories", weightUnit: "targetWeightUnit", distanceUnit: "targetDistanceUnit" }}
            showHeader
            heading="MEASUREMENTS"
            description={undefined}
          />

          <GoalSummaryInline
            values={{
              ...sanitizeEnabledMeasurementValues(
                {
                  reps: selectedMeasurements.includes("reps"),
                  weight: selectedMeasurements.includes("weight"),
                  time: selectedMeasurements.includes("time"),
                  distance: selectedMeasurements.includes("distance"),
                  calories: selectedMeasurements.includes("calories"),
                },
                {
                  reps: targetRepsMin ? Number(targetRepsMin) : null,
                  weight: targetWeight ? Number(targetWeight) : null,
                  durationSeconds: parseDurationInput(targetDuration),
                  distance: targetDistance ? Number(targetDistance) : null,
                  calories: targetCalories ? Number(targetCalories) : null,
                },
              ),
              sets: targetSets ? Number(targetSets) : null,
              repsMax: selectedMeasurements.includes("reps") && targetRepsMax ? Number(targetRepsMax) : null,
              weightUnit: targetWeightUnit,
              distanceUnit: selectedDefaultUnit,
              emptyLabel: "-",
            }}
          />
          <input type="hidden" name="defaultUnit" value={selectedMeasurements.includes("distance") ? selectedDefaultUnit : "mi"} />
        </section>
      ) : null}

      {renderFooter ? renderFooter({
        selectedExercise,
        selectedCanonicalExerciseId,
        filteredExercises,
        openExerciseInfo,
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
