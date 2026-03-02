"use client";

import { useState } from "react";
import { ExerciseInfoSheet, type ExerciseInfoSheetExercise } from "@/components/ExerciseInfoSheet";
import { AppRow } from "@/components/ui/app/AppRow";
import { appTokens } from "@/components/ui/app/tokens";

type TodayExerciseRow = {
  id: string;
  exerciseId: string;
  name: string;
  targets: string | null;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_howto_path: string | null;
  image_icon_path: string | null;
  slug: string | null;
  how_to_short: string | null;
};

export function TodayExerciseRows({
  exercises,
  emptyMessage,
}: {
  exercises: TodayExerciseRow[];
  emptyMessage: string;
}) {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseInfoSheetExercise | null>(null);

  return (
    <>
      <ul className={`${appTokens.listDivider} overflow-hidden rounded-lg border border-white/15 bg-[rgb(var(--surface)/0.72)] text-sm`}>
        {exercises.map((exercise) => (
          <li key={exercise.id}>
            <AppRow
              leftTop={exercise.name}
              leftBottom={exercise.targets || undefined}
              rightTop={<span className="text-muted">›</span>}
              onClick={() => {
                setSelectedExercise({
                  id: exercise.exerciseId,
                  exercise_id: exercise.exerciseId,
                  name: exercise.name,
                  primary_muscle: exercise.primary_muscle,
                  equipment: exercise.equipment,
                  movement_pattern: exercise.movement_pattern,
                  image_howto_path: exercise.image_howto_path,
                  image_icon_path: exercise.image_icon_path,
                  slug: exercise.slug,
                  how_to_short: exercise.how_to_short,
                });
              }}
              className="rounded-none border-x-0 border-t-0 border-b-white/12 bg-transparent px-3"
            />
          </li>
        ))}
        {exercises.length === 0 ? <li className="px-3 py-3 text-muted">{emptyMessage}</li> : null}
      </ul>

      <ExerciseInfoSheet
        exercise={selectedExercise}
        open={Boolean(selectedExercise)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExercise(null);
          }
        }}
        onClose={() => {
          setSelectedExercise(null);
        }}
      />
    </>
  );
}
