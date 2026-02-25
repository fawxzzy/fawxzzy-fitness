"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { getExerciseDetailsAction } from "@/app/actions/exercises";
import { Glass } from "@/components/ui/Glass";

type ExerciseOption = {
  id: string;
  name: string;
  user_id: string | null;
  is_global: boolean;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_howto_path: string | null;
};

type ExerciseDetails = {
  id: string;
  name: string;
  how_to_short: string | null;
  primary_muscles: string[];
  secondary_muscles: string[];
  movement_pattern: string | null;
  equipment: string | null;
  image_howto_path: string | null;
  image_muscles_path: string | null;
};

type ExercisePickerProps = {
  exercises: ExerciseOption[];
  name: string;
  initialSelectedId?: string;
};

const tagClassName = "rounded-full border border-border bg-surface-2-soft px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted";

function MetaTag({ value }: { value: string | null }) {
  if (!value) return null;
  return <span className={tagClassName}>{value}</span>;
}

export function ExercisePicker({ exercises, name, initialSelectedId }: ExercisePickerProps) {
  const [search, setSearch] = useState("");

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
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [activeDetails, setActiveDetails] = useState<ExerciseDetails | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return uniqueExercises;
    return uniqueExercises.filter((exercise) => exercise.name.toLowerCase().includes(query));
  }, [uniqueExercises, search]);

  const selectedExercise = uniqueExercises.find((exercise) => exercise.id === selectedId);

  const openDetails = async (exerciseId: string) => {
    setIsInfoOpen(true);
    setIsLoadingDetails(true);
    setDetailsError(null);

    const result = await getExerciseDetailsAction({ exerciseId });
    if (!result.ok) {
      setDetailsError(result.error);
      setActiveDetails(null);
      setIsLoadingDetails(false);
      return;
    }

    setActiveDetails(result.data ?? null);
    setIsLoadingDetails(false);
  };

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
        <ul className="max-h-52 space-y-2 overflow-y-auto rounded-lg border border-slate-300/80 bg-[rgb(var(--bg)/0.25)] p-2 pr-1">
        {filteredExercises.map((exercise) => {
          const isSelected = exercise.id === selectedId;
          return (
            <li key={exercise.id} className={`rounded-lg border p-2 ${isSelected ? "border-border bg-surface-2-soft" : "border-border bg-surface"}`}>
              <div className="flex items-start gap-2">
                {exercise.image_howto_path ? (
                  <Image src={exercise.image_howto_path} alt="" width={48} height={48} className="h-12 w-12 rounded-md border border-border object-cover" />
                ) : null}
                <button type="button" onClick={() => setSelectedId(exercise.id)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-text">{exercise.name}</p>
                  <div className={`mt-1 flex flex-wrap gap-1 ${isSelected ? "" : "opacity-60"}`}>
                    <MetaTag value={exercise.equipment} />
                    <MetaTag value={exercise.movement_pattern} />
                    <span className="hidden sm:inline-flex"><MetaTag value={exercise.primary_muscle} /></span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => openDetails(exercise.id)}
                  className="h-full min-h-10 rounded-md border border-border bg-surface-2-strong px-2 py-1 text-xs text-text"
                >
                  Info
                </button>
              </div>
            </li>
          );
        })}
        </ul>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-10 rounded-b-lg bg-gradient-to-t from-[rgb(var(--bg))] to-transparent" />
      </div>

      {isInfoOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3" aria-hidden={false}>
          <button type="button" aria-label="Close exercise info" className="absolute inset-0 bg-black/50" onClick={() => setIsInfoOpen(false)} />
          <Glass variant="overlay" className="relative z-[1] w-full max-w-md rounded-xl border border-border p-4" interactive={false}>
            <div role="dialog" aria-modal="true" aria-label="Exercise details" className="space-y-3">
              {isLoadingDetails ? <p className="text-sm text-muted">Loading details…</p> : null}
              {detailsError ? <p className="text-sm text-red-300">{detailsError}</p> : null}
              {activeDetails ? (
                <>
                  <div>
                    <p className="text-base font-semibold text-text">{activeDetails.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <MetaTag value={activeDetails.equipment} />
                      <MetaTag value={activeDetails.movement_pattern} />
                    </div>
                  </div>

                  {activeDetails.image_howto_path ? (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted">How-to</p>
                      <Image src={activeDetails.image_howto_path} alt="How-to visual" width={640} height={360} className="w-full rounded-md border border-border" />
                    </div>
                  ) : null}

                  {activeDetails.image_muscles_path ? (
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-muted">Muscles</p>
                      <Image src={activeDetails.image_muscles_path} alt="Muscles visual" width={640} height={360} className="w-full rounded-md border border-border" />
                    </div>
                  ) : null}

                  {activeDetails.how_to_short ? <p className="text-sm text-text">{activeDetails.how_to_short}</p> : null}

                  {activeDetails.primary_muscles.length > 0 ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">Primary muscles</p>
                      <div className="mt-1 flex flex-wrap gap-1">{activeDetails.primary_muscles.map((item) => <span key={item} className={tagClassName}>{item}</span>)}</div>
                    </div>
                  ) : null}
                  {activeDetails.secondary_muscles.length > 0 ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted">Secondary muscles</p>
                      <div className="mt-1 flex flex-wrap gap-1">{activeDetails.secondary_muscles.map((item) => <span key={item} className={tagClassName}>{item}</span>)}</div>
                    </div>
                  ) : null}
                </>
              ) : null}
              <div className="flex justify-end">
                <button type="button" onClick={() => setIsInfoOpen(false)} className="rounded-md border border-border px-3 py-1.5 text-sm text-text">Close</button>
              </div>
            </div>
          </Glass>
        </div>
      ) : null}
    </div>
  );
}
