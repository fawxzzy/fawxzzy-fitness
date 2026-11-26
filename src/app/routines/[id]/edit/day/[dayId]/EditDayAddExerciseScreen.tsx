"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExerciseChooserAddFlowForm } from "@/components/exercises/ExerciseChooserAddFlowForm";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import type { ProgressionPlaybookId } from "@/lib/progression-playbooks";
import { hasWorkoutPlanNameConflict, normalizeWorkoutPlanNameCandidate } from "@/lib/workout-plan-template-name";
import { useFieldNotice } from "@/components/ui/FieldNotice";
import { FormField, formFieldControlClassName } from "@/components/ui/FormField";
import { AppButton } from "@/components/ui/AppButton";
import { cn } from "@/lib/cn";

type ExerciseOption = {
  id: string;
  name: string;
  user_id: string | null;
  is_global: boolean;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  measurement_type: "reps" | "time" | "distance" | "time_distance" | "none";
  default_unit: string | null;
  calories_estimation_method: string | null;
  image_howto_path: string | null;
  how_to_short?: string | null;
  image_icon_path?: string | null;
  slug?: string | null;
  kind?: string | null;
  type?: string | null;
  tags?: string[] | string | null;
  categories?: string[] | string | null;
};

export function EditDayAddExerciseScreen({
  routineId,
  routineDayId,
  dayIndex,
  cycleLengthDays,
  exercises,
  initialSelectedId,
  weightUnit,
  defaultProgressionPlaybookId,
  defaultProgressionPlaybookConfig,
  addExerciseAction,
  resolveWorkoutPlanDecisionAction,
  loadWorkoutPlanDecisionStateAction,
  exerciseStats,
  backHref,
  workoutPlanId = null,
  requiresWorkoutPlanEditDecision = false,
  existingWorkoutPlanNames = [],
  dayName = null,
}: {
  routineId: string;
  routineDayId: string;
  dayIndex: number;
  cycleLengthDays: number;
  exercises: ExerciseOption[];
  initialSelectedId?: string;
  weightUnit: "lbs" | "kg";
  defaultProgressionPlaybookId?: ProgressionPlaybookId | null;
  defaultProgressionPlaybookConfig?: Record<string, unknown> | null;
  addExerciseAction: (formData: FormData) => Promise<ActionResult>;
  resolveWorkoutPlanDecisionAction: (
    formData: FormData,
  ) => Promise<ActionResult & { workoutPlanId?: string; workoutPlanName?: string; templateId?: string; templateName?: string; syncMode?: "sync" }>;
  loadWorkoutPlanDecisionStateAction: (
    formData: FormData,
  ) => Promise<ActionResult & {
    workoutPlanId?: string | null;
    requiresWorkoutPlanEditDecision?: boolean;
    templateId?: string | null;
    requiresTemplateEditDecision?: boolean;
    syncMode?: "sync";
  }>;
  exerciseStats: ExerciseStatsOption[];
  backHref: string;
  workoutPlanId?: string | null;
  requiresWorkoutPlanEditDecision?: boolean;
  existingWorkoutPlanNames?: Array<string | null | undefined>;
  /** Shown in the shared-day sheet title: "Save to <day name>". */
  dayName?: string | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const [workoutPlanDecisionOpen, setWorkoutPlanDecisionOpen] = useState(false);
  const [workoutPlanDecisionMode, setWorkoutPlanDecisionMode] = useState<"update_existing" | "save_new">("update_existing");
  const [workoutPlanDecisionName, setWorkoutPlanDecisionName] = useState("");
  const [workoutPlanDecisionError, setWorkoutPlanDecisionErrorState] = useState<string | null>(null);
  // Errors from the shared-day choice go through the in-flow notice system (shown in the sheet), never as red text.
  // The notice is reported on every call, not only when the message text changes, so the same error repeated after
  // the 6 s notice has gone shows again.
  const { report: reportDecisionNotice, clear: clearDecisionNotice } = useFieldNotice("add-exercise-plan-decision");
  const setWorkoutPlanDecisionError = (message: string | null) => {
    setWorkoutPlanDecisionErrorState(message);
    if (message) {
      reportDecisionNotice(message);
    } else {
      clearDecisionNotice();
    }
  };
  useEffect(() => clearDecisionNotice, [clearDecisionNotice]);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [activeWorkoutPlanId, setActiveWorkoutPlanId] = useState<string | null>(workoutPlanId);
  const [requiresWorkoutPlanDecision, setRequiresWorkoutPlanDecision] = useState(requiresWorkoutPlanEditDecision);
  const [shouldSyncWorkoutPlanOnSave, setShouldSyncWorkoutPlanOnSave] = useState(
    Boolean(workoutPlanId) && !requiresWorkoutPlanEditDecision,
  );
  const [isWorkoutPlanDecisionPending, startWorkoutPlanDecisionTransition] = useTransition();

  const syncWorkoutPlanDecisionState = async () => {
    const stateFormData = new FormData();
    stateFormData.set("routineId", routineId);
    stateFormData.set("routineDayId", routineDayId);
    const stateResult = await loadWorkoutPlanDecisionStateAction(stateFormData);
    if (stateResult.ok) {
      setActiveWorkoutPlanId(stateResult.workoutPlanId ?? stateResult.templateId ?? null);
      setRequiresWorkoutPlanDecision(Boolean(stateResult.requiresWorkoutPlanEditDecision ?? stateResult.requiresTemplateEditDecision));
      setShouldSyncWorkoutPlanOnSave(stateResult.syncMode === "sync");
    }
    return stateResult;
  };

  const wrappedAddExerciseAction = async (formData: FormData): Promise<ActionResult & { handled?: boolean }> => {
    const stateResult = await syncWorkoutPlanDecisionState();
    if (!stateResult.ok) {
      return stateResult;
    }

    const resolvedWorkoutPlanId = stateResult.workoutPlanId ?? stateResult.templateId ?? activeWorkoutPlanId;
    const requiresDecision = Boolean(stateResult.requiresWorkoutPlanEditDecision ?? stateResult.requiresTemplateEditDecision);
    const shouldSync = stateResult.syncMode === "sync" || shouldSyncWorkoutPlanOnSave;

    if (requiresDecision && resolvedWorkoutPlanId) {
      const nextPendingFormData = new FormData();
      for (const [key, value] of formData.entries()) {
        nextPendingFormData.append(key, value);
      }
      setPendingFormData(nextPendingFormData);
      setWorkoutPlanDecisionMode("update_existing");
      setWorkoutPlanDecisionName("");
      setWorkoutPlanDecisionError(null);
      setWorkoutPlanDecisionOpen(true);
      return { ok: false, error: "", handled: true };
    }

    if (shouldSync && resolvedWorkoutPlanId) {
      formData.set("workoutPlanTemplateSyncMode", "sync");
    }

    return addExerciseAction(formData);
  };

  // One handler for both footer buttons: the mode is the button the person pressed, not a separate toggle.
  const submitWorkoutPlanDecision = (mode: "update_existing" | "save_new") => {
    const normalizedWorkoutPlanName = normalizeWorkoutPlanNameCandidate(workoutPlanDecisionName);
    if (mode === "save_new") {
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
        decisionFormData.set("decisionMode", mode);
        if (mode === "save_new") {
          decisionFormData.set("templateName", normalizedWorkoutPlanName);
        }

        const decisionResult = await resolveWorkoutPlanDecisionAction(decisionFormData);
        if (!decisionResult.ok) {
          setWorkoutPlanDecisionError(decisionResult.error ?? "Could not update day.");
          return;
        }

        if (!pendingFormData) {
          setWorkoutPlanDecisionOpen(false);
          return;
        }

        const resumedFormData = new FormData();
        for (const [key, value] of pendingFormData.entries()) {
          resumedFormData.append(key, value);
        }
        resumedFormData.set("workoutPlanTemplateSyncMode", "sync");

        const addResult = await addExerciseAction(resumedFormData);
        if (!addResult.ok) {
          toastActionResult(toast, addResult, {
            success: "Exercise added to the day.",
            error: "Could not add exercise to the day.",
          });
          return;
        }

        setWorkoutPlanDecisionOpen(false);
        setWorkoutPlanDecisionError(null);
        setPendingFormData(null);
        setRequiresWorkoutPlanDecision(false);
        setShouldSyncWorkoutPlanOnSave(decisionResult.syncMode === "sync");
        if (decisionResult.workoutPlanId ?? decisionResult.templateId) {
          setActiveWorkoutPlanId(decisionResult.workoutPlanId ?? decisionResult.templateId ?? null);
        }
        if (decisionResult.workoutPlanName ?? decisionResult.templateName) {
          toast.success(
            mode === "update_existing"
              ? `Day updated: ${decisionResult.workoutPlanName ?? decisionResult.templateName}`
              : `New day saved: ${decisionResult.workoutPlanName ?? decisionResult.templateName}`,
          );
        }
        toastActionResult(toast, addResult, {
          success: "Exercise added to the day.",
          error: "Could not add exercise to the day.",
        });
        if (addResult.ok) {
          router.push(backHref);
          router.refresh();
        }
      })();
    });
  };

  return (
    <>
      <ExerciseChooserAddFlowForm
        formId="routine-day-add-exercise-form"
        hiddenFields={{ routineId, routineDayId }}
        cycleLengthDays={cycleLengthDays}
        progressionExampleDayNumber={dayIndex}
        exercises={exercises}
        initialSelectedId={initialSelectedId}
        weightUnit={weightUnit}
        defaultProgressionPlaybookId={defaultProgressionPlaybookId}
        defaultProgressionPlaybookConfig={defaultProgressionPlaybookConfig}
        exerciseStats={exerciseStats}
        customExerciseEnabled
        backHref={backHref}
        addExerciseAction={wrappedAddExerciseAction}
        successMessage="Exercise added to the day."
        errorMessage="Could not add exercise to the day."
      />
      <ConfirmDestructiveModal
        open={workoutPlanDecisionOpen}
        // DESIGN #5: name the day being changed, and make the two choices the two footer buttons.
        title={workoutPlanDecisionMode === "update_existing"
          ? `Save to ${dayName?.trim() || "this day"}`
          : `New day from ${dayName?.trim() || "this day"}`}
        titleVariant="raw"
        description={workoutPlanDecisionMode === "update_existing"
          ? "Other days use this day too. Update it and they all get this exercise, or save your change as a new day."
          : "Name the new day. Your edits keep saving to it."}
        confirmLabel="Update day"
        cancelLabel="Cancel"
        confirmVariant="primary"
        isLoading={isWorkoutPlanDecisionPending}
        hideCancelAction
        attachedFooter={workoutPlanDecisionMode === "update_existing" ? (
          <div className="grid grid-cols-2 gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              disabled={isWorkoutPlanDecisionPending}
              onClick={() => {
                setWorkoutPlanDecisionMode("save_new");
                setWorkoutPlanDecisionError(null);
              }}
              data-workout-plan-decision="save-new"
            >
              Save as new day
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="md"
              fullWidth
              loading={isWorkoutPlanDecisionPending}
              onClick={() => submitWorkoutPlanDecision("update_existing")}
              data-workout-plan-decision="update"
            >
              Update day
            </AppButton>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <AppButton
              type="button"
              variant="secondary"
              size="md"
              fullWidth
              disabled={isWorkoutPlanDecisionPending}
              onClick={() => {
                setWorkoutPlanDecisionMode("update_existing");
                setWorkoutPlanDecisionError(null);
              }}
              data-workout-plan-decision="back"
            >
              Back
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="md"
              fullWidth
              loading={isWorkoutPlanDecisionPending}
              disabled={normalizeWorkoutPlanNameCandidate(workoutPlanDecisionName).length === 0}
              onClick={() => submitWorkoutPlanDecision("save_new")}
              data-workout-plan-decision="save-new-confirm"
            >
              Save new day
            </AppButton>
          </div>
        )}
        onCancel={() => {
          setWorkoutPlanDecisionOpen(false);
          setWorkoutPlanDecisionError(null);
          setPendingFormData(null);
          setWorkoutPlanDecisionMode("update_existing");
        }}
        onConfirm={() => submitWorkoutPlanDecision(workoutPlanDecisionMode)}
      >
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
      </ConfirmDestructiveModal>
    </>
  );
}
