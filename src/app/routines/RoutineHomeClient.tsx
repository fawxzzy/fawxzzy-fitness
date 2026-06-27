"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton, BottomDockLink } from "@/components/layout/BottomDockButton";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { getBottomActionButtonClassName } from "@/components/layout/bottomActionIntents";
import { DayList } from "@/components/day-list/DayList";
import {
  ROUTINE_CONTENT_GAP_CLASS_NAME,
  ROUTINE_DAY_CARD_SUBTITLE_CLASS_NAME,
  ROUTINE_DAY_CARD_TRAILING_STACK_CLASS_NAME,
  ROUTINE_SURFACE_TAG_CLASS_NAME,
  ROUTINE_SURFACE_TAG_ROW_CLASS_NAME,
  RoutineOverviewDayCard,
  buildRoutineSplitParts,
  renderRoutineMetricTagLabel,
} from "@/components/day-list/RoutineDayCardPresentation";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import {
  RoutinesPageScaffold,
  SharedDayListSection,
} from "@/components/routines/RoutinesScreenFamily";
import {
  RoutineChooserOptionCard,
  RoutineDuplicateChooserPanel,
  RoutineChooserSourceCard,
} from "@/components/routines/RoutineChooserMenu";
import { RoutineDuplicateChooserListViewport } from "@/components/routines/RoutineDuplicateChooserListViewport";
import { WorkoutPlanChooserSourceCard } from "@/components/routines/WorkoutPlanChooserSourceCard";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/Chevrons";
import { HorizontalScrollHint } from "@/components/ui/HorizontalScrollHint";
import { OverlayHeaderBlock, overlayChromeClassNames } from "@/components/ui/OverlayChrome";
import { SHARED_OVERLAY_PANEL_MAX_WIDTH_CLASS_NAME } from "@/components/ui/app/overlayPanelTokens";
import { appTokens } from "@/components/ui/app/tokens";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { MetricAccentBar } from "@/components/ui/MetricItem";
import { ReorderHandleGlyph } from "@/components/ui/ReorderHandleGlyph";
import { useToast } from "@/components/ui/ToastProvider";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { updateRoutineDaySettingsAction } from "@/app/routines/[id]/edit/day/actions";
import { REST_DAY_BEHAVIOR_CONTRACT } from "@/features/day-state/restDayBehavior";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import {
  formatRoutineDayStableDisplayName,
  getRoutineDayEditableName,
  getRoutineDayResolvedWeekdayLabel,
} from "@/lib/routines";
import { getRoutineDayEditHref, getRoutineHomeHref } from "@/lib/routine-day-navigation";
import type { WorkoutPlanSourceListItem } from "@/lib/workout-plan-source-list";

export type RoutineHomeDayCardItem = {
  id: string;
  dayIndex: number;
  name?: string | null;
  title?: string;
  occurrenceWeekday?: string | null;
  isRest: boolean;
  splitSummary?: {
    total: number;
    strength: number;
    cardio: number;
    bodyweight: number;
    unknown: number;
  };
  exerciseSummary?: string;
  notes?: string | null;
  href: string;
  isToday: boolean;
  isCompleted: boolean;
  isSkipped?: boolean;
  isInSession: boolean;
  loggedSetCount?: number;
  previewExercises?: Array<{
    id: string;
    name: string;
    goalLine?: string | null;
  }>;
  recapExercises?: Array<{
    id: string;
    name: string;
    progressionStateLabel?: string | null;
    signatureLabel?: string | null;
    setLabel?: string | null;
    targetLabel?: string | null;
  }>;
  remainingExerciseCount?: number;
};

export function routineDayHasWorkoutPlanContent(day: Pick<RoutineHomeDayCardItem, "splitSummary" | "recapExercises">) {
  return (day.splitSummary?.total ?? 0) > 0 || (day.recapExercises?.length ?? 0) > 0;
}

const ROUTINE_HOME_COPY = {
  empty: "No days yet.",
} as const;

