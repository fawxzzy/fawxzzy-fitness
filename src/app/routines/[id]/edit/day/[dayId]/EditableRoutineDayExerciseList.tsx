"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { ReorderExerciseRow } from "@/app/routines/[id]/edit/day/[dayId]/ReorderExerciseRow";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { DayDetailExerciseList } from "@/components/routines/day-detail/DayDetailExerciseList";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { BottomActionDock } from "@/components/layout/BottomActionDock";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import { useToast } from "@/components/ui/ToastProvider";
import { type ExerciseGoalFormState } from "@/components/ui/measurements/ExerciseGoalForm";
import { SharedExerciseGoalForm } from "@/components/ui/measurements/SharedExerciseGoalForm";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { appTokens } from "@/components/ui/app/tokens";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { ProgressionNumberField, ProgressionPlaybookEditor, type PromotionStepFieldId } from "@/components/routines/ProgressionPlaybookEditor";
import { DayDetailStateCard } from "@/components/routines/day-detail/DayDetailStateCard";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import { deriveGoalMeasurementSelections, resolveGoalModality, type GoalModality } from "@/lib/exercise-goal-validation";
import {
  createEditDayExerciseDraft,
  formatEditDayExerciseDraftSummary,
  resolveEditDayExercisePreview,
  type EditDayExerciseDraft,
} from "@/lib/edit-day-exercise-draft";
import { NORMALIZED_ACTION_LABELS } from "@/lib/action-labels";
import {
  parseProgressionPlaybookPayload,
  type ProgressionPlaybookId,
} from "@/lib/progression-playbooks";
import {
  buildProgressionPlaybookConfigFromFormState,
  createProgressionPlaybookFormState,
  createProgressionPlaybookFormStateForTrainingGoal,
  isTrainingGoalCustomized,
  type ProgressionPlaybookFormState,
} from "@/lib/progression-playbook-form-state";
import {
  inferProgressionStepPolicy,
  type ProgressionStepPolicy,
} from "@/lib/progression-step-policy";
import { isStretchHubExercise } from "@/lib/stretch-library";
import { scrollDockAwareIntoView } from "@/lib/scrollDockAwareIntoView";
import { getDayEditorModeViewModel } from "@/app/routines/[id]/edit/day/[dayId]/dayEditorMode";
import { REST_DAY_BEHAVIOR_CONTRACT } from "@/features/day-state/restDayBehavior";
import { getDayCtaDockState } from "@/shared/day-cta-dock/dayCtaDockState";
import { publishEditDayCloseExpandedCard, publishScreenFocusMode, publishScreenMode, subscribeEditDayCloseExpandedCard } from "@/lib/screen-focus-mode";
import type { TrainingGoalId } from "@/lib/progression-playbooks";

type SetStepFieldId = "load" | "reps" | "duration" | "distance";

