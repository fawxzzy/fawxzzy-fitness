"use client";

import { memo, useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExerciseCard } from "@/components/ExerciseCard";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
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

type QuickAddExerciseRowProps = {
  exercise: ExerciseOption;
  isSelected: boolean;
  subtitle: string;
  onPress: (exerciseId: string, isSelected: boolean) => void;
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

function getExerciseScanState(isSelected: boolean, subtitle: string) {
  if (isSelected) return "selected" as const;
  return subtitle ? "default" as const : "empty" as const;
}

const QuickAddExerciseRow = memo(function QuickAddExerciseRow({ exercise, isSelected, subtitle, onPress }: QuickAddExerciseRowProps) {
  return (
    <li>
      <ExerciseCard
        title={exercise.name}
        subtitle={isSelected ? subtitle || undefined : undefined}
        variant="compact"
        state={getExerciseScanState(isSelected, subtitle)}
        onPress={() => onPress(exercise.id, isSelected)}
        className="items-center"
        trailingClassName={isSelected ? "text-text" : "text-muted"}
        rightIcon={(
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex min-h-7 min-w-[3.75rem] items-center justify-center rounded-full border px-2.5 text-[11px] font-semibold leading-none",
              isSelected
                ? "border-accent/40 bg-accent/24 text-[rgb(var(--text)/0.98)] shadow-[0_6px_18px_-14px_rgba(96,200,130,0.95)]"
                : "border-border/45 bg-[rgb(var(--bg)/0.32)] text-muted",
            )}
          >
            {isSelected ? "Selected" : "Select"}
          </span>
        )}
      />
    </li>
  );
});

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
  const exerciseSubtitleById = useMemo(() => new Map(exercises.map((exercise) => [exercise.id, [exercise.primary_muscle, exercise.movement_pattern, exercise.equipment].filter(Boolean).join(" • ")])), [exercises]);

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
  const handleExercisePress = useCallback((exerciseId: string, isSelected: boolean) => {
    if (isSelected) {
      setIsExerciseInfoOpen(true);
      return;
    }

    setSelectedExerciseId(exerciseId);
  }, []);

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
      <AppButton type="button" variant="secondary" size="md" fullWidth onClick={() => setOpen(true)}>
        Quick Add Exercise
      </AppButton>
      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Quick Add Exercise"
        description="Select an exercise and add starter sets."
        className="max-w-md"
        contentClassName="space-y-5"
      >
        <section className="space-y-3">
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
            <h3 className="text-base font-semibold text-text">Selected exercise</h3>
            <p className="shrink-0 text-xs text-muted">{filteredExercises.length} shown</p>
          </div>

          <div className={cn(
            "rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.74)] px-4 py-4",
            selectedExercise ? "" : "py-3"
          )}>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-text">{selectedExercise?.name ?? "No exercise selected"}</p>
                    {selectedExercise ? (
                      <p className="text-xs text-muted">{exerciseSubtitleById.get(selectedExercise.id) ?? "No details"}</p>
                    ) : (
                      <p className="text-xs text-muted">Select one below.</p>
                    )}
                  </div>
                  {selectedExercise ? <span className="rounded-full border border-accent/35 bg-accent/18 px-2.5 py-1 text-[11px] font-semibold text-text">{selectedSetCount} set{selectedSetCount === 1 ? "" : "s"}</span> : null}
                </div>
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

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-text">Exercise list</h3>
              <p className="shrink-0 text-xs text-muted">Tap to select</p>
            </div>

            <ul className="max-h-[min(38dvh,18rem)] space-y-2 overflow-y-auto overscroll-contain pr-1">
              {filteredExercises.map((exercise) => (
                <QuickAddExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  isSelected={selectedExerciseId === exercise.id}
                  subtitle={exerciseSubtitleById.get(exercise.id) ?? ""}
                  onPress={handleExercisePress}
                />
              ))}
              {filteredExercises.length === 0 ? (
                <li className="rounded-2xl bg-surface/40 px-4 py-4 text-sm text-muted">No exercises match that search.</li>
              ) : null}
            </ul>
          </div>
        </section>

        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-text">Set the starting volume</h3>
            <p className="text-sm text-muted">Choose how many starter sets to add.</p>
          </div>

          <div className="rounded-[1.25rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.74)] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold text-text">{selectedExercise ? `${selectedSetCount} set${selectedSetCount === 1 ? "" : "s"} to start` : "Choose an exercise first"}</p>
              </div>
              <span className="rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-muted">Volume</span>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
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

        <div className="sticky bottom-0 -mx-4 bg-[rgb(var(--surface-rgb)/0.985)] px-4 pb-[max(0.25rem,var(--app-safe-bottom))] pt-3">
          <BottomActionSingle className={cn("border-white/10 bg-[rgb(var(--surface-rgb)/0.985)]")}>
            <AppButton type="button" variant="primary" fullWidth loading={isPending} onClick={handleSubmit}>
              Add to Session
            </AppButton>
          </BottomActionSingle>
        </div>
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
