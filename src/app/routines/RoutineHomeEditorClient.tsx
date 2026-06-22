"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ContentRail } from "@/components/layout/ContentRail";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { RoutineEditorTitleInput } from "@/components/routines/RoutineEditorShared";
import { useRoutineDetailsHeaderTitle } from "@/components/routines/RoutineDetailsExitGuard";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import { updateRoutineAction } from "@/app/routines/actions";
import { RoutineHomeClient, type RoutineHomeDayCardItem } from "@/app/routines/RoutineHomeClient";
import {
  appendProgressionPlaybookFormData,
  createProgressionPlaybookFormState,
} from "@/lib/progression-playbook-form-state";
import {
  buildRoutineDetailsSnapshot,
  commitRoutineCycleLengthInput,
  type RoutineDetailsDraft,
} from "@/lib/routine-details-form";
import type { ActionResult } from "@/lib/action-result";
import type { ProgressionPlaybookId } from "@/lib/progression-playbooks";
import {
  clearPendingWorkoutPlanChooserDayIndex,
  clearRoutineCreationDraftState,
  readPendingWorkoutPlanChooserDayIndex,
  writeRoutineDraftSession,
} from "@/lib/routine-draft-session";
import type { WorkoutPlanSourceListItem } from "@/lib/workout-plan-source-list";

function getDeviceTimezone(fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
  return resolved || fallback;
}

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

type Props = {
  routineId: string;
  existingStartDate: string;
  name: string;
  cycleLengthDays: number;
  scheduleMode: "weekday_anchored" | "rolling_n_day";
  startDate: string;
  startWeekday: string;
  timezone: string;
  weightUnit: string;
  distanceUnit: "mi" | "km";
  defaultProgressionPlaybookId?: ProgressionPlaybookId | null;
  defaultProgressionPlaybookConfig?: Record<string, unknown> | null;
  routineStartDate?: string | null;
  routineTimeZone?: string | null;
  routineReferenceDate?: string | null;
  days: RoutineHomeDayCardItem[];
  isActiveRoutine: boolean;
  appendRoutineDayAction: (formData: FormData) => Promise<ActionResult & { routineDayId?: string }>;
  deleteRoutineDayAction: (formData: FormData) => Promise<ActionResult>;
  reorderRoutineDaysAction?: (formData: FormData) => Promise<ActionResult>;
  deleteRoutineAction?: (payload: { routineId: string }) => Promise<ActionResult>;
  isDraftRoutine?: boolean;
  initialWorkoutPlanChooserDayId?: string | null;
  workoutPlanSources?: WorkoutPlanSourceListItem[];
};