function hasTextValue(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function getVisibleSetStepFieldsForGoal({
  goalState,
  modality,
  isCardioTarget,
}: {
  goalState: ExerciseGoalFormState;
  modality: GoalModality;
  isCardioTarget: boolean;
}): SetStepFieldId[] {
  const selectedMeasurements = new Set(goalState.measurements);
  const hasRepsValue = !goalState.failure && (hasTextValue(goalState.repsMin) || hasTextValue(goalState.repsMax));
  const hasWeightValue = hasTextValue(goalState.weight);
  const hasDurationBase = selectedMeasurements.has("time")
    || hasTextValue(goalState.duration)
    || modality === "cardio_time"
    || modality === "cardio_time_distance";
  const hasDistanceBase = selectedMeasurements.has("distance")
    || hasTextValue(goalState.distance)
    || modality === "cardio_distance"
    || modality === "cardio_time_distance";

  if (isCardioTarget) {
    return [
      ...(hasDurationBase ? ["duration" as const] : []),
      ...(hasDistanceBase ? ["distance" as const] : []),
      ...(hasRepsValue ? ["reps" as const] : []),
      ...(hasWeightValue ? ["load" as const] : []),
    ];
  }

  return [
    ...(hasWeightValue ? ["load" as const] : []),
    ...(hasRepsValue ? ["reps" as const] : []),
    ...(hasDurationBase && hasTextValue(goalState.duration) ? ["duration" as const] : []),
    ...(hasDistanceBase && hasTextValue(goalState.distance) ? ["distance" as const] : []),
  ];
}

type EditableRoutineDayExerciseItem = {
  id: string;
  exerciseId: string;
  orderNumber: number;
  name: string;
  measurementType: "reps" | "time" | "distance" | "time_distance" | "none";
  primary_muscle?: string | null;
  equipment: string | null;
  movement_pattern?: string | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
  targetSummary: string;
  isCardio: boolean;
  defaultDistanceUnit: "mi" | "km" | "m";
  image_path?: string | null;
  image_icon_path?: string | null;
  image_howto_path?: string | null;
  slug?: string | null;
  defaults: {
    targetSets?: number | null;
    targetReps?: number | null;
    targetRepsMin?: number | null;
    targetRepsMax?: number | null;
    targetWeight?: number | null;
    targetWeightUnit?: "lbs" | "kg" | null;
    targetDurationSeconds?: number | null;
    targetDistance?: number | null;
    targetDistanceUnit?: "mi" | "km" | "m" | null;
    targetCalories?: number | null;
    progressionPlaybookId?: ProgressionPlaybookId | null;
    progressionPlaybookConfig?: Record<string, unknown> | null;
  };
};

type Props = {
  routineId: string;
  routineDayId: string;
  weightUnit: "lbs" | "kg";
  exercises: EditableRoutineDayExerciseItem[];
  updateAction: (formData: FormData) => Promise<ActionResult>;
  deleteAction: (formData: FormData) => Promise<ActionResult>;
  reorderAction: (formData: FormData) => Promise<ActionResult>;
  initialIsRest: boolean;
  addExerciseHref: string;
  routineDefaultProgressionPlaybookId?: ProgressionPlaybookId | null;
  routineDefaultProgressionPlaybookConfig?: Record<string, unknown> | null;
};

type DragState = {
  id: string;
  pointerId: number;
};

function clampOrderValue(rawValue: number, listLength: number) {
  if (!Number.isFinite(rawValue)) return 1;
  const normalized = Math.trunc(rawValue);
  if (normalized < 1) return 1;
  if (normalized > listLength) return listLength;
  return normalized;
}

function resolveInlineModality(
  measurementType: "reps" | "time" | "distance" | "time_distance" | "none",
  equipment: string | null,
  name?: string | null,
): GoalModality {
  return resolveGoalModality({ measurementType: measurementType === "none" ? "reps" : measurementType, equipment, name, tags: undefined });
}

function RoutineTargetInputs({
  state,
  onStateChange,
  modality,
}: {
  state: ExerciseGoalFormState;
  onStateChange: (next: ExerciseGoalFormState) => void;
  modality: GoalModality;
}) {
  return (
    <div className={appTokens.routineEditorCompactStack}>
      <SharedExerciseGoalForm
        modality={modality}
        state={state}
        onStateChange={onStateChange}
        names={{
          sets: "targetSets",
          repsMin: "targetRepsMin",
          repsMax: "targetRepsMax",
          weight: "targetWeight",
          duration: "targetDuration",
          distance: "targetDistance",
          calories: "targetCalories",
          weightUnit: "targetWeightUnit",
          distanceUnit: "targetDistanceUnit",
        }}
        emptySummaryLabel="Goal missing"
        hideSummary
        measurementLayoutMode="horizontal-scroll"
      />
    </div>
  );
}

function HiddenRoutineTargetInputs({
  state,
  modality,
}: {
  state: ExerciseGoalFormState;
  modality: GoalModality;
}) {
  const measurementSelections = deriveGoalMeasurementSelections(modality, {
    repsMin: state.repsMin,
    repsMax: state.repsMax,
    failure: state.failure,
    weight: state.weight,
    duration: state.duration,
    distance: state.distance,
    calories: state.calories,
  });

  return (
    <>
      {measurementSelections.map((metric) => (
        <input key={`selected-${metric}`} type="hidden" name="measurementSelections" value={metric} />
      ))}
      <input type="hidden" name="targetSets" value={state.sets} />
      <input type="hidden" name="targetRepsMin" value={state.repsMin} />
      <input type="hidden" name="targetRepsMax" value={state.repsMax} />
      <input type="hidden" name="targetWeight" value={state.weight} />
      <input type="hidden" name="targetDuration" value={state.duration} />
      <input type="hidden" name="targetDistance" value={state.distance} />
      <input type="hidden" name="targetCalories" value={state.calories} />
      <input type="hidden" name="targetWeightUnit" value={state.weightUnit} />
      <input type="hidden" name="targetDistanceUnit" value={state.distanceUnit} />
      <input type="hidden" name="goalModality" value={modality} />
      <input type="hidden" name="defaultUnit" value={state.distanceUnit} />
    </>
  );
}

function ProgressionPlaybookInputs({
  draft,
  onDraftChange,
  weightUnit,
  title,
  routineDefaultValue,
  onApplyRoutineDefault,
  progressionStepLabel,
  progressionStepPolicy,
  visiblePromotionStepFields,
  trainingFocusValue,
  trainingFocusCustomized,
  onTrainingFocusChange,
}: {
  draft: EditDayExerciseDraft;
  onDraftChange: (nextDraft: EditDayExerciseDraft) => void;
  weightUnit: "lbs" | "kg";
  title?: string;
  routineDefaultValue: ProgressionPlaybookFormState;
  onApplyRoutineDefault: () => void;
  progressionStepLabel?: string | null;
  progressionStepPolicy?: ProgressionStepPolicy | null;
  visiblePromotionStepFields?: PromotionStepFieldId[] | null;
  trainingFocusValue: TrainingGoalId | "";
  trainingFocusCustomized: boolean;
  onTrainingFocusChange: (goal: TrainingGoalId) => void;
}) {
  return (
    <ProgressionPlaybookEditor
      value={draft}
      onChange={(nextValue) => onDraftChange({ ...draft, ...nextValue })}
      weightUnit={weightUnit}
      title={title}
      context="exercise"
      routineDefaultValue={routineDefaultValue}
      onApplyRoutineDefault={onApplyRoutineDefault}
      showDefaultState
      collapsible
      defaultExpanded={false}
      progressionStepLabel={progressionStepLabel}
      progressionStepPolicy={progressionStepPolicy}
      visiblePromotionStepFields={visiblePromotionStepFields}
      showProgressionSettingsRow={false}
      trainingFocusValue={trainingFocusValue}
      trainingFocusCustomized={trainingFocusCustomized}
      onTrainingFocusChange={onTrainingFocusChange}
    />
  );
}

function formatStepNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function getProgressionStepFieldLabel(policy: ReturnType<typeof inferProgressionStepPolicy>, weightUnit: "lbs" | "kg") {
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

function applyProgressionStepSeed(
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

function getLivePromotionStepFieldsForExercise({
  exercise,
  modality,
  goalState,
  policy,
}: {
  exercise: EditableRoutineDayExerciseItem;
  modality: GoalModality;
  goalState: ExerciseGoalFormState;
  policy: ProgressionStepPolicy;
}): PromotionStepFieldId[] {
  const selectedMetrics = new Set(deriveGoalMeasurementSelections(modality, {
    repsMin: goalState.repsMin,
    repsMax: goalState.repsMax,
    failure: goalState.failure,
    weight: goalState.weight,
    duration: goalState.duration,
    distance: goalState.distance,
    calories: goalState.calories,
  }));
  const isCardioTarget = exercise.isCardio
    || exercise.measurementType === "time"
    || exercise.measurementType === "distance"
    || exercise.measurementType === "time_distance"
    || modality === "cardio_time"
    || modality === "cardio_distance"
    || modality === "cardio_time_distance";

  if (isCardioTarget) {
    const fields: PromotionStepFieldId[] = [];
    if (selectedMetrics.has("time")) fields.push("duration");
    if (selectedMetrics.has("distance")) fields.push("distance");
    return fields;
  }

  if (policy.kind === "load" && selectedMetrics.has("weight")) {
    switch (policy.equipmentFamily) {
      case "barbell":
        return ["barbellLoad"];
      case "dumbbell":
        return ["dumbbellLoad"];
      case "machine":
        return ["machineLoad"];
      case "cable":
        return ["cableLoad"];
      default:
        return ["genericLoad"];
    }
  }

  if (selectedMetrics.has("reps")) {
    return ["bodyweightReps"];
  }

  if (selectedMetrics.has("time") || selectedMetrics.has("distance")) {
    const fields: PromotionStepFieldId[] = [];
    if (selectedMetrics.has("time")) fields.push("duration");
    if (selectedMetrics.has("distance")) fields.push("distance");
    return fields;
  }

  return [];
}

function ProgressionSettingsInputRow({
  draft,
  onDraftChange,
  weightUnit,
  progressionStepLabel,
  visiblePromotionStepFields,
}: {
  draft: EditDayExerciseDraft;
  onDraftChange: (nextDraft: EditDayExerciseDraft) => void;
  weightUnit: "lbs" | "kg";
  progressionStepLabel?: string | null;
  visiblePromotionStepFields: PromotionStepFieldId[];
}) {
  const isCardioTarget = draft.modality === "cardio_time"
    || draft.modality === "cardio_distance"
    || draft.modality === "cardio_time_distance";
  const visibleSetStepFields = getVisibleSetStepFieldsForGoal({
    goalState: draft.goalState,
    modality: draft.modality,
    isCardioTarget,
  });
  const renderPromotionStepField = (fieldId: PromotionStepFieldId) => {
    switch (fieldId) {
      case "barbellLoad":
        return (
          <ProgressionNumberField
            label={`BARBELL (${weightUnit})`}
            name="progressionBarbellLoadIncrement"
            inputMode="decimal"
            value={draft.progressionBarbellLoadIncrement}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionBarbellLoadIncrement: nextValue })}
          />
        );
      case "dumbbellLoad":
        return (
          <ProgressionNumberField
            label={`DUMBBELL (${weightUnit})`}
            name="progressionDumbbellLoadIncrement"
            inputMode="decimal"
            value={draft.progressionDumbbellLoadIncrement}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionDumbbellLoadIncrement: nextValue })}
          />
        );
      case "machineLoad":
        return (
          <ProgressionNumberField
            label={`MACHINE (${weightUnit})`}
            name="progressionMachineLoadIncrement"
            inputMode="decimal"
            value={draft.progressionMachineLoadIncrement}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionMachineLoadIncrement: nextValue })}
          />
        );
      case "cableLoad":
        return (
          <ProgressionNumberField
            label={`CABLE (${weightUnit})`}
            name="progressionCableLoadIncrement"
            inputMode="decimal"
            value={draft.progressionCableLoadIncrement}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionCableLoadIncrement: nextValue })}
          />
        );
      case "genericLoad":
        return (
          <ProgressionNumberField
            label={progressionStepLabel ?? `STEP (${weightUnit})`}
            name="progressionLoadIncrement"
            inputMode="decimal"
            value={draft.progressionLoadIncrement}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionLoadIncrement: nextValue })}
          />
        );
      case "bodyweightReps":
        return (
          <ProgressionNumberField
            label="BODYWEIGHT REPS"
            name="progressionBodyweightRepIncrement"
            inputMode="numeric"
            value={draft.progressionBodyweightRepIncrement}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionBodyweightRepIncrement: nextValue })}
          />
        );
      case "duration":
        return (
          <ProgressionNumberField
            label="DURATION (S)"
            name="progressionDurationIncrementSeconds"
            inputMode="numeric"
            value={draft.progressionDurationIncrementSeconds}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionDurationIncrementSeconds: nextValue })}
          />
        );
      case "distance":
        return (
          <ProgressionNumberField
            label="DISTANCE"
            name="progressionDistanceIncrement"
            inputMode="decimal"
            value={draft.progressionDistanceIncrement}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionDistanceIncrement: nextValue })}
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
            value={draft.progressionSetFlowLoadStep}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionSetFlowLoadStep: nextValue })}
          />
        );
      case "reps":
        return (
          <ProgressionNumberField
            label="SET REPS"
            name="progressionSetFlowRepStep"
            inputMode="numeric"
            value={draft.progressionSetFlowRepStep}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionSetFlowRepStep: nextValue })}
          />
        );
      case "duration":
        return (
          <ProgressionNumberField
            label="SET TIME (S)"
            name="progressionSetFlowDurationStep"
            inputMode="numeric"
            value={draft.progressionSetFlowDurationStep}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionSetFlowDurationStep: nextValue })}
          />
        );
      case "distance":
        return (
          <ProgressionNumberField
            label="SET DISTANCE"
            name="progressionSetFlowDistanceStep"
            inputMode="decimal"
            value={draft.progressionSetFlowDistanceStep}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionSetFlowDistanceStep: nextValue })}
          />
        );
      default:
        return null;
    }
  };
  const fieldGroups: Array<{ title: string; tone: "primary" | "secondary"; fields: ReactNode[] }> = [];

  if (draft.progressionPlaybookId) {
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

    if (draft.progressionSetFlow !== "straight_sets") {
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

    if (draft.progressionStallPolicy === "deload_after_stall") {
      fieldGroups.push({
        title: "Deload Settings",
        tone: "secondary",
        fields: [
        <div key="deload-stall" className="w-[8.25rem] shrink-0">
          <ProgressionNumberField
            label="MISS COUNT"
            name="progressionStallThreshold"
            inputMode="numeric"
            value={draft.progressionStallThreshold}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionStallThreshold: nextValue })}
          />
        </div>,
        <div key="deload-percent" className="w-[8.25rem] shrink-0">
          <ProgressionNumberField
            label="DELOAD %"
            name="progressionDeloadPercent"
            inputMode="decimal"
            value={draft.progressionDeloadPercent}
            onChange={(nextValue) => onDraftChange({ ...draft, progressionDeloadPercent: nextValue })}
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
    <div className="hide-scrollbar overflow-x-auto overscroll-x-contain pb-1.5 pt-1 [touch-action:pan-x_pan-y] [-webkit-overflow-scrolling:touch] [overscroll-behavior-y:auto]">
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

const INLINE_VIEW_ACTION_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "toggleInactive",
});

const INLINE_DELETE_ACTION_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "danger",
});

