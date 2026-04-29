"use client";

import { ExerciseChooserAddFlowForm } from "@/components/exercises/ExerciseChooserAddFlowForm";
import type { EditorExerciseOption } from "@/components/routines/RoutineEditorShared";
import { appTokens } from "@/components/ui/app/tokens";
import type { ActionResult } from "@/lib/action-result";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";

export function SessionQuickAddExerciseForm({
  sessionId,
  exercises,
  initialSelectedId,
  weightUnit,
  exerciseStats,
  backHref,
  addExerciseAction,
}: {
  sessionId: string;
  exercises: EditorExerciseOption[];
  initialSelectedId?: string;
  weightUnit: "lbs" | "kg";
  exerciseStats: ExerciseStatsOption[];
  backHref: string;
  addExerciseAction: (formData: FormData) => Promise<ActionResult>;
}) {
  return (
    <ExerciseChooserAddFlowForm
      formId="session-quick-add-exercise-form"
      hiddenFields={{ sessionId }}
      exercises={exercises}
      initialSelectedId={initialSelectedId}
      weightUnit={weightUnit}
      exerciseStats={exerciseStats}
      backHref={backHref}
      addExerciseAction={addExerciseAction}
      successMessage="Exercise added to session."
      errorMessage="Could not add exercise."
      className={appTokens.currentSessionFormStack}
    />
  );
}
