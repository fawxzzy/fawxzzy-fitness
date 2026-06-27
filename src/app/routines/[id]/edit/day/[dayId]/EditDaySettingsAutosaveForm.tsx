"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import {
  RoutineEditorPageHeader,
  RoutineEditorTitleInput,
} from "@/components/routines/RoutineEditorShared";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import { updateRoutineDaySettingsAction } from "@/app/routines/[id]/edit/day/actions";
import type { ActionResult } from "@/lib/action-result";
import { cn } from "@/lib/cn";
import { cycleSetFlowDirection, type SetFlowDirection } from "@/lib/set-flow-directions";
import { getRoutineOverviewHref } from "@/lib/routine-day-navigation";
import { getRoutineDayEditableName } from "@/lib/routines";
import { REST_DAY_BEHAVIOR_CONTRACT } from "@/features/day-state/restDayBehavior";
import { publishEditDayAdjustmentDirection, subscribeEditDayAutoProgressionVisibility, subscribeScreenFocusMode, subscribeScreenMode } from "@/lib/screen-focus-mode";
import { hasWorkoutPlanTemplateNameConflict, normalizeWorkoutPlanTemplateNameCandidate } from "@/lib/workout-plan-template-name";

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
  resolveTemplateDecisionAction: (
    formData: FormData,
  ) => Promise<ActionResult & { templateId?: string; templateName?: string; syncMode?: "sync" }>;
  workoutPlanTemplateId?: string | null;
  requiresWorkoutPlanTemplateEditDecision?: boolean;
  existingWorkoutPlanTemplateNames?: Array<string | null | undefined>;
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