const ROUTINE_HOME_TOGGLE_ACTION_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "toggleInactive",
  className: "!border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)]",
});
const ROUTINE_HOME_EDIT_ACTION_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "positive",
  className: "translate-x-px !border-l-0 focus-visible:ring-[rgb(var(--accent)/0.24)]",
});
const ROUTINE_HOME_DELETE_PILL_CLASS_NAME = cn(
  getBottomActionButtonClassName({
    intent: "danger",
    fullWidth: false,
    className: "!h-6 !min-h-0 rounded-full !px-4 text-[12px] font-semibold tracking-[0.04em]",
  }),
  "shrink-0 self-center",
);
const ROUTINE_HOME_CORNER_DELETE_PILL_CLASS_NAME = cn(
  ROUTINE_HOME_DELETE_PILL_CLASS_NAME,
  "!rounded-tl-[0.5rem] !rounded-tr-none !rounded-bl-none !rounded-br-none",
  "!border-[rgb(var(--danger-rgb)/0.98)] !bg-[linear-gradient(180deg,rgb(var(--danger-rgb)/0.98),rgb(132_31_31/0.98))] !text-[rgb(255_245_245)] shadow-[0_2px_10px_rgb(var(--danger-rgb)/0.16)]",
);
const ROUTINE_HOME_REORDER_HANDLE_CLASS_NAME = cn(
  appTokens.routineEditorReorderHandle,
  "relative z-[2] h-8 w-8 border-[rgb(var(--selection-rgb)/0.28)] bg-[linear-gradient(180deg,rgb(var(--selection-rgb)/0.08),rgb(var(--surface-1-rgb)/0.36))] text-[rgb(var(--text-primary)/0.94)] shadow-[0_0_0_1px_rgb(var(--selection-rgb)/0.06),0_0_16px_rgb(var(--selection-rgb)/0.12)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--selection-rgb)/0.22)]",
);
const ROUTINE_HOME_ADD_DAY_MODAL_PANEL_CLASS_NAME = cn(
  overlayChromeClassNames.panelBase,
  `relative z-10 mx-auto flex max-h-[min(100dvh-2rem,42rem)] min-w-0 w-full ${SHARED_OVERLAY_PANEL_MAX_WIDTH_CLASS_NAME} flex-col overflow-hidden rounded-[1.25rem]`,
);
type DragState = {
  id: string;
  pointerId: number;
};

