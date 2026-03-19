"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppButton } from "@/components/ui/AppButton";
import { Input } from "@/components/ui/Input";
import { InlineHintInput } from "@/components/ui/InlineHintInput";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { MeasurementConfigurator } from "@/components/ui/measurements/MeasurementConfigurator";
import { MeasurementSummary } from "@/components/ui/measurements/MeasurementSummary";
import { ExerciseTagFilterControl } from "@/components/ExerciseTagFilterControl";
import { cn } from "@/lib/cn";
import { resolveCanonicalExerciseId, type ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import { getExerciseIconSrc } from "@/lib/exerciseImages";

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

const tagClassName = "rounded-full bg-surface-2-soft px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted";

function toTagArray(value: string[] | string | null | undefined) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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


function MetaTag({ value }: { value: string | null }) {
  if (!value) return null;
  return <span className={tagClassName}>{value}</span>;
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
      className="h-10 w-10 rounded-md border border-border/40 object-cover"
    />
  );
}


const ExerciseRow = memo(function ExerciseRow({ exercise, isSelected, metadata, iconSrc, onPress }: ExerciseRowProps) {
  return (
    <li>
      <ExerciseCard
        title={exercise.name}
        subtitle={metadata || undefined}
        onPress={() => onPress(exercise.id, isSelected)}
        leadingVisual={<ExerciseThumbnail exercise={exercise} iconSrc={iconSrc} />}
        className={cn(
          listShellClasses.card,
          "min-h-[5.25rem] items-center px-4 py-3.5",
          isSelected
            ? "border-accent/35 bg-accent/10 shadow-[0_10px_28px_-18px_rgba(96,200,130,0.95)] ring-1 ring-accent/20"
            : "bg-[rgb(var(--surface-2-soft)/0.6)] hover:bg-[rgb(var(--surface-2-soft)/0.78)]",
        )}
        trailingClassName={cn(
          "self-center",
          isSelected ? "text-[rgb(var(--text)/0.98)]" : "text-muted",
        )}
        rightIcon={(
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex min-h-7 min-w-[3.75rem] items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold leading-none",
              isSelected
                ? "border-accent/35 bg-accent/20 text-text"
                : "border-border/50 bg-surface/50 text-muted",
            )}
          >
            {isSelected ? "Selected" : "Choose"}
          </span>
        )}
      />
    </li>
  );
});

