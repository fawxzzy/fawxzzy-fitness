"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
import { TodayOverviewHeader, TodayOverviewScaffold, TodayRoutineSwitchHeader } from "@/components/today/TodayScreenFamily";
import { HeaderInfoRail } from "@/components/ui/HeaderInfoRail";
import { AccentDotSeparatedText, SignatureMiniPipe } from "@/components/ui/app/SignatureSeparator";
import { WorkoutExerciseCardDetails } from "@/components/workout/WorkoutExerciseCardDetails";
import { DayList } from "@/components/day-list/DayList";
import {
  ROUTINE_CONTENT_GAP_CLASS_NAME,
  RoutineOverviewDayCard,
  RoutineDayCardTitle,
} from "@/components/day-list/RoutineDayCardPresentation";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { BottomActionSingle, BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { ACTION_CHROME_CONTROL_CLASS_NAME } from "@/components/ui/actionChrome";
import { appTokens } from "@/components/ui/app/tokens";
import { StateChevron } from "@/components/ui/StateChevron";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import { DayDetailStateCard } from "@/components/routines/day-detail/DayDetailStateCard";
import { getRestDayExerciseCountSummaryFromInputs } from "@/lib/day-summary";
import { cn } from "@/lib/cn";
import { deriveExerciseCardProgressFill } from "@/lib/exercise-card-progress-fill";
import { buildCurrentRoutineInfoRailItems, buildTodayHeaderInfoRailItems } from "@/lib/header-info-rail";
import { ACTIVE_SESSION_EVENT, clearActiveSessionHint, readActiveSessionHint } from "@/lib/session-state-sync";
import { isStretchHubExercise } from "@/lib/stretch-library";
import { buildPlannedExerciseDetailMetrics } from "@/lib/workout-card-view-models";
import { applyWorkoutCardSurfacePolicy } from "@/lib/workout-card-surface-policy";
import type { ActionResult } from "@/lib/action-result";
import type { ProgressionTargetPlan } from "@/lib/progression-playbooks";
import type {
  ProgressionReviewApplyResult,
  ProgressionReviewDisplayItem,
  ProgressionReviewRevertTargetSnapshot,
} from "@/lib/progression-review-display";
import { formatProgressionReviewTargetLabel } from "@/lib/progression-review-display";
import type { ProgressionStatusSurfaceItem } from "@/lib/progression-status-display";
import {
  buildProgressionAppliedPin,
  getPendingProgressionAppliedPinsForRoutineDay,
  getProgressionAppliedPinsStorageKey,
  PROGRESSION_APPLIED_PINS_CHANGED_EVENT,
  pruneExpiredProgressionAppliedPins,
  removeProgressionAppliedPin,
  type ProgressionAppliedPin,
  upsertProgressionAppliedPin,
} from "@/lib/progression-applied-pins";
import {
  deriveTodayScreenMode,
  getTodayDaySummary,
  getTodayDaySummaryTone,
  type TodayPickerDayState,
} from "@/lib/today-page-state";
import type { BottomActionIntent } from "@/components/layout/bottomActionIntents";

type TodayExercise = {
  id: string;
  exerciseId: string;
  name: string;
  targets: string | null;
  targetSetsMin?: number | null;
  targetSetsMax?: number | null;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  measurement_type?: "reps" | "time" | "distance" | "time_distance" | "none" | null;
  isCardio?: boolean | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
  image_howto_path: string | null;
  image_icon_path: string | null;
  slug: string | null;
  how_to_short: string | null;
};

type TodayDay = {
  id: string;
  dayIndex: number;
  name: string;
  occurrenceWeekday?: string | null;
  isRest: boolean;
  state: TodayPickerDayState;
  invalidExerciseCount: number;
  exercises: TodayExercise[];
};

function getTodayProgressionActionIntent(item: Pick<ProgressionReviewDisplayItem, "type">): BottomActionIntent {
  return item.type === "deload" ? "danger" : "positive";
}

function getTodayProgressionActionArrowClassName(item: Pick<ProgressionReviewDisplayItem, "type">) {
  return item.type === "deload"
    ? "text-[rgb(var(--danger-rgb)/0.95)]"
    : "text-[rgb(var(--accent-divider-rgb)/0.95)]";
}

function getTodayProgressionActionModalTitle(item: Pick<ProgressionReviewDisplayItem, "type">) {
  return item.type === "deload" ? "Apply linked regression?" : "Promote linked updates?";
}

function getTodayProgressionActionSelectionError(item: Pick<ProgressionReviewDisplayItem, "type">) {
  return item.type === "deload"
    ? "Select at least one day to apply regression."
    : "Select at least one day to promote.";
}

function resolveTodayProgressionTargetDisplayPair(item: ProgressionReviewDisplayItem) {
  const current = formatProgressionReviewTargetLabel(item.currentTarget);
  const proposed = formatProgressionReviewTargetLabel(item.proposedTarget);
  if (!current || !proposed || current === proposed) {
    return null;
  }

  return { current, proposed };
}


export function TodayDayPicker({
  days,
  currentDayIndex,
  noScheduledDayMessage = null,
  inProgressSessionId,
  completedDayIndexes,
  inSessionDayIndex,
  loggedSetCountsByDayIndex,
  routineName,
  startDate,
  floatingHeaderSlotId,
  switchFloatingHeaderSlotId,
  exerciseDensity = "compact",
  progressionReviewItems = [],
  progressionStatusItems = [],
  progressionRoutineId,
  applyProgressionReviewCandidateAction,
  revertProgressionReviewCandidateAction,
}: {
  days: TodayDay[];
  currentDayIndex: number | null;
  noScheduledDayMessage?: string | null;
  inProgressSessionId?: string | null;
  completedDayIndexes?: number[];
  inSessionDayIndex?: number | null;
  loggedSetCountsByDayIndex?: Record<number, number>;
  routineName: string;
  startDate: string | null;
  floatingHeaderSlotId?: string;
  switchFloatingHeaderSlotId?: string;
  exerciseDensity?: "compact" | "detailed";
  progressionReviewItems?: ProgressionReviewDisplayItem[];
  progressionStatusItems?: ProgressionStatusSurfaceItem[];
  progressionRoutineId?: string | null;
  applyProgressionReviewCandidateAction?: (payload: {
    routineId: string;
    routineDayExerciseId: string;
    candidateType: ProgressionReviewDisplayItem["type"];
    linkedRoutineDayExerciseIds?: string[];
  }) => Promise<ActionResult<ProgressionReviewApplyResult>>;
  revertProgressionReviewCandidateAction?: (payload: {
    routineId: string;
    routineDayExerciseId: string;
    previousTarget: ProgressionTargetPlan;
    linkedPreviousTargets?: ProgressionReviewRevertTargetSnapshot[];
  }) => Promise<ActionResult>;
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => currentDayIndex ?? days[0]?.dayIndex ?? 1);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedExerciseRowId, setSelectedExerciseRowId] = useState<string | null>(null);
  const [exerciseInfoExerciseId, setExerciseInfoExerciseId] = useState<string | null>(null);
  const [selectedDayAppliedPins, setSelectedDayAppliedPins] = useState<ProgressionAppliedPin[]>([]);
  const [cardConfirmItem, setCardConfirmItem] = useState<ProgressionReviewDisplayItem | null>(null);
  const [cardConfirmSelectedIds, setCardConfirmSelectedIds] = useState<string[]>([]);
  const [cardPendingItemId, setCardPendingItemId] = useState<string | null>(null);
  const [cardActionError, setCardActionError] = useState<string | null>(null);
  const [isCardActionPending, startCardActionTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const syncActiveSession = () => {
      const hintSessionId = readActiveSessionHint()?.sessionId ?? null;
      if (!inProgressSessionId && hintSessionId) {
        clearActiveSessionHint(hintSessionId);
        router.refresh();
      }
    };

    syncActiveSession();
    window.addEventListener(ACTIVE_SESSION_EVENT, syncActiveSession as EventListener);

    return () => {
      window.removeEventListener(ACTIVE_SESSION_EVENT, syncActiveSession as EventListener);
    };
  }, [inProgressSessionId, router]);

  useEffect(() => {
    setSelectedDayIndex((current) => {
      if (days.some((day) => day.dayIndex === current)) {
        return current;
      }

      return currentDayIndex ?? days[0]?.dayIndex ?? current;
    });
  }, [currentDayIndex, days]);


  const [floatingHeaderTarget, setFloatingHeaderTarget] = useState<HTMLElement | null>(null);
  const [switchFloatingHeaderTarget, setSwitchFloatingHeaderTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!floatingHeaderSlotId) return;
    const syncSlot = () => {
      const nextTarget = document.getElementById(floatingHeaderSlotId);
      setFloatingHeaderTarget((current) => (current === nextTarget ? current : nextTarget));
    };

    syncSlot();
    const frameId = window.requestAnimationFrame(syncSlot);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [floatingHeaderSlotId]);

  useEffect(() => {
    if (!switchFloatingHeaderSlotId) return;
    const syncSlot = () => {
      const nextTarget = document.getElementById(switchFloatingHeaderSlotId);
      setSwitchFloatingHeaderTarget((current) => (current === nextTarget ? current : nextTarget));
    };

    syncSlot();
    const frameId = window.requestAnimationFrame(syncSlot);
    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [switchFloatingHeaderSlotId]);

  const mode = useMemo(() => deriveTodayScreenMode({
    days,
    selectedDayIndex,
    currentDayIndex,
    dayPickerOpen: isPickerOpen,
    inProgressSessionId,
  }), [currentDayIndex, days, inProgressSessionId, isPickerOpen, selectedDayIndex]);

  useEffect(() => {
    document.body.dataset.todayDayPickerOpen = mode.dayPickerOpen ? "true" : "false";

    return () => {
      delete document.body.dataset.todayDayPickerOpen;
    };
  }, [mode.dayPickerOpen]);

  const togglePicker = useCallback(() => {
    setIsPickerOpen((previous) => !previous);
  }, []);

  const selectedDay = mode.selectedDay;
  const selectedDayProgressionReviewItems = useMemo(() => {
    if (!selectedDay) {
      return [];
    }

    return progressionReviewItems.flatMap((item) => {
      if (item.dayGroupId === selectedDay.id) {
        return [item];
      }

      const selectedLinkedTarget = item.linkedUpdate?.targets.find((target) => target.dayGroupId === selectedDay.id);
      if (!item.linkedUpdate || !selectedLinkedTarget) {
        return [];
      }

      const linkedTargets = [
        selectedLinkedTarget,
        ...item.linkedUpdate.targets.filter((target) => target.routineDayExerciseId !== selectedLinkedTarget.routineDayExerciseId),
      ];
      const dayNames = Array.from(new Set(linkedTargets.map((target) => target.dayName).filter(Boolean)));

      return [{
        ...item,
        dayName: selectedDay.name,
        dayGroupId: selectedDay.id,
        linkedUpdate: {
          ...item.linkedUpdate,
          dayNames,
          targets: linkedTargets,
        },
      }];
    });
  }, [progressionReviewItems, selectedDay]);

  const selectedDayProgressFillByExerciseId = useMemo(() => {
    const progressById = new Map<string, ProgressionStatusSurfaceItem["progress"]>();

    if (!selectedDay) {
      return progressById;
    }

    for (const item of progressionStatusItems) {
      if (item.dayGroupId === selectedDay.id && item.progress) {
        progressById.set(item.id, item.progress);
      }
    }

    for (const item of selectedDayProgressionReviewItems) {
      if (item.progress) {
        progressById.set(item.id, item.progress);
        for (const linkedTarget of item.linkedUpdate?.targets ?? []) {
          progressById.set(linkedTarget.routineDayExerciseId, item.progress);
        }
      }
    }

    return progressById;
  }, [progressionStatusItems, selectedDay, selectedDayProgressionReviewItems]);

  const selectedDayProgressionItemByExerciseId = useMemo(() => {
    const itemByExerciseId = new Map<string, ProgressionReviewDisplayItem>();

    if (!selectedDay) {
      return itemByExerciseId;
    }

    for (const item of selectedDayProgressionReviewItems) {
      itemByExerciseId.set(item.id, item);
      for (const linkedTarget of item.linkedUpdate?.targets ?? []) {
        if (linkedTarget.dayGroupId === selectedDay.id) {
          itemByExerciseId.set(linkedTarget.routineDayExerciseId, item);
        }
      }
    }

    return itemByExerciseId;
  }, [selectedDay, selectedDayProgressionReviewItems]);

  const readSelectedDayPendingAppliedPins = useCallback(() => {
    if (!progressionRoutineId || !selectedDay?.id || typeof window === "undefined") {
      return [];
    }

    try {
      const storageKey = getProgressionAppliedPinsStorageKey(progressionRoutineId);
      const raw = window.sessionStorage.getItem(storageKey);
      const pins = raw ? JSON.parse(raw) as ProgressionAppliedPin[] : [];
      return getPendingProgressionAppliedPinsForRoutineDay({
        pins: Array.isArray(pins) ? pins : [],
        routineDayId: selectedDay.id,
      });
    } catch {
      return [];
    }
  }, [progressionRoutineId, selectedDay?.id]);

  const syncSelectedDayPendingAppliedPins = useCallback(() => {
    const pins = readSelectedDayPendingAppliedPins();
    setSelectedDayAppliedPins(pins);
  }, [readSelectedDayPendingAppliedPins]);

  const persistProgressionAppliedPins = useCallback((pins: ProgressionAppliedPin[]) => {
    if (!progressionRoutineId || typeof window === "undefined") {
      return;
    }

    const storageKey = getProgressionAppliedPinsStorageKey(progressionRoutineId);
    const nextPins = pruneExpiredProgressionAppliedPins(pins);
    if (nextPins.length > 0) {
      window.sessionStorage.setItem(storageKey, JSON.stringify(nextPins));
    } else {
      window.sessionStorage.removeItem(storageKey);
    }

    window.dispatchEvent(new CustomEvent(PROGRESSION_APPLIED_PINS_CHANGED_EVENT, {
      detail: { routineId: progressionRoutineId, storageKey },
    }));
  }, [progressionRoutineId]);

  const readAllProgressionAppliedPins = useCallback(() => {
    if (!progressionRoutineId || typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.sessionStorage.getItem(getProgressionAppliedPinsStorageKey(progressionRoutineId));
      const pins = raw ? JSON.parse(raw) as ProgressionAppliedPin[] : [];
      return pruneExpiredProgressionAppliedPins(Array.isArray(pins) ? pins : []);
    } catch {
      return [];
    }
  }, [progressionRoutineId]);

  const findSelectedDayAppliedPinForExercise = useCallback((routineDayExerciseId: string) => (
    selectedDayAppliedPins.find((pin) => (
      pin.routineDayExerciseId === routineDayExerciseId
      || pin.linkedTargets?.some((target) => target.routineDayExerciseId === routineDayExerciseId) === true
      || pin.item.linkedUpdate?.targets.some((target) => target.routineDayExerciseId === routineDayExerciseId) === true
    )) ?? null
  ), [selectedDayAppliedPins]);

  useEffect(() => {
    syncSelectedDayPendingAppliedPins();
  }, [syncSelectedDayPendingAppliedPins]);

  useEffect(() => {
    window.addEventListener(PROGRESSION_APPLIED_PINS_CHANGED_EVENT, syncSelectedDayPendingAppliedPins);
    window.addEventListener("storage", syncSelectedDayPendingAppliedPins);

    return () => {
      window.removeEventListener(PROGRESSION_APPLIED_PINS_CHANGED_EVENT, syncSelectedDayPendingAppliedPins);
      window.removeEventListener("storage", syncSelectedDayPendingAppliedPins);
    };
  }, [syncSelectedDayPendingAppliedPins]);

  const applyProgressionItemFromTodayCard = useCallback((item: ProgressionReviewDisplayItem, selectedLinkedIds?: string[]) => {
    if (!progressionRoutineId || !applyProgressionReviewCandidateAction) {
      return;
    }

    const linkedTargets = item.linkedUpdate?.targets ?? [];
    const selectedLinkedTargets = linkedTargets.length > 1
      ? linkedTargets.filter((target) => selectedLinkedIds?.includes(target.routineDayExerciseId))
      : [];
    const itemForAction = item.linkedUpdate && linkedTargets.length > 1 ? {
      ...item,
      linkedUpdate: {
        ...item.linkedUpdate,
        count: selectedLinkedTargets.length,
        dayNames: selectedLinkedTargets.map((target) => target.dayName),
        routineDayExerciseIds: selectedLinkedTargets.map((target) => target.routineDayExerciseId),
        targets: selectedLinkedTargets,
      },
    } satisfies ProgressionReviewDisplayItem : item;

    setCardActionError(null);
    setCardPendingItemId(item.id);
    startCardActionTransition(async () => {
      const result = await applyProgressionReviewCandidateAction({
        routineId: progressionRoutineId,
        routineDayExerciseId: item.id,
        candidateType: item.type,
        linkedRoutineDayExerciseIds: linkedTargets.length > 1 ? selectedLinkedIds : item.linkedUpdate?.routineDayExerciseIds,
      });

      if (result.ok && result.data) {
        const pin = buildProgressionAppliedPin({
          item: itemForAction,
          previousTarget: result.data.previousTarget,
          appliedTarget: result.data.appliedTarget,
          linkedTargets: result.data.linkedTargets,
        });
        persistProgressionAppliedPins(upsertProgressionAppliedPin(readAllProgressionAppliedPins(), pin));
        setCardConfirmItem(null);
        setCardConfirmSelectedIds([]);
        router.refresh();
      } else if (!result.ok) {
        setCardActionError(result.error);
      }

      setCardPendingItemId(null);
    });
  }, [
    applyProgressionReviewCandidateAction,
    persistProgressionAppliedPins,
    progressionRoutineId,
    readAllProgressionAppliedPins,
    router,
  ]);

  const revertProgressionItemFromTodayCard = useCallback((pin: ProgressionAppliedPin) => {
    if (!progressionRoutineId || !revertProgressionReviewCandidateAction) {
      return;
    }

    setCardActionError(null);
    setCardPendingItemId(pin.routineDayExerciseId);
    startCardActionTransition(async () => {
      const result = await revertProgressionReviewCandidateAction({
        routineId: progressionRoutineId,
        routineDayExerciseId: pin.routineDayExerciseId,
        previousTarget: pin.previousTarget,
        linkedPreviousTargets: pin.linkedTargets?.map((target) => ({
          routineDayExerciseId: target.routineDayExerciseId,
          previousTarget: target.previousTarget,
        })),
      });

      if (result.ok) {
        persistProgressionAppliedPins(removeProgressionAppliedPin(readAllProgressionAppliedPins(), pin.routineDayExerciseId));
        router.refresh();
      } else {
        setCardActionError(result.error);
      }

      setCardPendingItemId(null);
    });
  }, [
    persistProgressionAppliedPins,
    progressionRoutineId,
    readAllProgressionAppliedPins,
    revertProgressionReviewCandidateAction,
    router,
  ]);

  const openTodayCardPromotion = useCallback((item: ProgressionReviewDisplayItem) => {
    const linkedTargets = item.linkedUpdate?.targets ?? [];
    if (linkedTargets.length > 1) {
      setCardActionError(null);
      setCardConfirmItem(item);
      setCardConfirmSelectedIds(linkedTargets.map((target) => target.routineDayExerciseId));
      return;
    }

    applyProgressionItemFromTodayCard(item);
  }, [applyProgressionItemFromTodayCard]);

  const daySummary = selectedDay
    ? getTodayDaySummary(selectedDay)
    : null;
  const daySummaryTone = selectedDay ? getTodayDaySummaryTone(selectedDay) : null;
  const completedDayIndexSet = useMemo(() => new Set(completedDayIndexes ?? []), [completedDayIndexes]);
  const hasSelectedDayRows = Boolean(selectedDay && selectedDay.exercises.length > 0);
  const selectedDaySummaryToneClassName = daySummaryTone === "blocking"
    ? "border-[rgb(var(--accent-red)/0.34)] bg-[rgb(var(--accent-red)/0.12)] text-[rgb(var(--button-destructive-text))]"
    : "border-[rgb(var(--accent-yellow-on)/0.28)] bg-[rgb(var(--accent-yellow-off)/0.12)] text-[rgb(var(--accent-yellow-on))]";
  const selectedDaySplitSummary = useMemo(() => (
    selectedDay
      ? getRestDayExerciseCountSummaryFromInputs(selectedDay.exercises, selectedDay.isRest)
      : null
  ), [selectedDay]);
  const todayHeaderInfoItems = useMemo(() => {
    const restDays = days.filter((day) => day.isRest).length;
    const trainingDays = Math.max(days.length - restDays, 0);
    return buildTodayHeaderInfoRailItems({
      trainingDays,
      restDays,
      daysLength: days.length,
      selectedDay: selectedDay ? {
        dayIndex: selectedDay.dayIndex,
        isRest: selectedDay.isRest,
        isToday: selectedDay.dayIndex === currentDayIndex,
        isInSession: inSessionDayIndex === selectedDay.dayIndex,
        state: selectedDay.state,
        invalidExerciseCount: selectedDay.invalidExerciseCount,
        splitSummary: selectedDaySplitSummary,
      } : null,
    });
  }, [currentDayIndex, days, inSessionDayIndex, selectedDay, selectedDaySplitSummary]);
  const routineHeaderInfoItems = useMemo(() => {
    const restDays = days.filter((day) => day.isRest).length;
    const trainingDays = Math.max(days.length - restDays, 0);

    return buildCurrentRoutineInfoRailItems({
      trainingDays,
      restDays,
      days: days.map((day) => ({
        dayIndex: day.dayIndex,
        isRest: day.isRest,
        isToday: day.dayIndex === currentDayIndex,
        isCompleted: completedDayIndexSet.has(day.dayIndex),
        isSkipped: false,
        isInSession: inSessionDayIndex === day.dayIndex,
        splitSummary: getRestDayExerciseCountSummaryFromInputs(day.exercises, day.isRest),
      })),
    });
  }, [completedDayIndexSet, currentDayIndex, days, inSessionDayIndex]);
  const selectedDayStateCard = useMemo(() => {
    if (!selectedDay || mode.dayPickerOpen) {
      return null;
    }

    return null;
  }, [mode.dayPickerOpen, selectedDay]);
  const noScheduledDayNotice = useMemo(() => {
    if (mode.dayPickerOpen || !noScheduledDayMessage?.trim()) {
      return null;
    }

    return (
      <DayDetailStateCard
        tone="neutral"
        title="No scheduled workout today."
        body={noScheduledDayMessage}
      />
    );
  }, [mode.dayPickerOpen, noScheduledDayMessage]);
  const selectedDaySummaryNode = useMemo(() => {
    if (selectedDayStateCard) {
      return selectedDayStateCard;
    }

    if (!mode.summaryVisible || !daySummary || !daySummaryTone) {
      return null;
    }

    return (
      <div className={cn(appTokens.detailStateCard, selectedDaySummaryToneClassName)}>
        <p className={cn(appTokens.detailBodyText, "font-medium")}>
          {daySummary}
        </p>
      </div>
    );
  }, [daySummary, daySummaryTone, mode.summaryVisible, selectedDayStateCard, selectedDaySummaryToneClassName]);
  const shouldCenterSelectedDayState = Boolean(!mode.dayPickerOpen && selectedDayStateCard && !hasSelectedDayRows);

  const headerNode = selectedDay && !mode.dayPickerOpen
    ? (
      <TodayOverviewHeader
        title={(
          <RoutineDayCardTitle
            routineName={routineName.trim() || "Routine"}
            name={selectedDay.name}
            dayIndex={selectedDay.dayIndex}
            startDate={startDate}
            weekdayLabel={selectedDay.occurrenceWeekday}
            dayWeekdaySeparator="dot"
          />
        )}
        align="center"
        subtitle={todayHeaderInfoItems.length > 0 ? (
          <HeaderInfoRail
            items={todayHeaderInfoItems}
            ariaLabel="Today day summary"
            behavior="rotate-single"
            className="justify-center text-center"
          />
        ) : undefined}
      />
    )
    : null;
  const switchHeaderNode = selectedDay && mode.dayPickerOpen
    ? (
      <TodayRoutineSwitchHeader
        title={routineName.trim() || "Routine"}
        subtitle={(
          <HeaderInfoRail
            items={routineHeaderInfoItems}
            ariaLabel="Routine cycle summary"
            behavior="rotate-single"
            className="justify-center text-center"
          />
        )}
        align="center"
      />
    )
    : null;

  const actionsNode = useMemo(() => {
    const selectDayButton = (
      <BottomDockButton
        id="today-day-picker"
        type="button"
        intent="toggleActive"
        onClick={togglePicker}
        aria-expanded={mode.dayPickerOpen}
        aria-controls="today-day-selector-list"
      >
        <span>{mode.cta.secondaryLabel}</span>
      </BottomDockButton>
    );

    if (mode.dayPickerOpen || !mode.cta.showPrimary) {
      return <BottomActionSingle>{selectDayButton}</BottomActionSingle>;
    }

    return (
      <BottomActionSplit
        secondary={selectDayButton}
        primary={mode.cta.primaryLabel === "Resume Workout" ? (
          <TodayStartButton
            sessionId={inProgressSessionId ?? undefined}
            returnTo="/today"
            fullWidth
            className="w-full"
            label="Resume Workout"
          />
        ) : (
          <TodayStartButton
            selectedDayIndex={selectedDayIndex}
            routineId={progressionRoutineId ?? undefined}
            dayId={selectedDay?.id}
            returnTo="/today"
            fullWidth
            className="w-full"
          />
        )}
      />
    );
  }, [
    inProgressSessionId,
    mode.cta.primaryLabel,
    mode.cta.secondaryLabel,
    mode.cta.showPrimary,
    mode.dayPickerOpen,
    progressionRoutineId,
    selectedDay?.id,
    selectedDayIndex,
    togglePicker,
  ]);

  usePublishBottomActions(actionsNode);

  return (
    <>
      {headerNode && floatingHeaderTarget ? createPortal(headerNode, floatingHeaderTarget) : null}
      {switchHeaderNode && switchFloatingHeaderTarget ? createPortal(switchHeaderNode, switchFloatingHeaderTarget) : null}
      <div className={cn(
        "flex min-h-0 flex-col",
      )}>
        {!mode.noRoutine && selectedDay ? (
          <TodayOverviewScaffold>
            {mode.contentShellVisible ? (
              <div className={mode.dayPickerOpen ? ROUTINE_CONTENT_GAP_CLASS_NAME : "pt-0.5"}>
                {mode.dayPickerOpen ? (
                  <DayList className="space-y-[0.375rem] sm:space-y-[0.375rem]">
                    {days.map((day) => {
                      const isSelected = selectedDayIndex === day.dayIndex;
                      return (
                        <RoutineOverviewDayCard
                          key={day.id}
                          day={{
                            ...day,
                            splitSummary: getRestDayExerciseCountSummaryFromInputs(day.exercises, day.isRest),
                            isToday: day.dayIndex === currentDayIndex,
                            isCompleted: completedDayIndexSet.has(day.dayIndex),
                            isInSession: inSessionDayIndex === day.dayIndex,
                          }}
                          startDate={startDate}
                          isSelected={isSelected}
                          showSelectedTag={isSelected}
                          onPress={() => {
                            setSelectedDayIndex(day.dayIndex);
                            setIsPickerOpen(false);
                          }}
                        />
                      );
                    })}
                  </DayList>
                ) : null}

                {selectedDaySummaryNode ? (
                  <div className={shouldCenterSelectedDayState ? appTokens.todaySummaryCenteredShell : undefined}>
                    {selectedDaySummaryNode}
                  </div>
                ) : null}

                {noScheduledDayNotice ? noScheduledDayNotice : null}

                {mode.dayRowsVisible && hasSelectedDayRows ? (
                  <ul className="flex flex-col gap-[0.375rem]">
                    {selectedDay.exercises.map((exercise) => {
                      const isSelected = selectedExerciseRowId === exercise.id;
                      const isStretchHub = isStretchHubExercise(exercise);
                      const cardReadyItem = selectedDayProgressionItemByExerciseId.get(exercise.id) ?? null;
                      const cardAppliedPin = findSelectedDayAppliedPinForExercise(exercise.id);
                      const canShowCardAction = cardReadyItem?.type === "promote" || cardReadyItem?.type === "deload";
                      const cardActionPending = isCardActionPending && (
                        cardPendingItemId === cardReadyItem?.id
                        || cardPendingItemId === cardAppliedPin?.routineDayExerciseId
                      );
                      const cardProgressionAction = cardAppliedPin || canShowCardAction;
                      const cardProgressFill = deriveExerciseCardProgressFill({
                        progressFill: selectedDayProgressFillByExerciseId.get(exercise.id) ?? null,
                        candidateType: cardReadyItem?.type ?? null,
                      });
                      const cardPromoteTargetPair = cardReadyItem
                        ? resolveTodayProgressionTargetDisplayPair(cardReadyItem)
                        : null;
                      const cardActionIntent = cardReadyItem ? getTodayProgressionActionIntent(cardReadyItem) : "positive";
                      const cardActionArrowClassName = cardReadyItem ? getTodayProgressionActionArrowClassName(cardReadyItem) : "text-[rgb(var(--accent-divider-rgb)/0.95)]";
                      const resolvedSummary = isStretchHub ? null : exercise.targets;
                      const detailedMetrics = buildPlannedExerciseDetailMetrics({
                        name: exercise.name,
                        slug: exercise.slug,
                        measurementType: exercise.measurement_type,
                        isCardio: exercise.isCardio,
                        kind: exercise.kind,
                        type: exercise.type,
                        equipment: exercise.equipment,
                        movementPattern: exercise.movement_pattern,
                        primaryMuscle: exercise.primary_muscle,
                        tags: exercise.tags,
                        categories: exercise.categories,
                        targetSetsMin: exercise.targetSetsMin,
                        targetSetsMax: exercise.targetSetsMax,
                      });
                      const { policy, chips, detailedMetrics: visibleDetailedMetrics } = applyWorkoutCardSurfacePolicy({
                        surface: "today",
                        density: exerciseDensity,
                        detailedMetrics,
                      });

                      return (
                        <li key={exercise.id}>
                          <StandardExerciseRow
                            exercise={exercise}
                            variant="interactive"
                            density={exerciseDensity}
                            summary={resolvedSummary}
                            subtitleTone="plain"
                            contentClassName="pl-3"
                            onPress={() => {
                              setSelectedExerciseRowId((current) => current === exercise.id ? null : exercise.id);
                            }}
                            showLeadingVisual={policy.showMedia}
                            showAccentRail={!isStretchHub}
                            hideEmptySummary={isStretchHub}
                            progressFill={cardProgressFill.fill}
                            rightIcon={(
                              <StateChevron
                                expanded={isSelected}
                                className="h-5 w-5"
                                expandedClassName="text-[rgb(var(--success-rgb)/0.98)]"
                                collapsedClassName="text-[rgb(var(--text-muted)/0.92)]"
                              />
                            )}
                            shellClassName={isSelected || cardProgressionAction ? "rounded-b-none [border-bottom-left-radius:0px] [border-bottom-right-radius:0px]" : undefined}
                            shellStyle={isSelected || cardProgressionAction ? ({
                              "--exercise-card-progress-fill-bottom-right-radius": "0px",
                            } as CSSProperties) : undefined}
                          >
                            <WorkoutExerciseCardDetails
                              density={exerciseDensity}
                              chips={chips}
                              detailedMetrics={visibleDetailedMetrics}
                            />
                          </StandardExerciseRow>
                          {isSelected ? (
                            <AttachedCardActionStripFrame className={cardProgressionAction ? "rounded-none border-t-0" : "rounded-t-none"} gridClassName="grid-cols-1">
                              <button
                                type="button"
                                data-bottom-action-intent="toggleActive"
                                className={cn(
                                  getAttachedCardActionButtonClassName({
                                    intent: "toggleActive",
                                    className: "focus-visible:ring-[rgb(var(--accent)/0.24)]",
                                  }),
                                )}
                                onClick={() => {
                                  setExerciseInfoExerciseId(exercise.exerciseId);
                                }}
                              >
                                <span className="bottom-action__label">Inspect</span>
                              </button>
                            </AttachedCardActionStripFrame>
                          ) : null}
                          {cardProgressionAction ? (
                            <AttachedCardActionStripFrame className={isSelected ? "rounded-t-none border-t-0" : "rounded-t-none"} gridClassName="grid-cols-1">
                              <button
                                type="button"
                                disabled={cardActionPending}
                                data-action-chrome-intent={cardAppliedPin ? "neutral" : cardActionIntent}
                                data-bottom-action-intent={cardAppliedPin ? "toggleInactive" : cardActionIntent}
                                onClick={() => {
                                  if (cardActionPending) {
                                    return;
                                  }
                                  if (cardAppliedPin) {
                                    revertProgressionItemFromTodayCard(cardAppliedPin);
                                    return;
                                  }
                                  if (cardReadyItem && canShowCardAction) {
                                    openTodayCardPromotion(cardReadyItem);
                                  }
                                }}
                                className={cn(
                                  ACTION_CHROME_CONTROL_CLASS_NAME,
                                  getAttachedCardActionButtonClassName({
                                    intent: cardAppliedPin ? "toggleInactive" : cardActionIntent,
                                    className: cardReadyItem?.type === "deload"
                                      ? "focus-visible:ring-[rgb(var(--danger-rgb)/0.24)]"
                                      : "focus-visible:ring-[rgb(var(--accent)/0.24)]",
                                  }),
                                  cardActionPending ? "opacity-80" : undefined,
                                )}
                              >
                                <span className="bottom-action__label inline-flex min-w-0 items-center justify-center gap-2">
                                  {cardAppliedPin
                                    ? cardActionPending ? "Reverting..." : "Revert"
                                    : cardActionPending ? "Applying..." : (
                                      <>
                                        <span>{cardReadyItem?.actionLabel ?? "Apply update"}</span>
                                        {cardPromoteTargetPair ? (
                                          <>
                                            <SignatureMiniPipe />
                                            <AccentDotSeparatedText
                                              text={cardPromoteTargetPair.current}
                                              className="min-w-0 gap-x-1.5 gap-y-0"
                                              itemClassName="truncate text-[rgb(var(--text-secondary)/0.96)]"
                                            />
                                            <span className={cn("inline-flex min-w-4 items-center justify-center text-[12px] font-bold", cardActionArrowClassName)}>
                                              {"\u2192"}
                                            </span>
                                            <AccentDotSeparatedText
                                              text={cardPromoteTargetPair.proposed}
                                              className="min-w-0 gap-x-1.5 gap-y-0"
                                              itemClassName="truncate text-[rgb(var(--text-secondary)/0.96)]"
                                            />
                                          </>
                                        ) : null}
                                      </>
                                    )}
                                </span>
                              </button>
                            </AttachedCardActionStripFrame>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

              </div>
            ) : null}
          </TodayOverviewScaffold>
        ) : null}

        <ExerciseInfo
          exerciseId={exerciseInfoExerciseId}
          open={Boolean(exerciseInfoExerciseId)}
          onOpenChange={(open) => {
            if (!open) {
              setExerciseInfoExerciseId(null);
            }
          }}
          onClose={() => {
            setExerciseInfoExerciseId(null);
          }}
          sourceContext="TodayDayPicker"
        />
        {cardConfirmItem ? (
          <ConfirmDestructiveModal
            open
            title={getTodayProgressionActionModalTitle(cardConfirmItem)}
            titleVariant="raw"
            description="Choose which matching routine days should receive this update."
            details={cardActionError ?? undefined}
            confirmLabel={cardConfirmItem.actionLabel}
            confirmActionLabel={`${cardConfirmItem.actionLabel} selected`}
            cancelLabel="Cancel"
            confirmVariant={cardConfirmItem.type === "deload" ? "destructive" : "primary"}
            isLoading={isCardActionPending}
            confirmDisabled={cardConfirmSelectedIds.length === 0}
            onCancel={() => {
              if (isCardActionPending) {
                return;
              }
              setCardConfirmItem(null);
              setCardConfirmSelectedIds([]);
              setCardActionError(null);
            }}
            onConfirm={() => {
              if (cardConfirmSelectedIds.length === 0) {
                return;
              }
              applyProgressionItemFromTodayCard(cardConfirmItem, cardConfirmSelectedIds);
            }}
          >
            <div className="rounded-[0.9rem] border border-[rgb(var(--border-strong)/0.12)] bg-[rgb(var(--surface-2-rgb)/0.22)] p-2 text-left">
              <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-muted)/0.76)]">
                Apply to
              </p>
              <div className="grid gap-1">
                {(cardConfirmItem.linkedUpdate?.targets ?? []).map((target) => {
                  const checked = cardConfirmSelectedIds.includes(target.routineDayExerciseId);
                  return (
                    <label
                      key={target.routineDayExerciseId}
                      className="flex items-center gap-2 rounded-[0.7rem] px-2 py-1.5 text-[12px] font-semibold text-[rgb(var(--text)/0.9)]"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isCardActionPending}
                        onChange={(event) => {
                          const nextChecked = event.currentTarget.checked;
                          setCardConfirmSelectedIds((current) => (
                            nextChecked
                              ? Array.from(new Set([...current, target.routineDayExerciseId]))
                              : current.filter((id) => id !== target.routineDayExerciseId)
                          ));
                        }}
                        className="h-4 w-4 accent-[rgb(var(--accent-divider-rgb))]"
                      />
                      <span>{target.dayName}</span>
                    </label>
                  );
                })}
              </div>
              {cardConfirmSelectedIds.length === 0 ? (
                <p className="px-1 pt-1.5 text-[11px] font-semibold text-[rgb(var(--warning-rgb)/0.94)]">
                  {getTodayProgressionActionSelectionError(cardConfirmItem)}
                </p>
              ) : null}
            </div>
          </ConfirmDestructiveModal>
        ) : null}
      </div>
    </>
  );
}