export function EditableRoutineDayExerciseList({
  routineId,
  routineDayId,
  weightUnit,
  exercises,
  updateAction,
  deleteAction,
  reorderAction,
  initialIsRest,
  addExerciseHref,
  routineDefaultProgressionPlaybookId,
  routineDefaultProgressionPlaybookConfig,
}: Props) {
  const toast = useToast();
  const router = useRouter();
  const [, startAutosaveTransition] = useTransition();
  const reorderFormRef = useRef<HTMLFormElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [items, setItems] = useState(exercises);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [isRestDay, setIsRestDay] = useState(initialIsRest);
  const [reorderMode, setReorderMode] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [draftsById, setDraftsById] = useState<Record<string, EditDayExerciseDraft>>({});
  const [trainingFocusById, setTrainingFocusById] = useState<Record<string, TrainingGoalId | "">>({});
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeEditFormRef = useRef<HTMLFormElement | null>(null);
  const pendingSnapshotRef = useRef<string | null>(null);
  const lastSavedSnapshotRef = useRef<Record<string, string>>({});
  const itemsRef = useRef(exercises);
  const addExerciseNavigationLockedRef = useRef(false);

  useEffect(() => {
    setItems(exercises);
  }, [exercises]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    setDraftsById((current) => Object.fromEntries(
      Object.entries(current).filter(([exerciseId]) => exercises.some((exercise) => exercise.id === exerciseId)),
    ));
    setTrainingFocusById((current) => Object.fromEntries(
      Object.entries(current).filter(([exerciseId]) => exercises.some((exercise) => exercise.id === exerciseId)),
    ));
  }, [exercises]);

  useEffect(() => {
    setIsRestDay(initialIsRest);
  }, [initialIsRest]);

  useEffect(() => () => {
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
  }, []);

  const orderedIds = useMemo(() => items.map((exercise) => exercise.id), [items]);
  const routineDefaultProgression = useMemo(() => createProgressionPlaybookFormState({
    playbookId: routineDefaultProgressionPlaybookId ?? null,
    config: routineDefaultProgressionPlaybookConfig ?? null,
  }), [routineDefaultProgressionPlaybookConfig, routineDefaultProgressionPlaybookId]);
  const initialOrder = useMemo(() => exercises.map((exercise) => exercise.id), [exercises]);
  const canonicalOrderById = useMemo(
    () => new Map(items.map((exercise, index) => [exercise.id, index + 1])),
    [items],
  );

  const persistOrder = (nextItems: EditableRoutineDayExerciseItem[]) => {
    itemsRef.current = nextItems;
    setItems(nextItems);
    requestAnimationFrame(() => reorderFormRef.current?.requestSubmit());
  };

  const updateLocalItem = (exerciseId: string, updater: (item: EditableRoutineDayExerciseItem) => EditableRoutineDayExerciseItem) => {
    setItems((current) => current.map((item) => item.id === exerciseId ? updater(item) : item));
  };

  const moveItemWithinList = (
    currentItems: EditableRoutineDayExerciseItem[],
    fromIndex: number,
    toIndex: number,
  ) => {
    if (
      fromIndex < 0
      || fromIndex >= currentItems.length
      || toIndex < 0
      || toIndex >= currentItems.length
      || fromIndex === toIndex
    ) return currentItems;
    const next = [...currentItems];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  };

  const moveItem = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    setItems((current) => {
      const fromIndex = current.findIndex((item) => item.id === draggedId);
      const toIndex = current.findIndex((item) => item.id === targetId);
      return moveItemWithinList(current, fromIndex, toIndex);
    });
  };

  const applyManualOrderValue = (exerciseId: string, rawOrderValue: number) => {
    const current = itemsRef.current;
    if (current.length === 0) return;
    const fromIndex = current.findIndex((item) => item.id === exerciseId);
    if (fromIndex === -1) return;
    const clampedOrder = clampOrderValue(rawOrderValue, current.length);
    const next = moveItemWithinList(current, fromIndex, clampedOrder - 1);
    const didChangeOrder = next !== current;
    setItems(next);
    itemsRef.current = next;
    if (didChangeOrder) {
      requestAnimationFrame(() => reorderFormRef.current?.requestSubmit());
    }
  };

  const finishReorder = () => {
    setActiveDragId(null);
    dragStateRef.current = null;
    const latestItems = itemsRef.current;
    const latestOrder = latestItems.map((exercise) => exercise.id);
    if (latestOrder.join(",") !== initialOrder.join(",")) {
      persistOrder(latestItems);
    }
  };

  const handleHandlePointerDown = (exerciseId: string, event: React.PointerEvent<HTMLButtonElement>) => {
    if (!reorderMode) return;
    dragStateRef.current = { id: exerciseId, pointerId: event.pointerId };
    setActiveDragId(exerciseId);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleHandlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const row = elementBelow?.closest("[data-exercise-row-id]") as HTMLElement | null;
    const targetId = row?.dataset.exerciseRowId;
    if (targetId) moveItem(dragState.id, targetId);
    event.preventDefault();
  };

  const handleHandlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    finishReorder();
  };

  useEffect(() => {
    if (!reorderMode) {
      setActiveDragId(null);
      dragStateRef.current = null;
      return;
    }
    setExpandedId(null);
    setSelectedExerciseId(null);
  }, [reorderMode]);

  useEffect(() => {
    if (isRestDay) {
      setReorderMode(false);
      setExpandedId(null);
      setSelectedExerciseId(null);
    }
  }, [isRestDay]);

  useEffect(() => {
    if (expandedId) {
      setReorderMode(false);
    }
  }, [expandedId]);

  useEffect(() => {
    if (!expandedId) {
      return;
    }

    let frameA = 0;
    let frameB = 0;

    frameA = window.requestAnimationFrame(() => {
      frameB = window.requestAnimationFrame(() => {
        const scrollContainer = document.querySelector("[data-app-scroll-container='true']");
        const activeRow = document.querySelector(`[data-testid='day-detail-toggle-${expandedId}']`)?.closest("li");

        if (!(scrollContainer instanceof HTMLElement) || !(activeRow instanceof HTMLElement)) {
          return;
        }

        scrollDockAwareIntoView(scrollContainer, activeRow);
      });
    });

    return () => {
      window.cancelAnimationFrame(frameA);
      window.cancelAnimationFrame(frameB);
    };
  }, [expandedId]);

  const handleToggleReorderMode = () => {
    if (isRestDay) return;
    flushAutosave();
    setExpandedId(null);
    setSelectedExerciseId(null);
    setReorderMode((current) => !current);
  };

  const createDraftSnapshot = useCallback((formData: FormData) => {
    const trackedKeys = [
      "targetSets",
      "targetRepsMin",
      "targetRepsMax",
      "targetWeight",
      "targetDuration",
      "targetDistance",
      "targetCalories",
      "targetWeightUnit",
      "targetDistanceUnit",
      "progressionPlaybookId",
      "progressionLoadIncrement",
      "progressionBarbellLoadIncrement",
      "progressionDumbbellLoadIncrement",
      "progressionMachineLoadIncrement",
      "progressionCableLoadIncrement",
      "progressionBodyweightRepIncrement",
      "progressionDurationIncrementSeconds",
      "progressionDistanceIncrement",
      "progressionStallThreshold",
      "progressionDeloadPercent",
      "progressionSetFlow",
      "progressionSetFlowLoadStep",
      "progressionSetFlowRepStep",
      "progressionSetFlowDurationStep",
      "progressionSetFlowDistanceStep",
    ];
    const snapshotPayload = {
      fields: Object.fromEntries(trackedKeys.map((key) => [key, String(formData.get(key) ?? "").trim()])),
      measurementSelections: formData.getAll("measurementSelections").map((value) => String(value)).sort(),
    };
    return JSON.stringify(snapshotPayload);
  }, []);

  const flushAutosave = useCallback(() => {
    if (!expandedId || !activeEditFormRef.current) return;
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }
    const formData = new FormData(activeEditFormRef.current);
    const snapshot = createDraftSnapshot(formData);
    const lastSavedSnapshot = lastSavedSnapshotRef.current[expandedId] ?? null;
    if (snapshot === lastSavedSnapshot) {
      pendingSnapshotRef.current = null;
      return;
    }
    pendingSnapshotRef.current = snapshot;
    activeEditFormRef.current.requestSubmit();
  }, [createDraftSnapshot, expandedId]);

  useEffect(() => subscribeEditDayCloseExpandedCard(() => {
    flushAutosave();
    setSelectedExerciseId(null);
    setExpandedId(null);
  }), [flushAutosave]);

  const editModeActive = expandedId !== null;
  const modeViewModel = getDayEditorModeViewModel({
    isRestDay,
    isReorderMode: reorderMode,
    hasExpandedExercise: editModeActive,
  });
  const ctaDockState = getDayCtaDockState(modeViewModel.mode);
  const activeExercise = useMemo(
    () => items.find((exercise) => exercise.id === expandedId) ?? null,
    [expandedId, items],
  );
  const buildExerciseDraft = useCallback((exercise: EditableRoutineDayExerciseItem) => createEditDayExerciseDraft({
    defaults: exercise.defaults,
    weightUnit,
    distanceUnit: exercise.defaultDistanceUnit,
    orderNumber: canonicalOrderById.get(exercise.id) ?? exercise.orderNumber,
    modality: resolveInlineModality(exercise.measurementType, exercise.equipment, exercise.name),
  }), [canonicalOrderById, weightUnit]);
  const getExerciseDraft = useCallback(
    (exercise: EditableRoutineDayExerciseItem) => draftsById[exercise.id] ?? buildExerciseDraft(exercise),
    [buildExerciseDraft, draftsById],
  );
  const updateExerciseDraft = useCallback(
    (exercise: EditableRoutineDayExerciseItem, updater: (draft: EditDayExerciseDraft) => EditDayExerciseDraft) => {
      setDraftsById((current) => {
        const baseDraft = current[exercise.id] ?? buildExerciseDraft(exercise);
        return {
          ...current,
          [exercise.id]: updater(baseDraft),
        };
      });
    },
    [buildExerciseDraft],
  );
  const hasExercises = items.length > 0;
  const visibleItems = items;

  useEffect(() => {
    publishScreenFocusMode({ screen: "edit-day", active: editModeActive });
    return () => {
      publishScreenFocusMode({ screen: "edit-day", active: false });
    };
  }, [editModeActive]);

  useEffect(() => {
    publishScreenMode({ screen: "edit-day", mode: modeViewModel.mode });
    return () => {
      publishScreenMode({ screen: "edit-day", mode: "default" });
    };
  }, [modeViewModel.mode]);

  const addExerciseLabel = NORMALIZED_ACTION_LABELS.add;
  const reorderButton = modeViewModel.headerAction === "reorder_toggle" ? (
    <BottomDockButton
      type="button"
      intent={reorderMode ? "toggleActive" : "toggleInactive"}
      onClick={handleToggleReorderMode}
      aria-pressed={reorderMode}
      disabled={isRestDay || !hasExercises}
      className={cn(
        isRestDay || !hasExercises ? appTokens.routineEditorHeaderActionButtonDisabled : undefined,
      )}
    >
      {reorderMode ? "Done" : "Reorder"}
    </BottomDockButton>
  ) : null;

  const handleAddExercisePress = () => {
    if (addExerciseNavigationLockedRef.current) return;
    flushAutosave();
    publishEditDayCloseExpandedCard();
    setSelectedExerciseId(null);
    addExerciseNavigationLockedRef.current = true;
    router.push(addExerciseHref);
  };

  const addExerciseDock = editModeActive ? (
    reorderButton ? <BottomActionSingle>{reorderButton}</BottomActionSingle> : null
  ) : (
    <BottomActionDock
      left={reorderButton ?? <div />}
      right={(
        <BottomDockButton type="button" intent="positive" onClick={handleAddExercisePress}>
          {addExerciseLabel}
        </BottomDockButton>
      )}
    />
  );

  if (items.length === 0 || modeViewModel.sections.restDayCardVisible) {
    return (
      <>
        <SharedSectionShell recipe="editDay" bodyClassName={appTokens.routineEditorCompactStack}>
          {modeViewModel.sections.restDayCardVisible ? (
            <DayDetailStateCard
              tone="rest"
              title="Rest day enabled"
              body={REST_DAY_BEHAVIOR_CONTRACT.copy.helper}
              meta={items.length > 0 ? REST_DAY_BEHAVIOR_CONTRACT.copy.enabled : undefined}
            />
          ) : (
            <DayDetailStateCard
              tone="neutral"
              title="No exercises planned"
              body="Add an exercise to start building this day."
            />
          )}
        </SharedSectionShell>
        <PublishBottomActions>
          {ctaDockState.variant === "add_exercise" || ctaDockState.variant === "edit_exercise" ? (
            addExerciseDock
          ) : ctaDockState.variant === "reorder_only" ? (
            reorderButton ? <BottomActionSingle>{reorderButton}</BottomActionSingle> : null
          ) : ctaDockState.variant === "rest_toggle_only" ? (
            reorderButton ? <BottomActionSingle>{reorderButton}</BottomActionSingle> : null
          ) : null}
        </PublishBottomActions>
      </>
    );
  }

  return (
    <>
      <PublishBottomActions>
        {ctaDockState.variant === "add_exercise" || ctaDockState.variant === "edit_exercise" ? (
          addExerciseDock
        ) : ctaDockState.variant === "reorder_only" ? (
          reorderButton ? <BottomActionSingle>{reorderButton}</BottomActionSingle> : null
        ) : ctaDockState.variant === "rest_toggle_only" ? (
          reorderButton ? <BottomActionSingle>{reorderButton}</BottomActionSingle> : null
        ) : null}
      </PublishBottomActions>
      <form
        action={async (formData) => {
          const result = await reorderAction(formData);
          if (!result.ok) {
            toast.error(result.error || "Could not reorder exercises.");
            setItems(exercises);
            return;
          }
          toast.success("Exercise order updated.");
        }}
        className="hidden"
        ref={reorderFormRef}
      >
        <input type="hidden" name="routineId" value={routineId} />
        <input type="hidden" name="routineDayId" value={routineDayId} />
        <input type="hidden" name="orderedExerciseRowIds" value={orderedIds.join(",")} />
      </form>

      {modeViewModel.sections.exerciseListVisible ? (
        reorderMode ? (
          <ul className="space-y-2">
            {visibleItems.map((exercise, index) => {
              const isDragging = activeDragId === exercise.id;
              return (
                <li key={exercise.id} className={appTokens.routineEditorReorderItem}>
                  <ReorderExerciseRow
                    exerciseId={exercise.id}
                    exerciseName={exercise.name}
                    metadata={exercise.targetSummary}
                    measurementType={exercise.measurementType}
                    primary_muscle={exercise.primary_muscle}
                    equipment={exercise.equipment}
                    movement_pattern={exercise.movement_pattern}
                    isCardio={exercise.isCardio}
                    kind={exercise.kind}
                    type={exercise.type}
                    tags={exercise.tags}
                    categories={exercise.categories}
                    slug={exercise.slug}
                    image_path={exercise.image_path}
                    image_icon_path={exercise.image_icon_path}
                    image_howto_path={exercise.image_howto_path}
                    orderNumber={canonicalOrderById.get(exercise.id) ?? index + 1}
                    isDragging={isDragging}
                    onHandlePointerDown={(event) => handleHandlePointerDown(exercise.id, event)}
                    onHandlePointerMove={handleHandlePointerMove}
                    onHandlePointerUp={handleHandlePointerUp}
                    onHandlePointerCancel={() => finishReorder()}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <DayDetailExerciseList
            mode="editable"
            showOrderBadges={false}
            items={visibleItems.map((exercise) => ({
              ...resolveEditDayExercisePreview({
                savedSummary: exercise.targetSummary,
                savedOrderNumber: canonicalOrderById.get(exercise.id) ?? exercise.orderNumber,
                draft: expandedId === exercise.id ? getExerciseDraft(exercise) : null,
                listLength: items.length,
              }),
              id: exercise.id,
              name: exercise.name,
              measurementType: exercise.measurementType,
              primary_muscle: exercise.primary_muscle,
              equipment: exercise.equipment,
              movement_pattern: exercise.movement_pattern,
              isCardio: exercise.isCardio,
              kind: exercise.kind,
              type: exercise.type,
              tags: exercise.tags,
              categories: exercise.categories,
              slug: exercise.slug,
              image_path: exercise.image_path,
              image_icon_path: exercise.image_icon_path,
              image_howto_path: exercise.image_howto_path,
            }))}
            activeItemId={expandedId}
            onSelectItem={!modeViewModel.exerciseListInteractive ? undefined : (item) => {
              setExpandedId((current) => {
                if (current === item.id) {
                  flushAutosave();
                  return null;
                }
                if (current) {
                  flushAutosave();
                }
                return item.id;
              });
            }}
            renderExpandedContent={(item) => {
              const exercise = items.find((entry) => entry.id === item.id);
              if (!exercise) return null;
              const isExpanded = expandedId === exercise.id;
              if (!isExpanded) return null;
              const isStretchExercise = isStretchHubExercise(exercise);
              const showEditableTargets = !isStretchExercise;
              const showProgressionInputs = !isStretchExercise;
              const draft = getExerciseDraft(exercise);
              const modality = resolveInlineModality(exercise.measurementType, exercise.equipment, exercise.name);
              const draftProgressionConfig = buildProgressionPlaybookConfigFromFormState(draft);
              const routineDefaultProgressionConfig = buildProgressionPlaybookConfigFromFormState(routineDefaultProgression);
              const progressionStepPolicy = inferProgressionStepPolicy({
                measurementType: exercise.measurementType === "none" ? "reps" : exercise.measurementType,
                equipment: exercise.equipment,
                movementPattern: exercise.movement_pattern ?? null,
                defaultUnit: exercise.defaultDistanceUnit,
                weightUnit,
                distanceUnit: exercise.defaultDistanceUnit === "km" ? "km" : "mi",
                targetWeight: Number(draft.goalState.weight),
                routineDefaultValue: Number(routineDefaultProgression.progressionLoadIncrement),
                exerciseOverrideValue: Number(draft.progressionLoadIncrement),
                stepOverrides: draftProgressionConfig?.stepOverrides ?? routineDefaultProgressionConfig?.stepOverrides ?? null,
              });
              const visiblePromotionStepFields = getLivePromotionStepFieldsForExercise({
                exercise,
                modality,
                goalState: draft.goalState,
                policy: progressionStepPolicy,
              });
              const progressionStepLabel = getProgressionStepFieldLabel(progressionStepPolicy, weightUnit);
              const selectedTrainingFocus = trainingFocusById[exercise.id] ?? "";
              return (
                <div className={appTokens.routineEditorCompactStack}>
                  <AttachedCardActionStripFrame gridClassName="grid-cols-[minmax(112px,0.92fr)_minmax(0,1.78fr)]">
                      <button
                        type="button"
                        data-bottom-action-intent="toggleInactive"
                        className={cn(INLINE_VIEW_ACTION_BUTTON_CLASS_NAME, "!border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)]")}
                        onClick={() => setSelectedExerciseId(exercise.exerciseId)}
                      >
                        <span className="bottom-action__label">{NORMALIZED_ACTION_LABELS.view}</span>
                      </button>
                      <button
                        type="button"
                        data-bottom-action-intent="danger"
                        className={cn(INLINE_DELETE_ACTION_BUTTON_CLASS_NAME, "translate-x-px")}
                        onClick={() => setDeleteConfirmOpen(true)}
                      >
                        <span className="bottom-action__label">Delete</span>
                      </button>
                  </AttachedCardActionStripFrame>
                  <form
                    ref={(node) => {
                      if (!isExpanded) {
                        return;
                      }
                      activeEditFormRef.current = node;
                      if (node && lastSavedSnapshotRef.current[exercise.id] == null) {
                        lastSavedSnapshotRef.current[exercise.id] = createDraftSnapshot(new FormData(node));
                      }
                    }}
                    onSubmit={(event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      startAutosaveTransition(() => {
                        void (async () => {
                          const result = await updateAction(formData);
                          if (!result.ok) {
                            const nextError = result.error ?? "Could not update exercise.";
                            toast.error(nextError);
                            return;
                          }

                          if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
                          if (result.ok) {
                            const snapshot = pendingSnapshotRef.current ?? createDraftSnapshot(formData);
                            const submittedDraft = getExerciseDraft(exercise);
                            lastSavedSnapshotRef.current[exercise.id] = snapshot;
                            pendingSnapshotRef.current = null;
                            const targetSets = Number(formData.get("targetSets") ?? exercise.defaults.targetSets ?? 1);
                            const parseFormOptionalNumber = (value: FormDataEntryValue | null) => {
                              const raw = String(value ?? "").trim();
                              if (!raw) return null;
                              const parsed = Number(raw);
                              return Number.isFinite(parsed) ? parsed : null;
                            };
                            const targetRepsMin = parseFormOptionalNumber(formData.get("targetRepsMin"));
                            const targetRepsMax = parseFormOptionalNumber(formData.get("targetRepsMax"));
                            const targetWeight = parseFormOptionalNumber(formData.get("targetWeight"));
                            const targetDuration = String(formData.get("targetDuration") ?? "");
                            const targetDistance = parseFormOptionalNumber(formData.get("targetDistance"));
                            const targetCalories = parseFormOptionalNumber(formData.get("targetCalories"));
                            const targetWeightUnit = String(formData.get("targetWeightUnit") ?? weightUnit);
                            const targetDistanceUnit = String(formData.get("targetDistanceUnit") ?? exercise.defaultDistanceUnit);
                            const measurementSelections = new Set(formData.getAll("measurementSelections").map((value) => String(value)));
                            const progression = parseProgressionPlaybookPayload(formData);
                            const durationRaw = targetDuration.trim();
                            const durationSeconds = durationRaw
                              ? (durationRaw.includes(":")
                                ? Number(durationRaw.split(":")[0]) * 60 + Number(durationRaw.split(":")[1])
                                : Number(durationRaw))
                              : null;
                            const summary = formatEditDayExerciseDraftSummary(submittedDraft);
                            updateLocalItem(exercise.id, (item) => ({
                              ...item,
                              targetSummary: summary,
                              defaults: {
                                ...item.defaults,
                                targetSets: Number.isFinite(targetSets) ? targetSets : null,
                                targetReps: measurementSelections.has("reps") ? targetRepsMin : null,
                                targetRepsMin: measurementSelections.has("reps") ? targetRepsMin : null,
                                targetRepsMax: measurementSelections.has("reps") ? targetRepsMax : null,
                                targetWeight: measurementSelections.has("weight") ? targetWeight : null,
                                targetWeightUnit: measurementSelections.has("weight") ? (targetWeightUnit === "kg" ? "kg" : "lbs") : null,
                                targetDurationSeconds: measurementSelections.has("time") && Number.isFinite(durationSeconds) ? durationSeconds : null,
                                targetDistance: measurementSelections.has("distance") ? targetDistance : null,
                                targetDistanceUnit: measurementSelections.has("distance")
                                  ? (targetDistanceUnit === "km" || targetDistanceUnit === "m" ? targetDistanceUnit : "mi")
                                  : null,
                                targetCalories: measurementSelections.has("calories") ? targetCalories : null,
                                progressionPlaybookId: progression.ok ? progression.playbookId : item.defaults.progressionPlaybookId ?? null,
                                progressionPlaybookConfig: progression.ok ? progression.config : item.defaults.progressionPlaybookConfig ?? null,
                              },
                            }));
                          }
                        })();
                      });
                    }}
                    className={cn(appTokens.routineEditorCompactStack, "pt-[2px]")}
                  >
                    <input type="hidden" name="routineId" value={routineId} />
                    <input type="hidden" name="routineDayId" value={routineDayId} />
                    <input type="hidden" name="exerciseRowId" value={exercise.id} />
                    {showEditableTargets ? (
                      <RoutineTargetInputs
                        state={draft.goalState}
                        onStateChange={(nextState) => updateExerciseDraft(exercise, (current) => ({
                          ...current,
                          goalState: nextState,
                        }))}
                        modality={modality}
                      />
                    ) : (
                      <HiddenRoutineTargetInputs state={draft.goalState} modality={modality} />
                    )}
                    {showProgressionInputs ? (
                      <ProgressionSettingsInputRow
                        draft={draft}
                        onDraftChange={(nextDraft) => updateExerciseDraft(exercise, () => nextDraft)}
                        weightUnit={weightUnit}
                        progressionStepLabel={progressionStepLabel}
                        visiblePromotionStepFields={visiblePromotionStepFields}
                      />
                    ) : null}
                    {showProgressionInputs ? (
                      <ProgressionPlaybookInputs
                        draft={draft}
                        onDraftChange={(nextDraft) => updateExerciseDraft(exercise, () => nextDraft)}
                        weightUnit={weightUnit}
                        title="Progression Settings"
                        routineDefaultValue={routineDefaultProgression}
                        onApplyRoutineDefault={() => {
                          updateExerciseDraft(exercise, (current) => ({
                            ...current,
                            ...routineDefaultProgression,
                          }));
                        }}
                        progressionStepLabel={progressionStepLabel}
                        progressionStepPolicy={progressionStepPolicy}
                        visiblePromotionStepFields={visiblePromotionStepFields}
                        trainingFocusValue={selectedTrainingFocus}
                        trainingFocusCustomized={isTrainingGoalCustomized(selectedTrainingFocus, draft)}
                        onTrainingFocusChange={(goal) => {
                          setTrainingFocusById((current) => ({
                            ...current,
                            [exercise.id]: goal,
                          }));
                          updateExerciseDraft(exercise, (current) => ({
                            ...current,
                            ...applyProgressionStepSeed(
                              createProgressionPlaybookFormStateForTrainingGoal(goal),
                              progressionStepPolicy,
                            ),
                          }));
                        }}
                      />
                    ) : null}
                  </form>
                </div>
              );
            }}
          />
        )
      ) : null}

      <ConfirmDestructiveModal
        open={deleteConfirmOpen}
        title="Delete exercise?"
        details={activeExercise?.name}
        confirmLabel="Delete"
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={async () => {
          if (!activeExercise) {
            setDeleteConfirmOpen(false);
            return;
          }
          const formData = new FormData();
          formData.set("routineId", routineId);
          formData.set("routineDayId", routineDayId);
          formData.set("exerciseRowId", activeExercise.id);
          const result = await deleteAction(formData);
          if (!result.ok) {
            toast.error(result.error ?? "Could not delete exercise.");
            return;
          }
          setDeleteConfirmOpen(false);
          setItems((current) => current.filter((item) => item.id !== activeExercise.id));
          setDraftsById((current) => {
            const { [activeExercise.id]: _deletedDraft, ...remainingDrafts } = current;
            return remainingDrafts;
          });
          setExpandedId(null);
          toast.success("Exercise removed.");
        }}
      />

      <ExerciseInfo
        exerciseId={selectedExerciseId}
        open={Boolean(selectedExerciseId)}
        onOpenChange={(open) => {
          if (!open) setSelectedExerciseId(null);
        }}
        onClose={() => setSelectedExerciseId(null)}
        sourceContext="EditableRoutineDayExerciseList"
      />
    </>
  );
}
