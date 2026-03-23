"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { controlClassName } from "@/components/ui/formClasses";
import { SubtitleText, TitleText } from "@/components/ui/text-roles";
import { updateRoutineDaySettingsAction } from "@/app/routines/[id]/edit/day/actions";

type Props = {
  routineId: string;
  routineDayId: string;
  backHref: string;
  dayIndex: number;
  name: string | null;
  isRest: boolean;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function EditDaySettingsAutosaveForm({ routineId, routineDayId, backHref, dayIndex, name, isRest }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSnapshot = useMemo(() => JSON.stringify({ name: name ?? "", isRest }), [isRest, name]);
  const lastSubmittedRef = useRef(initialSnapshot);
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
      name: String(formData.get("name") ?? ""),
      isRest: formData.get("isRest") === "on",
    });

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
  }, [router]);

  const scheduleAutosave = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(submitAutosave, 500);
  }, [submitAutosave]);

  return (
    <form ref={formRef} id="routine-day-settings-form" className="space-y-3" onChange={scheduleAutosave}>
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="routineDayId" value={routineDayId} />
      <NavigationReturnInput fallbackHref={`/routines/${routineId}/edit`} value={backHref} />
      <div className="space-y-2.5">
        <label className="block text-sm">
          <TitleText as="span" className="text-sm">Day Name</TitleText>
          <input name="name" defaultValue={name ?? ""} placeholder={`Day ${dayIndex}`} className={controlClassName} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isRest" defaultChecked={isRest} />
          <SubtitleText as="span" className="text-sm">Rest Day</SubtitleText>
        </label>
        <SubtitleText className="text-xs text-muted">{saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : saveState === "error" ? (error ?? "Could not save") : "Autosave on"}</SubtitleText>
        {saveState === "error" && error ? <SubtitleText className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-red-700">{error}</SubtitleText> : null}
      </div>
    </form>
  );
}
