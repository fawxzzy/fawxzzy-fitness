"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RoutineEditorPageHeader,
  RoutineEditorTitleInput,
} from "@/components/routines/RoutineEditorShared";
import { DockButton } from "@/components/layout/BottomActionDock";
import { DayTaxonomyHeaderSummary } from "@/components/day-list/DayTaxonomyHeaderSummary";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { useToast } from "@/components/ui/ToastProvider";
import { updateRoutineDaySettingsAction } from "@/app/routines/[id]/edit/day/actions";
import { getRoutineDayViewHref } from "@/lib/routine-day-navigation";
import { REST_DAY_BEHAVIOR_CONTRACT } from "@/features/day-state/restDayBehavior";

type Props = {
  routineId: string;
  daySummaryCounts: {
    strength: number;
    cardio: number;
    unknown: number;
  };
  routineDayId: string;
  backHref: string;
  dayIndex: number;
  name: string | null;
  isRest: boolean;
};

const REST_TOGGLE_SLOT_ID = "edit-day-rest-toggle-slot";

export function EditDaySettingsAutosaveForm({ routineId, daySummaryCounts, routineDayId, backHref, dayIndex, name, isRest }: Props) {
  const toast = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialSnapshot = useMemo(() => JSON.stringify({ name: name ?? "", isRest }), [isRest, name]);
  const pendingSnapshotRef = useRef<{ name: string; isRest: boolean } | null>(null);
  const lastSubmittedRef = useRef(initialSnapshot);
  const [draft, setDraft] = useState({ name: name ?? "", isRest });
  const [restToggleSlot, setRestToggleSlot] = useState<HTMLElement | null>(null);
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

  useEffect(() => {
    const syncSlot = () => setRestToggleSlot(document.getElementById(REST_TOGGLE_SLOT_ID));
    syncSlot();
    const observer = new MutationObserver(syncSlot);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", syncSlot);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncSlot);
    };
  }, []);

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

  const previewDayName = draft.name.trim() || `Day ${dayIndex}`;
  const restToggleButton = (
    <DockButton
      type="button"
      variant="secondary"
      aria-pressed={draft.isRest}
      onClick={() => {
        const nextSnapshot = { ...draft, isRest: !draft.isRest };
        setDraft(nextSnapshot);
        scheduleAutosave(nextSnapshot);
      }}
    >
      {draft.isRest ? "Rest On" : "Rest Off"}
    </DockButton>
  );

  return (
    <form ref={formRef} id="routine-day-settings-form" className="space-y-3" onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="routineDayId" value={routineDayId} />
      <NavigationReturnInput fallbackHref={getRoutineDayViewHref(routineId, routineDayId)} value={backHref} />
      <RoutineEditorPageHeader
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
        subtitle={<DayTaxonomyHeaderSummary dayName={previewDayName} summary={daySummaryCounts} isRest={draft.isRest} />}
        action={<TopRightBackButton href={backHref} ariaLabel="Back to Day" historyBehavior="fallback-only" />}
      />
      {restToggleSlot ? createPortal(restToggleButton, restToggleSlot) : null}
    </form>
  );
}