export function EditDaySettingsAutosaveForm({
  routineId,
  daySummaryCounts: _daySummaryCounts,
  routineDayId,
  backHref,
  dayIndex,
  name,
  startDate,
  isRest,
  showDayAdjustmentControl = false,
  initialDayAdjustmentDirection = "straight",
  floatingHeaderSlotId,
  resolveTemplateDecisionAction,
  workoutPlanTemplateId = null,
  requiresWorkoutPlanTemplateEditDecision = false,
  existingWorkoutPlanTemplateNames = [],
}: Props) {
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
  const [activeWorkoutPlanTemplateId, setActiveWorkoutPlanTemplateId] = useState<string | null>(workoutPlanTemplateId);
  const [requiresTemplateEditDecision, setRequiresTemplateEditDecision] = useState(requiresWorkoutPlanTemplateEditDecision);
  const [shouldSyncTemplateOnSave, setShouldSyncTemplateOnSave] = useState(
    Boolean(workoutPlanTemplateId) && !requiresWorkoutPlanTemplateEditDecision,
  );
  const [templateDecisionOpen, setTemplateDecisionOpen] = useState(false);
  const [templateDecisionMode, setTemplateDecisionMode] = useState<"update_existing" | "save_new">("update_existing");
  const [templateDecisionName, setTemplateDecisionName] = useState("");
  const [templateDecisionError, setTemplateDecisionError] = useState<string | null>(null);
  const [isTemplateDecisionPending, startTemplateDecisionTransition] = useTransition();

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
    setActiveWorkoutPlanTemplateId(workoutPlanTemplateId);
    setRequiresTemplateEditDecision(requiresWorkoutPlanTemplateEditDecision);
    setShouldSyncTemplateOnSave(Boolean(workoutPlanTemplateId) && !requiresWorkoutPlanTemplateEditDecision);
  }, [requiresWorkoutPlanTemplateEditDecision, workoutPlanTemplateId]);

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
    requiresTemplateEditDecision && Boolean(activeWorkoutPlanTemplateId)
  ), [activeWorkoutPlanTemplateId, requiresTemplateEditDecision]);

  const openTemplateDecision = useCallback(() => {
    setTemplateDecisionMode("update_existing");
    setTemplateDecisionName("");
    setTemplateDecisionError(null);
    setTemplateDecisionOpen(true);
  }, []);

  const submitAutosave = useCallback((options?: { forceTemplateSync?: boolean }) => {
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

    if (!options?.forceTemplateSync && shouldGateTemplateEditDecision()) {
      openTemplateDecision();
      return;
    }

    if ((options?.forceTemplateSync || shouldSyncTemplateOnSave) && activeWorkoutPlanTemplateId) {
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
    activeWorkoutPlanTemplateId,
    isDayAdjustmentVisible,
    openTemplateDecision,
    shouldGateTemplateEditDecision,
    shouldSyncTemplateOnSave,
    toast,
  ]);

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
      <ConfirmDestructiveModal
        open={templateDecisionOpen}
        title="Workout Plan Template"
        description={templateDecisionMode === "update_existing"
          ? "Update this shared template so linked workout plans stay in sync."
          : "Save this workout plan as a new template before these edits continue autosaving."}
        confirmLabel="Confirm"
        confirmActionLabel={templateDecisionMode === "update_existing" ? "Update Template" : "Save New Template"}
        cancelLabel="Cancel"
        confirmVariant="primary"
        confirmDisabled={templateDecisionMode === "save_new" && normalizeWorkoutPlanTemplateNameCandidate(templateDecisionName).length === 0}
        isLoading={isTemplateDecisionPending}
        onCancel={() => {
          setTemplateDecisionOpen(false);
          setTemplateDecisionError(null);
        }}
        onConfirm={() => {
          const normalizedTemplateName = normalizeWorkoutPlanTemplateNameCandidate(templateDecisionName);
          if (templateDecisionMode === "save_new") {
            if (!normalizedTemplateName) {
              setTemplateDecisionError("Template name is required.");
              return;
            }
            if (hasWorkoutPlanTemplateNameConflict({
              candidateName: normalizedTemplateName,
              templateNames: existingWorkoutPlanTemplateNames,
            })) {
              setTemplateDecisionError("Template name already exists.");
              return;
            }
          }

          startTemplateDecisionTransition(() => {
            void (async () => {
              const decisionFormData = new FormData();
              decisionFormData.set("routineId", routineId);
              decisionFormData.set("routineDayId", routineDayId);
              decisionFormData.set("decisionMode", templateDecisionMode);
              if (templateDecisionMode === "save_new") {
                decisionFormData.set("templateName", normalizedTemplateName);
              }

              const result = await resolveTemplateDecisionAction(decisionFormData);
              if (!result.ok) {
                setTemplateDecisionError(result.error ?? "Could not update workout plan template.");
                return;
              }

              setTemplateDecisionOpen(false);
              setTemplateDecisionError(null);
              setRequiresTemplateEditDecision(false);
              setShouldSyncTemplateOnSave(result.syncMode === "sync");
              if (result.templateId) {
                setActiveWorkoutPlanTemplateId(result.templateId);
              }
              if (result.templateName) {
                toast.success(
                  templateDecisionMode === "update_existing"
                    ? `Template updated: ${result.templateName}`
                    : `New template saved: ${result.templateName}`,
                );
              }
              submitAutosave({ forceTemplateSync: true });
            })();
          });
        }}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={cn(
                "min-h-11 rounded-[0.95rem] border px-3 py-2 text-sm font-semibold transition",
                templateDecisionMode === "update_existing"
                  ? "border-[rgb(var(--accent)/0.34)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--text-primary))]"
                  : "border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.56)] text-[rgb(var(--text-secondary)/0.88)]",
              )}
              onClick={() => {
                setTemplateDecisionMode("update_existing");
                setTemplateDecisionError(null);
              }}
            >
              Update Template
            </button>
            <button
              type="button"
              className={cn(
                "min-h-11 rounded-[0.95rem] border px-3 py-2 text-sm font-semibold transition",
                templateDecisionMode === "save_new"
                  ? "border-[rgb(var(--accent)/0.34)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--text-primary))]"
                  : "border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.56)] text-[rgb(var(--text-secondary)/0.88)]",
              )}
              onClick={() => {
                setTemplateDecisionMode("save_new");
                setTemplateDecisionError(null);
              }}
            >
              Save New Template
            </button>
          </div>
          {templateDecisionMode === "save_new" ? (
            <label className="block">
              <span className="sr-only">Template name</span>
              <input
                type="text"
                value={templateDecisionName}
                onChange={(event) => {
                  setTemplateDecisionName(event.target.value.slice(0, 15));
                  setTemplateDecisionError(null);
                }}
                placeholder="Template name"
                maxLength={15}
                className={cn(
                  "w-full rounded-[0.95rem] border bg-[rgb(var(--surface-2-rgb)/0.62)] px-3 py-2.5 text-center text-sm text-[rgb(var(--text-primary))] outline-none transition",
                  templateDecisionError
                    ? "border-[rgb(var(--danger-rgb)/0.52)]"
                    : "border-[rgb(var(--border-strong)/0.16)] focus:border-[rgb(var(--accent)/0.32)] focus:ring-2 focus:ring-[rgb(var(--accent)/0.16)]",
                )}
              />
            </label>
          ) : null}
          {templateDecisionError ? (
            <p className="text-center text-[12px] font-medium text-[rgb(var(--danger-rgb)/0.94)]">
              {templateDecisionError}
            </p>
          ) : null}
        </div>
      </ConfirmDestructiveModal>
    </form>
  );
}
