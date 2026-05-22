"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { RoutineEditorAddExerciseFlowShell, type EditorExerciseOption } from "@/components/routines/RoutineEditorShared";
import { ProgressionNumberField, ProgressionPlaybookEditor } from "@/components/routines/ProgressionPlaybookEditor";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { useToast } from "@/components/ui/ToastProvider";
import type { ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import { normalizeFitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import type { GoalModality } from "@/lib/exercise-goal-validation";
import {
  buildProgressionPlaybookConfigFromFormState,
  createProgressionPlaybookFormState,
  createProgressionPlaybookFormStateForTrainingGoal,
  isTrainingGoalCustomized,
  type ProgressionPlaybookFormState,
} from "@/lib/progression-playbook-form-state";
import {
  buildProgressionPromotionUiModel,
  getVisiblePromotionStepFieldsForGoal,
  getVisibleSetStepFieldsForGoal,
  type PromotionStepFieldId,
  type SetStepFieldId,
} from "@/lib/progression-playbook-ui-options";
import type { ProgressionPlaybookId, TrainingGoalId } from "@/lib/progression-playbooks";
import {
  inferProgressionStepPolicy,
  type ProgressionStepPolicy,
} from "@/lib/progression-step-policy";
import { isStretchHubExercise } from "@/lib/stretch-library";

export function hasTextValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function formatStepNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function resolveExerciseDistanceUnit(defaultUnit: string | null | undefined) {
  return normalizeFitnessDistanceUnit(defaultUnit, "mi");
}

export function getProgressionStepFieldLabel(policy: ReturnType<typeof inferProgressionStepPolicy>, weightUnit: "lbs" | "kg") {
  if (!policy.label) {
    return `STEP (${weightUnit})`;
  }

  if (policy.unit === "seconds") {
    return "DURATION STEP";
  }

  if (policy.unit === "reps") {
    return "REP STEP";
  }

  if (policy.unit === "mi" || policy.unit === "km") {
    return `DISTANCE STEP (${policy.unit})`;
  }

  if (policy.unit === "lbs" || policy.unit === "kg") {
    return `${policy.label.toUpperCase()} (${policy.unit})`;
  }

  return policy.label.toUpperCase();
}

export function applyProgressionStepSeed(
  state: ProgressionPlaybookFormState,
  policy: ReturnType<typeof inferProgressionStepPolicy>,
) {
  if (!state.progressionPlaybookId || !policy.defaultValue) {
    return state;
  }

  return {
    ...state,
    progressionLoadIncrement: formatStepNumber(policy.defaultValue),
  };
}

export function ProgressionSettingsInputRow({
  progressionDraft,
  onProgressionDraftChange,
  weightUnit,
  progressionStepLabel,
  visiblePromotionStepFields,
  visibleSetStepFields,
}: {
  progressionDraft: ProgressionPlaybookFormState;
  onProgressionDraftChange: (nextState: ProgressionPlaybookFormState) => void;
  weightUnit: "lbs" | "kg";
  progressionStepLabel?: string | null;
  visiblePromotionStepFields: PromotionStepFieldId[];
  visibleSetStepFields: SetStepFieldId[];
}) {
  const renderPromotionStepField = (fieldId: PromotionStepFieldId) => {
    switch (fieldId) {
      case "barbellLoad":
        return (
          <ProgressionNumberField
            label={`BARBELL (${weightUnit})`}
            name="progressionBarbellLoadIncrement"
            inputMode="decimal"
            value={progressionDraft.progressionBarbellLoadIncrement}
            onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionBarbellLoadIncrement: nextValue })}
          />
        );
      case "dumbbellLoad":
        return (
          <ProgressionNumberField
            label={`DUMBBELL (${weightUnit})`}
            name="progressionDumbbellLoadIncrement"
            inputMode="decimal"
            value={progressionDraft.progressionDumbbellLoadIncrement}
            onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionDumbbellLoadIncrement: nextValue })}
          />
        );
      case "machineLoad":
        return (
          <ProgressionNumberField
            label={`MACHINE (${weightUnit})`}
            name="progressionMachineLoadIncrement"
            inputMode="decimal"
            value={progressionDraft.progressionMachineLoadIncrement}
            onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionMachineLoadIncrement: nextValue })}
          />
        );
      case "cableLoad":
        return (
          <ProgressionNumberField
            label={`CABLE (${weightUnit})`}
            name="progressionCableLoadIncrement"
            inputMode="decimal"
            value={progressionDraft.progressionCableLoadIncrement}
            onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionCableLoadIncrement: nextValue })}
          />
        );
      case "genericLoad":
        return (
          <ProgressionNumberField
            label={progressionStepLabel ?? `STEP (${weightUnit})`}
            name="progressionLoadIncrement"
            inputMode="decimal"
            value={progressionDraft.progressionLoadIncrement}
            onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionLoadIncrement: nextValue })}
          />
        );
      case "bodyweightReps":
        return (
          <ProgressionNumberField
            label="BODYWEIGHT REPS"
            name="progressionBodyweightRepIncrement"
            inputMode="numeric"
            value={progressionDraft.progressionBodyweightRepIncrement}
            onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionBodyweightRepIncrement: nextValue })}
          />
        );
      case "duration":
        return (
          <ProgressionNumberField
            label="DURATION (S)"
            name="progressionDurationIncrementSeconds"
            inputMode="numeric"
            value={progressionDraft.progressionDurationIncrementSeconds}
            onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionDurationIncrementSeconds: nextValue })}
          />
        );
      case "distance":
        return (
          <ProgressionNumberField
            label="DISTANCE"
            name="progressionDistanceIncrement"
            inputMode="decimal"
            value={progressionDraft.progressionDistanceIncrement}
            onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionDistanceIncrement: nextValue })}
          />
        );
      default:
        return null;
    }
  };
  const renderSetStepField = (fieldId: SetStepFieldId) => {
    switch (fieldId) {
      case "load":
        return (
          <ProgressionNumberField
            label={`SET LOAD (${weightUnit})`}
            name="progressionSetFlowLoadStep"
            inputMode="decimal"
            value={progressionDraft.progressionSetFlowLoadStep}
            onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionSetFlowLoadStep: nextValue })}
          />
        );
      case "reps":
        return (
          <ProgressionNumberField
            label="SET REPS"
            name="progressionSetFlowRepStep"
            inputMode="numeric"
            value={progressionDraft.progressionSetFlowRepStep}
            onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionSetFlowRepStep: nextValue })}
          />
        );
      case "duration":
        return (
          <ProgressionNumberField
            label="SET TIME (S)"
            name="progressionSetFlowDurationStep"
            inputMode="numeric"
            value={progressionDraft.progressionSetFlowDurationStep}
            onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionSetFlowDurationStep: nextValue })}
          />
        );
      case "distance":
        return (
          <ProgressionNumberField
            label="SET DISTANCE"
            name="progressionSetFlowDistanceStep"
            inputMode="decimal"
            value={progressionDraft.progressionSetFlowDistanceStep}
            onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionSetFlowDistanceStep: nextValue })}
          />
        );
      default:
        return null;
    }
  };
  const fieldGroups: Array<{ title: string; tone: "primary" | "secondary"; fields: ReactNode[] }> = [];

  if (progressionDraft.progressionPlaybookId) {
    const promotionFields = visiblePromotionStepFields.map((fieldId) => (
      <div key={`promotion-${fieldId}`} className="w-[8.25rem] shrink-0">
        {renderPromotionStepField(fieldId)}
      </div>
    ));
    if (promotionFields.length > 0) {
      fieldGroups.push({
        title: "Promotion Step Settings",
        tone: "primary",
        fields: promotionFields,
      });
    }

    if (progressionDraft.progressionSetFlow !== "straight_sets") {
      const setStepFields = visibleSetStepFields.map((fieldId) => (
        <div key={`set-${fieldId}`} className="w-[8.25rem] shrink-0">
          {renderSetStepField(fieldId)}
        </div>
      ));
      if (setStepFields.length > 0) {
      fieldGroups.push({
        title: "Set Step Settings",
        tone: "primary",
        fields: setStepFields,
      });
      }
    }

    if (progressionDraft.progressionStallPolicy === "deload_after_stall") {
      fieldGroups.push({
        title: "Deload Settings",
        tone: "secondary",
        fields: [
          <div key="deload-stall" className="w-[8.25rem] shrink-0">
            <ProgressionNumberField
              label="MISS COUNT"
              name="progressionStallThreshold"
              inputMode="numeric"
              value={progressionDraft.progressionStallThreshold}
              onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionStallThreshold: nextValue })}
            />
          </div>,
          <div key="deload-percent" className="w-[8.25rem] shrink-0">
            <ProgressionNumberField
              label="DELOAD %"
              name="progressionDeloadPercent"
              inputMode="decimal"
              value={progressionDraft.progressionDeloadPercent}
              onChange={(nextValue) => onProgressionDraftChange({ ...progressionDraft, progressionDeloadPercent: nextValue })}
            />
          </div>,
        ],
      });
    }
  }

  if (fieldGroups.length === 0) {
    return null;
  }

  const orderedFieldGroups = fieldGroups.sort((left, right) => {
    const order: Record<string, number> = {
      "Promotion Step Settings": 0,
      "Set Step Settings": 1,
      "Deload Settings": 2,
    };
    return (order[left.title] ?? 99) - (order[right.title] ?? 99);
  });

  return (
    <div className="hide-scrollbar overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1.5 pt-1 [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]">
      <div className="mx-auto flex min-w-full w-max flex-nowrap items-center justify-center gap-1.5 px-1">
        {orderedFieldGroups.map((group, groupIndex) => (
          <div key={group.title} className="flex shrink-0 flex-nowrap items-stretch gap-2">
            {groupIndex > 0 ? (
              <span className="mx-1.5 flex shrink-0 self-stretch items-center" aria-hidden="true">
                <span className="block h-[3.7rem] w-px rounded-full bg-[rgb(var(--accent-divider-rgb)/0.52)]" />
              </span>
            ) : null}
            <div className="shrink-0 space-y-1.5">
              <div className="mx-auto w-fit max-w-full space-y-1 text-center">
                <p className={cn(
                  "text-[9.5px] font-semibold uppercase tracking-[0.15em]",
                  group.tone === "secondary"
                    ? "text-[rgb(var(--secondary-action-rgb)/0.9)]"
                    : "text-[rgb(var(--accent-divider-rgb)/0.88)]",
                )}>
                  {group.title}
                </p>
                <MetricAccentBar variant="thin" className="w-full opacity-85" />
              </div>
              <div className="flex flex-nowrap items-center justify-center gap-1.5">
                {group.fields}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ExerciseChooserAddFlowForm({
  formId,
  hiddenFields,
  exercises,
  initialSelectedId,
  initialCustomExerciseDraft,
  weightUnit,
  defaultProgressionPlaybookId,
  defaultProgressionPlaybookConfig,
  exerciseStats,
  customExerciseEnabled = false,
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
  initialCustomExerciseDraft?: {
    name?: string;
    primaryMuscle?: string | null;
    movementPattern?: string | null;
    equipment?: string | null;
  };
  weightUnit: "lbs" | "kg";
  defaultProgressionPlaybookId?: ProgressionPlaybookId | null;
  defaultProgressionPlaybookConfig?: Record<string, unknown> | null;
  exerciseStats: ExerciseStatsOption[];
  customExerciseEnabled?: boolean;
  backHref: string;
  addExerciseAction: (formData: FormData) => Promise<ActionResult>;
  successMessage: string;
  errorMessage: string;
  className?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const initialSelectedExercise = useMemo(
    () => exercises.find((exercise) => exercise.id === (initialSelectedId ?? exercises[0]?.id)) ?? exercises[0] ?? null,
    [exercises, initialSelectedId],
  );
  const [selectedExercise, setSelectedExercise] = useState<EditorExerciseOption | null>(initialSelectedExercise);
  const routineDefaultProgression = useMemo(() => createProgressionPlaybookFormState({
    playbookId: defaultProgressionPlaybookId ?? null,
    config: defaultProgressionPlaybookConfig ?? null,
  }), [defaultProgressionPlaybookConfig, defaultProgressionPlaybookId]);
  const routineDefaultProgressionConfig = useMemo(
    () => buildProgressionPlaybookConfigFromFormState(routineDefaultProgression),
    [routineDefaultProgression],
  );
  const progressionStepPolicy = useMemo(() => inferProgressionStepPolicy({
    measurementType: selectedExercise?.measurement_type ?? "reps",
    equipment: selectedExercise?.equipment ?? null,
    movementPattern: selectedExercise?.movement_pattern ?? null,
    defaultUnit: selectedExercise?.default_unit ?? null,
    weightUnit,
    distanceUnit: resolveExerciseDistanceUnit(selectedExercise?.default_unit),
    routineDefaultValue: Number(routineDefaultProgression.progressionLoadIncrement),
    stepOverrides: routineDefaultProgressionConfig?.stepOverrides ?? null,
  }), [
    routineDefaultProgressionConfig?.stepOverrides,
    routineDefaultProgression.progressionLoadIncrement,
    selectedExercise?.default_unit,
    selectedExercise?.equipment,
    selectedExercise?.measurement_type,
    selectedExercise?.movement_pattern,
    weightUnit,
  ]);
  const seededExerciseProgression = useMemo(() => {
    if (!routineDefaultProgression.progressionPlaybookId || !progressionStepPolicy.defaultValue) {
      return routineDefaultProgression;
    }

    return {
      ...routineDefaultProgression,
      progressionLoadIncrement: formatStepNumber(progressionStepPolicy.defaultValue),
    };
  }, [progressionStepPolicy.defaultValue, routineDefaultProgression]);
  const [progressionDraft, setProgressionDraft] = useState(seededExerciseProgression);
  const [hasCustomizedProgression, setHasCustomizedProgression] = useState(false);
  const [selectedTrainingFocus, setSelectedTrainingFocus] = useState<TrainingGoalId | "">("");
  const shouldShowProgression = !isStretchHubExercise(selectedExercise);
  const progressionStepLabel = getProgressionStepFieldLabel(progressionStepPolicy, weightUnit);

  useEffect(() => {
    if (hasCustomizedProgression) {
      return;
    }

    setProgressionDraft(seededExerciseProgression);
  }, [hasCustomizedProgression, seededExerciseProgression]);

  return (
    <>
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
          initialCustomExerciseDraft={initialCustomExerciseDraft}
          selectionSearchParam="exerciseId"
          weightUnit={weightUnit}
          exerciseStats={exerciseStats}
          customExerciseEnabled={customExerciseEnabled}
          onSelectedExerciseChange={setSelectedExercise}
          renderFooter={({ goalValidation, selectedCanonicalExerciseId, openExerciseInfo, isCustomExerciseSelected, customExerciseError }) => (
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
                    if (isCustomExerciseSelected && customExerciseError) {
                      event.preventDefault();
                      toast.error(customExerciseError, { id: "custom-exercise-validation" });
                      return;
                    }
                    if (goalValidation.isValid) {
                      return;
                    }
                    event.preventDefault();
                    toast.error(goalValidation.message || "Finish the missing goal fields before adding this exercise.", { id: "exercise-goal-validation" });
                  }}
                >
                  {isCustomExerciseSelected ? "Create & Add" : "Add"}
                </BottomDockButton>
              )}
            />
          )}
          goalBetweenInputsAndPreviewContent={shouldShowProgression ? ({ selectedExercise: activeExercise, goalState, effectiveGoalModality }) => {
            const activeProgressionStepPolicy = inferProgressionStepPolicy({
              measurementType: activeExercise?.measurement_type ?? selectedExercise?.measurement_type ?? "reps",
              equipment: activeExercise?.equipment ?? selectedExercise?.equipment ?? null,
              movementPattern: activeExercise?.movement_pattern ?? selectedExercise?.movement_pattern ?? null,
              defaultUnit: activeExercise?.default_unit ?? selectedExercise?.default_unit ?? null,
              weightUnit,
              distanceUnit: resolveExerciseDistanceUnit(activeExercise?.default_unit ?? selectedExercise?.default_unit),
              targetWeight: Number(goalState.weight),
              routineDefaultValue: Number(routineDefaultProgression.progressionLoadIncrement),
              exerciseOverrideValue: Number(progressionDraft.progressionLoadIncrement),
              stepOverrides: buildProgressionPlaybookConfigFromFormState(progressionDraft)?.stepOverrides
                ?? routineDefaultProgressionConfig?.stepOverrides
                ?? null,
            });
            const activeProgressionStepLabel = getProgressionStepFieldLabel(activeProgressionStepPolicy, weightUnit);
            const visiblePromotionStepFields = getVisiblePromotionStepFieldsForGoal({
              modality: effectiveGoalModality,
              values: goalState,
              policy: activeProgressionStepPolicy,
            });
            const visibleSetStepFields = getVisibleSetStepFieldsForGoal({
              modality: effectiveGoalModality,
              values: goalState,
            });

            return (
              <ProgressionSettingsInputRow
                progressionDraft={progressionDraft}
                onProgressionDraftChange={(nextValue) => {
                  setHasCustomizedProgression(true);
                  setProgressionDraft(nextValue);
                }}
                weightUnit={weightUnit}
                progressionStepLabel={activeProgressionStepLabel}
                visiblePromotionStepFields={visiblePromotionStepFields}
                visibleSetStepFields={visibleSetStepFields}
              />
            );
          } : null}
          goalExtraContent={shouldShowProgression ? ({ selectedExercise: activeExercise, goalState, effectiveGoalModality }) => {
            const activeProgressionStepPolicy = inferProgressionStepPolicy({
              measurementType: activeExercise?.measurement_type ?? selectedExercise?.measurement_type ?? "reps",
              equipment: activeExercise?.equipment ?? selectedExercise?.equipment ?? null,
              movementPattern: activeExercise?.movement_pattern ?? selectedExercise?.movement_pattern ?? null,
              defaultUnit: activeExercise?.default_unit ?? selectedExercise?.default_unit ?? null,
              weightUnit,
              distanceUnit: resolveExerciseDistanceUnit(activeExercise?.default_unit ?? selectedExercise?.default_unit),
              targetWeight: Number(goalState.weight),
              routineDefaultValue: Number(routineDefaultProgression.progressionLoadIncrement),
              exerciseOverrideValue: Number(progressionDraft.progressionLoadIncrement),
              stepOverrides: buildProgressionPlaybookConfigFromFormState(progressionDraft)?.stepOverrides
                ?? routineDefaultProgressionConfig?.stepOverrides
                ?? null,
            });
            const activeProgressionStepLabel = getProgressionStepFieldLabel(activeProgressionStepPolicy, weightUnit);
            const visiblePromotionStepFields = getVisiblePromotionStepFieldsForGoal({
              modality: effectiveGoalModality,
              values: goalState,
              policy: activeProgressionStepPolicy,
            });
            const promotionUiModel = buildProgressionPromotionUiModel({
              context: "exercise",
              promotionBasis: progressionDraft.progressionPromotionBasis,
              modality: effectiveGoalModality,
              values: goalState,
            });
            const repRangeMin = hasTextValue(goalState.repsMin)
              ? Number(goalState.repsMin)
              : null;
            const repRangeMax = hasTextValue(goalState.repsMax)
              ? Number(goalState.repsMax)
              : repRangeMin;

            return (
              <ProgressionPlaybookEditor
                value={progressionDraft}
                onChange={(nextValue) => {
                  setHasCustomizedProgression(true);
                  setProgressionDraft(nextValue);
                }}
                weightUnit={weightUnit}
              distanceUnit={resolveExerciseDistanceUnit(activeExercise?.default_unit ?? selectedExercise?.default_unit)}
                title="Progression Settings"
                context="exercise"
                routineDefaultValue={seededExerciseProgression}
                onApplyRoutineDefault={() => {
                  setHasCustomizedProgression(false);
                  setProgressionDraft(seededExerciseProgression);
                }}
                showDefaultState
                collapsible
                portalProgressionSettings
                defaultExpanded={false}
                progressionStepLabel={activeProgressionStepLabel}
                progressionStepPolicy={activeProgressionStepPolicy}
                visiblePromotionStepFields={visiblePromotionStepFields}
                promotionUiModel={promotionUiModel}
                showProgressionSettingsRow={false}
                repRangeMin={Number.isFinite(repRangeMin) ? repRangeMin : null}
                repRangeMax={Number.isFinite(repRangeMax) ? repRangeMax : null}
                trainingFocusValue={selectedTrainingFocus}
                trainingFocusCustomized={isTrainingGoalCustomized(selectedTrainingFocus, progressionDraft)}
                onTrainingFocusChange={(goal) => {
                  setSelectedTrainingFocus(goal);
                  setHasCustomizedProgression(true);
                  setProgressionDraft(applyProgressionStepSeed(
                    createProgressionPlaybookFormStateForTrainingGoal(goal),
                    activeProgressionStepPolicy,
                  ));
                }}
              />
            );
          } : null}
          footerSlot={null}
        />
      </form>
    </>
  );
}
