"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { RoutineEditorAddExerciseFlowShell, type EditorExerciseOption } from "@/components/routines/RoutineEditorShared";
import { AppButton } from "@/components/ui/AppButton";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";

export function RoutineDayAddExerciseForm({
  routineId,
  routineDayId,
  exercises,
  initialSelectedId,
  weightUnit,
  addExerciseAction,
  exerciseStats,
  customExerciseSection,
  submitLabel = "Add To Day",
  footerSlot,
  renderFooter,
  onSuccess,
}: {
  routineId: string;
  routineDayId: string;
  exercises: EditorExerciseOption[];
  initialSelectedId?: string;
  weightUnit: "lbs" | "kg";
  addExerciseAction: (formData: FormData) => Promise<ActionResult>;
  exerciseStats: ExerciseStatsOption[];
  customExerciseSection?: ReactNode;
  submitLabel?: string;
  footerSlot?: ReactNode;
  renderFooter?: ComponentProps<typeof RoutineEditorAddExerciseFlowShell>["renderFooter"];
  onSuccess?: () => void;
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
          onSuccess?.();
          router.refresh();
        }
      }}
      id="routine-day-add-exercise-form"
      className="space-y-4"
    >
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="routineDayId" value={routineDayId} />
      {customExerciseSection}
      <RoutineEditorAddExerciseFlowShell
        exercises={exercises}
        name="exerciseId"
        initialSelectedId={initialSelectedId}
        weightUnit={weightUnit}
        exerciseStats={exerciseStats}
        renderFooter={renderFooter}
        footerSlot={footerSlot !== undefined ? footerSlot : (
          <AppButton type="submit" variant="primary" fullWidth>
            {submitLabel}
          </AppButton>
        )}
      />
    </form>
  );
}
