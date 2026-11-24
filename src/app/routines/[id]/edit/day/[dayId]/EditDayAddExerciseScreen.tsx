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
import { SegmentedControl } from "@/components/ui/SegmentedControl";
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
          setPendingFormData(null);
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
                  workoutPlanDecisionMode === "update_existing"
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
        }}
      >
        <div className="space-y-3">
          <SegmentedControl
            ariaLabel="How to add this exercise to the shared day"
            size="sm"
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
    </>
  );
}
