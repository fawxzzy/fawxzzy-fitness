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
import {
  RoutineEditorCycleAnchorField,
  RoutineEditorCycleLengthField,
  RoutineEditorFormFields,
} from "@/components/routines/RoutineEditorForm";
import { ChipButton } from "@/components/ui/Chip";
import { MoreOptionsDisclosure, OptionSwitchRow } from "@/components/ui/measurements/OptionControls";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import { CardHeader, CardMeta, CardSurface } from "@/components/ui/card-system";
import { getRoutineLimitNoticeCopy, isRoutineLimitError } from "@/app/routines/routine-copy";
import { createRoutineWithDaysAction } from "@/app/routines/new/create-with-days-action";
import {
  DEFAULT_TRAINING_WEEKDAYS,
  TRAINING_WEEKDAY_CHIPS,
  describeTrainingWeekdays,
  normalizeTrainingWeekdays,
} from "@/app/routines/new/training-days";
import {
  buildRoutineDetailsSnapshot,
  commitRoutineCycleLengthInput,
  normalizeRoutineDetailsDraft,
  validateRoutineDetailsDraft,
  type RoutineDetailsDraft,
} from "@/lib/routine-details-form";
import { hasRoutineNameConflict } from "@/lib/routine-name-conflicts";
import {
  ROUTINE_NEW_LOCAL_DRAFT_STORAGE_KEY,
  clearRoutineDraftSession,
} from "@/lib/routine-draft-session";
import { getRoutineStartWeekdayFromDate, getTodayDateInTimeZone, type RoutineStartWeekday } from "@/lib/routines";
import { normalizeRoutineTimezone } from "@/lib/timezones";

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

// Dock labels stay short (DESIGN C12: 14 characters or fewer) and say what is missing.
function getCreateRoutineButtonLabel(args: {
  isSaving: boolean;
  trimmedRoutineName: string;
  routineNameConflict: boolean;
  validationError: string | null;
  hasTrainingDays: boolean;
  canCreate: boolean;
  limitReached?: boolean;
}) {
  if (args.isSaving) return "Creating...";
  if (args.limitReached) return "Limit reached";
  if (args.canCreate) return "Create";
  if (!args.trimmedRoutineName) return "Add a name";
  if (args.routineNameConflict) return "Name taken";
  if (!args.hasTrainingDays) return "Pick a day";
  switch (args.validationError) {
    case "Cycle start date is required.":
      return "Set start date";
    case "Timezone is required.":
      return "Set time zone";
    case "Cycle length must be between 1 and 365.":
      return "Set day count";
    default:
      return "Create";
  }
}

function buildCreateRoutineWithDaysFormData(args: {
  draft: RoutineDetailsDraft;
  trimmedRoutineName: string;
  trainingWeekdays: readonly RoutineStartWeekday[];
}) {
  const formData = new FormData();
  formData.set("name", args.trimmedRoutineName);
  formData.set("scheduleMode", args.draft.scheduleMode);
  formData.set("cycleLengthDays", String(args.draft.cycleLengthDays));
  formData.set("startDate", args.draft.startDate);
  formData.set("timezone", getDeviceTimezone(args.draft.timezone));
  formData.set("weightUnit", args.draft.weightUnit);
  formData.set("distanceUnit", args.draft.distanceUnit);
  formData.set("trainingWeekdays", JSON.stringify(args.trainingWeekdays));
  return formData;
}

function readStoredTrainingWeekdays(raw: unknown) {
  return Array.isArray(raw) ? normalizeTrainingWeekdays(raw) : null;
}

