"use client";

import { useState } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { WorkoutExerciseCardDetails } from "@/components/workout/WorkoutExerciseCardDetails";
import { deriveReadOnlyExercisePresentation } from "@/lib/session-exercise-progress";
import { buildExerciseIdentityChips, buildPlannedExerciseDetailMetrics } from "@/lib/workout-card-view-models";

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
  primary_muscle?: string | null;
  equipment?: string | null;
  movement_pattern?: string | null;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | null;
  isCardio?: boolean | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
};

export function TodayExerciseRows({
  exercises,
  emptyMessage,
  density = "compact",
}: {
  exercises: TodayExerciseRow[];
  emptyMessage: string;
  density?: "compact" | "detailed";
}) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  return (
    <>
      <ul className="space-y-1.5">
        {exercises.map((exercise) => {
          const cardVariantState = deriveReadOnlyExercisePresentation({
            loggedSetCount: exercise.loggedSetCount ?? 0,
            isSkipped: exercise.isSkipped === true,
            targetSetsMin: exercise.targetSetsMin,
            targetSetsMax: exercise.targetSetsMax,
          });
          const identityChips = buildExerciseIdentityChips({
            measurementType: exercise.measurement_type,
            isCardio: exercise.isCardio,
            kind: exercise.kind,
            type: exercise.type,
            equipment: exercise.equipment,
            movementPattern: exercise.movement_pattern,
            primaryMuscle: exercise.primary_muscle,
            tags: exercise.tags,
            categories: exercise.categories,
          });
          const detailedMetrics = buildPlannedExerciseDetailMetrics({
            measurementType: exercise.measurement_type,
            isCardio: exercise.isCardio,
            kind: exercise.kind,
            type: exercise.type,
            equipment: exercise.equipment,
            movementPattern: exercise.movement_pattern,
            primaryMuscle: exercise.primary_muscle,
            tags: exercise.tags,
            categories: exercise.categories,
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
                summaryLabel="Goal"
                variant="interactive"
                density={density}
                state={cardVariantState.cardState}
                badgeText={cardVariantState.badgeText}
                onPress={() => {
                  if (process.env.NODE_ENV === "development") {
                    console.debug("[ExerciseInfo:open] TodayExerciseRows", { exerciseId: exercise.exerciseId, exercise });
                  }
                  setSelectedExerciseId(exercise.exerciseId);
                }}
              >
                <WorkoutExerciseCardDetails
                  density={density}
                  chips={identityChips}
                  detailedMetrics={detailedMetrics}
                />
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