export function ExercisePicker({ exercises, name, initialSelectedId, routineTargetConfig, exerciseStats = [] }: ExercisePickerProps) {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isMeasurementsOpen, setIsMeasurementsOpen] = useState(true);
  const [isExerciseInfoOpen, setIsExerciseInfoOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLUListElement | null>(null);
  const scrollPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollInputRef = useRef<HTMLInputElement | null>(null);

  const initialScrollTop = useMemo(() => {
    const raw = Number(searchParams.get("exerciseListScroll"));
    if (!Number.isFinite(raw) || raw < 0) return 0;
    return Math.round(raw);
  }, [searchParams]);

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
  const scrollSnapshotRef = useRef(initialScrollTop);
  const [selectedDefaultUnit, setSelectedDefaultUnit] = useState<"mi" | "km" | "m">("mi");
  const [selectedMeasurements, setSelectedMeasurements] = useState<Array<"reps" | "weight" | "time" | "distance" | "calories">>([]);
  const [targetRepsMin, setTargetRepsMin] = useState("");
  const [targetRepsMax, setTargetRepsMax] = useState("");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetWeightUnit, setTargetWeightUnit] = useState<"lbs" | "kg">(routineTargetConfig?.weightUnit ?? "lbs");
  const [targetDuration, setTargetDuration] = useState("");
  const [targetDistance, setTargetDistance] = useState("");
  const [targetCalories, setTargetCalories] = useState("");
  const [didApplyLast, setDidApplyLast] = useState(false);
  const previousExerciseIdRef = useRef<string>(selectedId);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    if (!initialScrollTop) return;

    scrollContainerRef.current.scrollTop = initialScrollTop;
  }, [initialScrollTop]);

  useEffect(() => {
    return () => {
      if (scrollPersistTimeoutRef.current) {
        clearTimeout(scrollPersistTimeoutRef.current);
      }
    };
  }, []);

  const persistScrollTop = useCallback((nextScrollTop: number) => {
    if (scrollPersistTimeoutRef.current) {
      clearTimeout(scrollPersistTimeoutRef.current);
    }

    scrollPersistTimeoutRef.current = setTimeout(() => {
      scrollSnapshotRef.current = nextScrollTop;
      if (scrollInputRef.current) {
        scrollInputRef.current.value = String(nextScrollTop);
      }
    }, 96);
  }, []);

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
      muscle: [],
      movement: [],
      equipment: [],
      other: [],
    };

    for (const [value, { label, group }] of tagsByValue.entries()) {
      groupedTags[group].push({ value, label: formatTagLabel(label) });
    }

    return (Object.keys(tagGroupLabels) as TagFilterGroup[])
      .map((group) => ({
        key: group,
        label: tagGroupLabels[group],
        tags: groupedTags[group].sort((a, b) => a.label.localeCompare(b.label)),
      }))
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
  const exerciseMetadataById = useMemo(() => new Map(uniqueExercises.map((exercise) => [exercise.id, [exercise.primary_muscle, exercise.movement_pattern, exercise.equipment].filter(Boolean).join(" • ")])), [uniqueExercises]);
  const exerciseIconSrcById = useMemo(() => new Map(uniqueExercises.map((exercise) => [exercise.id, getExerciseIconSrc(exercise)])), [uniqueExercises]);
  const selectedFilteredIndex = filteredExercises.findIndex((exercise) => exercise.id === selectedId);
  const selectedCanonicalExerciseId = selectedExercise ? resolveCanonicalExerciseId(selectedExercise) : null;
  const statsQueryExerciseId = selectedCanonicalExerciseId;
  const selectedStats = statsQueryExerciseId ? statsByExerciseId.get(statsQueryExerciseId) : undefined;
  const hasLast = selectedStats ? (selectedStats.lastWeight != null && selectedStats.lastReps != null) : false;
  const hasPR = selectedStats ? ((selectedStats.prWeight != null && selectedStats.prReps != null) || selectedStats.prEst1rm != null) : false;
  const resetMeasurementFields = useCallback(() => {
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

    if (nextMeasurementType === "time") {
      setSelectedMeasurements(["time"]);
    } else {
      setSelectedMeasurements(["reps", "weight"]);
    }
    setSelectedDefaultUnit(nextDefaultUnit);
    resetMeasurementFields();
    setDidApplyLast(false);
    previousExerciseIdRef.current = selectedExercise.id;
  }, [resetMeasurementFields, routineTargetConfig, selectedExercise]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    console.log("[ExercisePicker:MeasurementsStats]", {
      selectedExercise,
      queryId: statsQueryExerciseId,
      stats: selectedStats ?? null,
      hasStats: Boolean(selectedStats),
      hasLast,
      hasPR,
    });
  }, [hasLast, hasPR, selectedExercise, selectedStats, statsQueryExerciseId]);

  const isCardio = selectedExercise ? normalizeExerciseTags(selectedExercise).has("cardio") : false;

  const handleExercisePress = useCallback((exerciseId: string, isSelected: boolean) => {
    if (isSelected) {
      setIsExerciseInfoOpen(true);
      return;
    }

    setSelectedId(exerciseId);
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium text-muted">Search or filter, then choose the movement you want to add.</p>
        </div>
        <div className="relative">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search exercises"
          className="pr-9"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear exercise search"
              className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2-soft hover:text-text"
            >
              ×
            </button>
          ) : null}
        </div>

        <ExerciseTagFilterControl
          selectedTags={selectedTags}
          onChange={setSelectedTags}
          groups={availableTagGroups}
          className="space-y-2"
        />
      </div>
      <input type="hidden" name={name} value={selectedCanonicalExerciseId ?? selectedId} required />
      <input ref={scrollInputRef} type="hidden" name="exerciseListScroll" defaultValue={String(initialScrollTop)} />

      <div className={cn(
        "rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.66)] px-4 text-sm text-[rgb(var(--text))]",
        selectedExercise ? "py-3" : "py-2.5"
      )}>
        {selectedExercise ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Selected</p>
              <p
                className="overflow-hidden font-medium leading-5 text-text"
                style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
              >
                {selectedExercise.name}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              <MetaTag value={selectedExercise.equipment} />
              <MetaTag value={selectedExercise.primary_muscle} />
              <MetaTag value={selectedExercise.movement_pattern} />
            </div>
            <div className="flex flex-wrap gap-2">
              <AppButton type="button" variant="secondary" size="sm" onClick={() => setIsExerciseInfoOpen(true)}>
                Exercise info
              </AppButton>
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const selectedIndex = filteredExercises.findIndex((exercise) => exercise.id === selectedId);
                  if (selectedIndex <= 0) return;
                  setSelectedId(filteredExercises[selectedIndex - 1]?.id ?? selectedId);
                }}
                disabled={selectedFilteredIndex <= 0}
              >
                Previous
              </AppButton>
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const selectedIndex = filteredExercises.findIndex((exercise) => exercise.id === selectedId);
                  if (selectedIndex === -1 || selectedIndex >= filteredExercises.length - 1) return;
                  setSelectedId(filteredExercises[selectedIndex + 1]?.id ?? selectedId);
                }}
                disabled={selectedFilteredIndex === -1 || selectedFilteredIndex >= filteredExercises.length - 1}
              >
                Next
              </AppButton>
            </div>
          </div>
        ) : (
          <span className="text-muted">Select an exercise from the list above.</span>
        )}
      </div>


      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Pick an exercise</p>
            <p className="text-xs text-muted">{filteredExercises.length} shown</p>
          </div>
        </div>
        <div className={cn("relative rounded-[1.35rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.42)] p-2", listShellClasses.card)}>
          <ul
            ref={scrollContainerRef}
            onScroll={(event) => persistScrollTop(Math.round(event.currentTarget.scrollTop))}
            className={cn("max-h-[26rem] overflow-y-auto overscroll-contain pr-1 [scrollbar-gutter:stable]", listShellClasses.viewport, listShellClasses.list)}
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
            {filteredExercises.length === 0 ? (
              <li className="rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.68)] px-4 py-4 text-sm text-muted">
                No exercises match that search.
              </li>
            ) : null}
          </ul>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-md bg-gradient-to-t from-[rgb(var(--bg))] to-transparent" />
        </div>
      </div>

      {routineTargetConfig && selectedExercise ? (
        <div className="space-y-3 rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.58)] p-4">
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Configure goal</p>
            <p className="text-xs text-muted">Use the same shared goal and measurement language you see in planners, sessions, and history.</p>
          </div>
          {selectedMeasurements.map((metric) => (
            <input key={`selected-measurement-${metric}`} type="hidden" name="measurementSelections" value={metric} />
          ))}
          <div className="rounded-2xl border border-border/35 bg-[rgb(var(--bg)/0.12)] px-3 py-2"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Sets <span className="normal-case tracking-normal">(Required)</span></p><Input type="number" min={1} name="targetSets" placeholder={isCardio ? "Intervals" : "Sets"} required className="mt-2" /></div>

          <div className="space-y-3 rounded-[1.1rem] border border-border/60 bg-[rgb(var(--bg)/0.28)] p-3">
            <div className="flex flex-wrap justify-end gap-2">
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const nextMeasurementType = selectedExercise ? getDefaultMeasurementType(selectedExercise) : "reps";
                  setSelectedMeasurements(nextMeasurementType === "time" ? ["time"] : ["reps", "weight"]);
                  setSelectedDefaultUnit("mi");
                  resetMeasurementFields();
                }}
              >
                Reset measurements
              </AppButton>
            </div>

            {selectedStats && (hasLast || hasPR) ? (
              <div className={cn("space-y-1 rounded-md border border-border/50 bg-[rgb(var(--bg)/0.2)] px-2 py-1.5 text-xs text-muted", didApplyLast ? "border-accent/40" : "")}>
                {process.env.NODE_ENV === "development" ? (
                  <p className="font-mono text-[10px] text-muted/90">
                    DEBUG stats selectedCanonicalId={selectedCanonicalExerciseId ?? "none"} queryExerciseId={statsQueryExerciseId ?? "none"} statsFound={selectedStats ? "yes" : "no"} stats.exercise_id={selectedStats.statsExerciseId ?? "none"}
                  </p>
                ) : null}
                {hasLast ? (
                  <p>
                    Last: {formatMeasurementStat(selectedStats.lastWeight, selectedStats.lastReps, selectedStats.lastUnit)}
                    {selectedStats.lastPerformedAt ? ` · ${formatStatDate(selectedStats.lastPerformedAt)}` : ""}
                  </p>
                ) : null}
                {hasPR ? (
                  <p>
                    PR: {selectedStats.prWeight != null && selectedStats.prReps != null ? formatMeasurementStat(selectedStats.prWeight, selectedStats.prReps, null) : null}
                    {selectedStats.prEst1rm != null ? `${selectedStats.prWeight != null && selectedStats.prReps != null ? " · " : ""}Est 1RM ${Math.round(selectedStats.prEst1rm)}` : ""}
                  </p>
                ) : null}
                {hasLast ? (
                  <div className="flex justify-start">
                    <AppButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTargetWeight(String(selectedStats.lastWeight));
                        setTargetRepsMin(String(selectedStats.lastReps));
                        setTargetRepsMax(String(selectedStats.lastReps));
                        if (selectedStats.lastUnit === "kg" || selectedStats.lastUnit === "lbs") {
                          setTargetWeightUnit(selectedStats.lastUnit);
                        }
                        setSelectedMeasurements((current) => {
                          const next = new Set(current);
                          next.add("weight");
                          next.add("reps");
                          return Array.from(next);
                        });
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
              values={{
                reps: targetRepsMin,
                weight: targetWeight,
                duration: targetDuration,
                distance: targetDistance,
                calories: targetCalories,
                weightUnit: targetWeightUnit,
                distanceUnit: selectedDefaultUnit,
              }}
              activeMetrics={{
                reps: selectedMeasurements.includes("reps"),
                weight: selectedMeasurements.includes("weight"),
                time: selectedMeasurements.includes("time"),
                distance: selectedMeasurements.includes("distance"),
                calories: selectedMeasurements.includes("calories"),
              }}
              isExpanded={isMeasurementsOpen}
              onExpandedChange={setIsMeasurementsOpen}
              onMetricToggle={(metric) => {
                setSelectedMeasurements((current) => current.includes(metric) ? current.filter((value) => value !== metric) : [...current, metric]);
              }}
              onChange={(patch) => {
                if (patch.reps !== undefined) setTargetRepsMin(patch.reps);
                if (patch.weight !== undefined) setTargetWeight(patch.weight);
                if (patch.duration !== undefined) setTargetDuration(patch.duration);
                if (patch.distance !== undefined) setTargetDistance(patch.distance);
                if (patch.calories !== undefined) setTargetCalories(patch.calories);
                if (patch.weightUnit !== undefined) setTargetWeightUnit(patch.weightUnit);
                if (patch.distanceUnit !== undefined) setSelectedDefaultUnit(patch.distanceUnit);
              }}
              names={{
                reps: "targetRepsMin",
                weight: "targetWeight",
                duration: "targetDuration",
                distance: "targetDistance",
                calories: "targetCalories",
                weightUnit: "targetWeightUnit",
                distanceUnit: "targetDistanceUnit",
              }}
              description="Choose only the optional measurements this goal needs."
              collapsedLabel="Optional measurements"
              collapsedDescription="Turn on only the measurements you want to configure."
            />
            {selectedMeasurements.includes("reps") ? (
              <InlineHintInput type="number" min={1} name="targetRepsMax" hint="max" value={targetRepsMax} onChange={(event) => setTargetRepsMax(event.target.value)} />
            ) : null}
            <MeasurementSummary
              values={{
                reps: targetRepsMin ? Number(targetRepsMin) : null,
                weight: targetWeight ? Number(targetWeight) : null,
                weightUnit: targetWeightUnit,
                durationSeconds: parseDurationInput(targetDuration),
                distance: targetDistance ? Number(targetDistance) : null,
                distanceUnit: selectedDefaultUnit,
                calories: targetCalories ? Number(targetCalories) : null,
              }}
              emptyLabel="Open goal"
            />
          <input type="hidden" name="defaultUnit" value={selectedMeasurements.includes("distance") ? selectedDefaultUnit : "mi"} />
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