export function RoutineHomeClient({
  routineId,
  routineStartDate,
  cycleLengthDays,
  scheduleMode,
  routineTimeZone,
  routineReferenceDate,
  days,
  isActiveRoutine: _isActiveRoutine,
  appendRoutineDayAction: _appendRoutineDayAction,
  createRoutineDayAction,
  deleteRoutineDayAction,
  reorderRoutineDaysAction,
  footerMode = "edit",
  onPublishDraft,
  isPublishDraftPending = false,
  onOpenWorkoutPlan,
  workoutPlanChooserDayId: _workoutPlanChooserDayId,
  workoutPlanSources: _workoutPlanSources,
  loadWorkoutPlanSourcesAction,
  onDismissWorkoutPlanChooser: _onDismissWorkoutPlanChooser,
}: {
  routineId: string;
  routineStartDate?: string | null;
  cycleLengthDays?: number | null;
  scheduleMode?: "weekday_anchored" | "rolling_n_day" | null;
  routineTimeZone?: string | null;
  routineReferenceDate?: string | null;
  days: RoutineHomeDayCardItem[];
  isActiveRoutine: boolean;
  appendRoutineDayAction: (formData: FormData) => Promise<ActionResult & { routineDayId?: string }>;
  createRoutineDayAction: (formData: FormData) => Promise<ActionResult & { routineDayId?: string }>;
  deleteRoutineDayAction: (formData: FormData) => Promise<ActionResult>;
  reorderRoutineDaysAction?: (formData: FormData) => Promise<ActionResult>;
  footerMode?: "edit" | "draftPublish";
  onPublishDraft?: () => void;
  isPublishDraftPending?: boolean;
  onOpenWorkoutPlan?: (day: RoutineHomeDayCardItem) => void | Promise<void>;
  workoutPlanChooserDayId?: string | null;
  workoutPlanSources?: WorkoutPlanSourceListItem[];
  loadWorkoutPlanSourcesAction?: (formData: FormData) => Promise<ActionResult & { sources?: WorkoutPlanSourceListItem[] }>;
  onDismissWorkoutPlanChooser?: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isCreateDayPending, startCreateDayTransition] = useTransition();
  const [isDeleteDayPending, startDeleteDayTransition] = useTransition();
  const [isRestTogglePending, startRestToggleTransition] = useTransition();
  const [isReorderPending, startReorderTransition] = useTransition();
  const reorderFormRef = useRef<HTMLFormElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [orderedDays, setOrderedDays] = useState(days);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [dayPendingDelete, setDayPendingDelete] = useState<RoutineHomeDayCardItem | null>(null);
  const [restOverrideByDayId, setRestOverrideByDayId] = useState<Record<string, boolean>>({});
  const [restTogglePendingDayId, setRestTogglePendingDayId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isAddDayMenuOpen, setIsAddDayMenuOpen] = useState(false);
  const [isDuplicateSourceListOpen, setIsDuplicateSourceListOpen] = useState(false);
  const [selectedSourceDayId, setSelectedSourceDayId] = useState<string>("");
  const [addDaySubmissionMode, setAddDaySubmissionMode] = useState<"blank" | "duplicate" | null>(null);
  const [cachedWorkoutPlanSources, setCachedWorkoutPlanSources] = useState<WorkoutPlanSourceListItem[] | null>(_workoutPlanSources ?? null);
  const [isWorkoutPlanSourcesPending, startWorkoutPlanSourcesTransition] = useTransition();
  const orderedDaysRef = useRef(days);
  const availableWorkoutPlanSources = useMemo(
    () => (cachedWorkoutPlanSources ?? []).filter((source) => !source.isRest && routineDayHasWorkoutPlanContent(source)),
    [cachedWorkoutPlanSources],
  );
  const isBusy = isCreateDayPending || isDeleteDayPending || isWorkoutPlanSourcesPending;

  useEffect(() => {
    setOrderedDays(days);
    orderedDaysRef.current = days;
  }, [days]);

  useEffect(() => {
    if (_workoutPlanSources) {
      setCachedWorkoutPlanSources(_workoutPlanSources);
    }
  }, [_workoutPlanSources]);

  useEffect(() => {
    if (selectedSourceDayId && availableWorkoutPlanSources.some((source) => source.id === selectedSourceDayId)) {
      return;
    }

    setSelectedSourceDayId(availableWorkoutPlanSources[0]?.id ?? "");
  }, [availableWorkoutPlanSources, selectedSourceDayId]);

  useEffect(() => {
    if (!isDuplicateSourceListOpen) {
      return;
    }

    if (!selectedSourceDayId && availableWorkoutPlanSources[0]) {
      setSelectedSourceDayId(availableWorkoutPlanSources[0].id);
    }
  }, [availableWorkoutPlanSources, isDuplicateSourceListOpen, selectedSourceDayId]);

  const handleToggleDayExpansion = useCallback((dayId: string) => {
    setExpandedDayId((current) => (current === dayId ? null : dayId));
  }, []);

  const handleSelectDuplicateSourceDay = useCallback((sourceDayId: string) => {
    setSelectedSourceDayId(sourceDayId);
  }, []);

  const handleLoadWorkoutPlanSources = useCallback(() => {
    if (cachedWorkoutPlanSources || !loadWorkoutPlanSourcesAction) {
      return;
    }

    startWorkoutPlanSourcesTransition(async () => {
      const formData = new FormData();
      formData.set("routineId", routineId);
      const result = await loadWorkoutPlanSourcesAction(formData);
      if (!result.ok) {
        toast.error(result.error ?? "Could not load workout plans.");
        return;
      }

      setCachedWorkoutPlanSources(result.sources ?? []);
    });
  }, [cachedWorkoutPlanSources, loadWorkoutPlanSourcesAction, routineId, toast]);

  const handleCreateDay = useCallback((creationMode: "blank" | "duplicate") => {
    if (creationMode === "duplicate") {
      if (!selectedSourceDayId) {
        toast.error("Choose a workout plan first.");
        return;
      }
    }

    startCreateDayTransition(async () => {
      setAddDaySubmissionMode(creationMode);
      try {
        const formData = new FormData();
        formData.set("routineId", routineId);
        formData.set("creationMode", creationMode);
        if (creationMode === "duplicate") {
          const selectedSource = availableWorkoutPlanSources.find((source) => source.id === selectedSourceDayId);
          if (selectedSource?.workoutPlanTemplateId) {
            formData.set("workoutPlanTemplateId", selectedSource.workoutPlanTemplateId);
          }
          if (selectedSource?.sourceRoutineDayId) {
            formData.set("sourceRoutineDayId", selectedSource.sourceRoutineDayId);
          }
        }
        const result = creationMode === "blank"
          ? await createRoutineDayAction(formData)
          : selectedSourceDayId
            ? await createRoutineDayAction(formData)
            : { ok: false, error: "Choose a workout plan first." };
        if (!result.ok) {
          toast.error(result.error ?? (creationMode === "blank" ? "Could not add day." : "Could not duplicate workout plan."));
          setAddDaySubmissionMode(null);
          return;
        }

        setIsAddDayMenuOpen(false);
        setIsDuplicateSourceListOpen(false);
        setAddDaySubmissionMode(null);
        toast.success(creationMode === "blank" ? "Empty day added." : "Workout plan duplicated into a new day.");
        if (creationMode === "duplicate" && "routineDayId" in result && result.routineDayId) {
          router.push(getRoutineDayEditHref(routineId, result.routineDayId, getRoutineHomeHref(routineId)));
          return;
        }
        router.refresh();
      } catch (error) {
        setAddDaySubmissionMode(null);
        toast.error(error instanceof Error ? error.message : "Could not complete the workout plan action.");
      }
    });
  }, [availableWorkoutPlanSources, createRoutineDayAction, routineId, router, selectedSourceDayId, toast]);

  const handleConfirmDeleteDay = useCallback(() => {
    const day = dayPendingDelete;
    if (!day) {
      return;
    }

    startDeleteDayTransition(async () => {
      const formData = new FormData();
      formData.set("routineId", routineId);
      formData.set("routineDayId", day.id);
      const result = await deleteRoutineDayAction(formData);
      if (!result.ok) {
        toast.error(result.error ?? "Could not delete workout plan.");
        return;
      }

      setDayPendingDelete(null);
      setExpandedDayId((current) => (current === day.id ? null : current));
      toast.success("Workout plan deleted.");
      router.refresh();
    });
  }, [dayPendingDelete, deleteRoutineDayAction, routineId, router, toast]);

  const handleToggleDayRest = useCallback((day: RoutineHomeDayCardItem, currentIsRest: boolean) => {
    if (isRestTogglePending) {
      return;
    }

    const nextIsRest = !currentIsRest;
    const previousOverride = restOverrideByDayId[day.id];
    const dayName = String(day.name ?? day.title ?? day.dayIndex).trim();

    setRestOverrideByDayId((current) => ({
      ...current,
      [day.id]: nextIsRest,
    }));
    setRestTogglePendingDayId(day.id);

    startRestToggleTransition(async () => {
      const formData = new FormData();
      formData.set("routineId", routineId);
      formData.set("routineDayId", day.id);
      formData.set("name", dayName);
      if (nextIsRest) {
        formData.set("isRest", "on");
      }

      const result = await updateRoutineDaySettingsAction(formData);
      if (!result.ok) {
        setRestOverrideByDayId((current) => {
          const next = { ...current };
          if (previousOverride === undefined) {
            delete next[day.id];
          } else {
            next[day.id] = previousOverride;
          }
          return next;
        });
        toast.error(result.error ?? "Could not update workout plan type.");
        setRestTogglePendingDayId(null);
        return;
      }

      toast.info(nextIsRest ? REST_DAY_BEHAVIOR_CONTRACT.copy.enabled : REST_DAY_BEHAVIOR_CONTRACT.copy.disabled, {
        id: "day-rest-toggle-status",
        durationMs: 2600,
      });
      setRestTogglePendingDayId(null);
      router.refresh();
    });
  }, [isRestTogglePending, restOverrideByDayId, routineId, router, toast]);

  const moveDayWithinList = useCallback((
    currentDays: RoutineHomeDayCardItem[],
    fromIndex: number,
    toIndex: number,
  ) => {
    if (
      fromIndex < 0
      || fromIndex >= currentDays.length
      || toIndex < 0
      || toIndex >= currentDays.length
      || fromIndex === toIndex
    ) {
      return currentDays;
    }

    const next = [...currentDays];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
  }, []);

  const moveDay = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) {
      return;
    }

    setOrderedDays((current) => {
      const fromIndex = current.findIndex((day) => day.id === draggedId);
      const toIndex = current.findIndex((day) => day.id === targetId);
      const next = moveDayWithinList(current, fromIndex, toIndex);
      orderedDaysRef.current = next;
      return next;
    });
  }, [moveDayWithinList]);

  const finishReorder = useCallback(() => {
    setActiveDragId(null);
    dragStateRef.current = null;

    const latestOrderedIds = orderedDaysRef.current.map((day) => day.id);
    const initialOrderedIds = days.map((day) => day.id);
    if (latestOrderedIds.join(",") !== initialOrderedIds.join(",")) {
      requestAnimationFrame(() => reorderFormRef.current?.requestSubmit());
    }
  }, [days]);

  const handleReorderHandlePointerDown = useCallback((dayId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    if (isReorderPending) {
      return;
    }

    setExpandedDayId(null);
    dragStateRef.current = { id: dayId, pointerId: event.pointerId };
    setActiveDragId(dayId);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  }, [isReorderPending]);

  const handleReorderHandlePointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const row = elementBelow?.closest("[data-routine-day-id]") as HTMLElement | null;
    const targetId = row?.dataset.routineDayId;
    if (targetId) {
      moveDay(dragState.id, targetId);
    }

    event.stopPropagation();
    event.preventDefault();
  }, [moveDay]);

  const handleReorderHandlePointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    event.stopPropagation();
    finishReorder();
  }, [finishReorder]);

  const actionsNode = useMemo(() => {
    if (footerMode === "draftPublish") {
      return (
        <BottomActionSingle>
          <BottomDockButton
            type="button"
            intent="positive"
            disabled={isPublishDraftPending}
            onClick={onPublishDraft}
          >
            <span>{isPublishDraftPending ? "Creating..." : "Create Routine"}</span>
          </BottomDockButton>
        </BottomActionSingle>
      );
    }

    return (
      <BottomActionSingle>
        <BottomDockButton
          type="button"
          intent="positive"
          disabled={isBusy}
          onClick={() => {
            setIsAddDayMenuOpen(true);
            setIsDuplicateSourceListOpen(false);
          }}
        >
          <span>{isDeleteDayPending ? "Deleting..." : isCreateDayPending ? "Adding..." : "Add Day"}</span>
        </BottomDockButton>
      </BottomActionSingle>
    );
  }, [footerMode, isBusy, isCreateDayPending, isDeleteDayPending, isPublishDraftPending, onPublishDraft]);

  usePublishBottomActions(actionsNode);

  const todaySlotIndexes = useMemo(
    () => new Set(days.filter((day) => day.isToday).map((day) => day.dayIndex)),
    [days],
  );
  const completedSlotIndexes = useMemo(
    () => new Set(days.filter((day) => day.isCompleted).map((day) => day.dayIndex)),
    [days],
  );
  const skippedSlotIndexes = useMemo(
    () => new Set(days.filter((day) => day.isSkipped).map((day) => day.dayIndex)),
    [days],
  );
  const inSessionSlotIndexes = useMemo(
    () => new Set(days.filter((day) => day.isInSession).map((day) => day.dayIndex)),
    [days],
  );
  const sourceDayById = useMemo(
    () => new Map(orderedDays.map((day) => [day.id, day])),
    [orderedDays],
  );
  const displayDays = useMemo(() => orderedDays.map((day, index) => {
    const displayDayIndex = index + 1;
    const hasCustomName = Boolean(getRoutineDayEditableName({
      name: day.name ?? day.title ?? null,
      dayIndex: day.dayIndex,
      startDate: routineStartDate,
    }));
    const displayTitle = hasCustomName
      ? day.title ?? day.name ?? undefined
      : formatRoutineDayStableDisplayName({
          name: null,
          dayIndex: displayDayIndex,
          startDate: routineStartDate,
        });

    return {
      ...day,
      dayIndex: displayDayIndex,
      title: displayTitle,
      occurrenceWeekday: getRoutineDayResolvedWeekdayLabel({
        dayIndex: displayDayIndex,
        startDate: routineStartDate,
        cycleLengthDays,
        scheduleMode,
        profileTimeZone: routineTimeZone,
        referenceDate: routineReferenceDate,
        weekday: "short",
      }),
      isToday: todaySlotIndexes.has(displayDayIndex),
      isCompleted: completedSlotIndexes.has(displayDayIndex),
      isSkipped: skippedSlotIndexes.has(displayDayIndex),
      isInSession: inSessionSlotIndexes.has(displayDayIndex),
    };
  }), [
    orderedDays,
    routineStartDate,
    cycleLengthDays,
    scheduleMode,
    routineTimeZone,
    routineReferenceDate,
    todaySlotIndexes,
    completedSlotIndexes,
    skippedSlotIndexes,
    inSessionSlotIndexes,
  ]);

  return (
    <RoutinesPageScaffold>
      <SharedDayListSection>
        <div className={ROUTINE_CONTENT_GAP_CLASS_NAME}>
          {displayDays.length > 0 ? (
            <DayList className="space-y-[0.375rem] sm:space-y-[0.375rem]">
              {displayDays.map((day) => {
                const sourceDay = sourceDayById.get(day.id) ?? day;
                const displayIsRest = restOverrideByDayId[day.id] ?? day.isRest;
                const displayDay = { ...day, isRest: displayIsRest };
                const hasWorkoutPlanContent = routineDayHasWorkoutPlanContent(sourceDay);
                const isExpanded = expandedDayId === day.id;
                const isThisTogglePending = restTogglePendingDayId === day.id && isRestTogglePending;
                return (
                  <RoutineOverviewDayCard
                    key={day.id}
                    day={displayDay}
                    startDate={routineStartDate}
                    isSelected={day.isToday}
                    isExpanded={isExpanded}
                    onPress={() => handleToggleDayExpansion(day.id)}
                    reorderHandle={reorderRoutineDaysAction && displayDays.length > 1 ? (
                      <button
                        type="button"
                        aria-label={`Reorder ${day.title ?? day.name ?? `Workout plan ${day.dayIndex}`}`}
                        title="Drag to reorder"
                        disabled={isReorderPending}
                        className={cn(
                          ROUTINE_HOME_REORDER_HANDLE_CLASS_NAME,
                          "touch-none",
                          activeDragId === day.id ? "ring-2 ring-[rgb(var(--selection-rgb)/0.26)]" : undefined,
                        )}
                        onPointerDown={(event) => handleReorderHandlePointerDown(day.id, event)}
                        onPointerMove={handleReorderHandlePointerMove}
                        onPointerUp={handleReorderHandlePointerUp}
                        onPointerCancel={finishReorder}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                      >
                        <ReorderHandleGlyph className={appTokens.routineEditorHandleGlyph} />
                      </button>
                    ) : undefined}
                    wrapper={(card) => (
                      <div className="relative min-w-0" data-routine-day-id={day.id}>
                        <div
                          className="pointer-events-none absolute left-[8px] top-px z-[4]"
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              setDayPendingDelete(sourceDay);
                            }}
                            disabled={isBusy}
                            aria-label={`Delete ${day.title ?? day.name ?? `workout plan ${day.dayIndex}`}`}
                            data-bottom-action-intent="danger"
                            className={cn(
                              ROUTINE_HOME_CORNER_DELETE_PILL_CLASS_NAME,
                              "pointer-events-auto",
                              isBusy ? "opacity-75" : undefined,
                            )}
                          >
                            <span className="bottom-action__label">Delete</span>
                          </button>
                        </div>
                        {card}
                        {isExpanded ? (
                          <AttachedCardActionStripFrame gridClassName={displayIsRest ? "grid-cols-1" : "grid-cols-[minmax(112px,0.92fr)_minmax(0,1.78fr)]"}>
                            <button
                              type="button"
                              data-bottom-action-intent={displayIsRest ? "toggleActive" : "toggleInactive"}
                              onClick={() => handleToggleDayRest(sourceDay, displayIsRest)}
                              disabled={isThisTogglePending}
                              aria-pressed={displayIsRest}
                              className={displayIsRest
                                ? getAttachedCardActionButtonClassName({ intent: "toggleActive" })
                                : ROUTINE_HOME_TOGGLE_ACTION_BUTTON_CLASS_NAME}
                            >
                              <span className={cn("bottom-action__label", isThisTogglePending ? "opacity-65" : undefined)}>
                                {isThisTogglePending ? "Saving..." : displayIsRest ? "Set Training" : "Set Rest"}
                              </span>
                            </button>
                            {!displayIsRest ? (
                              <button
                                type="button"
                                data-bottom-action-intent="positive"
                                onClick={() => {
                                  if (onOpenWorkoutPlan) {
                                    void onOpenWorkoutPlan(sourceDay);
                                    return;
                                  }

                                  router.push(day.href);
                                }}
                                className={ROUTINE_HOME_EDIT_ACTION_BUTTON_CLASS_NAME}
                              >
                                <span className="bottom-action__label">{hasWorkoutPlanContent ? "Edit" : "Create"}</span>
                              </button>
                            ) : null}
                          </AttachedCardActionStripFrame>
                        ) : null}
                      </div>
                    )}
                  />
                );
              })}
            </DayList>
          ) : (
            <EmptyState
              title="No days"
              body={ROUTINE_HOME_COPY.empty}
              action={(
                <button
                  type="button"
                  onClick={() => {
                    setIsAddDayMenuOpen(true);
                    setIsDuplicateSourceListOpen(false);
                  }}
                  disabled={isBusy}
                  className={getAppButtonClassName({ variant: "primary", fullWidth: true })}
                >
                  {isDeleteDayPending ? "Deleting..." : isCreateDayPending ? "Adding day..." : "Add first day"}
                </button>
              )}
              className={appTokens.routinesOverviewEmptyState}
            />
          )}
        </div>
      </SharedDayListSection>

      <ConfirmDestructiveModal
        open={dayPendingDelete !== null}
        title="Delete workout plan?"
        details={dayPendingDelete?.title ?? dayPendingDelete?.name ?? undefined}
        confirmLabel="Delete"
        onCancel={() => setDayPendingDelete(null)}
        onConfirm={handleConfirmDeleteDay}
      />

      {isAddDayMenuOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 pt-[max(1rem,var(--app-safe-top))] pb-[max(1rem,var(--app-safe-bottom))]">
          <div aria-hidden="true" className={overlayChromeClassNames.scrim} />
          <div className={ROUTINE_HOME_ADD_DAY_MODAL_PANEL_CLASS_NAME}>
            <div className="px-4 pb-4 pt-3">
              <div className="flex items-start justify-between gap-3">
                <OverlayHeaderBlock
                  title="Add Day"
                  className="min-w-0 flex-1 !px-0 !pb-0"
                />
                <button
                  type="button"
                  aria-label="Close add day menu"
                  onClick={() => {
                    setIsAddDayMenuOpen(false);
                    setIsDuplicateSourceListOpen(false);
                  }}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.58)] text-[rgb(var(--text-secondary)/0.88)] transition hover:text-[rgb(var(--text-primary)/0.96)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent)/0.2)]"
                >
                  <ChevronRightIcon className="h-4 w-4 rotate-180" />
                </button>
              </div>

              <div className="space-y-2 pt-3">
                <RoutineChooserOptionCard
                  title="Blank workout plan"
                  disabled={isBusy}
                  rightSlot={<ChevronRightIcon className="h-4 w-4" />}
                  onPress={() => handleCreateDay("blank")}
                />

                <RoutineChooserOptionCard
                  title="Duplicate workout plan"
                  active={isDuplicateSourceListOpen}
                  disabled={isCreateDayPending || isDeleteDayPending}
                  rightSlot={isDuplicateSourceListOpen ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                  onPress={() => {
                    if (isCreateDayPending || isDeleteDayPending) {
                      return;
                    }

                    handleLoadWorkoutPlanSources();
                    setIsDuplicateSourceListOpen((current) => !current);
                  }}
                />
              </div>

              {isDuplicateSourceListOpen ? (
                <div className="pt-3">
                  <RoutineDuplicateChooserPanel
                    title="Choose Workout Plan"
                    list={(
                      isWorkoutPlanSourcesPending ? (
                        <div className="px-4 py-6 text-center text-[0.8rem] text-[rgb(var(--text-secondary)/0.78)]">
                          Loading workout plans...
                        </div>
                      ) : availableWorkoutPlanSources.length > 0 ? (
                        <RoutineDuplicateChooserListViewport>
                          {availableWorkoutPlanSources.map((source) => (
                            <WorkoutPlanChooserSourceCard
                              key={source.id}
                              onPress={() => handleSelectDuplicateSourceDay(source.id)}
                              selected={selectedSourceDayId === source.id}
                              source={{
                                dayIndex: source.dayIndex,
                                title: source.title,
                                occurrenceWeekday: source.weekdayLabel,
                                isRest: source.isRest,
                                splitSummary: source.splitSummary,
                                recapExercises: source.recapExercises,
                              }}
                            />
                          ))}
                        </RoutineDuplicateChooserListViewport>
                      ) : (
                        <div className="px-4 py-6 text-center text-[0.8rem] text-[rgb(var(--text-secondary)/0.78)]">
                          No workout plans available to duplicate.
                        </div>
                      )
                    )}
                    footer={(
                      <>
                        <BottomDockButton
                          type="button"
                          intent="positive"
                          disabled={!selectedSourceDayId || isBusy}
                          onClick={() => handleCreateDay("duplicate")}
                        >
                          {addDaySubmissionMode === "duplicate" && isCreateDayPending ? "Confirming..." : "Confirm"}
                        </BottomDockButton>
                      </>
                    )}
                  />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <form
        action={async (formData) => {
          if (!reorderRoutineDaysAction) {
            return;
          }

          startReorderTransition(async () => {
            const result = await reorderRoutineDaysAction(formData);
            if (!result.ok) {
              toast.error(result.error ?? "Could not reorder workout plans.");
              setOrderedDays(days);
              orderedDaysRef.current = days;
              setActiveDragId(null);
              return;
            }

            toast.success("Workout plan order updated.");
            setActiveDragId(null);
            router.refresh();
          });
        }}
        className="hidden"
        ref={reorderFormRef}
      >
        <input type="hidden" name="routineId" value={routineId} />
        <input type="hidden" name="orderedRoutineDayIds" value={orderedDays.map((day) => day.id).join(",")} />
      </form>
    </RoutinesPageScaffold>
  );
}
