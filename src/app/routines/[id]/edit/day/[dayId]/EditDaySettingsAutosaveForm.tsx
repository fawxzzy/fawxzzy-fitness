"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useFieldErrorNotice } from "@/components/ui/FieldNotice";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { RoutineDayKindSelector, type RoutineDayKind } from "@/components/routines/RoutineDayKindSelector";
import { RoutineEditorTitleInput } from "@/components/routines/RoutineEditorShared";
import { ScreenHeader } from "@/components/ui/app/ScreenHeader";
import { ScreenHeaderBackButton } from "@/components/ui/app/ScreenHeaderBackButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import { updateRoutineDaySettingsAction } from "@/app/routines/[id]/edit/day/actions";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import { cycleSetFlowDirection, type SetFlowDirection } from "@/lib/set-flow-directions";
import { getRoutineOverviewHref } from "@/lib/routine-day-navigation";
import { formatRoutineDayStableDisplayName, getRoutineDayEditableName, resolveRoutineDaySettingsSubmitName } from "@/lib/routines";
import { REST_DAY_BEHAVIOR_CONTRACT } from "@/features/day-state/restDayBehavior";
import { publishEditDayAdjustmentDirection, subscribeEditDayAutoProgressionVisibility, subscribeScreenFocusMode, subscribeScreenMode } from "@/lib/screen-focus-mode";
import { hasWorkoutPlanNameConflict, normalizeWorkoutPlanNameCandidate } from "@/lib/workout-plan-template-name";
import { FormField, formFieldControlClassName } from "@/components/ui/FormField";

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
  routineName?: string | null;
  startDate: string | null;
  isRest: boolean;
  isOptional: boolean;
  showDayAdjustmentControl?: boolean;
  initialDayAdjustmentDirection?: SetFlowDirection;
  floatingHeaderSlotId?: string;
  resolveWorkoutPlanDecisionAction: (
    formData: FormData,
  ) => Promise<ActionResult & { workoutPlanId?: string; workoutPlanName?: string; templateId?: string; templateName?: string; syncMode?: "sync" }>;
  workoutPlanId?: string | null;
  requiresWorkoutPlanEditDecision?: boolean;
  existingWorkoutPlanNames?: Array<string | null | undefined>;
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
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgb(var(--accent-divider-rgb)/0.32)] bg-transparent p-0 transition-[border-color,background-color,transform] focus-visible:outline-none focus-visible:ring-2",
        direction === "up"
          ? "hover:bg-[rgb(var(--accent)/0.12)] focus-visible:ring-[rgb(var(--accent)/0.22)]"
          : direction === "down"
            ? "hover:bg-[rgb(var(--warning-rgb)/0.12)] focus-visible:ring-[rgb(var(--warning-rgb)/0.22)]"
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
                ? "text-[rgb(var(--warning-rgb)/0.96)]"
                : "text-[rgb(var(--accent-yellow-on))]",
          )}
        />
      </span>
    </button>
  );
}

