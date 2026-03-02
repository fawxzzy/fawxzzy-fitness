"use client";

import { useState } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";

export function ExerciseInfoIconButton({
  exerciseId,
  exerciseName,
  className,
}: {
  exerciseId: string;
  exerciseName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Exercise info for ${exerciseName}`}
        className={className ?? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-[rgb(var(--bg)/0.45)] text-sm text-text transition-colors hover:bg-[rgb(var(--bg)/0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"}
      >
        <span aria-hidden="true">ⓘ</span>
      </button>
      <ExerciseInfo exerciseId={exerciseId} open={open} onOpenChange={setOpen} onClose={() => setOpen(false)} />
    </>
  );
}
