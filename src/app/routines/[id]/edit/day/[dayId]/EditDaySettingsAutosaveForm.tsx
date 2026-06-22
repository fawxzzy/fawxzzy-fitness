"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  RoutineEditorPageHeader,
  RoutineEditorTitleInput,
} from "@/components/routines/RoutineEditorShared";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import { updateRoutineDaySettingsAction } from "@/app/routines/[id]/edit/day/actions";
import { cn } from "@/lib/cn";
import { cycleSetFlowDirection, type SetFlowDirection } from "@/lib/set-flow-directions";
import { getRoutineOverviewHref } from "@/lib/routine-day-navigation";
import { getRoutineDayEditableName } from "@/lib/routines";
import { REST_DAY_BEHAVIOR_CONTRACT } from "@/features/day-state/restDayBehavior";
import { publishEditDayAdjustmentDirection, subscribeEditDayAutoProgressionVisibility, subscribeScreenFocusMode, subscribeScreenMode } from "@/lib/screen-focus-mode";

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
  showDayAdjustmentControl?: boolean;
  initialDayAdjustmentDirection?: SetFlowDirection;
  floatingHeaderSlotId?: string;
};

function EditDayDirectionGlyph({
  direction,
  className,
}: {
  direction: SetFlowDirection;
  className?: string;
}) {
  if (direction === "up") {
    return <span aria-hidden="true" className={cn("text-[15px] leading-none font-semibold", className)}>{"\u2191"}</span>;
  }

  if (direction === "down") {
    return <span aria-hidden="true" className={cn("text-[15px] leading-none font-semibold", className)}>{"\u2193"}</span>;
  }

  return <span aria-hidden="true" className={cn("inline-block h-[2px] w-4 rounded-full bg-current", className)} />;
}

function EditDayAdjustmentButton({
  dayNumber,
  direction,
  onClick,
}: {
  dayNumber: number;
  direction: SetFlowDirection;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--accent-divider-rgb)/0.32)] bg-transparent p-0 transition-[border-color,background-color,transform] focus-visible:outline-none focus-visible:ring-2",
        direction === "up"
          ? "hover:bg-[rgb(var(--accent)/0.12)] focus-visible:ring-[rgb(var(--accent)/0.22)]"
          : direction === "down"
            ? "hover:bg-[rgb(var(--danger-rgb)/0.12)] focus-visible:ring-[rgb(var(--danger-rgb)/0.22)]"
            : "hover:bg-[rgb(var(--accent-yellow-on)/0.12)] focus-visible:ring-[rgb(var(--accent-yellow-on)/0.22)]",
      )}
      aria-label={`Cycle slot ${dayNumber} adjustment`}
    >
      <span className="flex h-4.5 items-center justify-center">
        <EditDayDirectionGlyph
          direction={direction}
          className={cn(
            direction === "up"
              ? "text-[rgb(var(--accent)/0.88)]"
              : direction === "down"
                ? "text-[rgb(var(--danger-rgb)/0.94)]"
                : "text-[rgb(var(--accent-yellow-on))]",
          )}
        />
      </span>
    </button>
  );
}

export function EditDaySettingsAutosaveForm({ routineId, daySummaryCounts: _daySummaryCounts, routineDayId, backHref, dayIndex, name, startDate, isRest, showDayAdjustmentControl = false, initialDayAdjustmentDirection = "straight", floatingHeaderSlotId }: Props) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialEditableName = useMemo(
    () => getRoutineDayEditableName({ name, dayIndex, startDate }),
    [dayIndex, name, startDate],
  );
  const initialSnapshot = useMemo(
    () => JSON.stringify({ name: initialEditableName, isRest, dayAdjustmentDirection: initialDayAdjustmentDirection }),
    [initialDayAdjustmentDirection, initialEditableName, isRest],
  );
  const pendingSnapshotRef = useRef<{ name: string; isRest: boolean; dayAdjustmentDirection: SetFlowDirection } | null>(null);
  const lastSubmittedRef = useRef(initialSnapshot);
  const [draft, setDraft] = useState({ name: initialEditableName, isRest, dayAdjustmentDirection: initialDayAdjustmentDirection });
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  const [isReorderModeActive, setIsReorderModeActive] = useState(false);
  const [isDayAdjustmentVisible, setIsDayAdjustmentVisible] = useState(showDayAdjustmentControl);
  const [floatingHeaderSlot, setFloatingHeaderSlot] = useState<HTMLElement | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    const nextDraft = { name: initialEditableName, isRest, dayAdjustmentDirection: initialDayAdjustmentDirection };
    setDraft(nextDraft);
    setIsDayAdjustmentVisible(showDayAdjustmentControl);
    pendingSnapshotRef.current = nextDraft;
    lastSubmittedRef.current = JSON.stringify(nextDraft);
  }, [initialDayAdjustmentDirection, initialEditableName, isRest, showDayAdjustmentControl]);

  useEffect(() => {
    if (!isDayAdjustmentVisible) {
      return;
    }

    publishEditDayAdjustmentDirection({
      screen: "edit-day",
      direction: draft.dayAdjustmentDirection,
    });
  }, [draft.dayAdjustmentDirection, isDayAdjustmentVisible]);

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
  useEffect(() => subscribeEditDayAutoProgressionVisibility(setIsDayAdjustmentVisible), []);

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
    if (isDayAdjustmentVisible) {
      formData.set("dayAdjustmentDirection", nextSnapshot.dayAdjustmentDirection);
    } else {
      formData.delete("dayAdjustmentDirection");
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
  }, [isDayAdjustmentVisible, toast]);

  const scheduleAutosave = useCallback((nextSnapshot: { name: string; isRest: boolean; dayAdjustmentDirection: SetFlowDirection }) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pendingSnapshotRef.current = nextSnapshot;
    timeoutRef.current = setTimeout(submitAutosave, 500);
  }, [submitAutosave]);

  const headerNode = (
    <RoutineEditorPageHeader
      title={(
        <div data-app-header-raw-title="true" className="mx-auto block w-fit max-w-full">
          <RoutineEditorTitleInput
            name="name"
            value={draft.name}
            onChange={(nextValue) => {
              const nextSnapshot: typeof draft = { ...draft, name: nextValue };
              setDraft(nextSnapshot);
              scheduleAutosave(nextSnapshot);
            }}
            placeholder="Workout Plan"
            ariaLabel="Workout Plan Name"
            maxLength={15}
            className="text-center"
            hideLabel
            plainShell
          />
        </div>
      )}
      action={(
        <TopRightBackButton
          href={backHref}
          ariaLabel="Back to routines"
          historyBehavior="history-first"
          className="translate-y-[2px] scale-[1.03]"
        />
      )}
      align="center"
      withPanel={false}
      showSeparator={false}
    />
  );

  return (
    <form ref={formRef} id="routine-day-settings-form" className={appTokens.routineEditorCompactStack} onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="routineDayId" value={routineDayId} />
      <NavigationReturnInput fallbackHref={getRoutineOverviewHref()} value={backHref} />
      {!isFocusModeActive ? (floatingHeaderSlot ? createPortal(headerNode, floatingHeaderSlot) : headerNode) : null}
    </form>
  );
}
