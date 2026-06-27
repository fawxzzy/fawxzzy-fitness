"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { ContentRail } from "@/components/layout/ContentRail";
import { DayList } from "@/components/day-list/DayList";
import {
  ROUTINE_CONTENT_GAP_CLASS_NAME,
  RoutineOverviewDayCard,
  type RoutineOverviewDayCardItem,
} from "@/components/day-list/RoutineDayCardPresentation";
import { RoutineEditorTitleInput } from "@/components/routines/RoutineEditorShared";
import { RoutinesPageScaffold, SharedDayListSection } from "@/components/routines/RoutinesScreenFamily";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import {
  RoutineDetailsDiscardConfirmationDock,
  useOptionalRoutineDetailsExitGuard,
} from "@/components/routines/RoutineDetailsExitGuard";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { appTokens } from "@/components/ui/app/tokens";
import { ReorderHandleGlyph } from "@/components/ui/ReorderHandleGlyph";
import { useToast } from "@/components/ui/ToastProvider";
import { createRoutineAction } from "@/app/routines/actions";
import { getBottomActionButtonClassName } from "@/components/layout/bottomActionIntents";
import {
  buildRoutineDetailsSnapshot,
  commitRoutineCycleLengthInput,
  normalizeRoutineDetailsDraft,
  validateRoutineDetailsDraft,
  type RoutineDetailsDraft,
} from "@/lib/routine-details-form";
import { RoutineDetailsSaveState } from "@/components/routines/RoutineDetailsFormState";
import {
  appendProgressionPlaybookFormData,
  createProgressionPlaybookFormState,
} from "@/lib/progression-playbook-form-state";
import { hasRoutineNameConflict } from "@/lib/routine-name-conflicts";
import {
  ROUTINE_NEW_LOCAL_DRAFT_STORAGE_KEY,
  writePendingWorkoutPlanChooserDayIndex,
  clearRoutineDraftSession,
  writeRoutineDraftSession,
} from "@/lib/routine-draft-session";
import { getRoutineHomeHref } from "@/lib/routine-day-navigation";
import { getRoutineDayResolvedWeekdayLabel, getRoutineStartWeekdayFromDate, getTodayDateInTimeZone } from "@/lib/routines";
import { cn } from "@/lib/cn";

function createNewRoutineProgressionDraft() {
  return createProgressionPlaybookFormState({
    playbookId: "double_progression",
  });
}

type NewRoutineDraftDefaults = Omit<RoutineDetailsDraft, "distanceUnit"> & {
  distanceUnit?: string;
};

type NewRoutinePreviewDay = RoutineOverviewDayCardItem & {
  id: string;
};

type NewRoutinePreviewDaySeed = {
  id: string;
  isRest: boolean;
};

type DragState = {
  id: string;
  pointerId: number;
};

const NEW_ROUTINE_PREVIEW_TOGGLE_ACTION_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "toggleInactive",
  className: "!border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)]",
});
const NEW_ROUTINE_PREVIEW_EDIT_ACTION_BUTTON_CLASS_NAME = getAttachedCardActionButtonClassName({
  intent: "positive",
  className: "translate-x-px !border-l-0 focus-visible:ring-[rgb(var(--accent)/0.24)]",
});
const NEW_ROUTINE_PREVIEW_DELETE_PILL_CLASS_NAME = cn(
  getBottomActionButtonClassName({
    intent: "danger",
    fullWidth: false,
    className: "!h-6 !min-h-0 rounded-full !px-4 text-[12px] font-semibold tracking-[0.04em]",
  }),
  "shrink-0 self-center",
);
const NEW_ROUTINE_PREVIEW_CORNER_DELETE_PILL_CLASS_NAME = cn(
  NEW_ROUTINE_PREVIEW_DELETE_PILL_CLASS_NAME,
  "!rounded-tl-[0.5rem] !rounded-tr-none !rounded-bl-none !rounded-br-none",
  "!border-[rgb(var(--danger-rgb)/0.98)] !bg-[linear-gradient(180deg,rgb(var(--danger-rgb)/0.98),rgb(132_31_31/0.98))] !text-[rgb(255_245_245)] shadow-[0_2px_10px_rgb(var(--danger-rgb)/0.16)]",
);
const NEW_ROUTINE_PREVIEW_REORDER_HANDLE_CLASS_NAME = cn(
  appTokens.routineEditorReorderHandle,
  "relative z-[2] h-7 w-7 rounded-[0.72rem] border-[rgb(var(--selection-rgb)/0.28)] bg-[linear-gradient(180deg,rgb(var(--selection-rgb)/0.08),rgb(var(--surface-1-rgb)/0.36))] text-[rgb(var(--text-primary)/0.94)] shadow-[0_0_0_1px_rgb(var(--selection-rgb)/0.06),0_0_16px_rgb(var(--selection-rgb)/0.12)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--selection-rgb)/0.22)]",
);
const NEW_ROUTINE_PREVIEW_CHEVRON_RAIL_CLASS_NAME = "!right-[0.38rem] !top-auto !bottom-[0.58rem] !translate-y-0 !min-w-0";

