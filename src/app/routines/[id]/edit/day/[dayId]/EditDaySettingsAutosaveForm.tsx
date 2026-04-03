"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RoutineEditorPageHeader,
  RoutineEditorTitleInput,
} from "@/components/routines/RoutineEditorShared";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { useToast } from "@/components/ui/ToastProvider";
import { updateRoutineDaySettingsAction } from "@/app/routines/[id]/edit/day/actions";
import { getRoutineDayViewHref } from "@/lib/routine-day-navigation";
import { REST_DAY_BEHAVIOR_CONTRACT } from "@/features/day-state/restDayBehavior";

type Props = {
  routineId: string;
  daySummary?: string;
  routineDayId: string;
  backHref: string;
  dayIndex: number;
  name: string | null;
  isRest: boolean;
};

export function EditDaySettingsAutosaveForm({ routineId, daySummary, routineDayId, backHref, dayIndex, name, isRest }: Props) {
  const toast = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSnapshot = useMemo(() => JSON.stringify({ name: name ?? "", isRest }), [isRest, name]);
  const pendingSnapshotRef = useRef<{ name: string; isRest: boolean } | null>(null);
  const lastSubmittedRef = useRef(initialSnapshot);
  const [draft, setDraft] = useState({ name: name ?? "", isRest });
  const [, startTransition] = useTransition();

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    const nextDraft = { name: name ?? "", isRest };
    setDraft(nextDraft);
    pendingSnapshotRef.current = nextDraft;
    lastSubmittedRef.current = JSON.stringify(nextDraft);
  }, [isRest, name]);

  const submitAutosave = useCallback(() => {
    const form = formRef.current;
    const nextSnapshot = pendingSnapshotRef.current;
    if (!form) return;
    if (!nextSnapshot) return;
    const formData = new FormData(form);
    const snapshot = JSON.stringify(nextSnapshot);

    formData.set("name", nextSnapshot.name);
    if (nextSnapshot.isRest) {
      formData.set("isRest", "on");
    } else {
      formData.delete("isRest");
    }

    if (snapshot === lastSubmittedRef.current) return;

    startTransition(async () => {
      const result = await updateRoutineDaySettingsAction(formData);
      if (result.ok) {
        const previousSnapshot = JSON.parse(lastSubmittedRef.current) as { name: string; isRest: boolean };
        lastSubmittedRef.current = snapshot;
        if (previousSnapshot.isRest !== nextSnapshot.isRest) {
          toast.info(
            nextSnapshot.isRest
              ? REST_DAY_BEHAVIOR_CONTRACT.copy.enabled
              : REST_DAY_BEHAVIOR_CONTRACT.copy.disabled,
            { id: "day-rest-toggle-status", durationMs: 2600 },
          );
        }
        router.refresh();
        return;
      }
      toast.error(result.error ?? "Autosave failed", { id: "day-autosave-status", durationMs: 3200 });
    });
  }, [router, toast]);

  const scheduleAutosave = useCallback((nextSnapshot: { name: string; isRest: boolean }) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pendingSnapshotRef.current = nextSnapshot;
    timeoutRef.current = setTimeout(submitAutosave, 500);
  }, [submitAutosave]);

  return (
    <form ref={formRef} id="routine-day-settings-form" className="space-y-3" onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="routineDayId" value={routineDayId} />
      <NavigationReturnInput fallbackHref={getRoutineDayViewHref(routineId, routineDayId)} value={backHref} />
      <RoutineEditorPageHeader
        eyebrow="Edit Day"
        title={(
          <RoutineEditorTitleInput
            name="name"
            value={draft.name}
            onChange={(nextValue) => {
              const nextSnapshot = { ...draft, name: nextValue };
              setDraft(nextSnapshot);
              scheduleAutosave(nextSnapshot);
            }}
            placeholder={`Day ${dayIndex}`}
            ariaLabel="Day Name"
          />
        )}
        subtitle={`Day ${dayIndex}`}
        meta={daySummary}
        action={<TopRightBackButton href={backHref} ariaLabel="Back to Day" historyBehavior="fallback-only" />}
      >
        <div className="px-1 pt-1">
          <button
            type="button"
            aria-pressed={draft.isRest}
            onClick={() => {
              const nextSnapshot = { ...draft, isRest: !draft.isRest };
              setDraft(nextSnapshot);
              scheduleAutosave(nextSnapshot);
            }}
            className={[
              "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition",
              draft.isRest
                ? "border-emerald-400/35 bg-emerald-400/14 text-emerald-100"
                : "border-white/12 bg-white/[0.04] text-muted hover:bg-white/[0.06] hover:text-text",
            ].join(" ")}
          >
            <span>Rest</span>
            <span>{draft.isRest ? "On" : "Off"}</span>
          </button>
          <p className="mt-2 text-xs text-[rgb(var(--text)/0.65)]">
            {REST_DAY_BEHAVIOR_CONTRACT.copy.helper}
          </p>
        </div>
      </RoutineEditorPageHeader>
    </form>
  );
}
