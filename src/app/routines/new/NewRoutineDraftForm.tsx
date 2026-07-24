"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { ContentRail } from "@/components/layout/ContentRail";
import { RoutineEditorTitleInput } from "@/components/routines/RoutineEditorShared";
import {
  RoutineDetailsDiscardConfirmationDock,
  useOptionalRoutineDetailsExitGuard,
} from "@/components/routines/RoutineDetailsExitGuard";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import { createRoutineAction } from "@/app/routines/actions";
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
  clearRoutineDraftSession,
} from "@/lib/routine-draft-session";
import { getRoutineStartWeekdayFromDate, getTodayDateInTimeZone } from "@/lib/routines";
import { normalizeRoutineTimezone } from "@/lib/timezones";

function createNewRoutineProgressionDraft() {
  return createProgressionPlaybookFormState({
    playbookId: "double_progression",
  });
}

type NewRoutineDraftDefaults = Omit<RoutineDetailsDraft, "distanceUnit"> & {
  distanceUnit?: string;
};

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
    return normalizeRoutineTimezone(fallback);
  }

  const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
  return normalizeRoutineTimezone(resolved || fallback);
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

function buildCreateRoutineFormData(args: {
  draft: RoutineDetailsDraft;
  trimmedRoutineName: string;
  previewDayCount: number;
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
  formData.set("previewDays", JSON.stringify(Array.from({ length: args.previewDayCount }, () => ({ isRest: false }))));
  appendProgressionPlaybookFormData(formData, createNewRoutineProgressionDraft());
  return formData;
}

export function NewRoutineDraftForm({
  defaults,
  existingRoutineNames = [],
  existingWorkoutPlanNames = [],
  embedded = false,
  onCancel,
  onCreated,
}: {
  defaults: NewRoutineDraftDefaults;
  existingRoutineNames?: Array<string | null | undefined>;
  existingWorkoutPlanNames?: Array<string | null | undefined>;
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
  const loadedDraftFromStorageRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, startTransition] = useTransition();

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

  const validation = validateRoutineDetailsDraft(draft);
  const initialSnapshot = buildRoutineDetailsSnapshot(normalizedDefaults);
  const currentSnapshot = buildRoutineDetailsSnapshot(draft);
  const isDirty = currentSnapshot !== initialSnapshot;
  const hasDirtyChanges = hasUserEdited && isDirty;
  const routineNameConflict = hasRoutineNameConflict({
    candidateName: draft.name,
    routineNames: existingRoutineNames,
    workoutPlanNames: existingWorkoutPlanNames,
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

  const commitCycleLengthInput = useCallback(() => {
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
  }, [cycleLengthInput, draft]);

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

  const submitRoutineDraft = useCallback(async () => {
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
      workoutPlanNames: existingWorkoutPlanNames,
    })) {
      const nextError = "Routine name already exists.";
      setError(nextError);
      toast.error(nextError);
      return;
    }

    const formData = buildCreateRoutineFormData({
      draft: nextDraft,
      trimmedRoutineName: nextDraft.name.trim().slice(0, 15),
      previewDayCount: Math.max(1, Math.min(31, nextDraft.cycleLengthDays)),
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

    clearRoutineDraftSession();
    window.localStorage.removeItem(ROUTINE_NEW_LOCAL_DRAFT_STORAGE_KEY);
    toast.success("Routine created");

    if (embedded && onCreated) {
      onCreated(result.routineId);
      return;
    }

    router.push("/routines");
  }, [commitCycleLengthInput, embedded, existingRoutineNames, existingWorkoutPlanNames, onCreated, router, toast]);

  const handleCreateRoutine = () => {
    startTransition(async () => {
      await submitRoutineDraft();
    });
  };

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
            fields={["cycleLengthDays", "scheduleMode", "startWeekday", "timezone", "weightUnit", "distanceUnit"]}
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
