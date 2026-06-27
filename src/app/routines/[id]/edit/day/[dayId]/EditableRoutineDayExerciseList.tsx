"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { DayDetailExerciseList } from "@/components/routines/day-detail/DayDetailExerciseList";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { BottomActionSingle, BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { useToast } from "@/components/ui/ToastProvider";
import { type ExerciseGoalFormState, type RoutineEditorInfoPayload } from "@/components/ui/measurements/ExerciseGoalForm";
import { SharedExerciseGoalForm } from "@/components/ui/measurements/SharedExerciseGoalForm";
import { SharedSectionShell } from "@/components/ui/app/SharedSectionShell";
import { appTokens } from "@/components/ui/app/tokens";
import { AccentDotSeparatedText } from "@/components/ui/app/SignatureSeparator";
import {
  GlowSwitch,
  GLOW_SWITCH_MEASUREMENT_ROW_WRAPPER_CLASS_NAME,
  GLOW_SWITCH_STANDARD_CLASS_NAME,
  GLOW_SWITCH_STANDARD_STATE_CLASS_NAME,
} from "@/components/ui/GlowSwitch";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { ReorderHandleGlyph } from "@/components/ui/ReorderHandleGlyph";
import type { MeasurementPanelAuxiliaryField } from "@/components/ui/measurements/MeasurementPanelV2";
import { ExerciseProgressionEditorSurface } from "@/components/routines/ExerciseProgressionEditorSurface";
import { DayDetailStateCard } from "@/components/routines/day-detail/DayDetailStateCard";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import type { FitnessDistanceUnit } from "@/lib/fitness-distance-units";
import { resolveGoalModality, type GoalModality } from "@/lib/exercise-goal-validation";
import {
  createEditDayExerciseDraft,
  formatEditDayExerciseDraftSummary,
  resolveEditDayAdjustedSummary,
  resolveEditDayExercisePreview,
  type EditDayExerciseDraft,
} from "@/lib/edit-day-exercise-draft";
import {
  getDefaultProgressionPlaybookConfig,
  parseProgressionPlaybookPayload,
  PROGRESSION_METHOD_DEFINITIONS,
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
import { hasWorkoutPlanTemplateNameConflict, normalizeWorkoutPlanTemplateNameCandidate } from "@/lib/workout-plan-template-name";
import { buildExerciseProgressionStateLabel } from "@/lib/exercise-progression-state-label";

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
  resolveTemplateDecisionAction: (
    formData: FormData,
  ) => Promise<ActionResult & { templateId?: string; templateName?: string; syncMode?: "sync" }>;
  loadTemplateDecisionStateAction: (
    formData: FormData,
  ) => Promise<ActionResult & {
    templateId?: string | null;
    requiresTemplateEditDecision?: boolean;
    syncMode?: "sync";
  }>;
  deleteAction: (formData: FormData) => Promise<ActionResult>;
  reorderAction: (formData: FormData) => Promise<ActionResult>;
  initialIsRest: boolean;
  addExerciseHref: string;
  duplicateWorkoutPlanHref: string;
  routineDefaultProgressionPlaybookId?: ProgressionPlaybookId | null;
  routineDefaultProgressionPlaybookConfig?: Record<string, unknown> | null;
  showDayAdjustmentControl: boolean;
  initialDayAdjustmentDirection: SetFlowDirection;
  workoutPlanTemplateId?: string | null;
  requiresWorkoutPlanTemplateEditDecision?: boolean;
  existingWorkoutPlanTemplateNames?: Array<string | null | undefined>;
};

type DragState = {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
};

type PendingTemplateDecisionSubmit = {
  resume: () => void | Promise<void>;
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
  auxiliaryFields,
  inlineFailureToggle,
}: {
  state: ExerciseGoalFormState;
  onStateChange: (next: ExerciseGoalFormState) => void;
  modality: GoalModality;
  onInfoRequest?: (payload: RoutineEditorInfoPayload) => void;
  auxiliaryFields?: MeasurementPanelAuxiliaryField[];
  inlineFailureToggle?: boolean;
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
        auxiliaryFields={auxiliaryFields}
        showInlineStepControls
        inlineFailureToggle={inlineFailureToggle}
      />
    </div>
  );
}

const CARD_REORDER_HANDLE_CLASS_NAME = cn(
  appTokens.routineEditorReorderHandle,
  "z-[2] h-7 w-7 rounded-[0.72rem] border-[rgb(var(--selection-rgb)/0.28)] bg-[linear-gradient(180deg,rgb(var(--selection-rgb)/0.08),rgb(var(--surface-1-rgb)/0.36))] text-[rgb(var(--text-primary)/0.94)] shadow-[0_0_0_1px_rgb(var(--selection-rgb)/0.06),0_0_16px_rgb(var(--selection-rgb)/0.12)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--selection-rgb)/0.22)]",
);
const TEMPLATE_DECISION_SECONDARY_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "toggleInactive",
  className: "!border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)] focus-visible:ring-[rgb(var(--secondary-action-rgb)/0.2)]",
});
const TEMPLATE_DECISION_PRIMARY_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "positive",
  className: "translate-x-px focus-visible:ring-[rgb(var(--accent)/0.24)]",
});
type EditDayProgressionMethodId = Exclude<ProgressionPlaybookId, "deload_after_stall"> | "";

