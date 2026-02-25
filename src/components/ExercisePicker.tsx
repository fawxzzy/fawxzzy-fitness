"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ExerciseOption = {
  id: string;
  name: string;
  user_id: string | null;
  is_global: boolean;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_howto_path: string | null;
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

export function ExercisePicker({ exercises, name, initialSelectedId }: ExercisePickerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const scrollContainerRef = useRef<HTMLUListElement | null>(null);

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
  const [scrollTop, setScrollTop] = useState(() => {
    const raw = Number(searchParams.get("exerciseListScroll"));
    if (!Number.isFinite(raw) || raw < 0) return 0;
    return Math.round(raw);
  });

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    if (!scrollTop) return;

    scrollContainerRef.current.scrollTop = scrollTop;
  }, [scrollTop]);

  const returnTo = useMemo(() => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("addExerciseOpen", "1");
    nextParams.set("exerciseId", selectedId);
    nextParams.set("exerciseListScroll", String(scrollTop));
    const query = nextParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, scrollTop, searchParams, selectedId]);

  const exerciseTagsById = useMemo(() => {
    const tagsById = new Map<string, Set<string>>();

    for (const exercise of uniqueExercises) {
      tagsById.set(exercise.id, new Set(normalizeExerciseTags(exercise).keys()));
    }

    return tagsById;
  }, [uniqueExercises]);

  const availableTags = useMemo(() => {
    const labelsByTag = new Map<string, string>();

    for (const exercise of uniqueExercises) {
      const tags = normalizeExerciseTags(exercise);
      for (const [tag, label] of tags) {
        if (!labelsByTag.has(tag)) {
          labelsByTag.set(tag, label);
        }
      }
    }

    return [...labelsByTag.entries()]
      .map(([value, label]) => ({ value, label: formatTagLabel(label) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [uniqueExercises]);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    return uniqueExercises.filter((exercise) => {
      const matchesQuery = !query || exercise.name.toLowerCase().includes(query);
      if (!matchesQuery) return false;

      if (!selectedTags.length) return true;
      const tags = exerciseTagsById.get(exercise.id);
      if (!tags || tags.size === 0) return false;

      return selectedTags.some((tag) => tags.has(tag));
    });
  }, [exerciseTagsById, search, selectedTags, uniqueExercises]);

  const selectedExercise = uniqueExercises.find((exercise) => exercise.id === selectedId);

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
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Filters</p>
        <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedTags([])}
            className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors ${selectedTags.length === 0 ? "border-accent bg-accent text-white" : "border-border bg-surface-2-soft text-muted hover:border-accent/70"}`}
          >
            All
          </button>
          {availableTags.map((tag) => {
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
                className={`shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors ${isSelected ? "border-accent bg-accent text-white" : "border-border bg-surface-2-soft text-muted hover:border-accent/70"}`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>
      <input type="hidden" name={name} value={selectedId} required />
      <div className="min-h-11 rounded-lg border border-slate-300 bg-[rgb(var(--bg)/0.4)] px-3 py-2 text-sm text-[rgb(var(--text))]">
        {selectedExercise ? (
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{selectedExercise.name}</span>
            <div className="flex flex-wrap justify-end gap-1">
              <MetaTag value={selectedExercise.equipment} />
              <MetaTag value={selectedExercise.movement_pattern} />
              <span className="hidden sm:inline-flex"><MetaTag value={selectedExercise.primary_muscle} /></span>
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
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-slate-300/80 bg-[rgb(var(--bg)/0.25)] p-2 pr-1"
        >
          {filteredExercises.map((exercise) => {
            const isSelected = exercise.id === selectedId;
            return (
              <li key={exercise.id} className={`rounded-xl border p-2 ${isSelected ? "border-slate-200 bg-surface-2-soft" : "border-slate-300 bg-surface"}`}>
                <div className="flex items-stretch gap-2">
                  {exercise.image_howto_path ? (
                    <Image src={exercise.image_howto_path} alt="" width={48} height={48} className="h-12 w-12 rounded-md border border-border object-cover" />
                  ) : null}
                  <button type="button" onClick={() => setSelectedId(exercise.id)} className="min-w-0 flex-1 rounded-md border border-border/50 bg-surface-2 px-2 py-1 text-left">
                    <p className="truncate text-sm font-medium text-text">{exercise.name}</p>
                    <div className={`mt-1 flex flex-wrap gap-1 ${isSelected ? "" : "opacity-60"}`}>
                      <MetaTag value={exercise.equipment} />
                      <MetaTag value={exercise.movement_pattern} />
                      <span className="hidden sm:inline-flex"><MetaTag value={exercise.primary_muscle} /></span>
                    </div>
                  </button>
                  <Link
                    href={`/exercises/${exercise.id}?returnTo=${encodeURIComponent(returnTo)}`}
                    className="inline-flex min-h-10 items-center rounded-md border border-border bg-surface-2-strong px-3 py-1 text-xs text-accent"
                  >
                    Info
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-lg bg-gradient-to-t from-[rgb(var(--bg))] to-transparent" />
      </div>
    </div>
  );
}
