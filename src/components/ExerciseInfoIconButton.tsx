"use client";

import { useState } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { CardInfoButton } from "@/components/ui/card-system";
import { resolveCanonicalExerciseId } from "@/lib/exercise-id-aliases";

export function ExerciseInfoIconButton({
  exerciseId,
  exerciseName,
}: {
  exerciseId: string;
  exerciseName: string;
}) {
  const [open, setOpen] = useState(false);
  const canonicalExerciseId = resolveCanonicalExerciseId(exerciseId);

  return (
    <>
      <CardInfoButton
        label={`Open exercise info for ${exerciseName}`}
        onClick={() => {
          if (process.env.NODE_ENV === "development") {
            console.debug("[ExerciseInfo:open] ExerciseInfoIconButton", { exerciseId, canonicalExerciseId, exerciseName });
          }
          setOpen(true);
        }}
      />
      <ExerciseInfo
        exerciseId={canonicalExerciseId}
        open={open}
        onOpenChange={setOpen}
        onClose={() => setOpen(false)}
        sourceContext="ExerciseInfoIconButton"
      />
    </>
  );
}
