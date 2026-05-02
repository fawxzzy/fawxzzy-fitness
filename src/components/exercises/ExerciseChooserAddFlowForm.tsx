"use client";

import { useRouter } from "next/navigation";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { RoutineEditorAddExerciseFlowShell, type EditorExerciseOption } from "@/components/routines/RoutineEditorShared";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";

export function ExerciseChooserAddFlowForm({
  formId,
  hiddenFields,
  exercises,
  initialSelectedId,
  weightUnit,
  exerciseStats,
  backHref,
  addExerciseAction,
  successMessage,
  errorMessage,
  className,
}: {
  formId: string;
  hiddenFields: Record<string, string>;
  exercises: EditorExerciseOption[];
  initialSelectedId?: string;
  weightUnit: "lbs" | "kg";
  exerciseStats: ExerciseStatsOption[];
  backHref: string;
  addExerciseAction: (formData: FormData) => Promise<ActionResult>;
  successMessage: string;
  errorMessage: string;
  className?: string;
}) {
  const toast = useToast();
  const router = useRouter();

  return (
    <form
      action={async (formData) => {
        const result = await addExerciseAction(formData);
        toastActionResult(toast, result, {
          success: successMessage,
          error: errorMessage,
        });

        if (result.ok) {
          router.push(backHref);
          router.refresh();
        }
      }}
      id={formId}
      className={className}
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <RoutineEditorAddExerciseFlowShell
        exercises={exercises}
        name="exerciseId"
        initialSelectedId={initialSelectedId ?? exercises[0]?.id}
        selectionSearchParam="exerciseId"
        weightUnit={weightUnit}
        exerciseStats={exerciseStats}
        renderFooter={({ goalValidation, selectedCanonicalExerciseId, openExerciseInfo }) => (
          <BottomActionSplit
            secondary={(
              <BottomDockButton
                type="button"
                intent="toggleActive"
                onClick={openExerciseInfo}
                disabled={!selectedCanonicalExerciseId}
              >
                View
              </BottomDockButton>
            )}
            primary={(
              <BottomDockButton
                type="submit"
                form={formId}
                intent="positive"
                onClick={(event) => {
                  if (goalValidation.isValid) {
                    return;
                  }
                  event.preventDefault();
                  toast.warning(goalValidation.message, { id: "exercise-goal-validation" });
                }}
              >
                Add
              </BottomDockButton>
            )}
          />
        )}
        footerSlot={null}
      />
    </form>
  );
}
