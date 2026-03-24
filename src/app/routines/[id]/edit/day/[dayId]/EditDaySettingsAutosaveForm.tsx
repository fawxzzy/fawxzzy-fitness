"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RoutineEditorFullRowToggle,
  RoutineEditorPageHeader,
  RoutineEditorTitleInput,
} from "@/components/routines/RoutineEditorShared";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { SubtitleText } from "@/components/ui/text-roles";
import { updateRoutineDaySettingsAction } from "@/app/routines/[id]/edit/day/actions";

type Props = {
  routineId: string;
  routineName: string;
  daySummary: string;
  routineDayId: string;
  backHref: string;
  dayIndex: number;
  name: string | null;
  isRest: boolean;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function EditDaySettingsAutosaveForm({ routineId, routineName, daySummary, routineDayId, backHref, dayIndex, name, isRest }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSnapshot = useMemo(() => JSON.stringify({ name: name ?? "", isRest }), [isRest, name]);
  const lastSubmittedRef = useRef(initialSnapshot);
  const [nameValue, setNameValue] = useState(name ?? "");
  const [isRestValue, setIsRestValue] = useState(isRest);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const submitAutosave = useCallback(() => {
    const form = formRef.current;
    if (!form) return;
    const formData = new FormData(form);
    const snapshot = JSON.stringify({
      name: nameValue,
      isRest: isRestValue,
    });

    formData.set("name", nameValue);
    if (isRestValue) {
      formData.set("isRest", "on");
    } else {
      formData.delete("isRest");
    }

    if (snapshot === lastSubmittedRef.current) return;

    setSaveState("saving");
    setError(null);
    startTransition(async () => {
      const result = await updateRoutineDaySettingsAction(formData);
      if (result.ok) {
        lastSubmittedRef.current = snapshot;
        setSaveState("saved");
        router.refresh();
        return;
      }
      setSaveState("error");
      setError(result.error ?? "Could not save day settings.");
    });
  }, [isRestValue, nameValue, router]);

  const scheduleAutosave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(submitAutosave, 500);
  }, [submitAutosave]);

  return (
    <form ref={formRef} id="routine-day-settings-form" className="space-y-3" onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="routineDayId" value={routineDayId} />
      <NavigationReturnInput fallbackHref={`/routines/${routineId}/edit`} value={backHref} />
      <RoutineEditorPageHeader
        eyebrow="EDIT DAY DETAILS"
        title={(
          <RoutineEditorTitleInput
            name="name"
            value={nameValue}
            onChange={(nextValue) => {
              setNameValue(nextValue);
              scheduleAutosave();
            }}
            placeholder={`Day ${dayIndex}`}
            ariaLabel="Day Name"
          />
        )}
        subtitle={routineName}
        subtitleRight={daySummary}
        action={<TopRightBackButton href={backHref} ariaLabel="Back to Routine" historyBehavior="fallback-only" />}
        actionClassName="-mt-0.5"
        className="space-y-3 p-4 pt-3"
      >
        <RoutineEditorFullRowToggle
          label="Rest Day"
          description="Tap to mark this day as rest"
          enabled={isRestValue}
          onToggle={() => {
            setIsRestValue((current) => {
              const next = !current;
              setTimeout(scheduleAutosave, 0);
              return next;
            });
          }}
        />
      </RoutineEditorPageHeader>

      <SubtitleText className="px-1 text-xs text-muted">{saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : saveState === "error" ? (error ?? "Could not save") : "Autosave on"}</SubtitleText>
      {saveState === "error" && error ? <SubtitleText className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-red-700">{error}</SubtitleText> : null}
    </form>
  );
}
