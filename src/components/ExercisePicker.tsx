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
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search exercises"
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      <select
        name={name}
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        required
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
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
