"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ExercisePicker } from "@/components/ExercisePicker";
import { AppButton } from "@/components/ui/AppButton";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
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

export function RoutineDayAddExerciseForm({
  routineId,
  routineDayId,
  exercises,
  initialSelectedId,
  weightUnit,
  addExerciseAction,
  exerciseStats,
  customExerciseSection,
}: {
  routineId: string;
  routineDayId: string;
  exercises: ExerciseOption[];
  initialSelectedId?: string;
  weightUnit: "lbs" | "kg";
  addExerciseAction: (formData: FormData) => Promise<ActionResult>;
  exerciseStats: ExerciseStatsOption[];
  customExerciseSection?: ReactNode;
}) {
  const toast = useToast();
  const router = useRouter();

  return (
    <form
      action={async (formData) => {
        const result = await addExerciseAction(formData);
        toastActionResult(toast, result, {
          success: "Exercise added to the day.",
          error: "Could not add exercise to the day.",
        });

        if (result.ok) {
          router.refresh();
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="routineDayId" value={routineDayId} />
      {customExerciseSection}
      <ExercisePicker
        exercises={exercises}
        name="exerciseId"
        initialSelectedId={initialSelectedId}
        routineTargetConfig={{ weightUnit }}
        exerciseStats={exerciseStats}
        footerSlot={(
          <div className="rounded-[1.1rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.42)] p-3">
            <AppButton type="submit" variant="primary" fullWidth>
              Add to day
            </AppButton>
          </div>
        )}
      />
    </form>
  );
}