export function RoutineHomeEditorClient(props: Props) {
  const router = useRouter();
  const toast = useToast();
  const [workoutPlanChooserDayId, setWorkoutPlanChooserDayId] = useState<string | null>(props.initialWorkoutPlanChooserDayId ?? null);
  const [draft, setDraft] = useState<RoutineDetailsDraft>({
    name: props.name,
    cycleLengthDays: props.cycleLengthDays,
    scheduleMode: props.scheduleMode,
    startDate: props.startDate,
    startWeekday: props.startWeekday,
    timezone: props.timezone,
    weightUnit: props.weightUnit,
    distanceUnit: props.distanceUnit,
  });
  const [cycleLengthInput, setCycleLengthInput] = useState(() => String(props.cycleLengthDays));
  const [isSaving, startTransition] = useTransition();
  const [isPublishingDraft, startPublishTransition] = useTransition();
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressionDraft = useMemo(() => createProgressionPlaybookFormState({
    playbookId: props.defaultProgressionPlaybookId ?? null,
    config: props.defaultProgressionPlaybookConfig ?? null,
  }), [props.defaultProgressionPlaybookConfig, props.defaultProgressionPlaybookId]);
  const [lastSavedDraft, setLastSavedDraft] = useState(draft);

  useEffect(() => {
    setWorkoutPlanChooserDayId(props.initialWorkoutPlanChooserDayId ?? null);
  }, [props.initialWorkoutPlanChooserDayId]);

  useEffect(() => {
    if (props.initialWorkoutPlanChooserDayId || !props.isDraftRoutine) {
      return;
    }

    const pendingDayIndex = readPendingWorkoutPlanChooserDayIndex();
    if (!pendingDayIndex) {
      return;
    }

    const pendingDay = props.days.find((day) => day.dayIndex === pendingDayIndex);
    clearPendingWorkoutPlanChooserDayIndex();
    if (pendingDay) {
      setWorkoutPlanChooserDayId(pendingDay.id);
    }
  }, [props.days, props.initialWorkoutPlanChooserDayId, props.isDraftRoutine]);

  useEffect(() => {
    setCycleLengthInput(String(draft.cycleLengthDays));
  }, [draft.cycleLengthDays]);

  const initialSnapshot = useMemo(() => buildRoutineDetailsSnapshot({
    name: props.name,
    cycleLengthDays: props.cycleLengthDays,
    scheduleMode: props.scheduleMode,
    startDate: props.startDate,
    startWeekday: props.startWeekday,
    timezone: props.timezone,
    weightUnit: props.weightUnit,
    distanceUnit: props.distanceUnit,
  }), [
    props.cycleLengthDays,
    props.distanceUnit,
    props.name,
    props.scheduleMode,
    props.startDate,
    props.startWeekday,
    props.timezone,
    props.weightUnit,
  ]);
  const currentSnapshot = useMemo(() => buildRoutineDetailsSnapshot(draft), [draft]);
  const lastSavedSnapshot = useMemo(() => buildRoutineDetailsSnapshot(lastSavedDraft), [lastSavedDraft]);

  const headerTitle = useMemo(() => (
    <div data-app-header-raw-title="true" className="mx-auto block w-fit max-w-full">
      <RoutineEditorTitleInput
        name="name"
        value={draft.name}
        onChange={(nextValue) => {
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
      />
    </div>
  ), [draft.name]);

  useRoutineDetailsHeaderTitle(headerTitle);

  const commitCycleInput = (currentDraft: RoutineDetailsDraft) => {
    const committedCycleLength = commitRoutineCycleLengthInput(cycleLengthInput, currentDraft.cycleLengthDays);
    const nextDraft =
      committedCycleLength.cycleLengthDays === currentDraft.cycleLengthDays
        ? currentDraft
        : { ...currentDraft, cycleLengthDays: committedCycleLength.cycleLengthDays };

    setCycleLengthInput(committedCycleLength.inputValue);
    if (nextDraft !== currentDraft) {
      setDraft(nextDraft);
    }

    return nextDraft;
  };

  const persistRoutineSettings = useCallback(async (args?: {
    nextDraft?: RoutineDetailsDraft;
    shouldRefreshOnStructuralChange?: boolean;
  }) => {
    const nextDraft = args?.nextDraft ?? draft;
    const previousSavedDraft = lastSavedDraft;
    const formData = new FormData();
    formData.set("routineId", props.routineId);
    formData.set("existingStartDate", props.existingStartDate);
    formData.set("name", nextDraft.name.trim());
    formData.set("cycleLengthDays", String(nextDraft.cycleLengthDays));
    formData.set("scheduleMode", nextDraft.scheduleMode);
    formData.set("startDate", nextDraft.startDate);
    formData.set("startWeekday", nextDraft.startWeekday);
    formData.set("timezone", getDeviceTimezone(nextDraft.timezone));
    formData.set("weightUnit", nextDraft.weightUnit);
    formData.set("distanceUnit", nextDraft.distanceUnit);
    appendProgressionPlaybookFormData(formData, progressionDraft);

    const result = await updateRoutineAction(formData);
    if (!result.ok) {
      return result;
    }

    setLastSavedDraft(nextDraft);

    const shouldRefresh =
      args?.shouldRefreshOnStructuralChange !== false
      && (
        nextDraft.cycleLengthDays !== previousSavedDraft.cycleLengthDays
        || nextDraft.scheduleMode !== previousSavedDraft.scheduleMode
        || nextDraft.startDate !== previousSavedDraft.startDate
        || nextDraft.timezone !== previousSavedDraft.timezone
      );

    if (shouldRefresh) {
      router.refresh();
    }

    if (props.isDraftRoutine) {
      writeRoutineDraftSession(props.routineId, nextDraft.name.trim().slice(0, 15));
    }

    return result;
  }, [draft, lastSavedDraft, progressionDraft, props.existingStartDate, props.isDraftRoutine, props.routineId, router]);

  useEffect(() => {
    if (currentSnapshot === lastSavedSnapshot) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      const nextDraft = draft;

      startTransition(async () => {
        const result = await persistRoutineSettings({ nextDraft });
        if (!result.ok) {
          toast.error(result.error ?? "Could not save routine settings.");
        }
      });
    }, 420);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    currentSnapshot,
    draft,
    lastSavedDraft,
    lastSavedSnapshot,
    props.existingStartDate,
    props.routineId,
    persistRoutineSettings,
    toast,
  ]);

  const handlePublishDraft = () => {
    startPublishTransition(async () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      const nextDraft = commitCycleInput(draft);
      const result = await persistRoutineSettings({
        nextDraft,
        shouldRefreshOnStructuralChange: false,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not save routine settings.");
        return;
      }

      clearRoutineCreationDraftState();
      toast.success("Routine created");
      router.push("/routines");
      router.refresh();
    });
  };

  const handleOpenWorkoutPlan = async (day: RoutineHomeDayCardItem) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    const nextDraft = commitCycleInput(draft);
    const result = await persistRoutineSettings({
      nextDraft,
      shouldRefreshOnStructuralChange: false,
    });
    if (!result.ok) {
      toast.error(result.error ?? "Could not save routine settings.");
      return;
    }

    const hasWorkoutPlanContent = (day.splitSummary?.total ?? 0) > 0 || (day.recapExercises?.length ?? 0) > 0;
    if (hasWorkoutPlanContent || props.isDraftRoutine) {
      router.push(day.href);
      return;
    }

    setWorkoutPlanChooserDayId(day.id);
  };

  return (
    <ContentRail className="space-y-3">
      <div className={appTokens.routineEditorSectionStack}>
        <div className="space-y-2 pt-4">
          <RoutineEditorFormFields
            fields={["cycleLengthDays", "scheduleMode", "startWeekday", "weightUnit", "distanceUnit"]}
            showCycleSection
            cycleLengthInputValue={cycleLengthInput}
            cycleLengthDefaultValue={draft.cycleLengthDays}
            scheduleModeDefaultValue={draft.scheduleMode}
            startDateDefaultValue={draft.startDate}
            startWeekdayDefaultValue={draft.startWeekday}
            timezoneDefaultValue={draft.timezone}
            weightUnitDefaultValue={draft.weightUnit}
            distanceUnitDefaultValue={draft.distanceUnit}
            values={draft}
            onCycleLengthInputChange={setCycleLengthInput}
            onCycleLengthInputCommit={() => {
              commitCycleInput(draft);
            }}
            onCycleLengthStepChange={(nextValue) => {
              setCycleLengthInput(nextValue);
              setDraft((current) => ({
                ...current,
                cycleLengthDays: resolveSteppedCycleLength(nextValue, current.cycleLengthDays),
              }));
            }}
            onFieldChange={(field, value) => {
              setDraft((current) => ({
                ...current,
                [field]: resolveRoutineDraftFieldValue(field, value),
              }));
            }}
          />
        </div>
      </div>

      <RoutineHomeClient
        routineId={props.routineId}
        routineStartDate={props.routineStartDate}
        cycleLengthDays={draft.cycleLengthDays}
        scheduleMode={draft.scheduleMode}
        routineTimeZone={props.routineTimeZone}
        routineReferenceDate={props.routineReferenceDate}
        days={props.days}
        isActiveRoutine={props.isActiveRoutine}
        appendRoutineDayAction={props.appendRoutineDayAction}
        deleteRoutineDayAction={props.deleteRoutineDayAction}
        reorderRoutineDaysAction={props.reorderRoutineDaysAction}
        deleteRoutineAction={props.deleteRoutineAction}
        footerMode={props.isDraftRoutine ? "draftPublish" : "edit"}
        onPublishDraft={props.isDraftRoutine ? handlePublishDraft : undefined}
        isPublishDraftPending={isPublishingDraft}
        onOpenWorkoutPlan={handleOpenWorkoutPlan}
        workoutPlanChooserDayId={workoutPlanChooserDayId}
        workoutPlanSources={props.workoutPlanSources}
        onDismissWorkoutPlanChooser={() => {
          setWorkoutPlanChooserDayId(null);
          clearPendingWorkoutPlanChooserDayIndex();
          if (props.isDraftRoutine) {
            router.replace("/routines/new", { scroll: false });
          }
        }}
      />
      {isSaving ? <div className="sr-only" aria-live="polite">Saving routine settings</div> : null}
      {currentSnapshot !== initialSnapshot ? <div className="sr-only" aria-hidden="true" /> : null}
    </ContentRail>
  );
}
