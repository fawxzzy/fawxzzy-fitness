"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { DayDetailExerciseList } from "@/components/routines/day-detail/DayDetailExerciseList";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { BottomActionSingle, BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { useToast } from "@/components/ui/ToastProvider";
import { type ExerciseGoalFormState, type RoutineEditorInfoPayload } from "@/components/ui/measurements/ExerciseGoalForm";
import { SharedExerciseGoalForm } from "@/components/ui/measurements/SharedExerciseGoalForm";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { appTokens } from "@/components/ui/app/tokens";
import { AccentDotSeparatedText } from "@/components/ui/app/SignatureSeparator";
import { ExerciseProgressionEditorSurface } from "@/components/routines/ExerciseProgressionEditorSurface";
import { DayDetailStateCard } from "@/components/routines/day-detail/DayDetailStateCard";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import { deriveGoalMeasurementSelections, resolveGoalModality, type GoalModality } from "@/lib/exercise-goal-validation";
import {
  createEditDayExerciseDraft,
  formatEditDayExerciseDraftSummary,
  resolveEditDayAdjustedSummary,
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
} from "@/lib/progression-playbook-form-state";
import {
  inferProgressionStepPolicy,
} from "@/lib/progression-step-policy";
import { seedProgressionDraftWithStepValue } from "@/lib/progression-step-seeding";
import { isStretchHubExercise } from "@/lib/stretch-library";
import { scrollDockAwareIntoView } from "@/lib/scrollDockAwareIntoView";
import { getDayEditorModeViewModel } from "@/app/routines/[id]/edit/day/[dayId]/dayEditorMode";
import { REST_DAY_BEHAVIOR_CONTRACT } from "@/features/day-state/restDayBehavior";
import { getDayCtaDockState } from "@/shared/day-cta-dock/dayCtaDockState";
import {
  publishEditDayAutoProgressionVisibility,
  publishEditDayCloseExpandedCard,
  publishScreenFocusMode,
  publishScreenMode,
  subscribeEditDayAdjustmentDirection,
  subscribeEditDayAutoProgressionVisibility,
  subscribeEditDayCloseExpandedCard,
} from "@/lib/screen-focus-mode";
import type { TrainingGoalId } from "@/lib/progression-playbooks";
import type { SetFlowDirection } from "@/lib/set-flow-directions";

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
  defaultDistanceUnit: FitnessDistanceUnit;
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
    targetDistanceUnit?: FitnessDistanceUnit | null;
    targetCalories?: number | null;
    progressionPlaybookId?: ProgressionPlaybookId | null;
    progressionPlaybookConfig?: Record<string, unknown> | null;
  };
};

type Props = {
  routineId: string;
  routineDayId: string;
  dayIndex?: number | null;
  cycleLengthDays: number;
  weightUnit: "lbs" | "kg";
  exercises: EditableRoutineDayExerciseItem[];
  updateAction: (formData: FormData) => Promise<ActionResult>;
  deleteAction: (formData: FormData) => Promise<ActionResult>;
  reorderAction: (formData: FormData) => Promise<ActionResult>;
  initialIsRest: boolean;
  addExerciseHref: string;
  routineDefaultProgressionPlaybookId?: ProgressionPlaybookId | null;
  routineDefaultProgressionPlaybookConfig?: Record<string, unknown> | null;
  showDayAdjustmentControl: boolean;
  initialDayAdjustmentDirection: SetFlowDirection;
};

