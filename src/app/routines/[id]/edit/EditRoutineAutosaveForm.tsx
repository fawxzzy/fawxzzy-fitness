"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { SubtitleText } from "@/components/ui/text-roles";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { useToast } from "@/components/ui/ToastProvider";
import { autosaveRoutineAction } from "@/app/routines/actions";

type Props = {
  routineId: string;
  existingStartDate: string;
  returnHref: string;
  name: string;
  cycleLengthDays: number;
  startWeekday: string;
  timezone: string;
  weightUnit: string;
  success?: string;
  error?: string;
};

export function EditRoutineAutosaveForm(props: Props) {
  const toast = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSnapshot = useMemo(() => JSON.stringify({
    name: props.name,
    cycleLengthDays: String(props.cycleLengthDays),
    startWeekday: props.startWeekday,
    timezone: props.timezone,
    weightUnit: props.weightUnit,
  }), [props]);
  const lastSubmittedRef = useRef(initialSnapshot);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (props.success) {
      toast.success(props.success, { id: "routine-autosave-status" });
    }
    if (props.error) {
      toast.error(props.error, { id: "routine-autosave-status", durationMs: 3200 });
    }
  }, [props.error, props.success, toast]);

  const submitAutosave = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    const snapshot = JSON.stringify({
      name: String(formData.get("name") ?? ""),
      cycleLengthDays: String(formData.get("cycleLengthDays") ?? ""),
      startWeekday: String(formData.get("startWeekday") ?? ""),
      timezone: String(formData.get("timezone") ?? ""),
      weightUnit: String(formData.get("weightUnit") ?? ""),
    });

    if (snapshot === lastSubmittedRef.current) return;

    toast.info("Saving...", { id: "routine-autosave-status", durationMs: 2000 });
    startTransition(async () => {
      const result = await autosaveRoutineAction(formData);
      if (result.ok) {
        lastSubmittedRef.current = snapshot;
        toast.success("Saved", { id: "routine-autosave-status", durationMs: 2200 });
        router.refresh();
        return;
      }
      const nextError = result.error ?? "Autosave failed";
      toast.error(nextError, { id: "routine-autosave-status", durationMs: 3200 });
    });
  }, [router, toast]);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const scheduleAutosave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      submitAutosave();
    }, 500);
  }, [submitAutosave]);

  return (
    <form
      ref={formRef}
      onChange={scheduleAutosave}
      id="routine-update-form"
      className="space-y-4 px-1 pb-4"
    >
      <input type="hidden" name="routineId" value={props.routineId} />
      <input type="hidden" name="existingStartDate" value={props.existingStartDate} />
      <NavigationReturnInput fallbackHref="/routines" value={props.returnHref} />

        <RoutineEditorPageHeader
        title="EDIT ROUTINE DETAILS"
        action={<RoutineBackButton href={props.returnHref} hasUnsavedChanges={false} />}
        actionClassName="-mt-1"
        subtitleRight={<SubtitleText className="text-xs text-muted">Autosave on</SubtitleText>}
        className="space-y-5"
      >
        <RoutineEditorFormFields
          titleInput
          nameDefaultValue={props.name}
          cycleLengthDefaultValue={props.cycleLengthDays}
          startWeekdayDefaultValue={props.startWeekday}
          timezoneDefaultValue={props.timezone}
          weightUnitDefaultValue={props.weightUnit}
          onFieldChange={() => scheduleAutosave()}
        />
      </RoutineEditorPageHeader>
    </form>
  );
}
