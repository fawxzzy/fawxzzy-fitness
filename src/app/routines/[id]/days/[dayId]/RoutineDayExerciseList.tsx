"use client";

import { useState } from "react";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { ExerciseCard } from "@/components/ExerciseCard";
import { getExerciseIconSrc } from "@/lib/exerciseImages";

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
            <ExerciseCard
              title={exercise.name}
              subtitle={exercise.goalLine ?? "Goal: Not set"}
              variant="interactive"
              state={exercise.goalLine ? "default" : "empty"}
              leadingVisual={(
                <ExerciseAssetImage
                  src={getExerciseIconSrc(exercise)}
                  alt={`${exercise.name} icon`}
                  className="h-11 w-11 rounded-xl border border-border/35"
                  imageClassName="object-cover object-center"
                  sizes="44px"
                />
              )}
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
