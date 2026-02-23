"use client";

import { useMemo, useState } from "react";

type ExerciseOption = {
  id: string;
  name: string;
  user_id: string | null;
  is_global: boolean;
};

type ExercisePickerProps = {
  exercises: ExerciseOption[];
  name: string;
  initialSelectedId?: string;
};

export function ExercisePicker({ exercises, name, initialSelectedId }: ExercisePickerProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(initialSelectedId ?? exercises[0]?.id ?? "");

  const filteredExercises = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return exercises;
    return exercises.filter((exercise) => exercise.name.toLowerCase().includes(query));
  }, [exercises, search]);

  const globals = filteredExercises.filter((exercise) => exercise.is_global || exercise.user_id === null);
  const customs = filteredExercises.filter((exercise) => !exercise.is_global && exercise.user_id !== null);

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
      <select
        name={name}
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        required
        className="h-11 w-full rounded-lg border border-slate-300 bg-[rgb(var(--bg)/0.4)] px-3 py-2 text-sm text-[rgb(var(--text))] focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
      >
        {globals.length > 0 ? (
          <optgroup label="Common / Global">
            {globals.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
            ))}
          </optgroup>
        ) : null}
        {customs.length > 0 ? (
          <optgroup label="Your Custom">
            {customs.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </div>
  );
}
