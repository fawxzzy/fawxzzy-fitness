"use client";

import { type ReactNode, useEffect, useMemo, useState, useTransition } from "react";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { BottomActionStack } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { AppButton } from "@/components/ui/AppButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { AccentSubtitleText } from "@/components/ui/text-roles";
import { useToast } from "@/components/ui/ToastProvider";
import { updateRoutineAction } from "@/app/routines/actions";
import { buildRoutineDetailsSnapshot, type RoutineDetailsDraft, validateRoutineDetailsDraft } from "@/lib/routine-details-form";

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
      <form id="routine-update-form" className="space-y-4 px-1 pb-4">
        <input type="hidden" name="routineId" value={props.routineId} />
        <input type="hidden" name="existingStartDate" value={props.existingStartDate} />
        <NavigationReturnInput fallbackHref="/routines" value={props.returnHref} />
        <RoutineEditorPageHeader
          eyebrow="Edit Routine"
          title="Routine Details"
          action={<RoutineBackButton href={props.returnHref} hasUnsavedChanges={isDirty} />}
          className="space-y-5"
        >
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
        </RoutineEditorPageHeader>

        {error ? <AccentSubtitleText className="rounded-[1rem] border border-red-300/40 bg-red-50/10 px-3 py-2 text-red-200">{error}</AccentSubtitleText> : null}
        {!error ? (
          <AccentSubtitleText className="text-[rgb(var(--text)/0.7)]">
            {isSaving ? "Saving changes…" : (isDirty ? "Unsaved changes" : "All changes saved")}
          </AccentSubtitleText>
        ) : null}
      </form>

      <PublishBottomActions>
        <BottomActionStack
          utility={props.deleteAction}
          primary={(
            <AppButton type="button" variant="primary" fullWidth disabled={!canSave} onClick={saveChanges}>
              Save Changes
            </AppButton>
          )}
        />
      </PublishBottomActions>
    </>
  );
}
