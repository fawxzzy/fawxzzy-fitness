"use client";

import { useState } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { ExerciseCard } from "@/components/ExerciseCard";

type TodayExerciseRow = {
  id: string;
  exerciseId: string;
  name: string;
  targets: string | null;
};

export function TodayExerciseRows({
  exercises,
  emptyMessage,
}: {
  exercises: TodayExerciseRow[];
  emptyMessage: string;
}) {
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
                  console.debug("[ExerciseInfo:open] TodayExerciseRows", { exerciseId: exercise.exerciseId, exercise });
                }
                setSelectedExerciseId(exercise.exerciseId);
              }}
            >
              <p className="min-w-0 text-xs leading-snug whitespace-normal break-words text-[rgb(var(--text)/0.7)]">{exercise.targets ?? "Goal: Not set"}</p>
            </ExerciseCard>
          </li>
        ))}
        {exercises.length === 0 ? <li className="px-3 py-3 text-muted">{emptyMessage}</li> : null}
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
        sourceContext="TodayExerciseRows"
      />
    </>
  );
}
