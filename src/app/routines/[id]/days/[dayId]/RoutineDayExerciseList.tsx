"use client";

import { useState } from "react";
import { ExerciseInfoSheet, type ExerciseInfoSheetExercise } from "@/components/ExerciseInfoSheet";
import { AppRow } from "@/components/ui/app/AppRow";

type RoutineDayExerciseItem = {
  id: string;
  name: string;
  targetSummary: string;
  info: {
    id: string;
    exercise_id: string;
    name: string;
    primary_muscle: string | null;
    equipment: string | null;
    movement_pattern: string | null;
    image_howto_path: string | null;
    image_icon_path: string | null;
    slug: string | null;
    how_to_short: string | null;
  };
};

export function RoutineDayExerciseList({ exercises }: { exercises: RoutineDayExerciseItem[] }) {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseInfoSheetExercise | null>(null);

  return (
    <>
      <ul className="space-y-2">
        {exercises.map((exercise) => (
          <li key={exercise.id}>
            <AppRow
              leftTop={exercise.name}
              leftBottom={exercise.targetSummary || undefined}
              rightTop={<span className="text-muted">›</span>}
              onClick={() => setSelectedExercise(exercise.info)}
            />
          </li>
        ))}
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
