"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RoutineEditorPageHeader,
  RoutineEditorTitleInput,
} from "@/components/routines/RoutineEditorShared";
import { DayRestToggleDockControl } from "@/components/day/DayRestToggleDockControl";
import { DayTaxonomyHeaderSummary } from "@/components/day-list/DayTaxonomyHeaderSummary";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import { updateRoutineDaySettingsAction } from "@/app/routines/[id]/edit/day/actions";
import { getRoutineDayViewHref } from "@/lib/routine-day-navigation";
import { formatRoutineDayDisplayName, getRoutineDayEditableName } from "@/lib/routines";
import { REST_DAY_BEHAVIOR_CONTRACT } from "@/features/day-state/restDayBehavior";
import { subscribeScreenFocusMode } from "@/lib/screen-focus-mode";

type Props = {
  routineId: string;
  daySummaryCounts: {
    strength: number;
    cardio: number;
    bodyweight: number;
    unknown: number;
  };
  routineDayId: string;
  backHref: string;
  dayIndex: number;
  name: string | null;
  startDate: string | null;
  isRest: boolean;
  floatingHeaderSlotId?: string;
  headerActionSlotId?: string;
};

const REST_TOGGLE_SLOT_ID = "edit-day-rest-toggle-slot";

export function EditDaySettingsAutosaveForm({ routineId, daySummaryCounts, routineDayId, backHref, dayIndex, name, startDate, isRest, floatingHeaderSlotId, headerActionSlotId }: Props) {
  const toast = useToast();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialEditableName = useMemo(
    () => getRoutineDayEditableName({ name, dayIndex, startDate }),
    [dayIndex, name, startDate],
  );
  const initialSnapshot = useMemo(() => JSON.stringify({ name: initialEditableName, isRest }), [initialEditableName, isRest]);
  const pendingSnapshotRef = useRef<{ name: string; isRest: boolean } | null>(null);
  const lastSubmittedRef = useRef(initialSnapshot);
  const [draft, setDraft] = useState({ name: initialEditableName, isRest });
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  const [restToggleSlot, setRestToggleSlot] = useState<HTMLElement | null>(null);
  const [floatingHeaderSlot, setFloatingHeaderSlot] = useState<HTMLElement | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    const nextDraft = { name: initialEditableName, isRest };
    setDraft(nextDraft);
    pendingSnapshotRef.current = nextDraft;
    lastSubmittedRef.current = JSON.stringify(nextDraft);
  }, [initialEditableName, isRest]);

  useEffect(() => {
    const syncSlot = () => {
      setRestToggleSlot(document.getElementById(REST_TOGGLE_SLOT_ID));
      if (floatingHeaderSlotId) {
        setFloatingHeaderSlot(document.getElementById(floatingHeaderSlotId));
      }
    };
    syncSlot();
    const observer = new MutationObserver(syncSlot);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    window.addEventListener("resize", syncSlot);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncSlot);
    };
  }, [floatingHeaderSlotId]);

  useEffect(() => subscribeScreenFocusMode("edit-day", setIsFocusModeActive), []);

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

  const previewDayName = formatRoutineDayDisplayName({
    name: draft.name,
    dayIndex,
    startDate,
  });
  const restToggleButton = (
    <DayRestToggleDockControl
      isRest={draft.isRest}
      onToggle={() => {
        const nextSnapshot = { ...draft, isRest: !draft.isRest };
        setDraft(nextSnapshot);
        scheduleAutosave(nextSnapshot);
      }}
    />
  );

  const headerNode = (
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
          placeholder="Custom day name"
          ariaLabel="Day Name"
          maxLength={15}
        />
      )}
      subtitle={<DayTaxonomyHeaderSummary dayName={previewDayName} summary={daySummaryCounts} isRest={draft.isRest} />}
      action={<TopRightBackButton href={backHref} ariaLabel="Back to Day" historyBehavior="fallback-only" />}
    >
      {headerActionSlotId ? (
        <div className={appTokens.routineEditorHeaderSlot}>
          <div id={headerActionSlotId} className={appTokens.routineEditorFill} />
        </div>
      ) : null}
    </RoutineEditorPageHeader>
  );

  return (
    <form ref={formRef} id="routine-day-settings-form" className={appTokens.routineEditorCompactStack} onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="routineDayId" value={routineDayId} />
      <NavigationReturnInput fallbackHref={getRoutineDayViewHref(routineId, routineDayId)} value={backHref} />
      {!isFocusModeActive ? (floatingHeaderSlot ? createPortal(headerNode, floatingHeaderSlot) : headerNode) : null}
      {restToggleSlot ? createPortal(restToggleButton, restToggleSlot) : null}
    </form>
  );
}
