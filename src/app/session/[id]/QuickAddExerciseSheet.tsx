"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppButton } from "@/components/ui/AppButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { ExerciseTagFilterControl, type ExerciseTagGroup } from "@/components/ExerciseTagFilterControl";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";

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
  const [isExerciseInfoOpen, setIsExerciseInfoOpen] = useState(false);
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
  const selectedExerciseIndex = filteredExercises.findIndex((exercise) => exercise.id === selectedExerciseId);

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
        setIsExerciseInfoOpen(false);
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
              className="min-h-12 w-full rounded-[1.25rem] border border-border/50 bg-[rgb(var(--surface-2-soft)/0.74)] px-4 py-3 text-sm text-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
            />
            {filterGroups.length > 0 ? <ExerciseTagFilterControl selectedTags={selectedTags} onChange={setSelectedTags} groups={filterGroups} /> : null}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Pick an exercise</p>
              <h3 className="text-base font-semibold text-text">Select a movement, then configure it below</h3>
            </div>
            <p className="shrink-0 text-xs text-muted">{filteredExercises.length} shown</p>
          </div>

          <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {filteredExercises.map((exercise) => {
              const isSelected = selectedExerciseId === exercise.id;
              const tags = [exercise.primary_muscle, exercise.movement_pattern, exercise.equipment].filter(Boolean);
              return (
                <li key={exercise.id}>
                  <ExerciseCard
                    title={exercise.name}
                    subtitle={tags.join(" • ") || undefined}
                    onPress={() => setSelectedExerciseId(exercise.id)}
                    className={cn(
                      "min-h-[5.1rem] px-4 py-3.5",
                      isSelected
                        ? "border-accent/35 bg-accent/10 shadow-[0_10px_28px_-18px_rgba(96,200,130,0.95)] ring-1 ring-accent/20"
                        : "border-border/45 bg-[rgb(var(--surface-2-soft)/0.66)] hover:bg-[rgb(var(--surface-2-soft)/0.82)]",
                    )}
                    trailingClassName={isSelected ? "text-text" : "text-muted"}
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
            })}
            {filteredExercises.length === 0 ? (
              <li className="rounded-2xl bg-surface/40 px-4 py-4 text-sm text-muted">No exercises match that search.</li>
            ) : null}
          </ul>

          <div className="rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.74)] px-4 py-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Selected exercise</p>
                <p className="text-sm font-semibold text-text">{selectedExercise?.name ?? "Choose an exercise to continue"}</p>
                <p className="text-xs text-muted">Secondary actions stay here so the list rows stay clean and selection-first.</p>
              </div>

              {selectedExercise ? (
                <div className="flex flex-wrap gap-2">
                  <AppButton type="button" variant="secondary" size="sm" onClick={() => setIsExerciseInfoOpen(true)}>
                    Exercise info
                  </AppButton>
                  <AppButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={selectedExerciseIndex <= 0}
                    onClick={() => {
                      if (selectedExerciseIndex <= 0) return;
                      setSelectedExerciseId(filteredExercises[selectedExerciseIndex - 1]?.id ?? selectedExerciseId);
                    }}
                  >
                    Previous
                  </AppButton>
                  <AppButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={selectedExerciseIndex === -1 || selectedExerciseIndex >= filteredExercises.length - 1}
                    onClick={() => {
                      if (selectedExerciseIndex === -1 || selectedExerciseIndex >= filteredExercises.length - 1) return;
                      setSelectedExerciseId(filteredExercises[selectedExerciseIndex + 1]?.id ?? selectedExerciseId);
                    }}
                  >
                    Next
                  </AppButton>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Configure goal</p>
            <h3 className="text-base font-semibold text-text">Set the starting volume</h3>
            <p className="text-xs text-muted">Use the same selected-summary then configure pattern as Add Exercise, with sets as the only quick-add goal.</p>
          </div>

          <div className="rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.74)] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Goal</p>
                <p className="text-sm font-semibold text-text">{selectedExercise ? `${selectedSetCount} set${selectedSetCount === 1 ? "" : "s"} to start` : "Choose an exercise first"}</p>
                <p className="text-xs text-muted">Quick Add keeps configuration intentionally light, then commits directly to the session.</p>
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
                className="min-h-11 w-24 rounded-[1rem] border border-border/50 bg-[rgb(var(--surface-2-soft)/0.82)] px-3 py-2.5 text-center text-sm text-text disabled:opacity-60"
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
      <ExerciseInfo
        exerciseId={selectedExerciseId || null}
        open={isExerciseInfoOpen && Boolean(selectedExerciseId)}
        onOpenChange={setIsExerciseInfoOpen}
        onClose={() => setIsExerciseInfoOpen(false)}
        sourceContext="QuickAddExerciseSheet"
      />
    </>
  );
}
