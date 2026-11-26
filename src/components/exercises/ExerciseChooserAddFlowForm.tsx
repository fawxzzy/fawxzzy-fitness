"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BottomActionSingle, BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { OptionSwitchRow } from "@/components/ui/measurements/OptionControls";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { ExerciseProgressionEditorSurface } from "@/components/routines/ExerciseProgressionEditorSurface";
import { RoutineEditorAddExerciseFlowShell, type EditorExerciseOption } from "@/components/routines/RoutineEditorShared";
import { useToast } from "@/components/ui/ToastProvider";
import { type RoutineEditorInfoPayload } from "@/components/ui/measurements/ExerciseGoalForm";
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
import { AddExerciseGuide } from "@/components/exercises/AddExerciseGuide";
import { inferProgressionStepPolicy } from "@/lib/progression-step-policy";
import { seedProgressionDraftWithStepValue } from "@/lib/progression-step-seeding";
import { isStretchHubExercise } from "@/lib/stretch-library";

type HandledActionResult = ActionResult & {
  handled?: boolean;
};

function resolveExerciseDistanceUnit(defaultUnit: string | null | undefined) {
  return normalizeFitnessDistanceUnit(defaultUnit, "mi");
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
  additionalGoalExtraContent,
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
  additionalGoalExtraContent?: ReactNode;
  className?: string;
}) {
  const toast = useToast();
  const router = useRouter();
  const initialSelectedExercise = useMemo(
    // No fallback to the first exercise: nothing is selected until the person picks one (F-003).
    () => (initialSelectedId ? exercises.find((exercise) => exercise.id === initialSelectedId) ?? null : null),
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
  // The submit button lives in the bottom dock (outside the <form>), so useFormStatus cannot see it: track it here.
  const [isSubmitting, setIsSubmitting] = useState(false);
  // `<form action>` runs as a React transition, so a pending flag set inside it lands in the same render as its reset and
  // never shows. Submit from onSubmit (an urgent event) instead, and guard with a ref so a second tap cannot start a second add.
  const submitInFlightRef = useRef(false);
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
  const isAutoProgressOn = Boolean(progressionDraft.progressionPlaybookId);
  // One plain switch (SIMPLIFY #6) instead of the amber Auto/Manual pill; the rules editor only shows while it is on.
  const autoProgressSwitch = (
    <OptionSwitchRow
      label="Auto-progress"
      hint={isAutoProgressOn ? "Adds weight or reps when you hit the top of your goal." : "You set the next goal yourself."}
      checked={isAutoProgressOn}
      onCheckedChange={(next) => {
        const nextPlaybookId: AddExerciseProgressionMethodId = next ? "double_progression" : "";
        setHasCustomizedProgression(true);
        setProgressionDraft(applyAddExerciseProgressionMethod(progressionDraft, nextPlaybookId));
        publishProgressionMethodInfo(nextPlaybookId);
      }}
    />
  );

  return (
    <>
      <form
        onSubmit={async (event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          if (submitInFlightRef.current) {
            return;
          }
          submitInFlightRef.current = true;
          setIsSubmitting(true);
          try {
            const result = await addExerciseAction(new FormData(event.currentTarget));
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
          } catch {
            toast.error(errorMessage, { id: "add-exercise-submit" });
          } finally {
            submitInFlightRef.current = false;
            setIsSubmitting(false);
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
          initialSelectedId={initialSelectedId}
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
          renderFooter={({ goalValidation, isCustomExerciseSelected, customExerciseError, canToggleLastSelection, didApplyLastSelection, onToggleLastSelection }) => {
            const addButton = (
                <BottomDockButton
                  type="submit"
                  form={formId}
                  intent="positive"
                  disabled={!selectedExercise && !isCustomExerciseSelected}
                  loading={isSubmitting}
                  loadingLabel="Adding exercise"
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
                  Add Exercise
                </BottomDockButton>
            );
            // "Same as last time" only exists when this exercise has history (SIMPLIFY #6); otherwise Add is the one action.
            if (!canToggleLastSelection) {
              return <BottomActionSingle>{addButton}</BottomActionSingle>;
            }
            return (
              <BottomActionSplit
                secondary={(
                  <BottomDockButton
                    type="button"
                    intent="info"
                    onClick={onToggleLastSelection}
                    disabled={isSubmitting}
                    aria-label={didApplyLastSelection ? "Reset" : "Same as last time"}
                  >
                    {/* Dock labels stay at 14 characters or fewer (DESIGN C12); the full words are the accessible name. */}
                    {didApplyLastSelection ? "Reset" : "Last time"}
                  </BottomDockButton>
                )}
                primary={addButton}
              />
            );
          }}
          goalExtraContent={({ selectedExercise: activeExercise, goalState, effectiveGoalModality }) => {
            return (
              <div className="space-y-2">
                {shouldShowProgression ? autoProgressSwitch : null}
                {additionalGoalExtraContent}
                {shouldShowProgression ? <AddExerciseGuide showTimer={Boolean(additionalGoalExtraContent)} /> : null}
                {shouldShowProgression ? (
                  // Stays mounted while Auto-progress is off so its fields still submit "no progression".
                  <div hidden={!isAutoProgressOn}>
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
                    // One explainer (DESIGN #4): AddExerciseGuide above is the only help row. The fixed INFO dock also
                    // covered the bottom of the goal sheet and its folded header.
                    showProgressionInfo={false}
                  />
                  </div>
                ) : null}
              </div>
            );
          }}
          // One panel height for every Add exercise entry: it always has to fit the goal fields, the timer row (workout)
          // and the "How this works" row without hiding them below the fold.
          goalDockViewportMode="default"
          footerSlot={null}
        />
      </form>
    </>
  );
}
