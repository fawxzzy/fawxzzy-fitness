"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppButton } from "@/components/ui/AppButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";

type ExerciseOption = {
  id: string;
  name: string;
  primary_muscle: string | null;
  movement_pattern: string | null;
  equipment: string | null;
};

function formatTagLabel(value: string) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function normalizeExerciseTags(exercise: ExerciseOption) {
  return [exercise.primary_muscle, exercise.movement_pattern, exercise.equipment]
    .map((value) => value?.trim().toLowerCase() ?? "")
    .filter((value) => value.length > 0);
}

export function QuickAddExerciseSheet({
  sessionId,
  exercises,
  quickAddExerciseAction,
}: {
  sessionId: string;
  exercises: ExerciseOption[];
  quickAddExerciseAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [setCountByExerciseId, setSetCountByExerciseId] = useState<Record<string, number>>({});
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const filterGroups = useMemo<ExerciseTagGroup[]>(() => {
    const primaryMuscles = new Set<string>();
    const movementPatterns = new Set<string>();
    const equipment = new Set<string>();

    for (const exercise of exercises) {
      if (exercise.primary_muscle) primaryMuscles.add(exercise.primary_muscle.toLowerCase());
      if (exercise.movement_pattern) movementPatterns.add(exercise.movement_pattern.toLowerCase());
      if (exercise.equipment) equipment.add(exercise.equipment.toLowerCase());
    }

    return [
      { key: "muscle", label: "Muscle", tags: Array.from(primaryMuscles).sort().map((value) => ({ value, label: formatTagLabel(value) })) },
      { key: "movement", label: "Movement", tags: Array.from(movementPatterns).sort().map((value) => ({ value, label: formatTagLabel(value) })) },
      { key: "equipment", label: "Equipment", tags: Array.from(equipment).sort().map((value) => ({ value, label: formatTagLabel(value) })) },
    ].filter((group) => group.tags.length > 0);
  }, [exercises]);

  const selectedSetCount = setCountByExerciseId[selectedExerciseId] ?? 3;

  const filteredExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return exercises
        .filter((exercise) => {
          if (selectedTags.length === 0) return true;
          const tags = normalizeExerciseTags(exercise);
          return selectedTags.every((tag) => tags.includes(tag));
        })
        .slice(0, 40);
    }

    return exercises
      .filter((exercise) => exercise.name.toLowerCase().includes(normalizedQuery))
      .filter((exercise) => {
        if (selectedTags.length === 0) return true;
        const tags = normalizeExerciseTags(exercise);
        return selectedTags.every((tag) => tags.includes(tag));
      })
      .slice(0, 40);
  }, [exercises, query, selectedTags]);

  const handleSubmit = () => {
    if (!selectedExerciseId) {
      toast.error("Select an exercise first.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("exerciseId", selectedExerciseId);
      formData.set("setCount", String(selectedSetCount));
      const result = await quickAddExerciseAction(formData);
      toastActionResult(toast, result, {
        success: "Exercise added to session.",
        error: "Could not add exercise.",
      });

      if (result.ok) {
        setOpen(false);
        setQuery("");
        setSelectedTags([]);
        setSelectedExerciseId("");
        router.refresh();
      }
    });
  };

  return (
    <>
      <AppButton type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        + Quick Add
      </AppButton>
      <BottomSheet open={open} onClose={() => setOpen(false)} title="Quick Add">
        <div className="space-y-3 pb-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-muted">Exercise</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search exercises"
              className="w-full rounded-md border border-border/70 bg-[rgb(var(--bg)/0.45)] px-3 py-2 text-sm text-text"
            />
          </label>

          <ExerciseTagFilterControl selectedTags={selectedTags} onChange={setSelectedTags} groups={filterGroups} />

          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border/60 p-1">
            {filteredExercises.map((exercise) => {
              const isSelected = selectedExerciseId === exercise.id;
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedExerciseId(exercise.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${isSelected ? "border-accent/50 bg-accent/20 text-text ring-1 ring-accent/30" : "border-transparent text-muted hover:bg-surface-2-soft"}`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isSelected ? <span className="text-accent">✓</span> : null}
                      {exercise.name}
                    </span>
                  </button>
                </li>
              );
            })}
            {filteredExercises.length === 0 ? <li className="px-3 py-2 text-sm text-muted">No matches.</li> : null}
          </ul>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted">Set count (optional)</span>
            <div className="flex items-center gap-2">
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!selectedExerciseId) return;
                  setSetCountByExerciseId((current) => ({
                    ...current,
                    [selectedExerciseId]: Math.max(1, (current[selectedExerciseId] ?? 3) - 1),
                  }));
                }}
              >
                -
              </AppButton>
              <input
                type="number"
                min={1}
                value={selectedSetCount}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  if (!selectedExerciseId) return;
                  setSetCountByExerciseId((current) => ({
                    ...current,
                    [selectedExerciseId]: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
                  }));
                }}
                className="w-20 rounded-md border border-border/70 bg-[rgb(var(--bg)/0.45)] px-2 py-1.5 text-sm text-text"
              />
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (!selectedExerciseId) return;
                  setSetCountByExerciseId((current) => ({
                    ...current,
                    [selectedExerciseId]: (current[selectedExerciseId] ?? 3) + 1,
                  }));
                }}
              >
                +
              </AppButton>
            </div>
          </label>

          <AppButton type="button" variant="primary" fullWidth loading={isPending} onClick={handleSubmit}>
            Add to Session
          </AppButton>
        </div>
      </BottomSheet>
    </>
  );
}