export function NewRoutineDraftForm({
  defaults,
  existingRoutineNames = [],
  existingWorkoutPlanNames = [],
  embedded = false,
  routineLimit = null,
  onCancel,
  onCreated,
}: {
  defaults: NewRoutineDraftDefaults;
  existingRoutineNames?: Array<string | null | undefined>;
  existingWorkoutPlanNames?: Array<string | null | undefined>;
  embedded?: boolean;
  /** Free-plan cap reached (resolved on the server before render): one notice with an upgrade link, Create disabled. */
  routineLimit?: { message: string; upgradeHref: string } | null;
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
  const [trainingWeekdays, setTrainingWeekdays] = useState<RoutineStartWeekday[]>(() => [...DEFAULT_TRAINING_WEEKDAYS]);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState(false);
  // The name field shows its invalid state only after the user types in it or tries to create (no red on a pristine form).
  const [hasTouchedName, setHasTouchedName] = useState(false);
  const [isEmbeddedConfirmingDiscard, setIsEmbeddedConfirmingDiscard] = useState(false);
  const loadedDraftFromStorageRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ROUTINE_NEW_LOCAL_DRAFT_STORAGE_KEY);
      if (raw) {
        loadedDraftFromStorageRef.current = true;
        const parsed = JSON.parse(raw) as Partial<RoutineDetailsDraft> & { trainingWeekdays?: unknown };
        const storedTrainingWeekdays = readStoredTrainingWeekdays(parsed.trainingWeekdays);
        if (storedTrainingWeekdays) setTrainingWeekdays(storedTrainingWeekdays);
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
        window.localStorage.setItem(ROUTINE_NEW_LOCAL_DRAFT_STORAGE_KEY, JSON.stringify({ ...draft, trainingWeekdays }));
      } catch {
        toast.error("Could not save local draft.");
      }
    }, 400);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, loadedDraft, toast, trainingWeekdays]);

  useEffect(() => {
    setCycleLengthInput(String(draft.cycleLengthDays));
  }, [draft.cycleLengthDays]);

  const validation = validateRoutineDetailsDraft(draft);
  const initialSnapshot = buildRoutineDetailsSnapshot(normalizedDefaults);
  const currentSnapshot = buildRoutineDetailsSnapshot(draft);
  const isWeekly = draft.scheduleMode !== "rolling_n_day";
  const hasTrainingDays = !isWeekly || trainingWeekdays.length > 0;
  const isDirty = currentSnapshot !== initialSnapshot
    || trainingWeekdays.join(",") !== DEFAULT_TRAINING_WEEKDAYS.join(",");
  const hasDirtyChanges = hasUserEdited && isDirty;
  const routineNameConflict = hasRoutineNameConflict({
    candidateName: draft.name,
    routineNames: existingRoutineNames,
    workoutPlanNames: existingWorkoutPlanNames,
  });
  const limitReached = Boolean(routineLimit);
  // A name and at least one training day is enough: every other answer has a default (SIMPLIFY #7).
  const canCreate = validation.valid && hasTrainingDays && !routineNameConflict && !isSaving && !limitReached;
  const isUsingExitGuard = !embedded && Boolean(exitGuard);
  const isConfirmingDiscard = isUsingExitGuard ? Boolean(exitGuard?.isConfirmingDiscard) : isEmbeddedConfirmingDiscard;
  const trimmedRoutineName = draft.name.trim().slice(0, 15);
  const isRoutineNameInvalid = hasTouchedName && (trimmedRoutineName.length === 0 || routineNameConflict);
  const createRoutineButtonLabel = getCreateRoutineButtonLabel({
    isSaving,
    trimmedRoutineName,
    routineNameConflict,
    validationError: validation.error,
    hasTrainingDays,
    canCreate,
    limitReached,
  });
  const routineHeaderTitle = useMemo(() => (
    <RoutineEditorTitleInput
        name="name"
        value={draft.name}
        onChange={(nextValue) => {
          setHasUserEdited(true);
          setHasTouchedName(true);
          setDraft((current) => ({
            ...current,
            name: resolveRoutineDraftFieldValue("name", nextValue),
          }));
        }}
        label="Routine name"
        placeholder="e.g. Upper / Lower"
        maxLength={15}
        invalid={isRoutineNameInvalid}
      />
  ), [draft.name, isRoutineNameInvalid]);

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
    setHasTouchedName(true);
    const nextDraft = commitCycleLengthInput();
    const nextValidation = validateRoutineDetailsDraft(nextDraft);
    if (!nextValidation.valid) {
      toast.error(nextValidation.error ?? "Please complete all required routine fields.");
      return;
    }
    if (hasRoutineNameConflict({
      candidateName: nextDraft.name,
      routineNames: existingRoutineNames,
      workoutPlanNames: existingWorkoutPlanNames,
    })) {
      toast.error("Routine name already exists.");
      return;
    }

    if (nextDraft.scheduleMode !== "rolling_n_day" && trainingWeekdays.length === 0) {
      toast.error("Pick at least one day you train.");
      return;
    }

    const formData = buildCreateRoutineWithDaysFormData({
      draft: nextDraft,
      trimmedRoutineName: nextDraft.name.trim().slice(0, 15),
      trainingWeekdays,
    });
    // A failed request (offline blip, server error) must not throw into the route error boundary:
    // the typed form stays and the in-flow notice says the save failed.
    let result: Awaited<ReturnType<typeof createRoutineWithDaysAction>>;
    try {
      result = await createRoutineWithDaysAction(formData);
    } catch {
      toast.error("Could not save the routine. Check your connection and try again.");
      return;
    }
    if (!result.ok) {
      toast.error(isRoutineLimitError(result.error)
        ? getRoutineLimitNoticeCopy()
        : result.error ?? "Could not save the routine.");
      return;
    }
    if (!("routineId" in result) || !result.routineId) {
      toast.error("Could not save the routine.");
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
  }, [commitCycleLengthInput, embedded, existingRoutineNames, existingWorkoutPlanNames, onCreated, router, toast, trainingWeekdays]);

  const toggleTrainingWeekday = (weekday: RoutineStartWeekday) => {
    setHasUserEdited(true);
    setTrainingWeekdays((current) => normalizeTrainingWeekdays(
      current.includes(weekday) ? current.filter((value) => value !== weekday) : [...current, weekday],
    ));
  };

  const updateDraftField = (field: string, value: string) => {
    setHasUserEdited(true);
    setDraft((current) => ({
      ...current,
      [field]: resolveRoutineDraftFieldValue(field, value),
    }));
  };

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
          {routineLimit ? (
            <CardSurface tone="attention" data-routine-limit-notice="true">
              <CardHeader
                headingLevel={2}
                title="Routine limit reached"
                meta={<CardMeta items={[routineLimit.message, "Tap to see Pro"]} />}
                interaction={{ kind: "link", href: routineLimit.upgradeHref }}
              />
            </CardSurface>
          ) : null}
          {routineHeaderTitle}
          {isWeekly ? (
            <fieldset className="min-w-0 space-y-2 pt-1" data-training-days="">
              <legend className="px-1 pb-2 text-[0.95rem] font-semibold text-[rgb(var(--text-primary))]">
                Which days do you train?
              </legend>
              <div className="grid grid-cols-7 gap-1.5">
                {TRAINING_WEEKDAY_CHIPS.map((chip) => (
                  <ChipButton
                    key={chip.weekday}
                    selected={trainingWeekdays.includes(chip.weekday)}
                    aria-label={chip.long}
                    onClick={() => toggleTrainingWeekday(chip.weekday)}
                    className="w-full min-w-0 justify-center px-0 text-[0.8rem]"
                  >
                    {chip.short}
                  </ChipButton>
                ))}
              </div>
              <p className="px-1 text-[0.8rem] text-[rgb(var(--text-muted))]" aria-live="polite">
                {trainingWeekdays.length === 0
                  ? "Pick at least one day. The rest are rest days."
                  : `${trainingWeekdays.length} ${trainingWeekdays.length === 1 ? "day" : "days"} a week: ${describeTrainingWeekdays(trainingWeekdays)}. The rest are rest days.`}
              </p>
            </fieldset>
          ) : (
            <p className="px-1 pt-1 text-[0.85rem] text-[rgb(var(--text-muted))]">
              {`Repeats every ${draft.cycleLengthDays} ${draft.cycleLengthDays === 1 ? "day" : "days"}, not tied to the week.`}
            </p>
          )}
          <MoreOptionsDisclosure className="pt-1">
            <OptionSwitchRow
              label="Repeat every few days"
              hint="For a plan that does not follow the week, like every 4 days."
              checked={!isWeekly}
              onCheckedChange={(next) => updateDraftField("scheduleMode", next ? "rolling_n_day" : "weekday_anchored")}
            />
            {!isWeekly ? (
              <div className="flex justify-center pb-1">
                <RoutineEditorCycleLengthField
                  value={cycleLengthInput}
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
                  onFieldChange={updateDraftField}
                />
              </div>
            ) : null}
            <div className="flex justify-center pb-1">
              <RoutineEditorCycleAnchorField
                value={draft.startDate}
                onChange={(nextValue) => updateDraftField("startDate", nextValue)}
              />
            </div>
            <RoutineEditorFormFields
              fields={["timezone", "weightUnit", "distanceUnit"]}
              showCycleSection={false}
              sectionsDefaultExpanded
              cycleLengthDefaultValue={draft.cycleLengthDays}
              scheduleModeDefaultValue={draft.scheduleMode}
              startDateDefaultValue={draft.startDate}
              startWeekdayDefaultValue={draft.startWeekday}
              timezoneDefaultValue={draft.timezone}
              weightUnitDefaultValue={draft.weightUnit}
              distanceUnitDefaultValue={draft.distanceUnit}
              values={draft}
              onFieldChange={updateDraftField}
            />
          </MoreOptionsDisclosure>
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
