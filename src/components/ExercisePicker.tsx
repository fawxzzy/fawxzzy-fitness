"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseInfoSheet } from "@/components/ExerciseInfoSheet";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pill, PillButton } from "@/components/ui/Pill";
import { InlineHintInput } from "@/components/ui/InlineHintInput";
import { ChevronDownIcon, ChevronUpIcon } from "@/components/ui/Chevrons";
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
  image_muscles_path?: string | null;
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

const tagGroupLabels: Record<TagFilterGroup, string> = {
  muscle: "Muscle",
  movement: "Movement",
  equipment: "Equipment",
  other: "Other",
};

const tagClassName = "rounded-full bg-surface-2-soft px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted";
const rowTagClassName = "rounded-full bg-surface-2-soft px-2 py-0.5 text-xs text-muted";

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

function ExerciseThumbnail({ exercise, iconSrc }: { exercise: ExerciseOption; iconSrc: string }) {
  return (
    <ExerciseAssetImage
      src={iconSrc}
      alt={`${exercise.name} icon`}
      className="h-10 w-10 rounded-md border border-border/40 object-cover"
    />
  );
}

export function ExercisePicker({ exercises, name, initialSelectedId, routineTargetConfig, exerciseStats = [] }: ExercisePickerProps) {
  const searchParams = useSearchParams();
  const [hasMounted, setHasMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isMeasurementsOpen, setIsMeasurementsOpen] = useState(false);
  const scrollContainerRef = useRef<HTMLUListElement | null>(null);
  const scrollPersistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [scrollTopSnapshot, setScrollTopSnapshot] = useState(initialScrollTop);
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
  const [info, setInfo] = useState<{ exercise: ExerciseOption; stats: ExerciseStatsOption | null } | null>(null);
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

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const persistScrollTop = (nextScrollTop: number) => {
    if (scrollPersistTimeoutRef.current) {
      clearTimeout(scrollPersistTimeoutRef.current);
    }

    scrollPersistTimeoutRef.current = setTimeout(() => {
      setScrollTopSnapshot((current) => (current === nextScrollTop ? current : nextScrollTop));
    }, 80);
  };

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

  const availableTags = useMemo(() => {
    return availableTagGroups.flatMap((group) => group.tags);
  }, [availableTagGroups]);

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

  const selectedTagSummary = useMemo(() => {
    if (selectedTags.length === 0) {
      return "0 filters selected: All";
    }

    const tagLabelsByValue = new Map(availableTags.map((tag) => [tag.value, tag.label]));
    const labels = selectedTags.map((tag) => tagLabelsByValue.get(tag) ?? formatTagLabel(tag));
    return `${selectedTags.length} filter${selectedTags.length === 1 ? "" : "s"} selected: ${labels.join(", ")}`;
  }, [availableTags, selectedTags]);

  const selectedExercise = uniqueExercises.find((exercise) => exercise.id === selectedId);
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

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-md border border-border/70 bg-[rgb(var(--bg)/0.28)] p-2.5">
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

        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsFiltersOpen((prev) => !prev)}
          aria-expanded={isFiltersOpen}
          className="w-full justify-between border border-border/60 bg-[rgb(var(--bg)/0.4)] [-webkit-tap-highlight-color:transparent]"
        >
          <span>Filters</span>
          <span className="ml-auto inline-flex items-center gap-2">
            <Pill active={isFiltersOpen} className="text-[10px] uppercase">{isFiltersOpen ? "Open" : "Closed"}</Pill>
            {isFiltersOpen ? <ChevronUpIcon className="h-4 w-4 text-muted" /> : <ChevronDownIcon className="h-4 w-4 text-muted" />}
          </span>
        </Button>

        <p className="text-xs text-muted">{selectedTags.length} selected · {selectedTags.length ? "Filtered" : "All"}</p>

        {isFiltersOpen ? (
          <div className="space-y-2">
            <PillButton
              type="button"
              active={selectedTags.length === 0}
              onClick={() => setSelectedTags([])}
            >
              All
            </PillButton>
            {availableTagGroups.map((group) => (
              <div key={group.key} className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{group.label}</p>
                <div className="flex gap-1 overflow-x-auto px-0.5 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
                  {group.tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.value);
                    return (
                      <PillButton
                        key={tag.value}
                        type="button"
                        active={isSelected}
                        onClick={() => {
                          setSelectedTags((prev) => {
                            if (prev.includes(tag.value)) {
                              return prev.filter((value) => value !== tag.value);
                            }

                            return [...prev, tag.value];
                          });
                        }}
                      >
                        {tag.label}
                      </PillButton>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted">{selectedTagSummary}</p>
          </div>
        ) : null}
      </div>
      <input type="hidden" name={name} value={selectedCanonicalExerciseId ?? selectedId} required />
      <input type="hidden" name="exerciseListScroll" value={scrollTopSnapshot} />

      <div className="rounded-md border border-border/60 bg-[rgb(var(--bg)/0.45)] px-3 py-2 text-sm text-[rgb(var(--text))]">
        {selectedExercise ? (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Selected exercise</p>
            <p
              className="overflow-hidden font-medium leading-5 text-text"
              style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}
            >
              {selectedExercise.name}
            </p>
            <div className="flex flex-wrap gap-1">
              <MetaTag value={selectedExercise.equipment} />
              <MetaTag value={selectedExercise.primary_muscle} />
              <MetaTag value={selectedExercise.movement_pattern} />
            </div>
          </div>
        ) : (
          <span className="text-muted">Select an exercise from the list below</span>
        )}
      </div>

      <div className="relative">
        <ul
          ref={scrollContainerRef}
          onScroll={(event) => persistScrollTop(Math.round(event.currentTarget.scrollTop))}
          className="max-h-64 overflow-y-auto overscroll-contain rounded-md border border-border/60 bg-[rgb(var(--bg)/0.25)] [scrollbar-gutter:stable]"
        >
          {filteredExercises.map((exercise) => {
            const isSelected = exercise.id === selectedId;
            const iconSrc = getExerciseIconSrc(exercise);

            return (
              <li key={exercise.id} className="border-b border-border/40 last:border-b-0">
                <div className={cn("flex min-h-12 items-center gap-2 px-3 py-2", isSelected ? "bg-surface-2-soft" : "bg-transparent hover:bg-surface-2-soft/60")}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(exercise.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <ExerciseThumbnail exercise={exercise} iconSrc={iconSrc} />
                    <span className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{exercise.name}</p>
                      <span className={cn("mt-1 flex flex-wrap gap-1", isSelected ? "" : "opacity-70")}>
                        {exercise.equipment ? <span className={rowTagClassName}>{exercise.equipment}</span> : null}
                        {exercise.primary_muscle ? <span className={cn("hidden sm:inline-flex", rowTagClassName)}>{exercise.primary_muscle}</span> : null}
                        {exercise.movement_pattern ? <span className={rowTagClassName}>{exercise.movement_pattern}</span> : null}
                      </span>
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation();
                      const canonicalExerciseId = resolveCanonicalExerciseId(exercise);
                      setInfo({
                        exercise,
                        stats: statsByExerciseId.get(canonicalExerciseId) ?? null,
                      });
                    }}
                    aria-label="Exercise info"
                    className="h-9 w-9 rounded-full px-0 text-base"
                  >
                    ⓘ
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-md bg-gradient-to-t from-[rgb(var(--bg))] to-transparent" />
      </div>

      <ExerciseInfoSheet
        exercise={info?.exercise ?? null}
        stats={info ? {
          exercise_id: info.stats?.statsExerciseId,
          last_weight: info.stats?.lastWeight ?? null,
          last_reps: info.stats?.lastReps ?? null,
          last_unit: info.stats?.lastUnit ?? null,
          last_performed_at: info.stats?.lastPerformedAt ?? null,
          pr_weight: info.stats?.prWeight ?? null,
          pr_reps: info.stats?.prReps ?? null,
          pr_est_1rm: info.stats?.prEst1rm ?? null,
        } : null}
        open={!!info && hasMounted}
        onOpenChange={(open) => {
          if (!open) {
            setInfo(null);
          }
        }}
      />

      {routineTargetConfig && selectedExercise ? (
        <div className="space-y-2 border-t border-border/50 pt-2">
          <Input type="number" min={1} name="targetSets" placeholder={isCardio ? "Intervals" : "Sets"} required />

          <div className="space-y-2 rounded-md border border-border/60 bg-[rgb(var(--bg)/0.28)] p-2">
            <button
              type="button"
              aria-expanded={isMeasurementsOpen}
              onClick={() => setIsMeasurementsOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm font-medium text-text transition-colors hover:bg-surface-2-soft/80 active:bg-surface-2-active/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 [-webkit-tap-highlight-color:transparent]"
            >
              <span>Measurements</span>
              {isMeasurementsOpen ? <ChevronUpIcon className="h-4 w-4 text-muted" /> : <ChevronDownIcon className="h-4 w-4 text-muted" />}
            </button>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                className="h-7 px-1 text-xs"
                onClick={() => {
                  const nextMeasurementType = selectedExercise ? getDefaultMeasurementType(selectedExercise) : "reps";
                  setSelectedMeasurements(nextMeasurementType === "time" ? ["time"] : ["reps", "weight"]);
                  setSelectedDefaultUnit("mi");
                  resetMeasurementFields();
                }}
              >
                Reset measurements
              </Button>
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
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-7 px-1 text-xs"
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
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isMeasurementsOpen ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {(["reps", "weight", "time", "distance", "calories"] as const).map((metric) => (
                  <label key={metric} className="flex items-center gap-2 rounded-md bg-[rgb(var(--bg)/0.35)] px-2 py-1">
                    <input
                      type="checkbox"
                      name="measurementSelections"
                      value={metric}
                      checked={selectedMeasurements.includes(metric)}
                      onChange={(event) => {
                        setSelectedMeasurements((current) => {
                          if (event.target.checked) return [...current, metric];
                          return current.filter((value) => value !== metric);
                        });
                      }}
                    />
                    {metric === "reps" ? "Reps" : metric === "weight" ? "Weight" : metric === "time" ? "Time (duration)" : metric === "distance" ? "Distance" : "Calories"}
                  </label>
                ))}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              {selectedMeasurements.includes("reps") ? (
                <div className="col-span-2 grid grid-cols-2 gap-2">
                  <InlineHintInput type="number" min={1} name="targetRepsMin" hint="min" value={targetRepsMin} onChange={(event) => setTargetRepsMin(event.target.value)} />
                  <InlineHintInput type="number" min={1} name="targetRepsMax" hint="max" value={targetRepsMax} onChange={(event) => setTargetRepsMax(event.target.value)} />
                </div>
              ) : null}
              {selectedMeasurements.includes("weight") ? (
                <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <InlineHintInput type="number" min={0} step="0.5" name="targetWeight" hint={routineTargetConfig.weightUnit} value={targetWeight} onChange={(event) => setTargetWeight(event.target.value)} />
                  <select name="targetWeightUnit" value={targetWeightUnit} onChange={(event) => setTargetWeightUnit(event.target.value === "kg" ? "kg" : "lbs")} className="h-11 rounded-md border border-border bg-[rgb(var(--bg)/0.4)] px-3 py-2 text-sm">
                    <option value="lbs">lbs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              ) : null}
              {selectedMeasurements.includes("time") ? (
                <InlineHintInput name="targetDuration" hint="mm:ss" value={targetDuration} onChange={(event) => setTargetDuration(event.target.value)} containerClassName="col-span-2" />
              ) : null}
              {selectedMeasurements.includes("distance") ? (
                <div className="col-span-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                  <InlineHintInput type="number" min={0} step="0.01" name="targetDistance" hint={selectedDefaultUnit} value={targetDistance} onChange={(event) => setTargetDistance(event.target.value)} />
                  <select name="targetDistanceUnit" value={selectedDefaultUnit} onChange={(event) => setSelectedDefaultUnit(event.target.value as "mi" | "km" | "m")} className="h-11 rounded-md border border-border bg-[rgb(var(--bg)/0.4)] px-3 py-2 text-sm">
                    <option value="mi">mi</option>
                    <option value="km">km</option>
                    <option value="m">m</option>
                  </select>
                </div>
              ) : null}
              {selectedMeasurements.includes("calories") ? (
                <InlineHintInput type="number" min={0} step="1" name="targetCalories" hint="cal" value={targetCalories} onChange={(event) => setTargetCalories(event.target.value)} containerClassName="col-span-2" />
              ) : null}
            </div>
          <input type="hidden" name="defaultUnit" value={selectedMeasurements.includes("distance") ? selectedDefaultUnit : "mi"} />
        </div>
      </div>
      ) : null}
    </div>
  );
}
