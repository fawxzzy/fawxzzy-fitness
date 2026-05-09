"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  RoutineEditorPageHeader,
} from "@/components/routines/RoutineEditorShared";
import { DayTaxonomyHeaderSummary } from "@/components/day-list/DayTaxonomyHeaderSummary";
import { RoutineDayHeaderTitle } from "@/components/ui/app/RoutineDayHeaderTitle";
import { LabeledEditorField, labeledEditorFieldControlClassName } from "@/components/ui/LabeledEditorField";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import { updateRoutineDaySettingsAction } from "@/app/routines/[id]/edit/day/actions";
import { cn } from "@/lib/cn";
import { getRoutineOverviewHref } from "@/lib/routine-day-navigation";
import { formatRoutineDayDisplayName, getRoutineDayEditableName } from "@/lib/routines";
import { REST_DAY_BEHAVIOR_CONTRACT } from "@/features/day-state/restDayBehavior";
import { publishEditDayCloseExpandedCard, subscribeScreenFocusMode, subscribeScreenMode } from "@/lib/screen-focus-mode";

type Props = {
  routineId: string;
  daySummaryCounts: {
    strength: number;
    cardio: number;
    bodyweight: number;
    unknown: number;
  };
  routineDayId: string;
  routineName: string;
  backHref: string;
  dayIndex: number;
  name: string | null;
  startDate: string | null;
  isRest: boolean;
  floatingHeaderSlotId?: string;
};

export function EditDaySettingsAutosaveForm({ routineId, daySummaryCounts, routineDayId, routineName, backHref, dayIndex, name, startDate, isRest, floatingHeaderSlotId }: Props) {
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
  const [isReorderModeActive, setIsReorderModeActive] = useState(false);
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
  useEffect(() => subscribeScreenMode("edit-day", (mode) => setIsReorderModeActive(mode === "reorder")), []);

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

  const headerNode = (
    <RoutineEditorPageHeader
      title={<RoutineDayHeaderTitle leadingItems={[routineName.trim() || "Routine"]} dayLabel={previewDayName} dayLabelOrder="day-first" />}
      subtitle={<DayTaxonomyHeaderSummary dayName={previewDayName} summary={daySummaryCounts} isRest={draft.isRest} />}
      action={(
        <TopRightBackButton
          href={backHref}
          ariaLabel="Back to routines"
          historyBehavior="fallback-only"
          onClick={() => publishEditDayCloseExpandedCard()}
          className="translate-y-[2px] scale-[1.03]"
        />
      )}
      align="center"
    />
  );

  return (
    <form ref={formRef} id="routine-day-settings-form" className={appTokens.routineEditorCompactStack} onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="routineDayId" value={routineDayId} />
      <NavigationReturnInput fallbackHref={getRoutineOverviewHref()} value={backHref} />
      {!isFocusModeActive ? (floatingHeaderSlot ? createPortal(headerNode, floatingHeaderSlot) : headerNode) : null}
      {!isFocusModeActive && !isReorderModeActive ? (
        <div className="space-y-3 px-1">
          <label className="mx-auto block w-full max-w-[24rem]">
            <LabeledEditorField label="Day name" className="w-full">
              <input
                name="name"
                value={draft.name}
                onChange={(event) => {
                  const nextSnapshot = { ...draft, name: event.target.value };
                  setDraft(nextSnapshot);
                  scheduleAutosave(nextSnapshot);
                }}
                placeholder="Custom day name"
                aria-label="Day name"
                maxLength={15}
                className={cn(
                  labeledEditorFieldControlClassName,
                  "h-14 px-[10px] py-3 text-center text-base font-semibold",
                )}
              />
            </LabeledEditorField>
          </label>
        </div>
      ) : null}
    </form>
  );
}
