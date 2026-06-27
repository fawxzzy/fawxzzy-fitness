"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExerciseChooserAddFlowForm } from "@/components/exercises/ExerciseChooserAddFlowForm";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";
import type { ExerciseStatsOption } from "@/lib/exercise-picker-stats";
import type { ProgressionPlaybookId } from "@/lib/progression-playbooks";
import { hasWorkoutPlanNameConflict, normalizeWorkoutPlanNameCandidate } from "@/lib/workout-plan-template-name";

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
  const [workoutPlanDecisionError, setWorkoutPlanDecisionError] = useState<string | null>(null);
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
        successMessage="Exercise added to the workout plan."
        errorMessage="Could not add exercise to the workout plan."
      />
      <ConfirmDestructiveModal
        open={workoutPlanDecisionOpen}
        title="Workout Plan"
        description={workoutPlanDecisionMode === "update_existing"
          ? "Update this shared workout plan so linked workout plans stay in sync."
          : "Save this as a new workout plan before these edits continue autosaving."}
        confirmLabel="Confirm"
        confirmActionLabel={workoutPlanDecisionMode === "update_existing" ? "Update Workout Plan" : "Save New Workout Plan"}
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
              setWorkoutPlanDecisionError("Workout plan name is required.");
              return;
            }
            if (hasWorkoutPlanNameConflict({
              candidateName: normalizedWorkoutPlanName,
              workoutPlanNames: existingWorkoutPlanNames,
            })) {
              setWorkoutPlanDecisionError("Workout plan name already exists.");
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
                setWorkoutPlanDecisionError(decisionResult.error ?? "Could not update workout plan.");
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
                  success: "Exercise added to the workout plan.",
                  error: "Could not add exercise to the workout plan.",
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
                    ? `Workout plan updated: ${decisionResult.workoutPlanName ?? decisionResult.templateName}`
                    : `New workout plan saved: ${decisionResult.workoutPlanName ?? decisionResult.templateName}`,
                );
              }
              toastActionResult(toast, addResult, {
                success: "Exercise added to the workout plan.",
                error: "Could not add exercise to the workout plan.",
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
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`min-h-11 rounded-[0.95rem] border px-3 py-2 text-sm font-semibold transition ${workoutPlanDecisionMode === "update_existing"
                ? "border-[rgb(var(--accent)/0.34)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--text-primary))]"
                : "border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.56)] text-[rgb(var(--text-secondary)/0.88)]"}`}
              onClick={() => {
                setWorkoutPlanDecisionMode("update_existing");
                setWorkoutPlanDecisionError(null);
              }}
            >
              Update Workout Plan
            </button>
            <button
              type="button"
              className={`min-h-11 rounded-[0.95rem] border px-3 py-2 text-sm font-semibold transition ${workoutPlanDecisionMode === "save_new"
                ? "border-[rgb(var(--accent)/0.34)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--text-primary))]"
                : "border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.56)] text-[rgb(var(--text-secondary)/0.88)]"}`}
              onClick={() => {
                setWorkoutPlanDecisionMode("save_new");
                setWorkoutPlanDecisionError(null);
              }}
            >
              Save New Workout Plan
            </button>
          </div>
          {workoutPlanDecisionMode === "save_new" ? (
            <label className="block">
              <span className="sr-only">Workout plan name</span>
              <input
                type="text"
                value={workoutPlanDecisionName}
                onChange={(event) => {
                  setWorkoutPlanDecisionName(event.target.value.slice(0, 15));
                  setWorkoutPlanDecisionError(null);
                }}
                placeholder="Workout plan name"
                maxLength={15}
                className={`w-full rounded-[0.95rem] border bg-[rgb(var(--surface-2-rgb)/0.62)] px-3 py-2.5 text-center text-sm text-[rgb(var(--text-primary))] outline-none transition ${workoutPlanDecisionError
                  ? "border-[rgb(var(--danger-rgb)/0.52)]"
                  : "border-[rgb(var(--border-strong)/0.16)] focus:border-[rgb(var(--accent)/0.32)] focus:ring-2 focus:ring-[rgb(var(--accent)/0.16)]"}`}
              />
            </label>
          ) : null}
          {workoutPlanDecisionError ? (
            <p className="text-center text-[12px] font-medium text-[rgb(var(--danger-rgb)/0.94)]">
              {workoutPlanDecisionError}
            </p>
          ) : null}
        </div>
      </ConfirmDestructiveModal>
    </>
  );
}