function resolveRoutineDraftFieldValue(field: string, value: string) {
  if (field === "name") {
    return value.slice(0, 15);
  }

  return value;
}

function resolveSteppedCycleLength(nextValue: string, fallback: number) {
  const parsed = Number.parseInt(nextValue, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(365, Math.max(1, parsed || fallback));
}

function getDeviceTimezone(fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
  return resolved || fallback;
}

function buildEmptyRoutinePreviewDays(args: {
  seeds: NewRoutinePreviewDaySeed[];
  scheduleMode: RoutineDetailsDraft["scheduleMode"];
  startDate: string;
  timezone: string;
}): NewRoutinePreviewDay[] {
  const safeCycleLength = Math.max(1, Math.min(31, args.seeds.length));

  return args.seeds.map((seed, index) => {
    const dayIndex = index + 1;

    return {
      id: seed.id,
      dayIndex,
      title: seed.isRest ? "Rest Day" : `Day ${dayIndex}`,
      occurrenceWeekday: getRoutineDayResolvedWeekdayLabel({
        dayIndex,
        startDate: args.startDate,
        cycleLengthDays: safeCycleLength,
        scheduleMode: args.scheduleMode,
        profileTimeZone: args.timezone,
        referenceDate: args.startDate,
        weekday: "short",
      }),
      isRest: seed.isRest,
      splitSummary: {
        total: 0,
        strength: 0,
        cardio: 0,
        bodyweight: 0,
        unknown: 0,
      },
      exerciseSummary: seed.isRest ? "No exercises" : "No exercises yet",
      isToday: false,
      isCompleted: false,
      isSkipped: false,
      isInSession: false,
      recapExercises: [],
      remainingExerciseCount: 0,
    };
  });
}

function getCreateRoutineButtonLabel(args: {
  isSaving: boolean;
  trimmedRoutineName: string;
  routineNameConflict: boolean;
  validationError: string | null;
  canCreate: boolean;
}) {
  if (args.isSaving) {
    return "Creating routine...";
  }

  if (args.canCreate) {
    return "Create routine";
  }

  if (!args.trimmedRoutineName) {
    return "Enter routine name";
  }

  if (args.routineNameConflict) {
    return "Routine name exists";
  }

  switch (args.validationError) {
    case "Cycle start date is required.":
      return "Set cycle start date";
    case "Timezone is required.":
      return "Set time zone";
    case "Cycle length must be between 1 and 365.":
      return "Set routine length";
    case "Weight unit must be lbs or kg.":
      return "Set weight label";
    case "Distance unit must be mi or km.":
      return "Set distance label";
    case "Schedule mode must be week-based or day-based.":
      return "Set routine type";
    default:
      return "Complete routine setup";
  }
}

function createPreviewDaySeeds(count: number, nextIdRef: { current: number }) {
  return Array.from({ length: count }, () => ({
    id: `draft-day-${nextIdRef.current++}`,
    isRest: false,
  })) satisfies NewRoutinePreviewDaySeed[];
}

function buildCreateRoutineFormData(args: {
  draft: RoutineDetailsDraft;
  trimmedRoutineName: string;
  previewDaySeeds: NewRoutinePreviewDaySeed[];
}) {
  const formData = new FormData();
  formData.set("name", args.trimmedRoutineName);
  formData.set("cycleLengthDays", String(args.draft.cycleLengthDays));
  formData.set("scheduleMode", args.draft.scheduleMode);
  formData.set("startDate", args.draft.startDate);
  formData.set("startWeekday", args.draft.startWeekday);
  formData.set("timezone", getDeviceTimezone(args.draft.timezone));
  formData.set("weightUnit", args.draft.weightUnit);
  formData.set("distanceUnit", args.draft.distanceUnit);
  formData.set("previewDays", JSON.stringify(args.previewDaySeeds.map((seed) => ({
    isRest: seed.isRest,
  }))));
  appendProgressionPlaybookFormData(formData, createNewRoutineProgressionDraft());
  return formData;
}

export function NewRoutineDraftForm({
  defaults,
  existingRoutineNames = [],
  existingTemplateNames = [],
  embedded = false,
  onCancel,
  onCreated,
}: {
  defaults: NewRoutineDraftDefaults;
  existingRoutineNames?: Array<string | null | undefined>;
  existingTemplateNames?: Array<string | null | undefined>;
  embedded?: boolean;
  onCancel?: () => void;
  onCreated?: (routineId: string) => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const exitGuard = useOptionalRoutineDetailsExitGuard();
  const normalizedDefaults = useMemo(
    () => normalizeRoutineDetailsDraft(defaults, {
      name: defaults.name,
      cycleLengthDays: defaults.cycleLengthDays,
      scheduleMode: defaults.scheduleMode,
      startDate: defaults.startDate,
      startWeekday: defaults.startWeekday,
      timezone: defaults.timezone,
      weightUnit: defaults.weightUnit,
      distanceUnit: defaults.distanceUnit === "km" ? "km" : "mi",
    }),
    [defaults],
  );
  const [draft, setDraft] = useState<RoutineDetailsDraft>(normalizedDefaults);
  const [cycleLengthInput, setCycleLengthInput] = useState(() => String(normalizedDefaults.cycleLengthDays));
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmbeddedConfirmingDiscard, setIsEmbeddedConfirmingDiscard] = useState(false);
  const [expandedPreviewDayId, setExpandedPreviewDayId] = useState<string | null>(null);
  const nextPreviewDayIdRef = useRef(1);
  const [previewDaySeeds, setPreviewDaySeeds] = useState<NewRoutinePreviewDaySeed[]>(
    () => createPreviewDaySeeds(normalizedDefaults.cycleLengthDays, nextPreviewDayIdRef),
  );
  const [previewDayPendingDelete, setPreviewDayPendingDelete] = useState<NewRoutinePreviewDaySeed | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const previewDaySeedsRef = useRef(previewDaySeeds);
  const loadedDraftFromStorageRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, startTransition] = useTransition();

  useEffect(() => {
    previewDaySeedsRef.current = previewDaySeeds;
  }, [previewDaySeeds]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ROUTINE_NEW_LOCAL_DRAFT_STORAGE_KEY);
      if (raw) {
        loadedDraftFromStorageRef.current = true;
        const parsed = JSON.parse(raw) as Partial<RoutineDetailsDraft>;
        const normalizedParsed = normalizeRoutineDetailsDraft(parsed, normalizedDefaults);
        const shouldResetStartWeekday =
          normalizedParsed.name.trim().length === 0
          && normalizedParsed.cycleLengthDays === normalizedDefaults.cycleLengthDays;
        const nextDraft = {
          ...normalizedParsed,
          startDate: shouldResetStartWeekday ? normalizedDefaults.startDate : normalizedParsed.startDate,
          startWeekday: shouldResetStartWeekday ? normalizedDefaults.startWeekday : normalizedParsed.startWeekday,
        };
        setDraft(nextDraft);
        setCycleLengthInput(String(nextDraft.cycleLengthDays));
      }
    } catch {
      // ignore malformed local drafts
    }
    setLoadedDraft(true);
  }, [normalizedDefaults]);

  useEffect(() => {
    if (!loadedDraft || hasUserEdited || loadedDraftFromStorageRef.current) {
      return;
    }

    const deviceTimezone = getDeviceTimezone(draft.timezone);
    const deviceStartDate = getTodayDateInTimeZone(deviceTimezone);
    const deviceStartWeekday = getRoutineStartWeekdayFromDate(deviceStartDate) ?? draft.startWeekday;

    if (
      draft.timezone === deviceTimezone
      && draft.startDate === deviceStartDate
      && draft.startWeekday === deviceStartWeekday
    ) {
      return;
    }

    setDraft((current) => ({
      ...current,
      timezone: deviceTimezone,
      startDate: deviceStartDate,
      startWeekday: deviceStartWeekday,
    }));
  }, [draft.startDate, draft.startWeekday, draft.timezone, hasUserEdited, loadedDraft]);

  useEffect(() => {
    if (!loadedDraft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(ROUTINE_NEW_LOCAL_DRAFT_STORAGE_KEY, JSON.stringify(draft));
        setError(null);
      } catch {
        setError("Could not save local draft.");
        toast.error("Could not save local draft.");
      }
    }, 400);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, loadedDraft, toast]);

  useEffect(() => {
    setCycleLengthInput(String(draft.cycleLengthDays));
  }, [draft.cycleLengthDays]);

  useEffect(() => {
    setPreviewDaySeeds((current) => {
      const targetLength = Math.max(1, Math.min(31, draft.cycleLengthDays));
      if (current.length === targetLength) {
        return current;
      }

      if (current.length < targetLength) {
        return [...current, ...createPreviewDaySeeds(targetLength - current.length, nextPreviewDayIdRef)];
      }

      return current.slice(0, targetLength);
    });
  }, [draft.cycleLengthDays]);

  const validation = validateRoutineDetailsDraft(draft);
  const initialSnapshot = buildRoutineDetailsSnapshot(normalizedDefaults);
  const currentSnapshot = buildRoutineDetailsSnapshot(draft);
  const isDirty = currentSnapshot !== initialSnapshot;
  const hasDirtyChanges = hasUserEdited && isDirty;
  const routineNameConflict = hasRoutineNameConflict({
    candidateName: draft.name,
    routineNames: existingRoutineNames,
    templateNames: existingTemplateNames,
  });
  const canCreate = validation.valid && !routineNameConflict && isDirty && !isSaving;
  const isUsingExitGuard = !embedded && Boolean(exitGuard);
  const isConfirmingDiscard = isUsingExitGuard ? Boolean(exitGuard?.isConfirmingDiscard) : isEmbeddedConfirmingDiscard;
  const trimmedRoutineName = draft.name.trim().slice(0, 15);
  const isRoutineNameInvalid = trimmedRoutineName.length === 0 || routineNameConflict;
  const createRoutineButtonLabel = getCreateRoutineButtonLabel({
    isSaving,
    trimmedRoutineName,
    routineNameConflict,
    validationError: validation.error,
    canCreate,
  });
  const previewDays = useMemo(() => buildEmptyRoutinePreviewDays({
    seeds: previewDaySeeds,
    scheduleMode: draft.scheduleMode,
    startDate: draft.startDate,
    timezone: getDeviceTimezone(draft.timezone),
  }), [draft.scheduleMode, draft.startDate, draft.timezone, previewDaySeeds]);
  const routineHeaderTitle = useMemo(() => (
    <div data-app-header-raw-title="true" className="mx-auto block w-fit max-w-full">
      <RoutineEditorTitleInput
        name="name"
        value={draft.name}
        onChange={(nextValue) => {
          setHasUserEdited(true);
          setDraft((current) => ({
            ...current,
            name: resolveRoutineDraftFieldValue("name", nextValue),
          }));
        }}
        placeholder="Enter Routine Name"
        ariaLabel="Routine Name"
        maxLength={15}
        className="text-center"
        hideLabel
        plainShell
        invalid={isRoutineNameInvalid}
      />
    </div>
  ), [draft.name, isRoutineNameInvalid]);

  useEffect(() => {
    if (!isUsingExitGuard) {
      return;
    }

    exitGuard?.setHeaderTitle(routineHeaderTitle);
  }, [exitGuard, isUsingExitGuard, routineHeaderTitle]);

  useEffect(() => {
    if (!isUsingExitGuard) {
      return;
    }

    exitGuard?.setHasUnsavedChanges(hasDirtyChanges);
  }, [exitGuard, hasDirtyChanges, isUsingExitGuard]);

  useEffect(() => {
    if (!hasDirtyChanges) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [hasDirtyChanges]);

  const commitCycleLengthInput = () => {
    const committedCycleLength = commitRoutineCycleLengthInput(cycleLengthInput, draft.cycleLengthDays);
    const nextDraft =
      committedCycleLength.cycleLengthDays === draft.cycleLengthDays
        ? draft
        : { ...draft, cycleLengthDays: committedCycleLength.cycleLengthDays };

    setCycleLengthInput(committedCycleLength.inputValue);
    if (nextDraft !== draft) {
      setHasUserEdited(true);
      setDraft(nextDraft);
    }

    return nextDraft;
  };

  const movePreviewDayWithinList = useCallback((currentDays: NewRoutinePreviewDaySeed[], fromIndex: number, toIndex: number) => {
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

  const movePreviewDay = useCallback((draggedId: string, targetId: string) => {
    if (draggedId === targetId) {
      return;
    }

    setPreviewDaySeeds((current) => {
      const fromIndex = current.findIndex((day) => day.id === draggedId);
      const toIndex = current.findIndex((day) => day.id === targetId);
      return movePreviewDayWithinList(current, fromIndex, toIndex);
    });
  }, [movePreviewDayWithinList]);

  const finishPreviewReorder = useCallback(() => {
    setActiveDragId(null);
    dragStateRef.current = null;
  }, []);

  const handlePreviewReorderHandlePointerDown = useCallback((dayId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    setExpandedPreviewDayId(null);
    dragStateRef.current = { id: dayId, pointerId: event.pointerId };
    setActiveDragId(dayId);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  }, []);

  const handlePreviewReorderHandlePointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const elementBelow = document.elementFromPoint(event.clientX, event.clientY);
    const row = elementBelow?.closest("[data-new-routine-preview-day-id]") as HTMLElement | null;
    const targetId = row?.dataset.newRoutinePreviewDayId;
    if (targetId) {
      movePreviewDay(dragState.id, targetId);
    }

    event.stopPropagation();
    event.preventDefault();
  }, [movePreviewDay]);

  const handlePreviewReorderHandlePointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    event.stopPropagation();
    finishPreviewReorder();
  }, [finishPreviewReorder]);

  const handleConfirmDeletePreviewDay = useCallback(() => {
    const day = previewDayPendingDelete;
    if (!day) {
      return;
    }

    setPreviewDaySeeds((current) => current.filter((currentDay) => currentDay.id !== day.id));
    setPreviewDayPendingDelete(null);
    setExpandedPreviewDayId((current) => (current === day.id ? null : current));
    setDraft((current) => ({
      ...current,
      cycleLengthDays: Math.max(1, current.cycleLengthDays - 1),
    }));
    setCycleLengthInput((current) => {
      const parsed = Number.parseInt(current, 10);
      const nextValue = Number.isFinite(parsed) ? Math.max(1, parsed - 1) : Math.max(1, draft.cycleLengthDays - 1);
      return String(nextValue);
    });
  }, [draft.cycleLengthDays, previewDayPendingDelete]);

  const handleRequestCancel = () => {
    if (!hasDirtyChanges) {
      if (isUsingExitGuard) {
        exitGuard?.requestExit();
      } else {
        onCancel?.();
      }
      return;
    }

    if (isUsingExitGuard) {
      exitGuard?.requestExit();
      return;
    }

    setIsEmbeddedConfirmingDiscard(true);
  };

  const handleDiscardEmbeddedDraft = () => {
    setIsEmbeddedConfirmingDiscard(false);
    onCancel?.();
  };

  const handleStayOnEmbeddedDraft = () => {
    setIsEmbeddedConfirmingDiscard(false);
  };

  const submitRoutineDraft = useCallback(async (targetPreviewDayId?: string | null) => {
    setError(null);
    const nextDraft = commitCycleLengthInput();
    const nextValidation = validateRoutineDetailsDraft(nextDraft);
    if (!nextValidation.valid) {
      const nextError = nextValidation.error ?? "Please complete all required routine fields.";
      setError(nextError);
      toast.error(nextError);
      return;
    }
    if (hasRoutineNameConflict({
      candidateName: nextDraft.name,
      routineNames: existingRoutineNames,
      templateNames: existingTemplateNames,
    })) {
      const nextError = "Routine name already exists.";
      setError(nextError);
      toast.error(nextError);
      return;
    }

    const orderedPreviewSeeds = previewDaySeedsRef.current.slice(0, nextDraft.cycleLengthDays);
    const formData = buildCreateRoutineFormData({
      draft: nextDraft,
      trimmedRoutineName: nextDraft.name.trim().slice(0, 15),
      previewDaySeeds: orderedPreviewSeeds,
    });
    const result = await createRoutineAction(formData);
    if (!result.ok) {
      const nextError = result.error ?? "Could not create routine.";
      setError(nextError);
      toast.error(nextError);
      return;
    }
    if (!result.routineId) {
      const nextError = "Could not create routine.";
      setError(nextError);
      toast.error(nextError);
      return;
    }

    if (targetPreviewDayId) {
      writeRoutineDraftSession(result.routineId, nextDraft.name.trim().slice(0, 15));
      window.localStorage.removeItem(ROUTINE_NEW_LOCAL_DRAFT_STORAGE_KEY);
      const targetDayIndex = orderedPreviewSeeds.findIndex((seed) => seed.id === targetPreviewDayId) + 1;
      toast.success("Routine draft created");
      writePendingWorkoutPlanChooserDayIndex(targetDayIndex);
      router.refresh();
      return;
    }

    clearRoutineDraftSession();
    window.localStorage.removeItem(ROUTINE_NEW_LOCAL_DRAFT_STORAGE_KEY);
    toast.success("Routine created");

    if (embedded && onCreated) {
      onCreated(result.routineId);
      return;
    }

    router.push("/routines");
  }, [commitCycleLengthInput, embedded, existingRoutineNames, existingTemplateNames, onCreated, router, toast]);

  const handleCreateRoutine = () => {
    startTransition(async () => {
      await submitRoutineDraft();
    });
  };

  const handleOpenPreviewWorkoutPlan = useCallback((targetPreviewDayId: string) => {
    startTransition(async () => {
      await submitRoutineDraft(targetPreviewDayId);
    });
  }, [submitRoutineDraft]);

  const localEmbeddedFooter = (
    <div className="border-t border-[rgb(var(--border-strong)/0.14)] px-4 pb-4 pt-3">
      <BottomActionSingle>
          <BottomDockButton
            type="button"
            intent="positive"
            disabled={!canCreate}
            onClick={handleCreateRoutine}
          >
            {createRoutineButtonLabel}
          </BottomDockButton>
      </BottomActionSingle>
    </div>
  );

  return (
    <>
      <ContentRail className="space-y-3">
        <div className="space-y-2 pt-4">
          {embedded ? (
            <div className="px-1 pb-2">
              {routineHeaderTitle}
            </div>
          ) : null}
          <RoutineEditorFormFields
            fields={["cycleLengthDays", "scheduleMode", "startWeekday", "weightUnit", "distanceUnit"]}
            showCycleSection
            sectionsDefaultExpanded
            cycleLengthInputValue={cycleLengthInput}
            cycleLengthDefaultValue={draft.cycleLengthDays}
            scheduleModeDefaultValue={draft.scheduleMode}
            startDateDefaultValue={draft.startDate}
            startWeekdayDefaultValue={draft.startWeekday}
            timezoneDefaultValue={draft.timezone}
            weightUnitDefaultValue={draft.weightUnit}
            distanceUnitDefaultValue={draft.distanceUnit}
            values={draft}
            onCycleLengthInputChange={(value) => {
              setHasUserEdited(true);
              setCycleLengthInput(value);
            }}
            onCycleLengthInputCommit={commitCycleLengthInput}
            onCycleLengthStepChange={(nextValue) => {
              setHasUserEdited(true);
              setCycleLengthInput(nextValue);
              setDraft((current) => ({
                ...current,
                cycleLengthDays: resolveSteppedCycleLength(nextValue, current.cycleLengthDays),
              }));
            }}
            onFieldChange={(field, value) => {
              setHasUserEdited(true);
              setDraft((current) => ({
                ...current,
                [field]: resolveRoutineDraftFieldValue(field, value),
              }));
            }}
          />
          <RoutineDetailsSaveState error={error} />
        </div>

        <RoutinesPageScaffold>
          <SharedDayListSection>
            <div className={ROUTINE_CONTENT_GAP_CLASS_NAME}>
              <DayList className="space-y-[0.375rem] sm:space-y-[0.375rem]">
                {previewDays.map((day) => (
                  <RoutineOverviewDayCard
                    key={day.id}
                    day={day}
                    startDate={draft.startDate}
                    isExpanded={expandedPreviewDayId === day.id}
                    rightRailClassName={NEW_ROUTINE_PREVIEW_CHEVRON_RAIL_CLASS_NAME}
                    onPress={() => {
                      setExpandedPreviewDayId((current) => (current === day.id ? null : day.id));
                    }}
                    wrapper={(card) => {
                      const displayIsRest = day.isRest;

                      return (
                        <div className="relative min-w-0" data-new-routine-preview-day-id={day.id}>
                          {previewDays.length > 1 ? (
                            <div className="pointer-events-none absolute right-[0.22rem] top-[0.1rem] z-[7]">
                              <div className="pointer-events-auto">
                                <button
                                  type="button"
                                  aria-label={`Reorder ${day.title ?? `Workout plan ${day.dayIndex}`}`}
                                  title="Drag to reorder"
                                  className={cn(
                                    NEW_ROUTINE_PREVIEW_REORDER_HANDLE_CLASS_NAME,
                                    "touch-none",
                                    activeDragId === day.id ? "ring-2 ring-[rgb(var(--selection-rgb)/0.26)]" : undefined,
                                  )}
                                  onPointerDown={(event) => handlePreviewReorderHandlePointerDown(day.id, event)}
                                  onPointerMove={handlePreviewReorderHandlePointerMove}
                                  onPointerUp={handlePreviewReorderHandlePointerUp}
                                  onPointerCancel={finishPreviewReorder}
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                  }}
                                >
                                  <ReorderHandleGlyph className={appTokens.routineEditorHandleGlyph} />
                                </button>
                              </div>
                            </div>
                          ) : null}
                          <div className="pointer-events-none absolute left-[8px] top-px z-[4]">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setPreviewDayPendingDelete(previewDaySeedsRef.current.find((seed) => seed.id === day.id) ?? null);
                              }}
                              disabled={previewDays.length <= 1}
                              aria-label={`Delete ${day.title ?? `workout plan ${day.dayIndex}`}`}
                              data-bottom-action-intent="danger"
                              className={cn(
                                NEW_ROUTINE_PREVIEW_CORNER_DELETE_PILL_CLASS_NAME,
                                "pointer-events-auto",
                                previewDays.length <= 1 ? "opacity-45" : undefined,
                              )}
                            >
                              <span className="bottom-action__label">Delete</span>
                            </button>
                          </div>
                          {card}
                          {expandedPreviewDayId === day.id ? (
                            <AttachedCardActionStripFrame gridClassName={displayIsRest ? "grid-cols-1" : "grid-cols-[minmax(112px,0.92fr)_minmax(0,1.78fr)]"}>
                              <button
                                type="button"
                                data-bottom-action-intent={displayIsRest ? "toggleActive" : "toggleInactive"}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setPreviewDaySeeds((current) => current.map((seed) => seed.id === day.id
                                    ? { ...seed, isRest: !displayIsRest }
                                    : seed));
                                }}
                                aria-pressed={displayIsRest}
                                className={displayIsRest
                                  ? getAttachedCardActionButtonClassName({ intent: "toggleActive" })
                                  : NEW_ROUTINE_PREVIEW_TOGGLE_ACTION_BUTTON_CLASS_NAME}
                              >
                                <span className="bottom-action__label">{displayIsRest ? "Set Training" : "Set Rest"}</span>
                              </button>
                              {!displayIsRest ? (
                                <button
                                  type="button"
                                  data-bottom-action-intent="positive"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleOpenPreviewWorkoutPlan(day.id);
                                  }}
                                  className={NEW_ROUTINE_PREVIEW_EDIT_ACTION_BUTTON_CLASS_NAME}
                                >
                                  <span className="bottom-action__label">Create</span>
                                </button>
                              ) : null}
                            </AttachedCardActionStripFrame>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                ))}
              </DayList>
            </div>
          </SharedDayListSection>
        </RoutinesPageScaffold>
      </ContentRail>

      {isConfirmingDiscard ? (
        isUsingExitGuard ? (
          <RoutineDetailsDiscardConfirmationDock />
        ) : (
          <ConfirmDestructiveModal
            open
            title="Discard changes?"
            confirmLabel="Discard"
            onCancel={handleStayOnEmbeddedDraft}
            onConfirm={handleDiscardEmbeddedDraft}
          />
        )
      ) : previewDayPendingDelete ? (
        <ConfirmDestructiveModal
          open
          title="Confirm delete"
          confirmLabel="Delete"
          onCancel={() => setPreviewDayPendingDelete(null)}
          onConfirm={handleConfirmDeletePreviewDay}
        />
      ) : embedded ? (
        localEmbeddedFooter
      ) : (
        <PublishBottomActions>
          <BottomActionSingle>
            <BottomDockButton
              type="button"
              intent="positive"
              disabled={!canCreate}
              onClick={handleCreateRoutine}
            >
              {createRoutineButtonLabel}
            </BottomDockButton>
          </BottomActionSingle>
        </PublishBottomActions>
      )}
    </>
  );
}
