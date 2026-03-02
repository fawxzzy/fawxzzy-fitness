"use client";

import { useState } from "react";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppRow } from "@/components/ui/app/AppRow";
import { appTokens } from "@/components/ui/app/tokens";

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
      <ul className={`${appTokens.listDivider} overflow-hidden rounded-lg border border-white/15 bg-[rgb(var(--surface)/0.72)] text-sm`}>
        {exercises.map((exercise) => (
          <li key={exercise.id}>
            <AppRow
              leftTop={exercise.name}
              leftBottom={exercise.targets || undefined}
              rightTop={<span className="text-muted">›</span>}
              onClick={() => {
                if (process.env.NODE_ENV === "development") {
                  console.debug("[ExerciseInfo:open] TodayExerciseRows", { exerciseId: exercise.exerciseId, exercise });
                }
                setSelectedExerciseId(exercise.exerciseId);
              }}
              className="rounded-none border-x-0 border-t-0 border-b-white/12 bg-transparent px-3"
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
      />
    </>
  );
}