type DragState = {
  id: string;
  pointerId: number;
};

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
  onInfoRequest,
}: {
  state: ExerciseGoalFormState;
  onStateChange: (next: ExerciseGoalFormState) => void;
  modality: GoalModality;
  onInfoRequest?: (payload: RoutineEditorInfoPayload) => void;
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
        onInfoRequest={onInfoRequest}
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

const CARD_REORDER_HANDLE_CLASS_NAME = cn(
  appTokens.routineEditorReorderHandle,
  "relative z-[1] h-8 w-8 border-[rgb(var(--selection-rgb)/0.28)] bg-[linear-gradient(180deg,rgb(var(--selection-rgb)/0.08),rgb(var(--surface-1-rgb)/0.36))] text-[rgb(var(--text-primary)/0.94)] shadow-[0_0_0_1px_rgb(var(--selection-rgb)/0.06),0_0_16px_rgb(var(--selection-rgb)/0.12)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--selection-rgb)/0.22)]",
);

function EditDayAdjustedSummaryPreview({
  currentSummary,
  adjustedSummary,
  direction,
}: {
  currentSummary: string;
  adjustedSummary: string;
  direction: SetFlowDirection;
}) {
  const arrowColor = direction === "up"
    ? "rgb(var(--accent))"
    : "rgb(var(--danger-rgb))";

  return (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <AccentDotSeparatedText
        text={currentSummary}
        className="min-w-0 text-[rgb(var(--text-secondary)/0.84)]"
        itemClassName="truncate"
      />
      <span
        className="inline-flex min-w-4 items-center justify-center"
        style={{ color: arrowColor }}
      >
        <span className="text-[12px] font-bold leading-none">{"\u2192"}</span>
      </span>
      <AccentDotSeparatedText
        text={adjustedSummary}
        className="min-w-0 text-[rgb(var(--text-primary)/0.96)]"
        itemClassName="truncate"
      />
    </span>
  );
}

export function EditableRoutineDayExerciseList({
  routineId,
  routineDayId,
  dayIndex,
  cycleLengthDays,
  weightUnit,
  exercises,
  updateAction,
  deleteAction,
  reorderAction,
  initialIsRest,
  addExerciseHref,
  routineDefaultProgressionPlaybookId,
  routineDefaultProgressionPlaybookConfig,
  showDayAdjustmentControl,
  initialDayAdjustmentDirection,
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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [draftsById, setDraftsById] = useState<Record<string, EditDayExerciseDraft>>({});
  const [trainingFocusById, setTrainingFocusById] = useState<Record<string, TrainingGoalId | "">>({});
  const [isDayAdjustmentVisible, setIsDayAdjustmentVisible] = useState(showDayAdjustmentControl);
  const [dayAdjustmentDirection, setDayAdjustmentDirection] = useState<SetFlowDirection>(initialDayAdjustmentDirection);
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

  useEffect(() => {
    setIsDayAdjustmentVisible(showDayAdjustmentControl);
  }, [showDayAdjustmentControl]);

  useEffect(() => {
    setDayAdjustmentDirection(initialDayAdjustmentDirection);
  }, [initialDayAdjustmentDirection]);

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

  const finishReorder = () => {
    setActiveDragId(null);
    dragStateRef.current = null;
    const latestItems = itemsRef.current;
    const latestOrder = latestItems.map((exercise) => exercise.id);
    if (latestOrder.join(",") !== initialOrder.join(",")) {
      persistOrder(latestItems);
    }
  };

  const handleHandlePointerDown = (exerciseId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    dragStateRef.current = { id: exerciseId, pointerId: event.pointerId };
    setActiveDragId(exerciseId);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleHandlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const row = elementBelow?.closest("[data-exercise-row-id]") as HTMLElement | null;
    const targetId = row?.dataset.exerciseRowId;
    if (targetId) moveItem(dragState.id, targetId);
    event.preventDefault();
  };

  const handleHandlePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    finishReorder();
  };

  useEffect(() => {
    if (isRestDay) {
      setActiveDragId(null);
      dragStateRef.current = null;
      setExpandedId(null);
      setSelectedExerciseId(null);
    }
  }, [isRestDay]);

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
      "progressionDayMode",
      "progressionDayLoadStep",
      "progressionDayRepStep",
      "progressionDayDurationStep",
      "progressionDayDistanceStep",
      "progressionSetFlowDirectionsJson",
      "progressionEffortWaveDirectionsJson",
      "progressionPromotionBasis",
      "progressionPromotionMeasurementOrdersJson",
      "progressionPromotionMeasurementSequenceJson",
      "progressionPromotionRepRangePreviewJson",
      "progressionRepPromotionThreshold",
      "progressionCustomRepPromotionTarget",
      "progressionTargetMutation",
      "progressionHasExplicitTargetMutation",
      "progressionRequiredQualifiedSessions",
      "progressionQualificationWindowMode",
      "progressionQualificationWindowResetOnMiss",
      "progressionHasExplicitQualificationWindow",
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

  useEffect(() => subscribeEditDayAutoProgressionVisibility(setIsDayAdjustmentVisible), []);
  useEffect(() => subscribeEditDayAdjustmentDirection(setDayAdjustmentDirection), []);

  const editModeActive = expandedId !== null;
  const modeViewModel = getDayEditorModeViewModel({
    isRestDay,
    isReorderMode: false,
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
  const visibleItems = items;
  const hasVisibleAutoProgression = useMemo(
    () => items.some((exercise) => {
      const draft = draftsById[exercise.id];
      return Boolean((draft?.progressionPlaybookId ?? exercise.defaults.progressionPlaybookId ?? "").trim());
    }),
    [draftsById, items],
  );

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

  useEffect(() => {
    publishEditDayAutoProgressionVisibility({
      screen: "edit-day",
      visible: hasVisibleAutoProgression,
    });
  }, [hasVisibleAutoProgression]);

  const addExerciseLabel = "Add Exercise";

  const handleAddExercisePress = () => {
    if (addExerciseNavigationLockedRef.current) return;
    flushAutosave();
    publishEditDayCloseExpandedCard();
    setSelectedExerciseId(null);
    addExerciseNavigationLockedRef.current = true;
    router.push(addExerciseHref);
  };

  const addExerciseDock = (
    <BottomActionSingle>
      <BottomDockButton type="button" intent="positive" onClick={handleAddExercisePress}>
        {addExerciseLabel}
      </BottomDockButton>
    </BottomActionSingle>
  );
  const expandedExerciseDock = activeExercise ? (
    <BottomActionSplit
      secondary={(
        <BottomDockButton type="button" intent="toggleInactive" onClick={() => setSelectedExerciseId(activeExercise.exerciseId)}>
          {NORMALIZED_ACTION_LABELS.view}
        </BottomDockButton>
      )}
      primary={(
        <BottomDockButton type="button" intent="danger" onClick={() => setDeleteConfirmOpen(true)}>
          Delete
        </BottomDockButton>
      )}
    />
  ) : null;

  const renderReorderHandle = (exerciseId: string, exerciseName: string) => (
    <button
      type="button"
      aria-label={`Reorder ${exerciseName}`}
      title="Drag to reorder"
      className={cn(CARD_REORDER_HANDLE_CLASS_NAME, activeDragId === exerciseId ? "ring-2 ring-[rgb(var(--selection-rgb)/0.26)]" : undefined)}
      onPointerDown={(event) => handleHandlePointerDown(exerciseId, event)}
      onPointerMove={handleHandlePointerMove}
      onPointerUp={handleHandlePointerUp}
      onPointerCancel={() => finishReorder()}
      onClick={(event) => event.preventDefault()}
    >
      <span aria-hidden="true" className={appTokens.routineEditorHandleGlyph}>::</span>
    </button>
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
          {ctaDockState.variant === "add_exercise" ? (
            addExerciseDock
          ) : ctaDockState.variant === "edit_exercise" ? (
            expandedExerciseDock
          ) : null}
        </PublishBottomActions>
      </>
    );
  }

  return (
    <>
      <PublishBottomActions>
        {ctaDockState.variant === "add_exercise" ? (
          addExerciseDock
        ) : ctaDockState.variant === "edit_exercise" ? (
          expandedExerciseDock
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
        <DayDetailExerciseList
          mode="editable"
          showOrderBadges={false}
          items={visibleItems.map((exercise) => ({
            ...(() => {
              const draftForPreview = expandedId === exercise.id
                ? getExerciseDraft(exercise)
                : createEditDayExerciseDraft({
                    defaults: exercise.defaults,
                    weightUnit,
                    distanceUnit: exercise.defaultDistanceUnit,
                    orderNumber: canonicalOrderById.get(exercise.id) ?? exercise.orderNumber,
                    modality: resolveInlineModality(exercise.measurementType, exercise.equipment, exercise.name),
                  });
              const preview = resolveEditDayExercisePreview({
              savedSummary: exercise.targetSummary,
              savedOrderNumber: canonicalOrderById.get(exercise.id) ?? exercise.orderNumber,
              draft: expandedId === exercise.id ? draftForPreview : null,
              listLength: items.length,
              });
              const adjustedPreview = isDayAdjustmentVisible
                ? resolveEditDayAdjustedSummary({
                    draft: draftForPreview,
                    measurementType: exercise.measurementType,
                    dayIndex: dayIndex ?? 1,
                    cycleLengthDays,
                    direction: dayAdjustmentDirection,
                  })
                : null;

              return {
                ...preview,
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
                summaryContent: adjustedPreview ? (
                  <EditDayAdjustedSummaryPreview
                    currentSummary={adjustedPreview.currentSummary}
                    adjustedSummary={adjustedPreview.adjustedSummary}
                    direction={dayAdjustmentDirection}
                  />
                ) : undefined,
              };
            })()
          }))}
          activeItemId={expandedId}
          renderOverlayActions={(item) => expandedId === item.id ? null : renderReorderHandle(item.id, item.name)}
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
            const selectedTrainingFocus = trainingFocusById[exercise.id] ?? "";
            return (
              <div className={appTokens.routineEditorCompactStack}>
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
                      <ExerciseProgressionEditorSurface
                        draft={draft}
                        onChange={(nextValue) => updateExerciseDraft(exercise, (current) => ({ ...current, ...nextValue }))}
                        goalState={draft.goalState}
                        modality={modality}
                        weightUnit={weightUnit}
                        distanceUnit={exercise.defaultDistanceUnit}
                        exerciseMeasurementType={exercise.measurementType}
                        exerciseEquipment={exercise.equipment}
                        exerciseMovementPattern={exercise.movement_pattern ?? null}
                        exerciseName={exercise.name}
                        cycleLengthDays={cycleLengthDays}
                        progressionExampleDayNumber={dayIndex}
                        routineDefaultValue={routineDefaultProgression}
                        onApplyRoutineDefault={() => {
                          updateExerciseDraft(exercise, (current) => ({
                            ...current,
                            ...routineDefaultProgression,
                          }));
                        }}
                        trainingFocusValue={selectedTrainingFocus}
                        trainingFocusCustomized={isTrainingGoalCustomized(selectedTrainingFocus, draft)}
                        onTrainingFocusChange={(goal) => {
                          setTrainingFocusById((current) => ({
                            ...current,
                            [exercise.id]: goal,
                          }));
                          updateExerciseDraft(exercise, (current) => ({
                            ...current,
                            ...seedProgressionDraftWithStepValue(
                              createProgressionPlaybookFormStateForTrainingGoal(goal),
                              progressionStepPolicy.defaultValue,
                            ),
                          }));
                        }}
                        hideExerciseSetSuccessCount
                      />
                    ) : null}
                </form>
              </div>
            );
          }}
        />
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
