"use client";

import { useState } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";

type RoutineDayExerciseItem = {
  id: string;
  name: string;
  goalLine: string | null;
  exerciseId: string;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  slug?: string | null;
};

export function RoutineDayExerciseList({ exercises }: { exercises: RoutineDayExerciseItem[] }) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  return (
    <>
      <ul className="space-y-2">
        {exercises.map((exercise) => (
          <li key={exercise.id}>
            <StandardExerciseRow
              exercise={exercise}
              summary={exercise.goalLine}
              onPress={() => {
                if (process.env.NODE_ENV === "development") {
                  console.debug("[ExerciseInfo:open] RoutineDayExerciseList", { exerciseId: exercise.exerciseId, exercise });
                }
                setSelectedExerciseId(exercise.exerciseId);
              }}
            />
          </li>
        ))}
      </ul>

      <ExerciseInfo
        exerciseId={selectedExerciseId}
        open={Boolean(selectedExerciseId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExerciseId(null);
          }
        }}
        onClose={() => {
          setSelectedExerciseId(null);
        }}
        sourceContext="RoutineDayExerciseList"
      />
    </>
  );
}
