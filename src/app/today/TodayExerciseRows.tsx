"use client";

import { useState } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { Pill } from "@/components/ui/Pill";
import { deriveWorkoutExerciseCardVariant } from "@/lib/workout-exercise-row-variant";

type TodayExerciseRow = {
  id: string;
  exerciseId: string;
  name: string;
  targets: string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  slug?: string | null;
  loggedSetCount?: number;
  isSkipped?: boolean;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
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
        {exercises.map((exercise) => {
          const cardVariantState = deriveWorkoutExerciseCardVariant({
            loggedSetCount: exercise.loggedSetCount ?? 0,
            isSkipped: exercise.isSkipped === true,
            targetSetsMin: exercise.targetSetsMin,
            targetSetsMax: exercise.targetSetsMax,
          });

          return (
            <li key={exercise.id}>
              <StandardExerciseRow
                exercise={exercise}
                summary={exercise.targets}
                state={cardVariantState.cardState}
                badgeText={cardVariantState.badgeText}
                onPress={() => {
                  if (process.env.NODE_ENV === "development") {
                    console.debug("[ExerciseInfo:open] TodayExerciseRows", { exerciseId: exercise.exerciseId, exercise });
                  }
                  setSelectedExerciseId(exercise.exerciseId);
                }}
              >
                {cardVariantState.showSkippedChip ? (
                  <div className="pt-0.5">
                    <Pill tone="warning" className="normal-case tracking-normal">Skipped</Pill>
                  </div>
                ) : null}
              </StandardExerciseRow>
            </li>
          );
        })}
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
