"use client";

import { useState } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { ExerciseCard } from "@/components/ExerciseCard";

type RoutineDayExerciseItem = {
  id: string;
  name: string;
  goalLine: string;
  exerciseId: string;
};

export function RoutineDayExerciseList({ exercises }: { exercises: RoutineDayExerciseItem[] }) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  return (
    <>
      <ul className="space-y-2">
        {exercises.map((exercise) => (
          <li key={exercise.id}>
            <ExerciseCard
              title={exercise.name}
              onPress={() => {
                if (process.env.NODE_ENV === "development") {
                  console.debug("[ExerciseInfo:open] RoutineDayExerciseList", { exerciseId: exercise.exerciseId, exercise });
                }
                setSelectedExerciseId(exercise.exerciseId);
              }}
            >
              <p className="min-w-0 text-xs leading-snug whitespace-normal break-words text-[rgb(var(--text)/0.7)]">{exercise.goalLine}</p>
            </ExerciseCard>
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
