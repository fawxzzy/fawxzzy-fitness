"use client";

import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { RoutineDetailsBottomActionPublisher, RoutineEditorPageBody } from "@/components/routines/RoutineEditorShared";
import {
  RoutineDetailsDiscardConfirmationDock,
  useRoutineDetailsDirtyState,
  useRoutineDetailsExitGuard,
} from "@/components/routines/RoutineDetailsExitGuard";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import { useToastMessageEffect } from "@/components/ui/useToastMessageEffect";
import { updateRoutineAction } from "@/app/routines/actions";
import {
  buildRoutineDetailsSnapshot,
  commitRoutineCycleLengthInput,
  type RoutineDetailsDraft,
  validateRoutineDetailsDraft,
} from "@/lib/routine-details-form";

type Props = {
  routineId: string;
  existingStartDate: string;
  returnHref: string;
  name: string;
  cycleLengthDays: number;
  startWeekday: string;
  timezone: string;
  weightUnit: string;
  distanceUnit?: "mi" | "km";
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
  const [draft, setDraft] = useState<RoutineDetailsDraft>({
    name: props.name,
    cycleLengthDays: props.cycleLengthDays,
    startWeekday: props.startWeekday,
    timezone: props.timezone,
    weightUnit: props.weightUnit,
    distanceUnit,
  });
  const [cycleLengthInput, setCycleLengthInput] = useState(() => String(props.cycleLengthDays));
  const [isSaving, startTransition] = useTransition();

  useToastMessageEffect("error", props.error, { id: "edit-routine-route-error" });

  const initialSnapshot = useMemo(
    () =>
      buildRoutineDetailsSnapshot({
        name: props.name,
        cycleLengthDays: props.cycleLengthDays,
        startWeekday: props.startWeekday,
        timezone: props.timezone,
        weightUnit: props.weightUnit,
        distanceUnit,
      }),
    [distanceUnit, props.cycleLengthDays, props.name, props.startWeekday, props.timezone, props.weightUnit],
  );

  useEffect(() => {
    setLastSavedSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  useEffect(() => {
    setCycleLengthInput(String(draft.cycleLengthDays));
  }, [draft.cycleLengthDays]);

  const currentSnapshot = useMemo(() => buildRoutineDetailsSnapshot(draft), [draft]);
  const baselineSnapshot = lastSavedSnapshot || initialSnapshot;
  const isDirty = currentSnapshot !== baselineSnapshot;
  const validation = validateRoutineDetailsDraft(draft);
  const canSave = validation.valid && isDirty && !isSaving;
  const { isConfirmingDiscard } = useRoutineDetailsExitGuard();

  useRoutineDetailsDirtyState(isDirty);

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

  const saveChanges = () => {
    startTransition(async () => {
      const nextDraft = commitCycleLengthInput();
      const nextValidation = validateRoutineDetailsDraft(nextDraft);
      if (!nextValidation.valid) {
        const nextError = nextValidation.error ?? "Please complete all required routine fields.";
        toast.error(nextError);
        return;
      }
      if (!isDirty) {
        toast.info("No changes to save.");
        return;
      }

      const formData = new FormData();
      formData.set("routineId", props.routineId);
      formData.set("existingStartDate", props.existingStartDate);
      formData.set("name", nextDraft.name.trim());
      formData.set("cycleLengthDays", String(nextDraft.cycleLengthDays));
      formData.set("startWeekday", nextDraft.startWeekday);
      formData.set("timezone", nextDraft.timezone);
      formData.set("weightUnit", nextDraft.weightUnit);
      formData.set("distanceUnit", nextDraft.distanceUnit);
      formData.set("returnTo", props.returnHref);

      const result = await updateRoutineAction(formData);
      if (!result.ok) {
        const nextError = result.error ?? "Could not save routine.";
        toast.error(nextError);
        return;
      }

      setLastSavedSnapshot(buildRoutineDetailsSnapshot(nextDraft));
      toast.success("Routine changes saved");
    });
  };

  return (
    <>
      <form id="routine-update-form" className={appTokens.routineEditorSectionStack}>
        <input type="hidden" name="routineId" value={props.routineId} />
        <input type="hidden" name="existingStartDate" value={props.existingStartDate} />
        <NavigationReturnInput fallbackHref="/routines" value={props.returnHref} />
        <RoutineEditorPageBody>
          <div className="pt-4">
            <RoutineEditorFormFields
              titleInput
              cycleLengthInputValue={cycleLengthInput}
              cycleLengthDefaultValue={draft.cycleLengthDays}
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
