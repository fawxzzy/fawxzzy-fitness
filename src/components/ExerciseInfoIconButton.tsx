"use client";

import { useState } from "react";
import { ExerciseInfoSheet, type ExerciseInfoSheetExercise } from "@/components/ExerciseInfoSheet";

export function ExerciseInfoIconButton({
  exercise,
  className,
}: {
  exercise: ExerciseInfoSheetExercise;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Exercise info for ${exercise.name}`}
        className={className ?? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-[rgb(var(--bg)/0.45)] text-sm text-text transition-colors hover:bg-[rgb(var(--bg)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"}
      >
        <span aria-hidden="true">ⓘ</span>
      </button>
      <ExerciseInfoSheet exercise={exercise} open={open} onOpenChange={setOpen} onClose={() => setOpen(false)} />
    </>
  );
}
