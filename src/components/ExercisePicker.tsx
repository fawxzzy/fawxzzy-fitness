"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { InlineHintInput } from "@/components/ui/InlineHintInput";
import { getExerciseHowToImageSrc, getExerciseIconSrc, getExerciseMusclesImageSrc } from "@/lib/exerciseImages";

type ExerciseOption = {
  id: string;
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

const tagClassName = "rounded-full border border-border bg-surface-2-soft px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted";

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

function ExerciseThumbnail({ exercise, iconSrc }: { exercise: ExerciseOption; iconSrc: string }) {
  return (
    <ExerciseAssetImage
      src={iconSrc}
      alt={`${exercise.name} icon`}
      className="h-8 w-8 rounded-md border border-border object-cover"
    />
  );
}

export function ExercisePicker({ exercises, name, initialSelectedId, routineTargetConfig }: ExercisePickerProps) {
  const searchParams = useSearchParams();
  const [hasMounted, setHasMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
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
  const [info, setInfo] = useState<{ exercise: ExerciseOption } | null>(null);
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
    if (!info) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [info]);

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
  const infoDetails = useMemo(() => {
    if (!info) {
      return null;
    }

    const primaryMuscles = info.exercise.primary_muscle ? [info.exercise.primary_muscle] : [];
    return {
      ...info.exercise,
      primary_muscles: primaryMuscles,
      secondary_muscles: [] as string[],
    };
  }, [info]);

  const exerciseDetailsOrRow = infoDetails ?? info?.exercise ?? null;
  const infoHowToSrc = exerciseDetailsOrRow ? getExerciseHowToImageSrc(exerciseDetailsOrRow) : "/exercises/icons/_placeholder.svg";
  const infoMusclesSrc = getExerciseMusclesImageSrc(infoDetails?.image_muscles_path);

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
    previousExerciseIdRef.current = selectedExercise.id;
  }, [resetMeasurementFields, routineTargetConfig, selectedExercise]);

  const isCardio = selectedExercise ? normalizeExerciseTags(selectedExercise).has("cardio") : false;

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search exercises"
          className="h-11 w-full rounded-lg border border-slate-300 bg-[rgb(var(--bg)/0.4)] px-3 py-2 pr-9 text-sm text-[rgb(var(--text))] focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear exercise search"
            className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setIsFiltersOpen((prev) => !prev)}
          aria-expanded={isFiltersOpen}
          className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-[rgb(var(--bg)/0.4)] px-3 py-2 text-left transition-colors hover:border-accent/70"
        >
          <span className="text-sm font-medium text-[rgb(var(--text))]">Filter</span>
          <span className="rounded-full border border-border bg-surface-2-soft px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            {isFiltersOpen ? "Close" : "Open"}
          </span>
        </button>

        {isFiltersOpen ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setSelectedTags([])}
              className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors ${selectedTags.length === 0 ? "border-slate-100 bg-surface-2-soft text-[rgb(var(--text))] shadow-[0_0_0_1px_rgba(255,255,255,0.55)]" : "border-slate-400/90 bg-slate-200/65 text-slate-500 hover:border-slate-500 hover:bg-slate-200"}`}
            >
              All
            </button>
            {availableTagGroups.map((group) => (
              <div key={group.key} className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{group.label}</p>
                <div className="flex gap-1 overflow-x-auto px-0.5 py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
                  {group.tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag.value);
                    return (
                      <button
                        key={tag.value}
                        type="button"
                        onClick={() => {
                          setSelectedTags((prev) => {
                            if (prev.includes(tag.value)) {
                              return prev.filter((value) => value !== tag.value);
                            }

                            return [...prev, tag.value];
                          });
                        }}
                        className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors ${isSelected ? "border-slate-100 bg-surface-2-soft text-[rgb(var(--text))] shadow-[0_0_0_1px_rgba(255,255,255,0.55)]" : "border-slate-400/90 bg-slate-200/65 text-slate-500 hover:border-slate-500 hover:bg-slate-200"}`}
                      >
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <p className="text-xs text-muted">{selectedTagSummary}</p>
      </div>
      <input type="hidden" name={name} value={selectedId} required />
      <div className="min-h-11 rounded-lg border border-slate-300 bg-[rgb(var(--bg)/0.4)] px-3 py-2 text-sm text-[rgb(var(--text))]">
        {selectedExercise ? (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{selectedExercise.name}</span>
            <div className="flex flex-wrap justify-end gap-1">
              <MetaTag value={selectedExercise.equipment} />
              <span className="hidden sm:inline-flex"><MetaTag value={selectedExercise.primary_muscle} /></span>
              <MetaTag value={selectedExercise.movement_pattern} />
            </div>
          </div>
        ) : (
          <span className="text-muted">Select an exercise from the list below</span>
        )}
      </div>

      <p className="text-xs text-muted">Scroll to see more exercises ↓</p>
      <div className="relative">
        <ul
          ref={scrollContainerRef}
          onScroll={(event) => persistScrollTop(Math.round(event.currentTarget.scrollTop))}
          className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-slate-300/80 bg-[rgb(var(--bg)/0.25)] p-2 pr-1 [scrollbar-gutter:stable]"
        >
          {filteredExercises.map((exercise) => {
            const isSelected = exercise.id === selectedId;
            const iconSrc = getExerciseIconSrc(exercise);

            return (
              <li key={exercise.id} className={`rounded-xl border p-2 ${isSelected ? "border-slate-200 bg-surface-2-soft" : "border-slate-300 bg-surface"}`}>
                <div className="flex items-stretch gap-2">
                  <ExerciseThumbnail exercise={exercise} iconSrc={iconSrc} />
                  <button type="button" onClick={() => setSelectedId(exercise.id)} className="min-w-0 flex-1 rounded-md border border-border/50 bg-surface-2 px-2 py-1 text-left">
                    <p className="truncate text-sm font-medium text-text">{exercise.name}</p>
                    <div className={`mt-1 flex flex-wrap gap-1 ${isSelected ? "" : "opacity-60"}`}>
                      <MetaTag value={exercise.equipment} />
                      <span className="hidden sm:inline-flex"><MetaTag value={exercise.primary_muscle} /></span>
                      <MetaTag value={exercise.movement_pattern} />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInfo({ exercise })}
                    className="inline-flex min-h-10 items-center rounded-md border border-border bg-surface-2-strong px-3 py-1 text-xs text-accent"
                  >
                    Info
                  </button>
                </div>
              </li>
            );
          })}        </ul>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-lg bg-gradient-to-t from-[rgb(var(--bg))] to-transparent" />
      </div>

      {info && hasMounted
        ? createPortal(
            <div className="fixed inset-0 z-50 pointer-events-auto" role="dialog" aria-modal="true" aria-label="Exercise info">
              <div className="absolute inset-0 h-[100dvh] w-full bg-[rgb(var(--bg))]">
                <section className="flex h-full w-full flex-col">
                  <div className="sticky top-0 z-10 border-b border-border bg-[rgb(var(--bg))] pt-[max(env(safe-area-inset-top),0px)]">
                    <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2 px-4 py-3">
                      <h2 className="text-2xl font-semibold">Exercise info</h2>
                      <button type="button" onClick={() => setInfo(null)} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted">Close</button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto overscroll-contain">
                    <div className="mx-auto w-full max-w-xl space-y-3 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3">
                      <div>
                        <p className="text-base font-semibold text-text">{info.exercise.name}</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <MetaTag value={info.exercise.equipment} />
                          <MetaTag value={info.exercise.primary_muscle} />
                          <MetaTag value={info.exercise.movement_pattern} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-muted">How-to</p>
                        <div className="aspect-[4/3] overflow-hidden rounded-md border border-border">
                          <ExerciseAssetImage
                            key={info.exercise.id ?? info.exercise.slug ?? infoHowToSrc ?? undefined}
                            src={infoHowToSrc}
                            alt="How-to visual"
                            className="h-full w-full object-contain object-center"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-muted">Muscles</p>
                        <ExerciseAssetImage src={infoMusclesSrc} alt="Muscles visual" className="w-full rounded-md border border-border" fallbackSrc="/exercises/placeholders/muscles.svg" />
                      </div>

                      {infoDetails?.how_to_short ? <p className="text-sm text-text">{infoDetails.how_to_short}</p> : null}

                      {infoDetails && infoDetails.primary_muscles.length > 0 ? (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-muted">Primary muscles</p>
                          <div className="mt-1 flex flex-wrap gap-1">{infoDetails.primary_muscles.map((item) => <span key={item} className={tagClassName}>{item}</span>)}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </section>
              </div>
            </div>,
            document.body,
          )
        : null}

      {routineTargetConfig && selectedExercise ? (
        <div className="space-y-2 rounded-md border border-slate-200 p-3">
          <input type="number" min={1} name="targetSets" placeholder={isCardio ? "Intervals" : "Sets"} required className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <div className="flex justify-end">
            <button
              type="button"
              className="text-xs font-medium text-slate-600 underline"
              onClick={() => {
                const nextMeasurementType = selectedExercise ? getDefaultMeasurementType(selectedExercise) : "reps";
                setSelectedMeasurements(nextMeasurementType === "time" ? ["time"] : ["reps", "weight"]);
                setSelectedDefaultUnit("mi");
                resetMeasurementFields();
              }}
            >
              Reset measurements
            </button>
          </div>
          <details className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium">+ Add Measurement</summary>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              {(["reps", "weight", "time", "distance", "calories"] as const).map((metric) => (
                <label key={metric} className="flex items-center gap-2">
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
          </details>
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
                <select name="targetWeightUnit" value={targetWeightUnit} onChange={(event) => setTargetWeightUnit(event.target.value === "kg" ? "kg" : "lbs")} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
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
                <select name="targetDistanceUnit" value={selectedDefaultUnit} onChange={(event) => setSelectedDefaultUnit(event.target.value as "mi" | "km" | "m")} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
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
      ) : null}
    </div>
  );
}
