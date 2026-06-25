"use client";

import type { ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { ExerciseProgressionEditorSurface } from "@/components/routines/ExerciseProgressionEditorSurface";
import type { GoalModality } from "@/lib/exercise-goal-validation";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { ProgressionPlaybookFormState } from "@/lib/progression-playbook-form-state";

export function CurrentSessionProgressionSurface({
  draft,
  onChange,
  goalState,
  modality,
  weightUnit,
  distanceUnit,
  exerciseMeasurementType,
  exerciseEquipment,
  exerciseMovementPattern,
  exerciseName,
  cycleLengthDays,
  progressionExampleDayNumber,
}: {
  draft: ProgressionPlaybookFormState;
  onChange: (nextValue: ProgressionPlaybookFormState) => void;
  goalState: ExerciseGoalFormState;
  modality: GoalModality;
  weightUnit: "lbs" | "kg";
  distanceUnit: FitnessDistanceUnit;
  exerciseMeasurementType: "reps" | "time" | "distance" | "time_distance" | "none";
  exerciseEquipment: string | null;
  exerciseMovementPattern?: string | null;
  exerciseName?: string | null;
  cycleLengthDays: number;
  progressionExampleDayNumber?: number | null;
}) {
  return (
    <ExerciseProgressionEditorSurface
      draft={draft}
      onChange={onChange}
      goalState={goalState}
      modality={modality}
      weightUnit={weightUnit}
      distanceUnit={distanceUnit}
      exerciseMeasurementType={exerciseMeasurementType}
      exerciseEquipment={exerciseEquipment}
      exerciseMovementPattern={exerciseMovementPattern ?? null}
      exerciseName={exerciseName ?? null}
      cycleLengthDays={cycleLengthDays}
      progressionExampleDayNumber={progressionExampleDayNumber ?? null}
      routineDefaultValue={null}
      showDefaultState={false}
      hideExerciseSetSuccessCount
      reserveInfoLayoutSpace={false}
      dropdownPreset="exercise-inline"
      infoDockPlacement="above-bottom-actions"
    />
  );
}