export function EditDaySettingsAutosaveForm({
  routineId,
  daySummaryCounts: _daySummaryCounts,
  routineDayId,
  backHref,
  dayIndex,
  name,
  routineName = null,
  startDate,
  isRest,
  isOptional,
  showDayAdjustmentControl = false,
  initialDayAdjustmentDirection = "straight",
  floatingHeaderSlotId,
  resolveWorkoutPlanDecisionAction,
  workoutPlanId = null,
  requiresWorkoutPlanEditDecision = false,
  existingWorkoutPlanNames = [],
}: Props) {
  const toast = useToast();
  const formRef = useRef<HTMLFormElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialEditableName = useMemo(
    () => getRoutineDayEditableName({ name, dayIndex, startDate }),
    [dayIndex, name, startDate],
  );
  const initialSnapshot = useMemo(
    () => JSON.stringify({ name: initialEditableName, isRest, isOptional, dayAdjustmentDirection: initialDayAdjustmentDirection }),
    [initialDayAdjustmentDirection, initialEditableName, isOptional, isRest],
  );
  const pendingSnapshotRef = useRef<{ name: string; isRest: boolean; isOptional: boolean; dayAdjustmentDirection: SetFlowDirection } | null>(null);
  const lastSubmittedRef = useRef(initialSnapshot);
  const [draft, setDraft] = useState({ name: initialEditableName, isRest, isOptional, dayAdjustmentDirection: initialDayAdjustmentDirection });
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);
  const [isReorderModeActive, setIsReorderModeActive] = useState(false);
  const [isDayAdjustmentVisible, setIsDayAdjustmentVisible] = useState(showDayAdjustmentControl);
  const [floatingHeaderSlot, setFloatingHeaderSlot] = useState<HTMLElement | null>(null);
  const [, startTransition] = useTransition();
  const [activeWorkoutPlanId, setActiveWorkoutPlanId] = useState<string | null>(workoutPlanId);
  const [requiresWorkoutPlanDecision, setRequiresWorkoutPlanDecision] = useState(requiresWorkoutPlanEditDecision);
  const [shouldSyncWorkoutPlanOnSave, setShouldSyncWorkoutPlanOnSave] = useState(
    Boolean(workoutPlanId) && !requiresWorkoutPlanEditDecision,
  );
  const [workoutPlanDecisionOpen, setWorkoutPlanDecisionOpen] = useState(false);
  const [workoutPlanDecisionMode, setWorkoutPlanDecisionMode] = useState<"update_existing" | "save_new">("update_existing");
  const [workoutPlanDecisionName, setWorkoutPlanDecisionName] = useState("");
  const [workoutPlanDecisionError, setWorkoutPlanDecisionError] = useState<string | null>(null);
  // Errors go to the sheet's notice slot, never as red text in the dialog (docs/ui/FOUNDATION.md).
  useFieldErrorNotice(workoutPlanDecisionError, { id: "routine-day-settings-decision-error" });
  const [isWorkoutPlanDecisionPending, startWorkoutPlanDecisionTransition] = useTransition();

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    const nextDraft = { name: initialEditableName, isRest, isOptional, dayAdjustmentDirection: initialDayAdjustmentDirection };
    setDraft(nextDraft);
    setIsDayAdjustmentVisible(showDayAdjustmentControl);
    pendingSnapshotRef.current = nextDraft;
    lastSubmittedRef.current = JSON.stringify(nextDraft);
  }, [initialDayAdjustmentDirection, initialEditableName, isOptional, isRest, showDayAdjustmentControl]);

  useEffect(() => {
    setActiveWorkoutPlanId(workoutPlanId);
    setRequiresWorkoutPlanDecision(requiresWorkoutPlanEditDecision);
    setShouldSyncWorkoutPlanOnSave(Boolean(workoutPlanId) && !requiresWorkoutPlanEditDecision);
  }, [requiresWorkoutPlanEditDecision, workoutPlanId]);

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

  const shouldGateTemplateEditDecision = useCallback(() => (
    requiresWorkoutPlanDecision && Boolean(activeWorkoutPlanId)
  ), [activeWorkoutPlanId, requiresWorkoutPlanDecision]);

  const openWorkoutPlanDecision = useCallback(() => {
    setWorkoutPlanDecisionMode("update_existing");
    setWorkoutPlanDecisionName("");
    setWorkoutPlanDecisionError(null);
    setWorkoutPlanDecisionOpen(true);
  }, []);

  const submitAutosave = useCallback((options?: { forceTemplateSync?: boolean }) => {
    const form = formRef.current;
    const nextSnapshot = pendingSnapshotRef.current;
    if (!form) return;
    if (!nextSnapshot) return;
    const formData = new FormData(form);
    const snapshot = JSON.stringify(nextSnapshot);

    formData.set("name", resolveRoutineDaySettingsSubmitName({
      storedName: name,
      displayName: initialEditableName,
      draftName: nextSnapshot.name,
    }));
    if (nextSnapshot.isRest) {
      formData.set("isRest", "on");
    } else {
      formData.delete("isRest");
    }
    if (nextSnapshot.isOptional && !nextSnapshot.isRest) {
      formData.set("isOptional", "on");
    } else {
      formData.delete("isOptional");
    }
    if (isDayAdjustmentVisible) {
      formData.set("dayAdjustmentDirection", nextSnapshot.dayAdjustmentDirection);
    } else {
      formData.delete("dayAdjustmentDirection");
    }

    if (snapshot === lastSubmittedRef.current) return;

    if (!options?.forceTemplateSync && shouldGateTemplateEditDecision()) {
      openWorkoutPlanDecision();
      return;
    }

    if ((options?.forceTemplateSync || shouldSyncWorkoutPlanOnSave) && activeWorkoutPlanId) {
      formData.set("workoutPlanTemplateSyncMode", "sync");
    } else {
      formData.delete("workoutPlanTemplateSyncMode");
    }

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
  }, [
    activeWorkoutPlanId,
    initialEditableName,
    isDayAdjustmentVisible,
    name,
    openWorkoutPlanDecision,
    shouldGateTemplateEditDecision,
    shouldSyncWorkoutPlanOnSave,
    toast,
  ]);

  const scheduleAutosave = useCallback((nextSnapshot: { name: string; isRest: boolean; isOptional: boolean; dayAdjustmentDirection: SetFlowDirection }) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pendingSnapshotRef.current = nextSnapshot;
    timeoutRef.current = setTimeout(submitAutosave, 500);
  }, [submitAutosave]);

  const headerNode = (
    <ScreenHeader
      kind="detail"
      // The saved name, not the draft: the title must not change while the name field is being typed in.
      title={formatRoutineDayStableDisplayName({ name, dayIndex, startDate })}
      subtitle={routineName?.trim() || null}
      back={<ScreenHeaderBackButton href={backHref} label="Back to routine" historyBehavior="history-first" />}
    />
  );

  return (
    <form ref={formRef} id="routine-day-settings-form" className={appTokens.routineEditorCompactStack} onSubmit={(event) => event.preventDefault()}>
      <input type="hidden" name="routineId" value={routineId} />
      <input type="hidden" name="routineDayId" value={routineDayId} />
      <NavigationReturnInput fallbackHref={getRoutineOverviewHref()} value={backHref} />
      {!isFocusModeActive ? (floatingHeaderSlot ? createPortal(headerNode, floatingHeaderSlot) : headerNode) : null}
      <ConfirmDestructiveModal
        open={workoutPlanDecisionOpen}
        title="Day"
        description={workoutPlanDecisionMode === "update_existing"
          ? "Update this shared day so linked days stay in sync."
          : "Save this as a new day before these edits continue autosaving."}
        confirmLabel="Confirm"
        confirmActionLabel={workoutPlanDecisionMode === "update_existing" ? "Update Day" : "Save New Day"}
        cancelLabel="Cancel"
        confirmVariant="primary"
        confirmDisabled={workoutPlanDecisionMode === "save_new" && normalizeWorkoutPlanNameCandidate(workoutPlanDecisionName).length === 0}
        isLoading={isWorkoutPlanDecisionPending}
        onCancel={() => {
          setWorkoutPlanDecisionOpen(false);
          setWorkoutPlanDecisionError(null);
        }}
        onConfirm={() => {
          const normalizedWorkoutPlanName = normalizeWorkoutPlanNameCandidate(workoutPlanDecisionName);
          if (workoutPlanDecisionMode === "save_new") {
            if (!normalizedWorkoutPlanName) {
              setWorkoutPlanDecisionError("Day name is required.");
              return;
            }
            if (hasWorkoutPlanNameConflict({
              candidateName: normalizedWorkoutPlanName,
              workoutPlanNames: existingWorkoutPlanNames,
            })) {
              setWorkoutPlanDecisionError("Day name already exists.");
              return;
            }
          }

          startWorkoutPlanDecisionTransition(() => {
            void (async () => {
              const decisionFormData = new FormData();
              decisionFormData.set("routineId", routineId);
              decisionFormData.set("routineDayId", routineDayId);
              decisionFormData.set("decisionMode", workoutPlanDecisionMode);
              if (workoutPlanDecisionMode === "save_new") {
                decisionFormData.set("templateName", normalizedWorkoutPlanName);
              }

              const result = await resolveWorkoutPlanDecisionAction(decisionFormData);
              if (!result.ok) {
                setWorkoutPlanDecisionError(result.error ?? "Could not update day.");
                return;
              }

              setWorkoutPlanDecisionOpen(false);
              setWorkoutPlanDecisionError(null);
              setRequiresWorkoutPlanDecision(false);
              setShouldSyncWorkoutPlanOnSave(result.syncMode === "sync");
              if (result.workoutPlanId ?? result.templateId) {
                setActiveWorkoutPlanId(result.workoutPlanId ?? result.templateId ?? null);
              }
              if (result.workoutPlanName ?? result.templateName) {
                toast.success(
                  workoutPlanDecisionMode === "update_existing"
                    ? `Day updated: ${result.workoutPlanName ?? result.templateName}`
                    : `New day saved: ${result.workoutPlanName ?? result.templateName}`,
                );
              }
              submitAutosave({ forceTemplateSync: true });
            })();
          });
        }}
      >
        <div className="space-y-3">
          <SegmentedControl
            ariaLabel="How to save this day"
            value={workoutPlanDecisionMode}
            options={[
              { label: "Update Day", value: "update_existing" },
              { label: "Save New Day", value: "save_new" },
            ]}
            onChange={(next) => {
              setWorkoutPlanDecisionMode(next === "save_new" ? "save_new" : "update_existing");
              setWorkoutPlanDecisionError(null);
            }}
          />
          {workoutPlanDecisionMode === "save_new" ? (
            <FormField label="Day name" invalid={Boolean(workoutPlanDecisionError)}>
              {(control) => (
                <input
                  {...control}
                  type="text"
                  value={workoutPlanDecisionName}
                  onChange={(event) => {
                    setWorkoutPlanDecisionName(event.target.value.slice(0, 15));
                    setWorkoutPlanDecisionError(null);
                  }}
                  placeholder="Day name"
                  maxLength={15}
                  className={cn(formFieldControlClassName, "text-center")}
                />
              )}
            </FormField>
          ) : null}
        </div>
      </ConfirmDestructiveModal>
      <RoutineEditorTitleInput
        name="name"
        label="Day name"
        value={draft.name}
        onChange={(nextValue) => {
          const nextSnapshot: typeof draft = { ...draft, name: nextValue };
          setDraft(nextSnapshot);
          scheduleAutosave(nextSnapshot);
        }}
        placeholder={`Day ${dayIndex}`}
        maxLength={15}
      />
      <RoutineDayKindSelector
        value={(draft.isRest ? "rest" : draft.isOptional ? "optional" : "required") satisfies RoutineDayKind}
        onChange={(kind) => {
          const nextSnapshot = {
            ...draft,
            isRest: kind === "rest",
            isOptional: kind === "optional",
          };
          setDraft(nextSnapshot);
          scheduleAutosave(nextSnapshot);
        }}
      />
    </form>
  );
}
