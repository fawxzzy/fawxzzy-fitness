"use client";

import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { RoutineDetailsBottomActionPublisher, RoutineEditorPageBody, RoutineEditorTitleInput } from "@/components/routines/RoutineEditorShared";
import {
  RoutineDetailsDiscardConfirmationDock,
  useRoutineDetailsDirtyState,
  useRoutineDetailsExitGuard,
  useRoutineDetailsHeaderTitle,
} from "@/components/routines/RoutineDetailsExitGuard";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import { useToastMessageEffect } from "@/components/ui/useToastMessageEffect";
import { updateRoutineAction } from "@/app/routines/actions";
import { ProgressionPlaybookEditor } from "@/components/routines/ProgressionPlaybookEditor";
import {
  buildRoutineDetailsSnapshot,
  commitRoutineCycleLengthInput,
  type RoutineDetailsDraft,
  validateRoutineDetailsDraft,
} from "@/lib/routine-details-form";
import {
  appendProgressionPlaybookFormData,
  buildProgressionPlaybookFormSnapshot,
  createProgressionPlaybookFormState,
  createProgressionPlaybookFormStateForTrainingGoal,
  isTrainingGoalCustomized,
} from "@/lib/progression-playbook-form-state";
import type { ProgressionPlaybookId, TrainingGoalId } from "@/lib/progression-playbooks";

type Props = {
  routineId: string;
  existingStartDate: string;
  returnHref: string;
  name: string;
  cycleLengthDays: number;
  scheduleMode: "weekday_anchored" | "rolling_n_day";
  startDate: string;
  startWeekday: string;
  timezone: string;
  weightUnit: string;
  distanceUnit?: "mi" | "km";
  defaultProgressionPlaybookId?: ProgressionPlaybookId | null;
  defaultProgressionPlaybookConfig?: Record<string, unknown> | null;
  error?: string;
  deleteAction?: ReactNode;
};

function resolveRoutineDraftFieldValue(field: string, value: string) {
  if (field === "name") {
    return value.slice(0, 15);
  }

  return value;
}

