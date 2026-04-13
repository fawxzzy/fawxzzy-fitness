"use client";

import { useState } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { DayDetailExerciseList } from "@/components/routines/day-detail/DayDetailExerciseList";

type RoutineDayExerciseItem = {
  id: string;
  name: string;
  goalLine: string | null;
  exerciseId: string;
  measurementType?: "reps" | "time" | "distance" | "time_distance" | null;
  primary_muscle?: string | null;
  equipment?: string | null;
  movement_pattern?: string | null;
  isCardio?: boolean | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  slug?: string | null;
};

export function RoutineDayExerciseList({ exercises }: { exercises: RoutineDayExerciseItem[] }) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  return (
    <>
      <DayDetailExerciseList
        mode="read_only"
        items={exercises.map((exercise, index) => ({
          id: exercise.id,
          name: exercise.name,
          summary: exercise.goalLine,
          orderNumber: index + 1,
          measurementType: exercise.measurementType,
          primary_muscle: exercise.primary_muscle,
          equipment: exercise.equipment,
          movement_pattern: exercise.movement_pattern,
          isCardio: exercise.isCardio,
          kind: exercise.kind,
          type: exercise.type,
          tags: exercise.tags,
          categories: exercise.categories,
          slug: exercise.slug,
          image_path: exercise.image_path,
          image_icon_path: exercise.image_icon_path,
          image_howto_path: exercise.image_howto_path,
        }))}
        onSelectItem={(item) => {
          const exercise = exercises.find((entry) => entry.id === item.id);
          if (!exercise) return;
          if (process.env.NODE_ENV === "development") {
            console.debug("[ExerciseInfo:open] RoutineDayExerciseList", { exerciseId: exercise.exerciseId, exercise });
          }
          setSelectedExerciseId(exercise.exerciseId);
        }}
      />

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
