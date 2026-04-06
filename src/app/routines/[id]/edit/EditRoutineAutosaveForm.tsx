"use client";

import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { RoutineDetailsBottomActionPublisher, RoutineEditorPageBody } from "@/components/routines/RoutineEditorShared";
import { DockButton } from "@/components/layout/BottomActionDock";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { useToast } from "@/components/ui/ToastProvider";
import { updateRoutineAction } from "@/app/routines/actions";
import { buildRoutineDetailsSnapshot, type RoutineDetailsDraft, validateRoutineDetailsDraft } from "@/lib/routine-details-form";
import { RoutineDetailsSaveState } from "@/components/routines/RoutineDetailsFormState";

type Props = {
  routineId: string;
  existingStartDate: string;
  returnHref: string;
  name: string;
  cycleLengthDays: number;
  startWeekday: string;
  timezone: string;
  weightUnit: string;
  error?: string;
  deleteAction?: ReactNode;
};

export function EditRoutineAutosaveForm(props: Props) {
  const toast = useToast();
  const [error, setError] = useState<string | null>(props.error ?? null);
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("");
  const [draft, setDraft] = useState<RoutineDetailsDraft>({
    name: props.name,
    cycleLengthDays: props.cycleLengthDays,
    startWeekday: props.startWeekday,
    timezone: props.timezone,
    weightUnit: props.weightUnit,
  });
  const [isSaving, startTransition] = useTransition();

  const initialSnapshot = useMemo(
    () =>
      buildRoutineDetailsSnapshot({
        name: props.name,
        cycleLengthDays: props.cycleLengthDays,
        startWeekday: props.startWeekday,
        timezone: props.timezone,
        weightUnit: props.weightUnit,
      }),
    [props.cycleLengthDays, props.name, props.startWeekday, props.timezone, props.weightUnit],
  );

  useEffect(() => {
    setLastSavedSnapshot(initialSnapshot);
  }, [initialSnapshot]);

  const currentSnapshot = useMemo(() => buildRoutineDetailsSnapshot(draft), [draft]);
  const baselineSnapshot = lastSavedSnapshot || initialSnapshot;
  const isDirty = currentSnapshot !== baselineSnapshot;
  const validation = validateRoutineDetailsDraft(draft);
  const canSave = validation.valid && isDirty && !isSaving;

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

  const saveChanges = () => {
    setError(null);
    startTransition(async () => {
      const nextValidation = validateRoutineDetailsDraft(draft);
      if (!nextValidation.valid) {
        const nextError = nextValidation.error ?? "Please complete all required routine fields.";
        setError(nextError);
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
      formData.set("name", draft.name.trim());
      formData.set("cycleLengthDays", String(draft.cycleLengthDays));
      formData.set("startWeekday", draft.startWeekday);
      formData.set("timezone", draft.timezone);
      formData.set("weightUnit", draft.weightUnit);
      formData.set("returnTo", props.returnHref);

      const result = await updateRoutineAction(formData);
      if (!result.ok) {
        const nextError = result.error ?? "Could not save routine.";
        setError(nextError);
        toast.error(nextError);
        return;
      }

      setLastSavedSnapshot(buildRoutineDetailsSnapshot(draft));
      toast.success("Routine changes saved");
    });
  };

  return (
    <>
      <form id="routine-update-form" className="space-y-4">
        <input type="hidden" name="routineId" value={props.routineId} />
        <input type="hidden" name="existingStartDate" value={props.existingStartDate} />
        <NavigationReturnInput fallbackHref="/routines" value={props.returnHref} />
        <RoutineEditorPageBody>
          <RoutineEditorFormFields
            titleInput
            cycleLengthDefaultValue={draft.cycleLengthDays}
            startWeekdayDefaultValue={draft.startWeekday}
            timezoneDefaultValue={draft.timezone}
            weightUnitDefaultValue={draft.weightUnit}
            values={draft}
            onFieldChange={(field, value) => {
              setDraft((current) => ({
                ...current,
                [field]: field === "cycleLengthDays" ? Number(value || current.cycleLengthDays) : value,
              }));
            }}
          />

          <RoutineDetailsSaveState error={error} isSaving={isSaving} isDirty={isDirty} mode="edit" />
        </RoutineEditorPageBody>
      </form>

      <RoutineDetailsBottomActionPublisher
        secondary={props.deleteAction ?? <div aria-hidden="true" />}
        primary={(
          <DockButton type="button" intent="positive" disabled={!canSave} onClick={saveChanges}>
            Save
          </DockButton>
        )}
      />
    </>
  );
}
