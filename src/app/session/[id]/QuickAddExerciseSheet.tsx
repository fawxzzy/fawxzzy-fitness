"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppButton } from "@/components/ui/AppButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";

type ExerciseOption = {
  id: string;
  name: string;
};

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
  const [setCount, setSetCount] = useState(3);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const filteredExercises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return exercises.slice(0, 40);
    }

    return exercises
      .filter((exercise) => exercise.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 40);
  }, [exercises, query]);

  const handleSubmit = () => {
    if (!selectedExerciseId) {
      toast.error("Select an exercise first.");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("exerciseId", selectedExerciseId);
      formData.set("setCount", String(setCount));
      const result = await quickAddExerciseAction(formData);
      toastActionResult(toast, result, {
        success: "Exercise added to session.",
        error: "Could not add exercise.",
      });

      if (result.ok) {
        setOpen(false);
        setQuery("");
        setSelectedExerciseId("");
        setSetCount(3);
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

          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border/60 p-1">
            {filteredExercises.map((exercise) => {
              const isSelected = selectedExerciseId === exercise.id;
              return (
                <li key={exercise.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedExerciseId(exercise.id)}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm ${isSelected ? "bg-accent/20 text-text" : "text-muted hover:bg-surface-2-soft"}`}
                  >
                    {exercise.name}
                  </button>
                </li>
              );
            })}
            {filteredExercises.length === 0 ? <li className="px-3 py-2 text-sm text-muted">No matches.</li> : null}
          </ul>

          <label className="space-y-1">
            <span className="text-xs font-medium text-muted">Set count (optional)</span>
            <div className="flex items-center gap-2">
              <AppButton type="button" variant="secondary" size="sm" onClick={() => setSetCount((value) => Math.max(1, value - 1))}>
                -
              </AppButton>
              <input
                type="number"
                min={1}
                value={setCount}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  setSetCount(Number.isFinite(parsed) && parsed > 0 ? parsed : 1);
                }}
                className="w-20 rounded-md border border-border/70 bg-[rgb(var(--bg)/0.45)] px-2 py-1.5 text-sm text-text"
              />
              <AppButton type="button" variant="secondary" size="sm" onClick={() => setSetCount((value) => value + 1)}>
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
