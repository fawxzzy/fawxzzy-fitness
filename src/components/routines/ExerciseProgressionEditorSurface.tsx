"use client";

import { useMemo } from "react";
import { buildFailureToggleInfoPayload, type ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { ProgressionPlaybookEditor } from "@/components/routines/ProgressionPlaybookEditor";
import {
  buildProgressionPlaybookConfigFromFormState,
  type ProgressionPlaybookFormState,
} from "@/lib/progression-playbook-form-state";
import {
  buildProgressionPromotionUiModel,
  getVisiblePromotionStepFieldsForGoal,
} from "@/lib/progression-playbook-ui-options";
import {
  inferProgressionStepPolicy,
  type ProgressionStepPolicy,
} from "@/lib/progression-step-policy";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { TrainingGoalId } from "@/lib/progression-playbooks";
import type { GoalModality } from "@/lib/exercise-goal-validation";

function hasTextValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function parseDurationInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/u.test(trimmed)) return Number(trimmed);
  const match = trimmed.match(/^(\d+):(\d{1,2})$/u);
  if (!match) return null;
  return (Number(match[1]) * 60) + Number(match[2]);
}

function parsePositiveNumber(value: string | null | undefined) {
  if (!hasTextValue(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getProgressionStepFieldLabel(policy: ReturnType<typeof inferProgressionStepPolicy>, weightUnit: "lbs" | "kg") {
  if (!policy.label) {
    return `WEIGHT (${weightUnit})`;
  }

  if (policy.unit === "seconds") {
    return "DURATION STEP";
  }

  if (policy.unit === "reps") {
    return "REP STEP";
  }

  if (policy.unit === "mi" || policy.unit === "km") {
    return `DIST (${policy.unit})`;
  }

  if (policy.unit === "lbs" || policy.unit === "kg") {
    return `${policy.label.toUpperCase()} (${policy.unit})`;
  }

  return policy.label.toUpperCase();
}

export function ExerciseProgressionEditorSurface({
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
  routineDefaultValue,
  onApplyRoutineDefault,
  trainingFocusValue = "",
  trainingFocusCustomized = false,
  onTrainingFocusChange,
  hideExerciseSetSuccessCount,
  reserveInfoLayoutSpace = true,
  dropdownPreset = "default",
  hideProgressionMethodControl,
  renderRegressionAsSection,
  infoDockPlacement,
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
  routineDefaultValue: ProgressionPlaybookFormState;
  onApplyRoutineDefault: () => void;
  trainingFocusValue?: TrainingGoalId | "";
  trainingFocusCustomized?: boolean;
  onTrainingFocusChange?: (goal: TrainingGoalId) => void;
  hideExerciseSetSuccessCount?: boolean;
  reserveInfoLayoutSpace?: boolean;
  dropdownPreset?: "default" | "exercise-inline";
  hideProgressionMethodControl?: boolean;
  renderRegressionAsSection?: boolean;
  infoDockPlacement?: "default" | "above-bottom-actions";
}) {
  const draftProgressionConfig = useMemo(
    () => buildProgressionPlaybookConfigFromFormState(draft),
    [draft],
  );
  const routineDefaultProgressionConfig = useMemo(
    () => buildProgressionPlaybookConfigFromFormState(routineDefaultValue),
    [routineDefaultValue],
  );

  const progressionStepPolicy = useMemo<ProgressionStepPolicy>(() => inferProgressionStepPolicy({
    measurementType: exerciseMeasurementType === "none" ? "reps" : exerciseMeasurementType,
    equipment: exerciseEquipment,
    movementPattern: exerciseMovementPattern ?? null,
    defaultUnit: distanceUnit,
    weightUnit,
    distanceUnit,
    targetWeight: Number(goalState.weight),
    routineDefaultValue: Number(routineDefaultValue.progressionLoadIncrement),
    exerciseOverrideValue: Number(draft.progressionLoadIncrement),
    stepOverrides: draftProgressionConfig?.stepOverrides ?? routineDefaultProgressionConfig?.stepOverrides ?? null,
  }), [
    distanceUnit,
    draft.progressionLoadIncrement,
    draftProgressionConfig?.stepOverrides,
    exerciseEquipment,
    exerciseMeasurementType,
    exerciseMovementPattern,
    goalState.weight,
    routineDefaultProgressionConfig?.stepOverrides,
    routineDefaultValue.progressionLoadIncrement,
    weightUnit,
  ]);

  const visiblePromotionStepFields = useMemo(
    () => getVisiblePromotionStepFieldsForGoal({
      modality,
      values: goalState,
      policy: progressionStepPolicy,
    }),
    [goalState, modality, progressionStepPolicy],
  );

  const promotionUiModel = useMemo(
    () => buildProgressionPromotionUiModel({
      context: "exercise",
      promotionBasis: draft.progressionPromotionBasis,
      modality,
      values: goalState,
    }),
    [draft.progressionPromotionBasis, goalState, modality],
  );

  const progressionStepLabel = useMemo(
    () => getProgressionStepFieldLabel(progressionStepPolicy, weightUnit),
    [progressionStepPolicy, weightUnit],
  );

  const repRangeMin = hasTextValue(goalState.repsMin) ? Number(goalState.repsMin) : null;
  const repRangeMax = hasTextValue(goalState.repsMax) ? Number(goalState.repsMax) : repRangeMin;
  const exampleTargetValues = useMemo(
    () => ({
      sets: parsePositiveNumber(goalState.sets),
      time: parseDurationInput(goalState.duration),
      distance: parsePositiveNumber(goalState.distance),
      reps: parsePositiveNumber(goalState.repsMin),
      repsMax: parsePositiveNumber(goalState.repsMax) ?? parsePositiveNumber(goalState.repsMin),
      weight: parsePositiveNumber(goalState.weight),
    }),
    [goalState.distance, goalState.duration, goalState.repsMax, goalState.repsMin, goalState.sets, goalState.weight],
  );

  const failureToggleInfoContent = useMemo(
    () => buildFailureToggleInfoPayload({
      modality,
      state: goalState,
      isFailureMode: goalState.failure && (modality === "strength" || modality === "bodyweight"),
    }),
    [goalState, modality],
  );

  return (
    <ProgressionPlaybookEditor
      value={draft}
      onChange={onChange}
      weightUnit={weightUnit}
      distanceUnit={distanceUnit}
      title=""
      context="exercise"
      routineDefaultValue={routineDefaultValue}
      onApplyRoutineDefault={onApplyRoutineDefault}
      showDefaultState
      collapsible={false}
      separateInfoBox
      separateInfoReserveLayoutSpace={reserveInfoLayoutSpace}
      cycleLengthDays={cycleLengthDays}
      progressionExampleDayNumber={progressionExampleDayNumber}
      progressionStepLabel={progressionStepLabel}
      progressionStepPolicy={progressionStepPolicy}
      visiblePromotionStepFields={visiblePromotionStepFields}
      promotionUiModel={promotionUiModel}
      repRangeMin={Number.isFinite(repRangeMin) ? repRangeMin : null}
      repRangeMax={Number.isFinite(repRangeMax) ? repRangeMax : null}
      trainingFocusValue={trainingFocusValue}
      trainingFocusCustomized={trainingFocusCustomized}
      onTrainingFocusChange={onTrainingFocusChange}
      dropdownPreset={dropdownPreset}
      hideExerciseSetSuccessCount={hideExerciseSetSuccessCount}
      failureToggleInfoContent={failureToggleInfoContent}
      hideProgressionMethodControl={hideProgressionMethodControl}
      renderRegressionAsSection={renderRegressionAsSection}
      infoDockPlacement={infoDockPlacement}
      exampleTargetValues={exampleTargetValues}
    />
  );
}
