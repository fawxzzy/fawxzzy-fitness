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
import { hasWorkoutPlanTemplateNameConflict, normalizeWorkoutPlanTemplateNameCandidate } from "@/lib/workout-plan-template-name";

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
  resolveTemplateDecisionAction,
  loadTemplateDecisionStateAction,
  exerciseStats,
  backHref,
  workoutPlanTemplateId = null,
  requiresWorkoutPlanTemplateEditDecision = false,
  existingWorkoutPlanTemplateNames = [],
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
  resolveTemplateDecisionAction: (
    formData: FormData,
  ) => Promise<ActionResult & { templateId?: string; templateName?: string; syncMode?: "sync" }>;
  loadTemplateDecisionStateAction: (
    formData: FormData,
  ) => Promise<ActionResult & {
    templateId?: string | null;
    requiresTemplateEditDecision?: boolean;
    syncMode?: "sync";
  }>;
  exerciseStats: ExerciseStatsOption[];
  backHref: string;
  workoutPlanTemplateId?: string | null;
  requiresWorkoutPlanTemplateEditDecision?: boolean;
  existingWorkoutPlanTemplateNames?: Array<string | null | undefined>;
}) {
  const toast = useToast();
  const router = useRouter();
  const [templateDecisionOpen, setTemplateDecisionOpen] = useState(false);
  const [templateDecisionMode, setTemplateDecisionMode] = useState<"update_existing" | "save_new">("update_existing");
  const [templateDecisionName, setTemplateDecisionName] = useState("");
  const [templateDecisionError, setTemplateDecisionError] = useState<string | null>(null);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [activeWorkoutPlanTemplateId, setActiveWorkoutPlanTemplateId] = useState<string | null>(workoutPlanTemplateId);
  const [requiresTemplateEditDecision, setRequiresTemplateEditDecision] = useState(requiresWorkoutPlanTemplateEditDecision);
  const [shouldSyncTemplateOnSave, setShouldSyncTemplateOnSave] = useState(
    Boolean(workoutPlanTemplateId) && !requiresWorkoutPlanTemplateEditDecision,
  );
  const [isTemplateDecisionPending, startTemplateDecisionTransition] = useTransition();

  const syncTemplateDecisionState = async () => {
    const stateFormData = new FormData();
    stateFormData.set("routineId", routineId);
    stateFormData.set("routineDayId", routineDayId);
    const stateResult = await loadTemplateDecisionStateAction(stateFormData);
    if (stateResult.ok) {
      setActiveWorkoutPlanTemplateId(stateResult.templateId ?? null);
      setRequiresTemplateEditDecision(Boolean(stateResult.requiresTemplateEditDecision));
      setShouldSyncTemplateOnSave(stateResult.syncMode === "sync");
    }
    return stateResult;
  };

  const wrappedAddExerciseAction = async (formData: FormData): Promise<ActionResult & { handled?: boolean }> => {
    const stateResult = await syncTemplateDecisionState();
    if (!stateResult.ok) {
      return stateResult;
    }

    const resolvedTemplateId = stateResult.templateId ?? activeWorkoutPlanTemplateId;
    const requiresDecision = Boolean(stateResult.requiresTemplateEditDecision);
    const shouldSync = stateResult.syncMode === "sync" || shouldSyncTemplateOnSave;

    if (requiresDecision && resolvedTemplateId) {
      const nextPendingFormData = new FormData();
      for (const [key, value] of formData.entries()) {
        nextPendingFormData.append(key, value);
      }
      setPendingFormData(nextPendingFormData);
      setTemplateDecisionMode("update_existing");
      setTemplateDecisionName("");
      setTemplateDecisionError(null);
      setTemplateDecisionOpen(true);
      return { ok: false, error: "", handled: true };
    }

    if (shouldSync && resolvedTemplateId) {
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
          setPendingFormData(null);
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

              const decisionResult = await resolveTemplateDecisionAction(decisionFormData);
              if (!decisionResult.ok) {
                setTemplateDecisionError(decisionResult.error ?? "Could not update workout plan template.");
                return;
              }

              if (!pendingFormData) {
                setTemplateDecisionOpen(false);
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

              setTemplateDecisionOpen(false);
              setTemplateDecisionError(null);
              setPendingFormData(null);
              setRequiresTemplateEditDecision(false);
              setShouldSyncTemplateOnSave(decisionResult.syncMode === "sync");
              if (decisionResult.templateId) {
                setActiveWorkoutPlanTemplateId(decisionResult.templateId);
              }
              if (decisionResult.templateName) {
                toast.success(
                  templateDecisionMode === "update_existing"
                    ? `Template updated: ${decisionResult.templateName}`
                    : `New template saved: ${decisionResult.templateName}`,
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
              className={`min-h-11 rounded-[0.95rem] border px-3 py-2 text-sm font-semibold transition ${templateDecisionMode === "update_existing"
                ? "border-[rgb(var(--accent)/0.34)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--text-primary))]"
                : "border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.56)] text-[rgb(var(--text-secondary)/0.88)]"}`}
              onClick={() => {
                setTemplateDecisionMode("update_existing");
                setTemplateDecisionError(null);
              }}
            >
              Update Template
            </button>
            <button
              type="button"
              className={`min-h-11 rounded-[0.95rem] border px-3 py-2 text-sm font-semibold transition ${templateDecisionMode === "save_new"
                ? "border-[rgb(var(--accent)/0.34)] bg-[rgb(var(--accent)/0.12)] text-[rgb(var(--text-primary))]"
                : "border-[rgb(var(--border-strong)/0.16)] bg-[rgb(var(--surface-2-rgb)/0.56)] text-[rgb(var(--text-secondary)/0.88)]"}`}
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
                className={`w-full rounded-[0.95rem] border bg-[rgb(var(--surface-2-rgb)/0.62)] px-3 py-2.5 text-center text-sm text-[rgb(var(--text-primary))] outline-none transition ${templateDecisionError
                  ? "border-[rgb(var(--danger-rgb)/0.52)]"
                  : "border-[rgb(var(--border-strong)/0.16)] focus:border-[rgb(var(--accent)/0.32)] focus:ring-2 focus:ring-[rgb(var(--accent)/0.16)]"}`}
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
    </>
  );
}
