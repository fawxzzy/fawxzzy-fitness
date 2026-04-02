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
      className="space-y-4"
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="space-y-4">
        {customExerciseSection}
        <ExercisePicker
          exercises={exercises}
          name="exerciseId"
          initialSelectedId={initialSelectedId}
          routineTargetConfig={{ weightUnit }}
          exerciseStats={exerciseStats}
          renderFooter={({ goalValidation }) => (
            <div className="space-y-2 rounded-[1.1rem] border border-border/45 bg-[rgb(var(--surface-2-soft)/0.42)] p-3">
              <AppButton type="submit" variant="primary" fullWidth disabled={!goalValidation.isValid}>
                Add Exercise
              </AppButton>
            </div>
          )}
        />
      </div>
    </form>
  );
}
