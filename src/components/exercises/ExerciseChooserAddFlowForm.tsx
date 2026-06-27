"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { ExerciseProgressionEditorSurface } from "@/components/routines/ExerciseProgressionEditorSurface";
import { RoutineEditorAddExerciseFlowShell, type EditorExerciseOption } from "@/components/routines/RoutineEditorShared";
import {
  GlowSwitch,
  GLOW_SWITCH_MEASUREMENT_ROW_WRAPPER_CLASS_NAME,
  GLOW_SWITCH_STANDARD_CLASS_NAME,
  GLOW_SWITCH_STANDARD_STATE_CLASS_NAME,
} from "@/components/ui/GlowSwitch";
import { useToast } from "@/components/ui/ToastProvider";
import { type RoutineEditorInfoPayload } from "@/components/ui/measurements/ExerciseGoalForm";
import type { MeasurementPanelAuxiliaryField } from "@/components/ui/measurements/MeasurementPanelV2";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import { normalizeFitnessDistanceUnit, type FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import {
  buildProgressionPlaybookConfigFromFormState,
  createProgressionPlaybookFormState,
  createProgressionPlaybookFormStateForTrainingGoal,
  isTrainingGoalCustomized,
} from "@/lib/progression-playbook-form-state";
import {
  getDefaultProgressionPlaybookConfig,
  PROGRESSION_METHOD_DEFINITIONS,
  type ProgressionPlaybookId,
  type TrainingGoalId,
} from "@/lib/progression-playbooks";
import { inferProgressionStepPolicy } from "@/lib/progression-step-policy";
import { seedProgressionDraftWithStepValue } from "@/lib/progression-step-seeding";
import { isStretchHubExercise } from "@/lib/stretch-library";

type HandledActionResult = ActionResult & {
  handled?: boolean;
};

function resolveExerciseDistanceUnit(defaultUnit: string | null | undefined) {
  return normalizeFitnessDistanceUnit(defaultUnit, "mi");
}

function hasTextValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

type AddExerciseProgressionMethodId = Exclude<ProgressionPlaybookId, "deload_after_stall"> | "";

function createAddExerciseProgressionMethodInfoPayload(playbookId: AddExerciseProgressionMethodId): RoutineEditorInfoPayload {
  const definition = playbookId && playbookId in PROGRESSION_METHOD_DEFINITIONS
    ? PROGRESSION_METHOD_DEFINITIONS[playbookId]
    : PROGRESSION_METHOD_DEFINITIONS.manual;

  return {
    title: "Progression",
    summary: definition.whatItDoes,
    rows: [
      { label: "Selected", value: definition.label },
      { label: "Use it for", value: definition.useItFor },
      { label: "Pattern", value: definition.pattern },
    ],
  };
}

function applyAddExerciseProgressionMethod(
  value: ReturnType<typeof createProgressionPlaybookFormState>,
  nextPlaybookId: AddExerciseProgressionMethodId,
) {
  if (!nextPlaybookId) {
    return {
      ...value,
      progressionPlaybookId: "" as const,
      progressionStallPolicy: "none" as const,
    };
  }

  const nextDefaults = getDefaultProgressionPlaybookConfig(nextPlaybookId);
  const nextState = createProgressionPlaybookFormState({
    playbookId: nextPlaybookId,
    config: nextDefaults,
  });

  return {
    ...value,
    ...nextState,
    progressionStallPolicy: value.progressionStallPolicy,
    progressionStallThreshold: value.progressionStallThreshold,
    progressionDeloadPercent: value.progressionDeloadPercent,
    progressionAutoUpdateRoutineGoals: value.progressionAutoUpdateRoutineGoals,
    progressionSetFlow: value.progressionSetFlow,
    progressionSetFlowTimeDirection: value.progressionSetFlowTimeDirection,
    progressionSetFlowDistanceDirection: value.progressionSetFlowDistanceDirection,
    progressionSetFlowRepDirection: value.progressionSetFlowRepDirection,
    progressionSetFlowLoadDirection: value.progressionSetFlowLoadDirection,
    progressionSetFlowMeasurements: value.progressionSetFlowMeasurements,
    progressionSetFlowLinks: value.progressionSetFlowLinks,
    progressionSetFlowCountMap: value.progressionSetFlowCountMap,
    progressionSetFlowGroupedCountMap: value.progressionSetFlowGroupedCountMap,
    progressionSetFlowGroupedDirectionMap: value.progressionSetFlowGroupedDirectionMap,
    progressionPromotionBasis: value.progressionPromotionBasis,
    progressionRepPromotionThreshold: value.progressionRepPromotionThreshold,
    progressionCustomRepPromotionTarget: value.progressionCustomRepPromotionTarget,
    progressionPromotionDirectionMap: value.progressionPromotionDirectionMap,
    progressionPromotionSessionCountMap: value.progressionPromotionSessionCountMap,
    progressionPromotionGroupedSessionCountMap: value.progressionPromotionGroupedSessionCountMap,
    progressionTargetMutation: value.progressionTargetMutation,
    progressionHasExplicitTargetMutation: value.progressionHasExplicitTargetMutation,
    progressionRequiredQualifiedSessions: value.progressionRequiredQualifiedSessions,
    progressionQualificationWindowMode: value.progressionQualificationWindowMode,
    progressionQualificationWindowResetOnMiss: value.progressionQualificationWindowResetOnMiss,
    progressionHasExplicitQualificationWindow: value.progressionHasExplicitQualificationWindow,
  };
}

export function ExerciseChooserAddFlowForm({
  formId,
  hiddenFields,
  cycleLengthDays = 7,
  progressionExampleDayNumber,
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
  cycleLengthDays?: number;
  progressionExampleDayNumber?: number | null;
  exercises: EditorExerciseOption[];
  initialSelectedId?: string;
  initialCustomExerciseDraft?: {
    name?: string;
    primaryMuscle?: string | null;
    secondaryMuscle?: string | null;
    movementPattern?: string | null;
    equipment?: string | null;
  };
  weightUnit: "lbs" | "kg";
  defaultProgressionPlaybookId?: ProgressionPlaybookId | null;
  defaultProgressionPlaybookConfig?: Record<string, unknown> | null;
  exerciseStats: ExerciseStatsOption[];
  customExerciseEnabled?: boolean;
  backHref: string;
  addExerciseAction: (formData: FormData) => Promise<HandledActionResult>;
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
    return seedProgressionDraftWithStepValue(
      routineDefaultProgression,
      progressionStepPolicy.defaultValue,
    );
  }, [progressionStepPolicy.defaultValue, routineDefaultProgression]);
  const [progressionDraft, setProgressionDraft] = useState(seededExerciseProgression);
  const [hasCustomizedProgression, setHasCustomizedProgression] = useState(false);
  const [selectedTrainingFocus, setSelectedTrainingFocus] = useState<TrainingGoalId | "">("");
  const shouldShowProgression = !isStretchHubExercise(selectedExercise);
  useEffect(() => {
    if (hasCustomizedProgression) {
      return;
    }

    setProgressionDraft(seededExerciseProgression);
  }, [hasCustomizedProgression, seededExerciseProgression]);
  const currentProgressionMethodId: AddExerciseProgressionMethodId = progressionDraft.progressionPlaybookId === "double_progression"
    || progressionDraft.progressionPlaybookId === "fixed_load_rep_range_progression"
    ? progressionDraft.progressionPlaybookId
    : "";
  const publishProgressionMethodInfo = (playbookId: AddExerciseProgressionMethodId = currentProgressionMethodId) => {
    window.dispatchEvent(new CustomEvent("fitness:routine-editor-info", {
      detail: createAddExerciseProgressionMethodInfoPayload(playbookId),
    }));
  };
  const progressionAuxiliaryField: MeasurementPanelAuxiliaryField = {
    title: "Progression",
    input: null,
    inlineLabel: "PROGRESSION",
    useInlineFieldShell: false,
    showEmptyValue: false,
    hasValue: true,
    renderInput: () => (
      <div
        className={GLOW_SWITCH_MEASUREMENT_ROW_WRAPPER_CLASS_NAME}
        onFocusCapture={() => publishProgressionMethodInfo()}
        onPointerDownCapture={() => publishProgressionMethodInfo()}
      >
        <GlowSwitch
          checked={Boolean(progressionDraft.progressionPlaybookId)}
          ariaLabel={progressionDraft.progressionPlaybookId ? "Automatic progression enabled" : "Manual progression enabled"}
          onLabel="Auto"
          offLabel="Manual"
          onClick={() => {
            const nextPlaybookId: AddExerciseProgressionMethodId = progressionDraft.progressionPlaybookId ? "" : "double_progression";
            setHasCustomizedProgression(true);
            setProgressionDraft(applyAddExerciseProgressionMethod(progressionDraft, nextPlaybookId));
            publishProgressionMethodInfo(nextPlaybookId);
          }}
          className={GLOW_SWITCH_STANDARD_CLASS_NAME}
          stateClassName={GLOW_SWITCH_STANDARD_STATE_CLASS_NAME}
        />
      </div>
    ),
  };

  return (
    <>
      <form
        action={async (formData) => {
          const result = await addExerciseAction(formData);
          if (result.handled) {
            return;
          }
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
          onApplyLastSelection={({ progressionPlaybookId, progressionPlaybookConfig }) => {
            setSelectedTrainingFocus("");
            setHasCustomizedProgression(true);
            setProgressionDraft(createProgressionPlaybookFormState({
              playbookId: progressionPlaybookId,
              config: progressionPlaybookConfig,
            }));
          }}
          onClearLastSelection={() => {
            setSelectedTrainingFocus("");
            setHasCustomizedProgression(false);
            setProgressionDraft(seededExerciseProgression);
          }}
          goalAuxiliaryFields={shouldShowProgression ? [progressionAuxiliaryField] : []}
          goalInlineFailureToggle
          renderFooter={({ goalValidation, isCustomExerciseSelected, customExerciseError, canToggleLastSelection, didApplyLastSelection, onToggleLastSelection }) => (
            <BottomActionSplit
              secondary={(
                <BottomDockButton
                  type="button"
                  intent="info"
                  onClick={onToggleLastSelection}
                  disabled={!canToggleLastSelection}
                >
                  {didApplyLastSelection ? "Clear Last" : "Use Last"}
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
                  Confirm
                </BottomDockButton>
              )}
            />
          )}
          goalExtraContent={shouldShowProgression ? ({ selectedExercise: activeExercise, goalState, effectiveGoalModality }) => {
            return (
              <ExerciseProgressionEditorSurface
                draft={progressionDraft}
                onChange={(nextValue) => {
                  setHasCustomizedProgression(true);
                  setProgressionDraft(nextValue);
                }}
                goalState={goalState}
                modality={effectiveGoalModality}
                weightUnit={weightUnit}
                distanceUnit={resolveExerciseDistanceUnit(activeExercise?.default_unit ?? selectedExercise?.default_unit)}
                exerciseMeasurementType={activeExercise?.measurement_type ?? selectedExercise?.measurement_type ?? "reps"}
                exerciseEquipment={activeExercise?.equipment ?? selectedExercise?.equipment ?? null}
                exerciseMovementPattern={activeExercise?.movement_pattern ?? selectedExercise?.movement_pattern ?? null}
                exerciseName={activeExercise?.name ?? selectedExercise?.name ?? null}
                cycleLengthDays={cycleLengthDays}
                progressionExampleDayNumber={progressionExampleDayNumber}
                routineDefaultValue={seededExerciseProgression}
                onApplyRoutineDefault={() => {
                  setHasCustomizedProgression(false);
                  setProgressionDraft(seededExerciseProgression);
                }}
                trainingFocusValue={selectedTrainingFocus}
                trainingFocusCustomized={isTrainingGoalCustomized(selectedTrainingFocus, progressionDraft)}
                onTrainingFocusChange={(goal) => {
                  setSelectedTrainingFocus(goal);
                  setHasCustomizedProgression(true);
                  const nextProgressionDraft = createProgressionPlaybookFormStateForTrainingGoal(goal);
                  setProgressionDraft(seedProgressionDraftWithStepValue(nextProgressionDraft, progressionStepPolicy.defaultValue));
                }}
                reserveInfoLayoutSpace={false}
                dropdownPreset="exercise-inline"
                infoDockPlacement="above-bottom-actions"
              />
            );
          } : null}
          goalDockViewportMode={shouldShowProgression ? ({ goalState }) => {
            const hasEnteredMeasurementValue = (
              hasTextValue(goalState.repsMin)
              || hasTextValue(goalState.repsMax)
              || hasTextValue(goalState.weight)
              || hasTextValue(goalState.duration)
              || hasTextValue(goalState.distance)
              || hasTextValue(goalState.calories)
            );
            const isManualProgression = !progressionDraft.progressionPlaybookId;
            return !hasEnteredMeasurementValue || isManualProgression ? "compact" : "default";
          } : "default"}
          footerSlot={null}
        />
      </form>
    </>
  );
}
