"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { ExerciseProgressionEditorSurface } from "@/components/routines/ExerciseProgressionEditorSurface";
import { RoutineEditorAddExerciseFlowShell, type EditorExerciseOption } from "@/components/routines/RoutineEditorShared";
import { ChevronDownIcon } from "@/components/ui/Chevrons";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { useToast } from "@/components/ui/ToastProvider";
import { type RoutineEditorInfoPayload } from "@/components/ui/measurements/ExerciseGoalForm";
import { ACTION_CHROME_CONTROL_CLASS_NAME, ACTION_CHROME_SEGMENTED_CLASS_NAME } from "@/components/ui/actionChrome";
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
  const progressionMethodInfoPayload = createAddExerciseProgressionMethodInfoPayload(currentProgressionMethodId);
  const addExerciseSecondaryToggleCardClassName = "w-[calc((100%-1.5rem)/3)] max-w-[12rem] min-w-0 flex-1 basis-0 space-y-[5px] text-center";
  const progressionToggleCard = (
    <div
      className={addExerciseSecondaryToggleCardClassName}
      onFocusCapture={() => {
        window.dispatchEvent(new CustomEvent("fitness:routine-editor-info", {
          detail: progressionMethodInfoPayload,
        }));
      }}
      onPointerDownCapture={() => {
        window.dispatchEvent(new CustomEvent("fitness:routine-editor-info", {
          detail: progressionMethodInfoPayload,
        }));
      }}
    >
      <div className="mx-auto inline-flex max-w-full flex-col items-stretch space-y-[2px]">
        <p className="px-1 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent-strong)/0.94)]">
          Progression
        </p>
        <MetricAccentBar variant="thin" className="w-full opacity-80" />
      </div>
      <button
        type="button"
        className={[
          ACTION_CHROME_CONTROL_CLASS_NAME,
          ACTION_CHROME_SEGMENTED_CLASS_NAME,
          "inline-flex min-h-10 w-full items-center justify-center rounded-[var(--action-chrome-segment-radius-compact)] border-[rgb(var(--accent-strong)/0.58)] bg-[linear-gradient(180deg,rgba(71,215,196,0.22),rgba(18,31,48,0.96))] px-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[rgb(var(--text-primary))] ring-1 ring-[rgb(var(--accent-strong)/0.22)] shadow-[var(--action-chrome-shadow-hover)] focus-visible:ring-[rgb(var(--accent)/0.2)]",
        ].join(" ")}
        aria-pressed={Boolean(progressionDraft.progressionPlaybookId)}
        aria-label={progressionDraft.progressionPlaybookId ? "Automatic progression enabled" : "Manual progression enabled"}
        onClick={() => {
          const nextPlaybookId: AddExerciseProgressionMethodId = progressionDraft.progressionPlaybookId ? "" : "double_progression";
          setHasCustomizedProgression(true);
          setProgressionDraft(applyAddExerciseProgressionMethod(progressionDraft, nextPlaybookId));
          window.dispatchEvent(new CustomEvent("fitness:routine-editor-info", {
            detail: createAddExerciseProgressionMethodInfoPayload(nextPlaybookId),
          }));
        }}
      >
        <span className="flex flex-col items-center justify-center gap-0.5 leading-none">
          <span className="measurement-toggle__label">
            {progressionDraft.progressionPlaybookId ? "Auto" : "Manual"}
          </span>
          <ChevronDownIcon className="h-3 w-3 text-[rgb(var(--accent-strong)/0.94)]" />
        </span>
      </button>
    </div>
  );

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
          goalCompanionToggleCards={[progressionToggleCard]}
          renderFooter={({ goalValidation, selectedCanonicalExerciseId, openExerciseInfo, isCustomExerciseSelected, customExerciseError }) => (
            <BottomActionSplit
              secondary={(
                <BottomDockButton
                  type="button"
                  intent="toggleActive"
                  onClick={openExerciseInfo}
                  disabled={!selectedCanonicalExerciseId}
                >
                  Inspect
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
