"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ExercisePicker } from "@/components/ExercisePicker";
import { AppButton } from "@/components/ui/AppButton";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import type { ActionResult } from "@/lib/action-result";


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
};

export function SessionAddExerciseForm({
  sessionId,
  exercises,
  initialSelectedId,
  weightUnit,
  addExerciseAction,
  exerciseStats,
  customExerciseSection,
}: {
  sessionId: string;
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
          success: "Exercise added.",
          error: "Could not add exercise.",
        });

        if (result.ok) {
          router.refresh();
        }
      }}
      className="space-y-3"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="space-y-3 rounded-lg border border-border/70 bg-surface/60 p-3">
        {customExerciseSection}
        <ExercisePicker exercises={exercises} name="exerciseId" initialSelectedId={initialSelectedId} routineTargetConfig={{ weightUnit }} exerciseStats={exerciseStats} />
      </div>
      <div className="border-t border-border/70 pt-2">
        <AppButton type="submit" variant="primary" fullWidth>
          Add Exercise
        </AppButton>
      </div>
    </form>
  );
}
