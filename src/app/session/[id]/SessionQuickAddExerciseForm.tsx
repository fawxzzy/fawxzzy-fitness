"use client";

import { useRouter } from "next/navigation";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { RoutineEditorAddExerciseFlowShell, type EditorExerciseOption } from "@/components/routines/RoutineEditorShared";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";

export function SessionQuickAddExerciseForm({
  sessionId,
  exercises,
  initialSelectedId,
  weightUnit,
  exerciseStats,
  backHref,
  quickAddExerciseAction,
}: {
  sessionId: string;
  exercises: EditorExerciseOption[];
  initialSelectedId?: string;
  weightUnit: "lbs" | "kg";
  exerciseStats: ExerciseStatsOption[];
  backHref: string;
  quickAddExerciseAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const toast = useToast();
  const router = useRouter();

  return (
    <form
      action={async (formData) => {
        const result = await quickAddExerciseAction(formData);
        toastActionResult(toast, result, {
          success: "Exercise added to session.",
          error: "Could not add exercise.",
        });

        if (result.ok) {
          router.push(backHref);
          router.refresh();
        }
      }}
      id="session-quick-add-exercise-form"
      className={appTokens.currentSessionFormStack}
    >
      <input type="hidden" name="sessionId" value={sessionId} />
      <input type="hidden" name="setCount" value="3" />

      <RoutineEditorAddExerciseFlowShell
        exercises={exercises}
        name="exerciseId"
        initialSelectedId={initialSelectedId ?? exercises[0]?.id}
        weightUnit={weightUnit}
        exerciseStats={exerciseStats}
        renderFooter={({ goalValidation, selectedCanonicalExerciseId, openExerciseInfo }) => (
          <PublishBottomActions>
            <BottomActionSplit
              secondary={(
                <BottomDockButton
                  type="button"
                  intent="info"
                  onClick={openExerciseInfo}
                  disabled={!selectedCanonicalExerciseId}
                >
                  View
                </BottomDockButton>
              )}
              primary={(
                <BottomDockButton
                  type="submit"
                  form="session-quick-add-exercise-form"
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
          </PublishBottomActions>
        )}
        footerSlot={null}
      />
    </form>
  );
}