function createEditDayProgressionMethodInfoPayload(playbookId: EditDayProgressionMethodId) {
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
    sectionKey: "progression_method" as const,
  };
}

function normalizeExerciseStallThresholdDraftValue(value: string, fallback = "2") {
  const trimmed = value.trim();
  if (!/^\d+$/u.test(trimmed)) {
    return fallback;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return String(Math.floor(parsed));
}

function applyEditDayProgressionMethod(
  value: EditDayExerciseDraft,
  nextPlaybookId: EditDayProgressionMethodId,
): EditDayExerciseDraft {
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
  resolveTemplateDecisionAction,
  loadTemplateDecisionStateAction,
  deleteAction,
  reorderAction,
  initialIsRest,
  addExerciseHref,
  duplicateWorkoutPlanHref,
  routineDefaultProgressionPlaybookId,
  routineDefaultProgressionPlaybookConfig,
  showDayAdjustmentControl,
  initialDayAdjustmentDirection,
  workoutPlanTemplateId = null,
  requiresWorkoutPlanTemplateEditDecision = false,
  existingWorkoutPlanTemplateNames = [],
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
  const [templateDecisionOpen, setTemplateDecisionOpen] = useState(false);
  const [templateDecisionStep, setTemplateDecisionStep] = useState<"choice" | "save_new">("choice");
  const [templateDecisionMode, setTemplateDecisionMode] = useState<"update_existing" | "save_new">("update_existing");
  const [templateDecisionSessionMode, setTemplateDecisionSessionMode] = useState<"update_existing" | null>(null);
  const [templateDecisionName, setTemplateDecisionName] = useState("");
  const [templateDecisionError, setTemplateDecisionError] = useState<string | null>(null);
  const [isTemplateDecisionPending, startTemplateDecisionTransition] = useTransition();
  const [draftsById, setDraftsById] = useState<Record<string, EditDayExerciseDraft>>({});
  const draftsByIdRef = useRef<Record<string, EditDayExerciseDraft>>({});
  const [trainingFocusById, setTrainingFocusById] = useState<Record<string, TrainingGoalId | "">>({});
  const [isDayAdjustmentVisible, setIsDayAdjustmentVisible] = useState(showDayAdjustmentControl);
  const [dayAdjustmentDirection, setDayAdjustmentDirection] = useState<SetFlowDirection>(initialDayAdjustmentDirection);
  const [activeWorkoutPlanTemplateId, setActiveWorkoutPlanTemplateId] = useState<string | null>(workoutPlanTemplateId);
  const [requiresTemplateEditDecision, setRequiresTemplateEditDecision] = useState(requiresWorkoutPlanTemplateEditDecision);
  const [shouldSyncTemplateOnSave, setShouldSyncTemplateOnSave] = useState(
    Boolean(workoutPlanTemplateId) && !requiresWorkoutPlanTemplateEditDecision,
  );
  const autosaveTimeoutRef = useRef<number | null>(null);
  const activeEditFormRef = useRef<HTMLFormElement | null>(null);
  const pendingSnapshotRef = useRef<string | null>(null);
  const pendingTemplateDecisionSubmitRef = useRef<PendingTemplateDecisionSubmit | null>(null);
  const lastSavedSnapshotRef = useRef<Record<string, string>>({});
  const itemsRef = useRef(exercises);
  const expandedIdRef = useRef<string | null>(null);
  const addExerciseNavigationLockedRef = useRef(false);

  useEffect(() => {
    setItems(exercises);
  }, [exercises]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    expandedIdRef.current = expandedId;
    if (!expandedId) {
      activeEditFormRef.current = null;
    }
  }, [expandedId]);

  useEffect(() => {
    draftsByIdRef.current = draftsById;
  }, [draftsById]);

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

  useEffect(() => {
    setActiveWorkoutPlanTemplateId(workoutPlanTemplateId);
    setRequiresTemplateEditDecision(requiresWorkoutPlanTemplateEditDecision && templateDecisionSessionMode !== "update_existing");
    setShouldSyncTemplateOnSave(Boolean(workoutPlanTemplateId) && (!requiresWorkoutPlanTemplateEditDecision || templateDecisionSessionMode === "update_existing"));
  }, [requiresWorkoutPlanTemplateEditDecision, templateDecisionSessionMode, workoutPlanTemplateId]);

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
      const next = moveItemWithinList(current, fromIndex, toIndex);
      itemsRef.current = next;
      return next;
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
    dragStateRef.current = {
      id: exerciseId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
    setActiveDragId(exerciseId);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handleHandlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const pointerDistance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
    if (pointerDistance >= 4) {
      dragState.moved = true;
    }
    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const row = elementBelow?.closest("[data-exercise-row-id]") as HTMLElement | null;
    const targetId = row?.dataset.exerciseRowId;
    if (targetId) {
      if (targetId !== dragState.id) {
        dragState.moved = true;
      }
      moveItem(dragState.id, targetId);
    }
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

  const shouldDeferInlineDraftAutosave = useCallback((form: HTMLFormElement | null) => {
    if (!form) {
      return false;
    }

    const activeElement = document.activeElement;
    if (!(activeElement instanceof HTMLElement) || !form.contains(activeElement)) {
      return false;
    }

    if (activeElement instanceof HTMLTextAreaElement) {
      return true;
    }

    if (activeElement instanceof HTMLInputElement) {
      const inputType = activeElement.type.trim().toLowerCase();
      return !["button", "checkbox", "radio", "range", "submit"].includes(inputType);
    }

    const role = activeElement.getAttribute("role")?.toLowerCase();
    return activeElement.isContentEditable || role === "textbox";
  }, []);

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
  const getLatestExerciseDraft = useCallback(
    (exercise: EditableRoutineDayExerciseItem) => draftsByIdRef.current[exercise.id] ?? buildExerciseDraft(exercise),
    [buildExerciseDraft],
  );
  const getExerciseDraft = useCallback(
    (exercise: EditableRoutineDayExerciseItem) => draftsById[exercise.id] ?? buildExerciseDraft(exercise),
    [buildExerciseDraft, draftsById],
  );
  const applyExerciseDraftUpdate = useCallback(
    (exercise: EditableRoutineDayExerciseItem, updater: (draft: EditDayExerciseDraft) => EditDayExerciseDraft) => {
      setDraftsById((current) => {
        const baseDraft = current[exercise.id] ?? buildExerciseDraft(exercise);
        const nextDraft = updater(baseDraft);
        draftsByIdRef.current = {
          ...current,
          [exercise.id]: nextDraft,
        };
        return {
          ...current,
          [exercise.id]: nextDraft,
        };
      });
    },
    [buildExerciseDraft],
  );
  const shouldGateTemplateEditDecision = useCallback(() => (
    requiresTemplateEditDecision && !templateDecisionSessionMode && Boolean(activeWorkoutPlanTemplateId)
  ), [activeWorkoutPlanTemplateId, requiresTemplateEditDecision, templateDecisionSessionMode]);
  const openTemplateDecision = useCallback((resume: () => void | Promise<void>) => {
    pendingTemplateDecisionSubmitRef.current = { resume };
    setTemplateDecisionStep("choice");
    setTemplateDecisionMode("update_existing");
    setTemplateDecisionName("");
    setTemplateDecisionError(null);
    setTemplateDecisionOpen(true);
  }, []);
  const updateExerciseDraft = useCallback(
    (exercise: EditableRoutineDayExerciseItem, updater: (draft: EditDayExerciseDraft) => EditDayExerciseDraft) => {
      if (shouldGateTemplateEditDecision()) {
        if (templateDecisionOpen) {
          return;
        }
        openTemplateDecision(() => {
          const pendingExercise = itemsRef.current.find((item) => item.id === exercise.id) ?? exercise;
          applyExerciseDraftUpdate(pendingExercise, updater);
        });
        return;
      }

      applyExerciseDraftUpdate(exercise, updater);
    },
    [applyExerciseDraftUpdate, openTemplateDecision, shouldGateTemplateEditDecision, templateDecisionOpen],
  );
  const parseFormOptionalNumber = useCallback((value: FormDataEntryValue | null) => {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, []);
  const sanitizeExerciseFormData = useCallback((
    exercise: EditableRoutineDayExerciseItem,
    formData: FormData,
  ) => {
    const sanitized = new FormData();
    for (const [key, value] of formData.entries()) {
      sanitized.append(key, value);
    }

    const draft = getLatestExerciseDraft(exercise);
    sanitized.set(
      "progressionStallThreshold",
      normalizeExerciseStallThresholdDraftValue(draft.progressionStallThreshold, "2"),
    );
    return sanitized;
  }, [getLatestExerciseDraft]);
  const shouldSuppressInlineExerciseAutosave = useCallback(
    (exercise: EditableRoutineDayExerciseItem | null | undefined) => Boolean(exercise && isStretchHubExercise(exercise)),
    [],
  );
  const syncTemplateDecisionState = useCallback(async () => {
    const stateFormData = new FormData();
    stateFormData.set("routineId", routineId);
    stateFormData.set("routineDayId", routineDayId);
    const stateResult = await loadTemplateDecisionStateAction(stateFormData);
    if (stateResult.ok) {
      setActiveWorkoutPlanTemplateId(stateResult.templateId ?? null);
      setRequiresTemplateEditDecision(Boolean(stateResult.requiresTemplateEditDecision) && templateDecisionSessionMode !== "update_existing");
      setShouldSyncTemplateOnSave(stateResult.syncMode === "sync" || templateDecisionSessionMode === "update_existing");
    }
    return stateResult;
  }, [loadTemplateDecisionStateAction, routineDayId, routineId, templateDecisionSessionMode]);
  useEffect(() => {
    void syncTemplateDecisionState();
  }, [syncTemplateDecisionState]);
  const performExerciseUpdate = useCallback((
    exercise: EditableRoutineDayExerciseItem,
    formData: FormData,
    snapshotOverride?: string | null,
    options?: { forceTemplateSync?: boolean },
  ) => {
    startAutosaveTransition(() => {
      void (async () => {
        const sanitizedFormData = sanitizeExerciseFormData(exercise, formData);
        if ((options?.forceTemplateSync || shouldSyncTemplateOnSave) && activeWorkoutPlanTemplateId) {
          sanitizedFormData.set("workoutPlanTemplateSyncMode", "sync");
        } else {
          sanitizedFormData.delete("workoutPlanTemplateSyncMode");
        }
        const result = await updateAction(sanitizedFormData);
        if (!result.ok) {
          const nextError = result.error ?? "Could not update exercise.";
          toast.error(nextError);
          return;
        }

        if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
        const snapshot = snapshotOverride ?? pendingSnapshotRef.current ?? createDraftSnapshot(sanitizedFormData);
        const submittedDraft = getLatestExerciseDraft(exercise);
        lastSavedSnapshotRef.current[exercise.id] = snapshot;
        pendingSnapshotRef.current = null;
        const targetSets = Number(sanitizedFormData.get("targetSets") ?? exercise.defaults.targetSets ?? 1);
        const targetRepsMin = parseFormOptionalNumber(sanitizedFormData.get("targetRepsMin"));
        const targetRepsMax = parseFormOptionalNumber(sanitizedFormData.get("targetRepsMax"));
        const targetWeight = parseFormOptionalNumber(sanitizedFormData.get("targetWeight"));
        const targetDuration = String(sanitizedFormData.get("targetDuration") ?? "");
        const targetDistance = parseFormOptionalNumber(sanitizedFormData.get("targetDistance"));
        const targetCalories = parseFormOptionalNumber(sanitizedFormData.get("targetCalories"));
        const targetWeightUnit = String(sanitizedFormData.get("targetWeightUnit") ?? weightUnit);
        const targetDistanceUnit = String(sanitizedFormData.get("targetDistanceUnit") ?? exercise.defaultDistanceUnit);
        const measurementSelections = new Set(sanitizedFormData.getAll("measurementSelections").map((value) => String(value)));
        const progression = parseProgressionPlaybookPayload(sanitizedFormData);
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
      })();
    });
  }, [
    activeWorkoutPlanTemplateId,
    createDraftSnapshot,
    getLatestExerciseDraft,
    parseFormOptionalNumber,
    sanitizeExerciseFormData,
    shouldSyncTemplateOnSave,
    toast,
    updateAction,
    weightUnit,
  ]);
  const submitExerciseUpdate = useCallback((
    exercise: EditableRoutineDayExerciseItem,
    formData: FormData,
    snapshotOverride?: string | null,
  ) => {
    if (shouldGateTemplateEditDecision()) {
      const resumedFormData = new FormData();
      for (const [key, value] of formData.entries()) {
        resumedFormData.append(key, value);
      }
      openTemplateDecision(() => {
        const pendingExercise = itemsRef.current.find((item) => item.id === exercise.id) ?? null;
        if (!pendingExercise) {
          return;
        }
        resumedFormData.set("workoutPlanTemplateSyncMode", "sync");
        performExerciseUpdate(pendingExercise, resumedFormData, snapshotOverride ?? null, { forceTemplateSync: true });
      });
      return;
    }

    performExerciseUpdate(exercise, formData, snapshotOverride);
  }, [openTemplateDecision, performExerciseUpdate, shouldGateTemplateEditDecision]);
  const flushAutosave = useCallback((options?: { defer?: boolean; forceTemplateSync?: boolean }) => {
    if (!expandedId || !activeEditFormRef.current || !activeExercise) return;
    if (shouldSuppressInlineExerciseAutosave(activeExercise)) {
      pendingSnapshotRef.current = null;
      return;
    }
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = null;
    }

    const form = activeEditFormRef.current;
    const exercise = activeExercise;
    const submit = () => {
      const formData = sanitizeExerciseFormData(exercise, new FormData(form));
      const snapshot = createDraftSnapshot(formData);
      const lastSavedSnapshot = lastSavedSnapshotRef.current[exercise.id] ?? null;
      if (snapshot === lastSavedSnapshot) {
        pendingSnapshotRef.current = null;
        return;
      }
      pendingSnapshotRef.current = snapshot;
      if (options?.forceTemplateSync) {
        formData.set("workoutPlanTemplateSyncMode", "sync");
        performExerciseUpdate(exercise, formData, snapshot, { forceTemplateSync: true });
        return;
      }
      submitExerciseUpdate(exercise, formData, snapshot);
    };

    const activeElement = document.activeElement;
    if (activeElement instanceof HTMLElement && form.contains(activeElement)) {
      activeElement.blur();
    }

    if (options?.defer) {
      window.setTimeout(submit, 0);
      return;
    }

    submit();
  }, [activeExercise, createDraftSnapshot, expandedId, performExerciseUpdate, submitExerciseUpdate]);
  const activeDraft = activeExercise ? draftsById[activeExercise.id] ?? null : null;

  useEffect(() => {
    if (!activeExercise || !expandedId || templateDecisionOpen) {
      return;
    }
    if (shouldSuppressInlineExerciseAutosave(activeExercise)) {
      pendingSnapshotRef.current = null;
      return;
    }

    const form = activeEditFormRef.current;
    if (!form || shouldDeferInlineDraftAutosave(form)) {
      return;
    }

    const formData = sanitizeExerciseFormData(activeExercise, new FormData(form));
    const snapshot = createDraftSnapshot(formData);
    const lastSavedSnapshot = lastSavedSnapshotRef.current[activeExercise.id] ?? null;
    if (snapshot === lastSavedSnapshot) {
      pendingSnapshotRef.current = null;
      return;
    }

    pendingSnapshotRef.current = snapshot;
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    autosaveTimeoutRef.current = window.setTimeout(() => {
      autosaveTimeoutRef.current = null;
      const liveForm = activeEditFormRef.current;
      if (!liveForm || expandedIdRef.current !== activeExercise.id || shouldDeferInlineDraftAutosave(liveForm)) {
        return;
      }

      const liveExercise = itemsRef.current.find((item) => item.id === activeExercise.id) ?? null;
      if (!liveExercise) {
        return;
      }

      const liveFormData = sanitizeExerciseFormData(liveExercise, new FormData(liveForm));
      const liveSnapshot = createDraftSnapshot(liveFormData);
      const liveLastSavedSnapshot = lastSavedSnapshotRef.current[liveExercise.id] ?? null;
      if (liveSnapshot === liveLastSavedSnapshot) {
        pendingSnapshotRef.current = null;
        return;
      }

      submitExerciseUpdate(liveExercise, liveFormData, liveSnapshot);
    }, 220);

    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
        autosaveTimeoutRef.current = null;
      }
    };
  }, [
    activeDraft,
    activeExercise,
    createDraftSnapshot,
    expandedId,
    sanitizeExerciseFormData,
    shouldSuppressInlineExerciseAutosave,
    shouldDeferInlineDraftAutosave,
    submitExerciseUpdate,
    templateDecisionOpen,
  ]);
  const submitTemplateDecision = useCallback((decisionMode: "update_existing" | "save_new") => {
    if (decisionMode === "save_new" && templateDecisionStep === "choice") {
      setTemplateDecisionMode("save_new");
      setTemplateDecisionStep("save_new");
      setTemplateDecisionError(null);
      return;
    }

    const pendingDecision = pendingTemplateDecisionSubmitRef.current;
    if (!pendingDecision) {
      setTemplateDecisionOpen(false);
      return;
    }

    setTemplateDecisionMode(decisionMode);
    const normalizedTemplateName = normalizeWorkoutPlanTemplateNameCandidate(templateDecisionName);
    if (decisionMode === "save_new") {
      if (!normalizedTemplateName) {
        setTemplateDecisionError("Template name is required.");
        return;
      }
      if (hasWorkoutPlanTemplateNameConflict({
        candidateName: normalizedTemplateName,
        templateNames: existingWorkoutPlanTemplateNames,
      })) {
        setTemplateDecisionError("Template name already exists.");
        return;
      }
    }

    startTemplateDecisionTransition(() => {
      void (async () => {
        const decisionFormData = new FormData();
        decisionFormData.set("routineId", routineId);
        decisionFormData.set("routineDayId", routineDayId);
        decisionFormData.set("decisionMode", decisionMode);
        if (decisionMode === "save_new") {
          decisionFormData.set("templateName", normalizedTemplateName);
        }

        const result = await resolveTemplateDecisionAction(decisionFormData);
        if (!result.ok) {
          setTemplateDecisionError(result.error ?? "Could not update workout plan template.");
          return;
        }

        setTemplateDecisionOpen(false);
        setTemplateDecisionStep("choice");
        setTemplateDecisionError(null);
        setRequiresTemplateEditDecision(false);
        setShouldSyncTemplateOnSave(result.syncMode === "sync");
        setTemplateDecisionSessionMode(decisionMode === "update_existing" ? "update_existing" : null);
        if (result.templateId) {
          setActiveWorkoutPlanTemplateId(result.templateId);
        }
        pendingTemplateDecisionSubmitRef.current = null;
        if (result.templateName) {
          toast.success(
            decisionMode === "update_existing"
              ? `Template updated: ${result.templateName}`
              : `New template saved: ${result.templateName}`,
          );
        }

        router.refresh();
        await pendingDecision.resume();
      })();
    });
  }, [
    existingWorkoutPlanTemplateNames,
    resolveTemplateDecisionAction,
    router,
    routineDayId,
    routineId,
    templateDecisionStep,
    templateDecisionName,
    toast,
  ]);

  useEffect(() => subscribeEditDayCloseExpandedCard(() => {
    flushAutosave({ defer: true });
    setSelectedExerciseId(null);
    setExpandedId(null);
  }), [flushAutosave]);
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

  const performReorderSubmit = useCallback(async () => {
    const formData = new FormData();
    formData.set("routineId", routineId);
    formData.set("routineDayId", routineDayId);
    formData.set("orderedExerciseRowIds", orderedIds.join(","));
    if (shouldSyncTemplateOnSave || (shouldGateTemplateEditDecision() && activeWorkoutPlanTemplateId)) {
      formData.set("workoutPlanTemplateSyncMode", "sync");
    }
    const result = await reorderAction(formData);
    if (!result.ok) {
      toast.error(result.error || "Could not reorder exercises.");
      setItems(exercises);
      return;
    }
    toast.success("Exercise order updated.");
  }, [
    activeWorkoutPlanTemplateId,
    exercises,
    orderedIds,
    reorderAction,
    routineDayId,
    routineId,
    shouldGateTemplateEditDecision,
    shouldSyncTemplateOnSave,
    toast,
  ]);

  const performDeleteExercise = useCallback(async (exerciseId: string) => {
    const formData = new FormData();
    formData.set("routineId", routineId);
    formData.set("routineDayId", routineDayId);
    formData.set("exerciseRowId", exerciseId);
    if (shouldSyncTemplateOnSave || (shouldGateTemplateEditDecision() && activeWorkoutPlanTemplateId)) {
      formData.set("workoutPlanTemplateSyncMode", "sync");
    }
    const result = await deleteAction(formData);
    if (!result.ok) {
      toast.error(result.error ?? "Could not delete exercise.");
      return false;
    }
    setItems((current) => current.filter((item) => item.id !== exerciseId));
    setDraftsById((current) => {
      const { [exerciseId]: _deletedDraft, ...remainingDrafts } = current;
      return remainingDrafts;
    });
    setExpandedId(null);
    toast.success("Exercise removed.");
    return true;
  }, [
    activeWorkoutPlanTemplateId,
    deleteAction,
    routineDayId,
    routineId,
    shouldGateTemplateEditDecision,
    shouldSyncTemplateOnSave,
    toast,
  ]);

  const addExerciseLabel = "Add Exercise";

  const handleAddExercisePress = () => {
    if (addExerciseNavigationLockedRef.current) return;
    addExerciseNavigationLockedRef.current = true;
    void (async () => {
      const stateResult = await syncTemplateDecisionState();
      if (!stateResult.ok) {
        addExerciseNavigationLockedRef.current = false;
        toast.error(stateResult.error ?? "Could not verify workout plan template state.");
        return;
      }

      const requiresDecision = Boolean(stateResult.requiresTemplateEditDecision) && !templateDecisionSessionMode;
      const resolvedTemplateId = stateResult.templateId ?? activeWorkoutPlanTemplateId;

      if (requiresDecision && resolvedTemplateId) {
        addExerciseNavigationLockedRef.current = false;
        openTemplateDecision(() => {
          flushAutosave({ forceTemplateSync: true });
          publishEditDayCloseExpandedCard();
          setSelectedExerciseId(null);
          addExerciseNavigationLockedRef.current = true;
          router.push(addExerciseHref);
        });
        return;
      }

      flushAutosave();
      publishEditDayCloseExpandedCard();
      setSelectedExerciseId(null);
      router.push(addExerciseHref);
    })();
  };

  const addExerciseDock = (
    <BottomActionSingle>
      <BottomDockButton type="button" intent="positive" onClick={handleAddExercisePress}>
        {addExerciseLabel}
      </BottomDockButton>
    </BottomActionSingle>
  );
  const emptyWorkoutPlanDock = (
    <BottomActionSplit
      secondary={(
        <BottomDockLink href={duplicateWorkoutPlanHref} intent="toggleInactive">
          Duplicate Workout Plan
        </BottomDockLink>
      )}
      primary={(
        <BottomDockButton type="button" intent="positive" onClick={handleAddExercisePress}>
          {addExerciseLabel}
        </BottomDockButton>
      )}
    />
  );
  const expandedExerciseDock = activeExercise ? (
    <BottomActionSingle>
      <BottomDockButton type="button" intent="danger" onClick={() => setDeleteConfirmOpen(true)}>
        Delete
      </BottomDockButton>
    </BottomActionSingle>
  ) : null;

  const renderReorderHandle = (exerciseId: string, exerciseName: string) => (
    <button
      type="button"
      aria-label={`Reorder ${exerciseName}`}
      title="Drag to reorder"
      className={cn(
        CARD_REORDER_HANDLE_CLASS_NAME,
        "pointer-events-auto",
        "absolute right-[0.22rem] top-[0.12rem]",
        "touch-none",
        activeDragId === exerciseId ? "ring-2 ring-[rgb(var(--selection-rgb)/0.26)]" : undefined,
      )}
      onPointerDown={(event) => handleHandlePointerDown(exerciseId, event)}
      onPointerMove={handleHandlePointerMove}
      onPointerUp={handleHandlePointerUp}
      onPointerCancel={() => finishReorder()}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const dragState = dragStateRef.current;
        if (dragState?.id === exerciseId && dragState.moved) {
          return;
        }
        toast.info("Reorder button. Drag to reorder.", {
          id: "edit-day-reorder-hint",
          durationMs: 2200,
        });
      }}
    >
      <ReorderHandleGlyph className={appTokens.routineEditorHandleGlyph} />
    </button>
  );

  if (items.length === 0 || modeViewModel.sections.restDayCardVisible) {
    return (
      <>
        <SharedSectionShell recipe="editDay" bodyClassName={appTokens.routineEditorCompactStack}>
          {modeViewModel.sections.restDayCardVisible ? (
            <DayDetailStateCard
              tone="rest"
              title="Rest workout plan enabled"
              body={REST_DAY_BEHAVIOR_CONTRACT.copy.helper}
              meta={items.length > 0 ? REST_DAY_BEHAVIOR_CONTRACT.copy.enabled : undefined}
            />
          ) : (
            <DayDetailStateCard
              tone="neutral"
              title="No workout plan built yet"
              body="Add an exercise to build this workout plan from scratch, or duplicate an existing workout plan into this day."
            />
          )}
        </SharedSectionShell>
        <PublishBottomActions>
          {modeViewModel.sections.restDayCardVisible ? ctaDockState.variant === "add_exercise" ? (
            addExerciseDock
          ) : ctaDockState.variant === "edit_exercise" ? (
            expandedExerciseDock
          ) : null : emptyWorkoutPlanDock}
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
        onSubmit={(event) => {
          event.preventDefault();
          if (shouldGateTemplateEditDecision()) {
            openTemplateDecision(() => performReorderSubmit());
            return;
          }
          void performReorderSubmit();
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
              const persistedPreviewDraft = draftsById[exercise.id] ?? null;
              const draftForPreview = persistedPreviewDraft ?? createEditDayExerciseDraft({
                defaults: exercise.defaults,
                weightUnit,
                distanceUnit: exercise.defaultDistanceUnit,
                orderNumber: canonicalOrderById.get(exercise.id) ?? exercise.orderNumber,
                modality: resolveInlineModality(exercise.measurementType, exercise.equipment, exercise.name),
              });
              const preview = resolveEditDayExercisePreview({
                savedSummary: exercise.targetSummary,
                savedOrderNumber: canonicalOrderById.get(exercise.id) ?? exercise.orderNumber,
                draft: draftForPreview,
                listLength: items.length,
              });
              return {
                ...preview,
                id: exercise.id,
                name: exercise.name,
                progressionStateLabel: buildExerciseProgressionStateLabel({
                  progression_playbook_id: draftForPreview.progressionPlaybookId,
                  progression_playbook_config: draftForPreview,
                }),
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
              };
            })()
          }))}
          activeItemId={expandedId}
          renderOverlayActions={(item) => expandedId === item.id ? null : renderReorderHandle(item.id, item.name)}
          onInfoItem={(item) => {
            const selectedExercise = items.find((entry) => entry.id === item.id);
            setSelectedExerciseId(item.exerciseId ?? selectedExercise?.exerciseId ?? null);
          }}
          onSelectItem={!modeViewModel.exerciseListInteractive ? undefined : (item) => {
            setExpandedId((current) => {
              if (current === item.id) {
                flushAutosave({ defer: true });
                return null;
              }
              if (current) {
                flushAutosave({ defer: true });
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
            const currentProgressionMethodId: EditDayProgressionMethodId = draft.progressionPlaybookId === "double_progression"
              || draft.progressionPlaybookId === "fixed_load_rep_range_progression"
              ? draft.progressionPlaybookId
              : "";
            const progressionMethodInfoPayload = createEditDayProgressionMethodInfoPayload(currentProgressionMethodId);
            const publishProgressionMethodInfo = (playbookId: EditDayProgressionMethodId = currentProgressionMethodId) => {
              window.dispatchEvent(new CustomEvent("fitness:routine-editor-info", {
                detail: createEditDayProgressionMethodInfoPayload(playbookId),
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
                    checked={Boolean(draft.progressionPlaybookId)}
                    ariaLabel={draft.progressionPlaybookId ? "Automatic progression enabled" : "Manual progression enabled"}
                    onLabel="Auto"
                    offLabel="Manual"
                    onClick={() => {
                      const nextPlaybookId: EditDayProgressionMethodId = draft.progressionPlaybookId ? "" : "double_progression";
                      const nextDraft = applyEditDayProgressionMethod(draft, nextPlaybookId);
                      updateExerciseDraft(exercise, () => nextDraft);
                      publishProgressionMethodInfo(nextPlaybookId);
                    }}
                    className={GLOW_SWITCH_STANDARD_CLASS_NAME}
                    stateClassName={GLOW_SWITCH_STANDARD_STATE_CLASS_NAME}
                  />
                </div>
              ),
            };
            return (
              <div className={appTokens.routineEditorCompactStack}>
                <form
                    ref={(node) => {
                      if (!isExpanded) {
                        return;
                      }
                      activeEditFormRef.current = node;
                      if (node && lastSavedSnapshotRef.current[exercise.id] == null) {
                        const initialFormData = sanitizeExerciseFormData(exercise, new FormData(node));
                        lastSavedSnapshotRef.current[exercise.id] = createDraftSnapshot(initialFormData);
                      }
                    }}
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (isStretchHubExercise(exercise)) {
                        return;
                      }
                      const formData = sanitizeExerciseFormData(exercise, new FormData(event.currentTarget));
                      submitExerciseUpdate(exercise, formData);
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
                        auxiliaryFields={showProgressionInputs ? [progressionAuxiliaryField] : undefined}
                        inlineFailureToggle
                      />
                    ) : null}
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
                        reserveInfoLayoutSpace={false}
                        dropdownPreset="exercise-inline"
                        infoDockPlacement="above-bottom-actions"
                      />
                    ) : null}
                </form>
              </div>
            );
          }}
        />
      ) : null}

      <ConfirmDestructiveModal
        open={templateDecisionOpen}
        title="Workout Plan Template"
        confirmLabel="Confirm"
        confirmVariant="primary"
        hideBottomActions
        isLoading={isTemplateDecisionPending}
        attachedFooter={(
          <AttachedCardActionStripFrame className="rounded-t-none" gridClassName="grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {templateDecisionStep === "choice" ? (
              <>
                <button
                  type="button"
                  disabled={isTemplateDecisionPending}
                  data-confirm-modal-action="cancel"
                  className={TEMPLATE_DECISION_SECONDARY_BUTTON_CLASS_NAME}
                  onClick={() => submitTemplateDecision("update_existing")}
                >
                  <span className="bottom-action__label">
                    {isTemplateDecisionPending && templateDecisionMode === "update_existing" ? "Updating..." : "Update Template"}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={isTemplateDecisionPending}
                  data-confirm-modal-action="confirm"
                  className={TEMPLATE_DECISION_PRIMARY_BUTTON_CLASS_NAME}
                  onClick={() => submitTemplateDecision("save_new")}
                >
                  <span className="bottom-action__label">Save New Template</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isTemplateDecisionPending}
                  data-confirm-modal-action="cancel"
                  className={TEMPLATE_DECISION_SECONDARY_BUTTON_CLASS_NAME}
                  onClick={() => {
                    setTemplateDecisionStep("choice");
                    setTemplateDecisionMode("update_existing");
                    setTemplateDecisionError(null);
                  }}
                >
                  <span className="bottom-action__label">Cancel</span>
                </button>
                <button
                  type="button"
                  disabled={isTemplateDecisionPending}
                  data-confirm-modal-action="confirm"
                  className={TEMPLATE_DECISION_PRIMARY_BUTTON_CLASS_NAME}
                  onClick={() => submitTemplateDecision("save_new")}
                >
                  <span className="bottom-action__label">
                    {isTemplateDecisionPending && templateDecisionMode === "save_new" ? "Saving..." : "Confirm"}
                  </span>
                </button>
              </>
            )}
          </AttachedCardActionStripFrame>
        )}
        onCancel={() => {
          pendingTemplateDecisionSubmitRef.current = null;
          setTemplateDecisionOpen(false);
          setTemplateDecisionStep("choice");
          setTemplateDecisionError(null);
        }}
        onConfirm={() => {}}
      >
        <div className="space-y-3">
          {templateDecisionStep === "save_new" ? (
            <label className="block">
              <span className="sr-only">Template name</span>
              <input
                type="text"
                value={templateDecisionName}
                onChange={(event) => {
                  setTemplateDecisionName(event.target.value.slice(0, 15));
                  setTemplateDecisionError(null);
                }}
                placeholder="Template name"
                maxLength={15}
                className={cn(
                  "w-full rounded-[0.95rem] border bg-[rgb(var(--surface-2-rgb)/0.62)] px-3 py-2.5 text-center text-sm text-[rgb(var(--text-primary))] outline-none transition",
                  templateDecisionError
                    ? "border-[rgb(var(--danger-rgb)/0.52)]"
                    : "border-[rgb(var(--border-strong)/0.16)] focus:border-[rgb(var(--accent)/0.32)] focus:ring-2 focus:ring-[rgb(var(--accent)/0.16)]",
                )}
              />
            </label>
          ) : null}
          {templateDecisionError ? (
            <p className="text-center text-[12px] font-medium text-[rgb(var(--danger-rgb)/0.94)]">
              {templateDecisionError}
            </p>
          ) : null}
        </div>
      </ConfirmDestructiveModal>

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
          if (shouldGateTemplateEditDecision()) {
            setDeleteConfirmOpen(false);
            openTemplateDecision(async () => {
              await performDeleteExercise(activeExercise.id);
            });
            return;
          }
          const didDelete = await performDeleteExercise(activeExercise.id);
          if (didDelete) {
            setDeleteConfirmOpen(false);
          }
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
