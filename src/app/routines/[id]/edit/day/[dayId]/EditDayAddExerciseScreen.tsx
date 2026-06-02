"use client";

import { ExerciseChooserAddFlowForm } from "@/components/exercises/ExerciseChooserAddFlowForm";
import type { ActionResult } from "@/lib/action-result";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import type { ProgressionPlaybookId } from "@/lib/progression-playbooks";

type ExerciseOption = {
  id: string;
  name: string;
  user_id: string | null;
  is_global: boolean;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance" | "none";
  default_unit: string | null;
  calories_estimation_method: string | null;
  image_howto_path: string | null;
  how_to_short?: string | null;
  image_icon_path?: string | null;
  slug?: string | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
};

export function EditDayAddExerciseScreen({
  routineId,
  routineDayId,
  dayIndex,
  cycleLengthDays,
  exercises,
  initialSelectedId,
  weightUnit,
  defaultProgressionPlaybookId,
  defaultProgressionPlaybookConfig,
  addExerciseAction,
  exerciseStats,
  backHref,
}: {
  routineId: string;
  routineDayId: string;
  dayIndex: number;
  cycleLengthDays: number;
  exercises: ExerciseOption[];
  initialSelectedId?: string;
  weightUnit: "lbs" | "kg";
  defaultProgressionPlaybookId?: ProgressionPlaybookId | null;
  defaultProgressionPlaybookConfig?: Record<string, unknown> | null;
  addExerciseAction: (formData: FormData) => Promise<ActionResult>;
  exerciseStats: ExerciseStatsOption[];
  backHref: string;
}) {
  return (
    <ExerciseChooserAddFlowForm
      formId="routine-day-add-exercise-form"
      hiddenFields={{ routineId, routineDayId }}
      cycleLengthDays={cycleLengthDays}
      progressionExampleDayNumber={dayIndex}
      exercises={exercises}
      initialSelectedId={initialSelectedId}
      weightUnit={weightUnit}
      defaultProgressionPlaybookId={defaultProgressionPlaybookId}
      defaultProgressionPlaybookConfig={defaultProgressionPlaybookConfig}
      exerciseStats={exerciseStats}
      customExerciseEnabled
      backHref={backHref}
      addExerciseAction={addExerciseAction}
      successMessage="Exercise added to the day."
      errorMessage="Could not add exercise to the day."
    />
  );
}
