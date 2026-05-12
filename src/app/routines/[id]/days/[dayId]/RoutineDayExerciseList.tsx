"use client";

import { TodayExerciseRows, type TodayExerciseRow } from "@/app/today/TodayExerciseRows";

type RoutineDayExerciseItem = TodayExerciseRow;

export function RoutineDayExerciseList({ exercises }: { exercises: RoutineDayExerciseItem[] }) {
  return (
    <TodayExerciseRows
      exercises={exercises}
      emptyMessage="No runnable exercises planned for this day."
      showProgress={false}
      sourceContext="RoutineDayExerciseList"
      density="compact"
      surface="view-day"
      rightIcon={null}
    />
  );
}
