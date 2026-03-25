"use client";

import { useRouter } from "next/navigation";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { RoutineDayAddExerciseForm } from "@/app/routines/[id]/edit/day/[dayId]/RoutineDayAddExerciseForm";
import { AppButton } from "@/components/ui/AppButton";
import type { ActionResult } from "@/lib/action-result";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";

type ExerciseOption = {
  id: string;
  name: string;
  user_id: string | null;
  is_global: boolean;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance";
  default_unit: string | null;
  calories_estimation_method: string | null;
  image_howto_path: string | null;
  how_to_short?: string | null;
  image_icon_path?: string | null;
  slug?: string | null;
};

export function EditDayAddExerciseScreen({
  routineId,
  routineDayId,
  exercises,
  weightUnit,
  addExerciseAction,
  exerciseStats,
  backHref,
}: {
  routineId: string;
  routineDayId: string;
  exercises: ExerciseOption[];
  weightUnit: "lbs" | "kg";
  addExerciseAction: (formData: FormData) => Promise<ActionResult>;
  exerciseStats: ExerciseStatsOption[];
  backHref: string;
}) {
  const router = useRouter();

  return (
    <RoutineDayAddExerciseForm
      routineId={routineId}
      routineDayId={routineDayId}
      exercises={exercises}
      weightUnit={weightUnit}
      addExerciseAction={addExerciseAction}
      exerciseStats={exerciseStats}
      footerSlot={null}
      renderFooter={({ selectedCanonicalExerciseId, openExerciseInfo }) => (
        <PublishBottomActions>
          <BottomActionSplit
            secondary={(
              <AppButton
                type="button"
                variant="secondary"
                onClick={openExerciseInfo}
                disabled={!selectedCanonicalExerciseId}
              >
                View Exercise
              </AppButton>
            )}
            primary={(
              <AppButton type="submit" form="routine-day-add-exercise-form" variant="primary">
                Add Exercise
              </AppButton>
            )}
          />
        </PublishBottomActions>
      )}
      onSuccess={() => {
        router.push(backHref);
      }}
    />
  );
}
