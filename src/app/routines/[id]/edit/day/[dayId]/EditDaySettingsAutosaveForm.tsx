"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { controlClassName } from "@/components/ui/formClasses";
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
          <input
            name="name"
            value={nameValue}
            onChange={(event) => {
              setNameValue(event.target.value);
              scheduleAutosave();
            }}
            placeholder={`Day ${dayIndex}`}
            aria-label="Day Name"
            className={`${controlClassName} min-h-11 border-border/55 bg-[rgb(var(--bg)/0.44)] text-base font-semibold`}
          />
        )}
        subtitle={routineName}
        subtitleRight={daySummary}
        action={<TopRightBackButton href={backHref} ariaLabel="Back to Routine" historyBehavior="fallback-only" />}
        actionClassName="-mt-0.5"
        className="space-y-3 p-4 pt-3"
      >
        <button
          type="button"
          onClick={() => {
            setIsRestValue((current) => {
              const next = !current;
              setTimeout(scheduleAutosave, 0);
              return next;
            });
          }}
          aria-pressed={isRestValue}
          className={[
            "flex w-full items-center justify-between gap-3 rounded-[1.1rem] border px-3 py-2.5 text-left transition",
            isRestValue
              ? "border-emerald-400/35 bg-emerald-400/14 text-emerald-100"
              : "border-white/8 bg-white/[0.04] text-text hover:bg-white/[0.06]",
          ].join(" ")}
        >
          <span className="flex items-center gap-2">
            <span className={isRestValue ? "text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200" : "text-xs font-semibold uppercase tracking-[0.14em] text-muted"}>Rest Day</span>
            <span className={isRestValue ? "text-sm text-emerald-100/90" : "text-sm text-muted"}>Tap to mark this day as rest</span>
          </span>
          <span className={isRestValue ? "text-sm font-semibold text-emerald-100" : "text-sm font-medium text-text"}>{isRestValue ? "On" : "Off"}</span>
        </button>
      </RoutineEditorPageHeader>

      <SubtitleText className="px-1 text-xs text-muted">{saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : saveState === "error" ? (error ?? "Could not save") : "Autosave on"}</SubtitleText>
      {saveState === "error" && error ? <SubtitleText className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-red-700">{error}</SubtitleText> : null}
    </form>
  );
}
