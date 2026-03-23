"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { AccentSubtitleText, SubtitleText } from "@/components/ui/text-roles";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
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

type SaveState = "idle" | "saving" | "saved" | "error";

function SaveStateLabel({ state, message }: { state: SaveState; message?: string | null }) {
  const text = state === "saving" ? "Saving..." : state === "saved" ? "Saved" : state === "error" ? (message || "Could not save") : "Autosave on";
  return <SubtitleText className="text-xs text-muted">{text}</SubtitleText>;
}

export function EditRoutineAutosaveForm(props: Props) {
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
  const [saveState, setSaveState] = useState<SaveState>(props.success ? "saved" : "idle");
  const [message, setMessage] = useState<string | null>(props.error ?? null);
  const [, startTransition] = useTransition();

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

    setSaveState("saving");
    setMessage(null);
    startTransition(async () => {
      const result = await autosaveRoutineAction(formData);
      if (result.ok) {
        lastSubmittedRef.current = snapshot;
        setSaveState("saved");
        router.refresh();
        return;
      }
      setSaveState("error");
      setMessage(result.error ?? "Could not save routine.");
    });
  }, [router]);

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
        subtitleRight={<SaveStateLabel state={saveState} message={message} />}
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

      {saveState === "error" && message ? <AccentSubtitleText className="rounded-[1rem] border border-red-300/40 bg-red-50/10 px-3 py-2 text-red-200">{message}</AccentSubtitleText> : null}
      {props.success && saveState !== "error" ? <AccentSubtitleText className="rounded-[1rem] border border-accent/40 bg-accent/10 px-3 py-2 text-accent">{props.success}</AccentSubtitleText> : null}
    </form>
  );
}
