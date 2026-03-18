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
  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null;

  const filteredExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesTags = (exercise: ExerciseOption) => {
      if (selectedTags.length === 0) return true;
      const tags = normalizeExerciseTags(exercise);
      return selectedTags.every((tag) => tags.includes(tag));
    };

    return exercises
      .filter((exercise) => (!normalizedQuery ? true : exercise.name.toLowerCase().includes(normalizedQuery)))
      .filter(matchesTags)
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
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Quick Add"
        description="Choose an exercise, set the starting volume, then add it to this session."
        contentClassName="space-y-5"
      >
        <section className="space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Choose</p>
            <h3 className="text-base font-semibold text-text">Find the exercise you want to add</h3>
          </div>

          <div className="space-y-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search exercises"
              className="min-h-12 w-full rounded-2xl border border-border/55 bg-surface/50 px-4 py-3 text-sm text-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
            />
            {filterGroups.length > 0 ? <ExerciseTagFilterControl selectedTags={selectedTags} onChange={setSelectedTags} groups={filterGroups} /> : null}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Configure</p>
              <h3 className="text-base font-semibold text-text">Pick the exercise, then set starting volume</h3>
            </div>
            <p className="shrink-0 text-xs text-muted">{filteredExercises.length} shown</p>
          </div>

          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filteredExercises.map((exercise) => {
              const isSelected = selectedExerciseId === exercise.id;
              const tags = [exercise.primary_muscle, exercise.movement_pattern, exercise.equipment].filter(Boolean);
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedExerciseId(exercise.id)}
                    className={[
                      "w-full rounded-2xl px-4 py-3 text-left transition-colors",
                      isSelected
                        ? "bg-accent/10 ring-1 ring-accent/30"
                        : "bg-surface/45 hover:bg-surface/65",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className={`text-sm font-medium leading-snug ${isSelected ? "text-text" : "text-[rgb(var(--text)/0.92)]"}`}>{exercise.name}</p>
                        {tags.length > 0 ? <p className="text-xs text-muted">{tags.join(" • ")}</p> : null}
                      </div>
                      <span
                        className={[
                          "mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full text-xs font-semibold",
                          isSelected ? "bg-accent/20 text-text" : "bg-surface/80 text-muted",
                        ].join(" ")}
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
            {filteredExercises.length === 0 ? (
              <li className="rounded-2xl bg-surface/40 px-4 py-4 text-sm text-muted">No exercises match that search.</li>
            ) : null}
          </ul>

          <div className="rounded-2xl bg-surface/45 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Selected</p>
                <p className="text-sm font-semibold text-text">{selectedExercise?.name ?? "Choose an exercise to continue"}</p>
                <p className="text-xs text-muted">Start with the number of sets you want added right away.</p>
              </div>
              <span className="rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-muted">Sets</span>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={!selectedExerciseId}
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
                disabled={!selectedExerciseId}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  if (!selectedExerciseId) return;
                  setSetCountByExerciseId((current) => ({
                    ...current,
                    [selectedExerciseId]: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
                  }));
                }}
                className="min-h-11 w-24 rounded-xl border border-border/55 bg-surface/60 px-3 py-2.5 text-center text-sm text-text disabled:opacity-60"
              />
              <AppButton
                type="button"
                variant="secondary"
                size="sm"
                disabled={!selectedExerciseId}
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
          </div>
        </section>

        <AppButton type="button" variant="primary" fullWidth loading={isPending} onClick={handleSubmit}>
          Add to Session
        </AppButton>
      </BottomSheet>
    </>
  );
}
