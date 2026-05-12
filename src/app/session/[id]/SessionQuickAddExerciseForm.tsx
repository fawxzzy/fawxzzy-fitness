"use client";

import { ExerciseChooserAddFlowForm } from "@/components/exercises/ExerciseChooserAddFlowForm";
import type { EditorExerciseOption } from "@/components/routines/RoutineEditorShared";
import type { ActionResult } from "@/lib/action-result";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import type { ProgressionPlaybookId } from "@/lib/progression-playbooks";

export function SessionQuickAddExerciseForm({
  sessionId,
  exercises,
  initialSelectedId,
  weightUnit,
  exerciseStats,
  defaultProgressionPlaybookId,
  defaultProgressionPlaybookConfig,
  backHref,
  addExerciseAction,
}: {
  sessionId: string;
  exercises: EditorExerciseOption[];
  initialSelectedId?: string;
  weightUnit: "lbs" | "kg";
  exerciseStats: ExerciseStatsOption[];
  defaultProgressionPlaybookId?: ProgressionPlaybookId | null;
  defaultProgressionPlaybookConfig?: Record<string, unknown> | null;
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
      defaultProgressionPlaybookId={defaultProgressionPlaybookId}
      defaultProgressionPlaybookConfig={defaultProgressionPlaybookConfig}
      exerciseStats={exerciseStats}
      customExerciseEnabled
      backHref={backHref}
      addExerciseAction={addExerciseAction}
      successMessage="Exercise added to session."
      errorMessage="Could not add exercise."
    />
  );
}
