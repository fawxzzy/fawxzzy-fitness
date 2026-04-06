"use client";

import { useState } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { DayDetailExerciseList } from "@/components/routines/day-detail/DayDetailExerciseList";
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
      <DayDetailExerciseList
        mode="read_only"
        items={exercises.map((exercise, index) => ({
          id: exercise.id,
          name: exercise.name,
          summary: exercise.goalLine,
          iconSrc: getExerciseIconSrc(exercise),
          orderNumber: index + 1,
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