export function EditRoutineAutosaveForm(props: Props) {
  const toast = useToast();
  const distanceUnit = props.distanceUnit ?? "mi";
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("");
  const [lastSavedProgressionSnapshot, setLastSavedProgressionSnapshot] = useState("");
  const [draft, setDraft] = useState<RoutineDetailsDraft>({
    name: props.name,
    cycleLengthDays: props.cycleLengthDays,
    scheduleMode: props.scheduleMode,
    startDate: props.startDate,
    startWeekday: props.startWeekday,
    timezone: props.timezone,
    weightUnit: props.weightUnit,
    distanceUnit,
  });
  const [progressionDraft, setProgressionDraft] = useState(() => createProgressionPlaybookFormState({
    playbookId: props.defaultProgressionPlaybookId ?? null,
    config: props.defaultProgressionPlaybookConfig ?? null,
  }));
  const [selectedTrainingGoal, setSelectedTrainingGoal] = useState<TrainingGoalId | "">("");
  const [autoApplyUpdatesToExercises, setAutoApplyUpdatesToExercises] = useState(true);
  const [cycleLengthInput, setCycleLengthInput] = useState(() => String(props.cycleLengthDays));
  const [isSaving, startTransition] = useTransition();

  useToastMessageEffect("error", props.error, { id: "edit-routine-route-error" });

  const initialSnapshot = useMemo(
    () =>
      buildRoutineDetailsSnapshot({
        name: props.name,
        cycleLengthDays: props.cycleLengthDays,
        scheduleMode: props.scheduleMode,
        startDate: props.startDate,
        startWeekday: props.startWeekday,
        timezone: props.timezone,
        weightUnit: props.weightUnit,
        distanceUnit,
      }),
    [distanceUnit, props.cycleLengthDays, props.name, props.scheduleMode, props.startDate, props.startWeekday, props.timezone, props.weightUnit],
  );
  const initialProgressionSnapshot = useMemo(() => buildProgressionPlaybookFormSnapshot(createProgressionPlaybookFormState({
    playbookId: props.defaultProgressionPlaybookId ?? null,
    config: props.defaultProgressionPlaybookConfig ?? null,
  })), [props.defaultProgressionPlaybookConfig, props.defaultProgressionPlaybookId]);

  useEffect(() => {
    setLastSavedSnapshot(initialSnapshot);
    setLastSavedProgressionSnapshot(initialProgressionSnapshot);
  }, [initialProgressionSnapshot, initialSnapshot]);

  useEffect(() => {
    setCycleLengthInput(String(draft.cycleLengthDays));
  }, [draft.cycleLengthDays]);

  const currentSnapshot = useMemo(() => buildRoutineDetailsSnapshot(draft), [draft]);
  const currentProgressionSnapshot = useMemo(() => buildProgressionPlaybookFormSnapshot(progressionDraft), [progressionDraft]);
  const baselineSnapshot = lastSavedSnapshot || initialSnapshot;
  const baselineProgressionSnapshot = lastSavedProgressionSnapshot || initialProgressionSnapshot;
  const isDirty = currentSnapshot !== baselineSnapshot || currentProgressionSnapshot !== baselineProgressionSnapshot;
  const validation = validateRoutineDetailsDraft(draft, { allowLegacyLongName: true });
  const canSave = validation.valid && isDirty && !isSaving;
  const { isConfirmingDiscard } = useRoutineDetailsExitGuard();
  const routineHeaderTitle = useMemo(() => (
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
        placeholder="Routine"
        ariaLabel="Routine Name"
        maxLength={15}
        className="text-center"
      />
    </div>
  ), [draft.name]);

  useRoutineDetailsDirtyState(isDirty);
  useRoutineDetailsHeaderTitle(routineHeaderTitle);

  useEffect(() => {
    if (!isDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [isDirty]);

  const commitCycleLengthInput = () => {
    const committedCycleLength = commitRoutineCycleLengthInput(cycleLengthInput, draft.cycleLengthDays);
    const nextDraft =
      committedCycleLength.cycleLengthDays === draft.cycleLengthDays
        ? draft
        : { ...draft, cycleLengthDays: committedCycleLength.cycleLengthDays };

    setCycleLengthInput(committedCycleLength.inputValue);
    if (nextDraft !== draft) {
      setDraft(nextDraft);
    }

    return nextDraft;
  };

  const submitChanges = (
    formData: FormData,
    nextDraft: RoutineDetailsDraft,
    progressionSnapshot: string,
    applyRoutineDefaultToExercises: boolean,
  ) => {
    startTransition(async () => {
      if (applyRoutineDefaultToExercises) {
        formData.set("applyRoutineDefaultToExercises", "1");
      } else {
        formData.delete("applyRoutineDefaultToExercises");
      }

      const result = await updateRoutineAction(formData);
      if (!result.ok) {
        const nextError = result.error ?? "Could not save routine.";
        toast.error(nextError);
        return;
      }

      setLastSavedSnapshot(buildRoutineDetailsSnapshot(nextDraft));
      setLastSavedProgressionSnapshot(progressionSnapshot);
      toast.success("Routine changes saved");
    });
  };

  const saveChanges = () => {
    startTransition(() => {
      const nextDraft = commitCycleLengthInput();
      const nextValidation = validateRoutineDetailsDraft(nextDraft, { allowLegacyLongName: true });
      if (!nextValidation.valid) {
        const nextError = nextValidation.error ?? "Please complete all required routine fields.";
        toast.error(nextError);
        return;
      }
      if (!isDirty) {
        toast.info("No changes to save.");
        return;
      }

      const progressionChanged = currentProgressionSnapshot !== baselineProgressionSnapshot;

      const formData = new FormData();
      formData.set("routineId", props.routineId);
      formData.set("existingStartDate", props.existingStartDate);
      formData.set("name", nextDraft.name.trim());
      formData.set("cycleLengthDays", String(nextDraft.cycleLengthDays));
      formData.set("scheduleMode", nextDraft.scheduleMode);
      formData.set("startDate", nextDraft.startDate);
      formData.set("startWeekday", nextDraft.startWeekday);
      formData.set("timezone", nextDraft.timezone);
      formData.set("weightUnit", nextDraft.weightUnit);
      formData.set("distanceUnit", nextDraft.distanceUnit);
      appendProgressionPlaybookFormData(formData, progressionDraft);
      formData.set("returnTo", props.returnHref);

      submitChanges(
        formData,
        nextDraft,
        currentProgressionSnapshot,
        progressionChanged && autoApplyUpdatesToExercises,
      );
    });
  };

  return (
    <>
      <form id="routine-update-form" className={appTokens.routineEditorSectionStack}>
        <input type="hidden" name="routineId" value={props.routineId} />
        <input type="hidden" name="existingStartDate" value={props.existingStartDate} />
        <NavigationReturnInput fallbackHref="/routines" value={props.returnHref} />
        <RoutineEditorPageBody>
          <div className="space-y-2 pt-4">
            <RoutineEditorFormFields
              fields={["cycleLengthDays", "scheduleMode", "startWeekday", "timezone", "weightUnit", "distanceUnit"]}
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
              onCycleLengthInputCommit={commitCycleLengthInput}
              onFieldChange={(field, value) => {
                setDraft((current) => ({
                  ...current,
                  [field]: resolveRoutineDraftFieldValue(field, value),
                }));
              }}
            />
            <ProgressionPlaybookEditor
              value={progressionDraft}
              onChange={(nextValue) => {
                setProgressionDraft(nextValue);
              }}
              weightUnit={draft.weightUnit === "kg" ? "kg" : "lbs"}
              distanceUnit={draft.distanceUnit === "km" ? "km" : "mi"}
              cycleLengthDays={draft.cycleLengthDays}
              context="routine-default"
              collapsible
              defaultExpanded={false}
              separateInfoBox
              trainingFocusValue={selectedTrainingGoal}
              trainingFocusCustomized={isTrainingGoalCustomized(selectedTrainingGoal, progressionDraft)}
              onTrainingFocusChange={(goal) => {
                setSelectedTrainingGoal(goal);
                setProgressionDraft(createProgressionPlaybookFormStateForTrainingGoal(goal));
              }}
              autoApplyUpdatesToExercises={autoApplyUpdatesToExercises}
              onAutoApplyUpdatesToExercisesChange={setAutoApplyUpdatesToExercises}
            />
          </div>
        </RoutineEditorPageBody>
      </form>

      {isConfirmingDiscard ? (
        <RoutineDetailsDiscardConfirmationDock />
      ) : (
        <RoutineDetailsBottomActionPublisher
          secondary={props.deleteAction ?? <div aria-hidden="true" />}
          primary={(
            <BottomDockButton type="button" intent="positive" disabled={!canSave} onClick={saveChanges}>
              Save
            </BottomDockButton>
          )}
        />
      )}
    </>
  );
}
