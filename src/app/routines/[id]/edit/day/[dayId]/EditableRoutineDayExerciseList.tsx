"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { DayDetailStateCard } from "@/components/routines/day-detail/DayDetailStateCard";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import { resolveGoalModality, type GoalModality } from "@/lib/exercise-goal-validation";
import {
  createEditDayExerciseDraft,
  formatEditDayExerciseDraftSummary,
  resolveEditDayExercisePreview,
  type EditDayExerciseDraft,
} from "@/lib/edit-day-exercise-draft";
import { NORMALIZED_ACTION_LABELS } from "@/lib/action-labels";
import { scrollDockAwareIntoView } from "@/lib/scrollDockAwareIntoView";
import { getDayEditorModeViewModel } from "@/app/routines/[id]/edit/day/[dayId]/dayEditorMode";
import { REST_DAY_BEHAVIOR_CONTRACT } from "@/features/day-state/restDayBehavior";
import { getDayCtaDockState } from "@/shared/day-cta-dock/dayCtaDockState";
import { publishEditDayCloseExpandedCard, publishScreenFocusMode, publishScreenMode, subscribeEditDayCloseExpandedCard } from "@/lib/screen-focus-mode";

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

const INLINE_VIEW_ACTION_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "toggleActive",
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
}: Props) {
  const toast = useToast();
  const router = useRouter();
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
  }, [exercises]);

  useEffect(() => {
    setIsRestDay(initialIsRest);
  }, [initialIsRest]);

  useEffect(() => () => {
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
  }, []);

  const orderedIds = useMemo(() => items.map((exercise) => exercise.id), [items]);
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

  const scheduleAutosave = useCallback(() => {
    if (!expandedId || !activeEditFormRef.current) return;
    const formData = new FormData(activeEditFormRef.current);
    const snapshot = createDraftSnapshot(formData);
    const lastSavedSnapshot = lastSavedSnapshotRef.current[expandedId] ?? null;
    if (snapshot === lastSavedSnapshot) {
      pendingSnapshotRef.current = null;
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
      return;
    }
    pendingSnapshotRef.current = snapshot;
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      activeEditFormRef.current?.requestSubmit();
    }, 500);
  }, [createDraftSnapshot, expandedId]);

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
          router.refresh();
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
              setExpandedId((current) => current === item.id ? null : item.id);
            }}
            renderExpandedContent={(item) => {
              const exercise = items.find((entry) => entry.id === item.id);
              if (!exercise) return null;
              const isExpanded = expandedId === exercise.id;
              if (!isExpanded) return null;
              const draft = getExerciseDraft(exercise);
              return (
                <div className={appTokens.routineEditorCompactStack}>
                  <AttachedCardActionStripFrame gridClassName="grid-cols-[minmax(112px,0.92fr)_minmax(0,1.78fr)]">
                      <button
                        type="button"
                        data-bottom-action-intent="toggleActive"
                        className={cn(INLINE_VIEW_ACTION_BUTTON_CLASS_NAME, "!border-r !border-r-[rgb(var(--border-strong)/0.18)]")}
                        onClick={() => setSelectedExerciseId(exercise.exerciseId)}
                      >
                        <span className="bottom-action__label">{NORMALIZED_ACTION_LABELS.view}</span>
                      </button>
                      <button
                        type="button"
                        data-bottom-action-intent="danger"
                        className={INLINE_DELETE_ACTION_BUTTON_CLASS_NAME}
                        onClick={() => setDeleteConfirmOpen(true)}
                      >
                        <span className="bottom-action__label">Delete</span>
                      </button>
                  </AttachedCardActionStripFrame>
                  <form
                    ref={(node) => {
                      if (isExpanded) activeEditFormRef.current = node;
                    }}
                    action={async (formData) => {
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
                              },
                            }));
                            router.refresh();
                          }
                        }}
                    className={cn(appTokens.routineEditorCompactStack, "pt-[2px]")}
                    onChangeCapture={scheduleAutosave}
                    onBlurCapture={flushAutosave}
                  >
                    <input type="hidden" name="routineId" value={routineId} />
                    <input type="hidden" name="routineDayId" value={routineDayId} />
                    <input type="hidden" name="exerciseRowId" value={exercise.id} />
                    <RoutineTargetInputs
                      state={draft.goalState}
                      onStateChange={(nextState) => updateExerciseDraft(exercise, (current) => ({
                        ...current,
                        goalState: nextState,
                      }))}
                      modality={resolveInlineModality(exercise.measurementType, exercise.equipment, exercise.name)}
                    />
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
