"use client";

import { useState } from "react";
import { ExerciseAssetImage } from "@/components/ExerciseAssetImage";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { ExerciseCard } from "@/components/ExerciseCard";
import { getExerciseIconSrc } from "@/lib/exerciseImages";

type TodayExerciseRow = {
  id: string;
  exerciseId: string;
  name: string;
  targets: string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  slug?: string | null;
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
              subtitle={exercise.targets ?? "Goal missing"}
              variant="interactive"
              state={exercise.targets ? "default" : "empty"}
              leadingVisual={(
                <ExerciseAssetImage
                  src={getExerciseIconSrc(exercise)}
                  alt={`${exercise.name} icon`}
                  className="h-11 w-11 rounded-xl border border-border/35"
                  imageClassName="object-cover object-center"
                  sizes="44px"
                />
              )}
              badgeText={exercise.targets ? undefined : "Needs goal"}
              onPress={() => {
                if (process.env.NODE_ENV === "development") {
                  console.debug("[ExerciseInfo:open] TodayExerciseRows", { exerciseId: exercise.exerciseId, exercise });
                }
                setSelectedExerciseId(exercise.exerciseId);
              }}
            />
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
