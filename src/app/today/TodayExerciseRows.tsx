"use client";

import { useState } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { WorkoutExerciseCardDetails } from "@/components/workout/WorkoutExerciseCardDetails";
import { deriveSessionExerciseProgressState } from "@/lib/session-exercise-progress";
import { buildPlannedExerciseDetailMetrics } from "@/lib/workout-card-view-models";
import { applyWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";

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
      <ul className="flex flex-col gap-[0.375rem]">
        {exercises.map((exercise) => {
          const progressState = deriveSessionExerciseProgressState({
            loggedSetCount: exercise.loggedSetCount ?? 0,
            isSkipped: exercise.isSkipped === true,
            targetSetsMin: exercise.targetSetsMin,
            targetSetsMax: exercise.targetSetsMax,
            surface: "summary",
          });
          const titleMeta = progressState.goalSetTarget !== null
            ? `${progressState.loggedSetCount} / ${progressState.goalSetTarget}`
            : undefined;
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
          const { policy, chips, detailedMetrics: visibleDetailedMetrics } = applyWorkoutCardSurfacePolicy({
            surface: "today",
            density,
            detailedMetrics,
          });

          return (
            <li key={exercise.id}>
              <StandardExerciseRow
                exercise={exercise}
                summary={exercise.targets}
                subtitleTone="plain"
                variant="interactive"
                density={density}
                contentClassName="pl-3"
                state={progressState.cardState}
                badgeText={titleMeta ? undefined : progressState.badgeText}
                titleMeta={titleMeta}
                className={exercise.isSkipped ? "opacity-60 saturate-[0.78]" : undefined}
                onPress={() => {
                  if (process.env.NODE_ENV === "development") {
                    console.debug("[ExerciseInfo:open] TodayExerciseRows", { exerciseId: exercise.exerciseId, exercise });
                  }
                  setSelectedExerciseId(exercise.exerciseId);
                }}
                showLeadingVisual={policy.showMedia}
              >
                <WorkoutExerciseCardDetails
                  density={density}
                  chips={chips}
                  detailedMetrics={visibleDetailedMetrics}
                />
              </StandardExerciseRow>
            </li>
          );
        })}
        {exercises.length === 0 ? <li className="rounded-[var(--radius-md)] border border-[rgb(var(--border-strong)/0.14)] bg-[rgb(var(--surface-2-rgb)/0.72)] px-3 py-3 text-center text-sm leading-normal text-[rgb(var(--text-muted)/0.96)]">{emptyMessage}</li> : null}
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
