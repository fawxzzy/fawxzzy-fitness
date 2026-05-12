"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import {
  RoutineDetailsBottomActionPublisher,
  RoutineEditorPageBody,
  RoutineEditorTitleInput,
} from "@/components/routines/RoutineEditorShared";
import { appTokens } from "@/components/ui/app/tokens";
import {
  RoutineDetailsBackSecondaryAction,
  RoutineDetailsDiscardConfirmationDock,
  useRoutineDetailsDirtyState,
  useRoutineDetailsExitGuard,
  useRoutineDetailsHeaderTitle,
} from "@/components/routines/RoutineDetailsExitGuard";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { useToast } from "@/components/ui/ToastProvider";
import { createRoutineAction } from "@/app/routines/actions";
import {
  buildRoutineDetailsSnapshot,
  commitRoutineCycleLengthInput,
  normalizeRoutineDetailsDraft,
  validateRoutineDetailsDraft,
  type RoutineDetailsDraft,
} from "@/lib/routine-details-form";
import { RoutineDetailsSaveState } from "@/components/routines/RoutineDetailsFormState";
import { ProgressionPlaybookEditor } from "@/components/routines/ProgressionPlaybookEditor";
import {
  appendProgressionPlaybookFormData,
  buildProgressionPlaybookFormSnapshot,
  createProgressionPlaybookFormState,
  createProgressionPlaybookFormStateForTrainingGoal,
  isTrainingGoalCustomized,
} from "@/lib/progression-playbook-form-state";
import { buildProgressionTargetMutationUiModel } from "@/lib/progression-playbook-ui-options";
import { TRAINING_GOAL_IDS, type TrainingGoalId } from "@/lib/progression-playbooks";

const STORAGE_KEY = "routine-new-draft-v1";

type NewRoutineDraftDefaults = Omit<RoutineDetailsDraft, "distanceUnit"> & {
  distanceUnit?: string;
};

function resolveRoutineDraftFieldValue(field: string, value: string) {
  if (field === "name") {
    return value.slice(0, 15);
  }

  return value;
}

function normalizeTrainingGoalId(value: unknown): TrainingGoalId | "" {
  return TRAINING_GOAL_IDS.includes(value as TrainingGoalId) ? (value as TrainingGoalId) : "";
}

export function NewRoutineDraftForm({ defaults }: { defaults: NewRoutineDraftDefaults }) {
  const toast = useToast();
  const router = useRouter();
  const normalizedDefaults = useMemo(
    () => normalizeRoutineDetailsDraft(defaults, {
      name: defaults.name,
      cycleLengthDays: defaults.cycleLengthDays,
      startDate: defaults.startDate,
      startWeekday: defaults.startWeekday,
      timezone: defaults.timezone,
      weightUnit: defaults.weightUnit,
      distanceUnit: defaults.distanceUnit === "km" ? "km" : "mi",
    }),
    [
      defaults.cycleLengthDays,
      defaults.distanceUnit,
      defaults.name,
      defaults.startDate,
      defaults.startWeekday,
      defaults.timezone,
      defaults.weightUnit,
    ],
  );
  const [draft, setDraft] = useState<RoutineDetailsDraft>(normalizedDefaults);
  const [progressionDraft, setProgressionDraft] = useState(() => createProgressionPlaybookFormState());
  const [selectedTrainingGoal, setSelectedTrainingGoal] = useState<TrainingGoalId | "">("");
  const targetMutationUiModel = useMemo(() => buildProgressionTargetMutationUiModel({
    context: "routine-default",
    targetMutation: progressionDraft.progressionTargetMutation,
    promotionBasis: progressionDraft.progressionPromotionBasis,
  }), [progressionDraft.progressionPromotionBasis, progressionDraft.progressionTargetMutation]);
  const [cycleLengthInput, setCycleLengthInput] = useState(() => String(normalizedDefaults.cycleLengthDays));
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<RoutineDetailsDraft> & {
          progressionPlaybookId?: string | null;
          progressionPlaybookConfig?: Record<string, unknown> | null;
          progressionLoadIncrement?: string;
          progressionStallThreshold?: string;
          progressionDeloadPercent?: string;
          progressionBarbellLoadIncrement?: string;
          progressionDumbbellLoadIncrement?: string;
          progressionMachineLoadIncrement?: string;
          progressionCableLoadIncrement?: string;
          progressionBodyweightRepIncrement?: string;
          progressionDurationIncrementSeconds?: string;
          progressionDistanceIncrement?: string;
          progressionSetFlowLoadStep?: string;
          progressionSetFlowRepStep?: string;
          progressionSetFlowDurationStep?: string;
          progressionSetFlowDistanceStep?: string;
          progressionPromotionBasis?: "weight_only" | "reps_only" | "weight_and_reps";
          progressionRepPromotionThreshold?: "top_of_range" | "top_half_of_range" | "custom";
          progressionCustomRepPromotionTarget?: string;
          progressionTrainingGoal?: string | null;
        };
        const normalizedParsed = normalizeRoutineDetailsDraft(parsed, normalizedDefaults);
        const shouldResetStartWeekday =
          normalizedParsed.name.trim().length === 0
          && normalizedParsed.cycleLengthDays === normalizedDefaults.cycleLengthDays;
        const nextDraft = {
          ...normalizedParsed,
          startDate: shouldResetStartWeekday ? normalizedDefaults.startDate : normalizedParsed.startDate,
          startWeekday: shouldResetStartWeekday ? normalizedDefaults.startWeekday : normalizedParsed.startWeekday,
        };

        setDraft(nextDraft);
        setProgressionDraft((current) => ({
          ...createProgressionPlaybookFormState({
            playbookId: parsed.progressionPlaybookId ?? current.progressionPlaybookId,
            config: parsed.progressionPlaybookConfig ?? null,
          }),
          progressionLoadIncrement: typeof parsed.progressionLoadIncrement === "string" ? parsed.progressionLoadIncrement : current.progressionLoadIncrement,
          progressionStallThreshold: typeof parsed.progressionStallThreshold === "string" ? parsed.progressionStallThreshold : current.progressionStallThreshold,
          progressionDeloadPercent: typeof parsed.progressionDeloadPercent === "string" ? parsed.progressionDeloadPercent : current.progressionDeloadPercent,
          progressionBarbellLoadIncrement: typeof parsed.progressionBarbellLoadIncrement === "string" ? parsed.progressionBarbellLoadIncrement : current.progressionBarbellLoadIncrement,
          progressionDumbbellLoadIncrement: typeof parsed.progressionDumbbellLoadIncrement === "string" ? parsed.progressionDumbbellLoadIncrement : current.progressionDumbbellLoadIncrement,
          progressionMachineLoadIncrement: typeof parsed.progressionMachineLoadIncrement === "string" ? parsed.progressionMachineLoadIncrement : current.progressionMachineLoadIncrement,
          progressionCableLoadIncrement: typeof parsed.progressionCableLoadIncrement === "string" ? parsed.progressionCableLoadIncrement : current.progressionCableLoadIncrement,
          progressionBodyweightRepIncrement: typeof parsed.progressionBodyweightRepIncrement === "string" ? parsed.progressionBodyweightRepIncrement : current.progressionBodyweightRepIncrement,
          progressionDurationIncrementSeconds: typeof parsed.progressionDurationIncrementSeconds === "string" ? parsed.progressionDurationIncrementSeconds : current.progressionDurationIncrementSeconds,
          progressionDistanceIncrement: typeof parsed.progressionDistanceIncrement === "string" ? parsed.progressionDistanceIncrement : current.progressionDistanceIncrement,
          progressionSetFlowLoadStep: typeof parsed.progressionSetFlowLoadStep === "string" ? parsed.progressionSetFlowLoadStep : current.progressionSetFlowLoadStep,
          progressionSetFlowRepStep: typeof parsed.progressionSetFlowRepStep === "string" ? parsed.progressionSetFlowRepStep : current.progressionSetFlowRepStep,
          progressionSetFlowDurationStep: typeof parsed.progressionSetFlowDurationStep === "string" ? parsed.progressionSetFlowDurationStep : current.progressionSetFlowDurationStep,
          progressionSetFlowDistanceStep: typeof parsed.progressionSetFlowDistanceStep === "string" ? parsed.progressionSetFlowDistanceStep : current.progressionSetFlowDistanceStep,
          progressionPromotionBasis: typeof parsed.progressionPromotionBasis === "string" ? parsed.progressionPromotionBasis : current.progressionPromotionBasis,
          progressionRepPromotionThreshold: typeof parsed.progressionRepPromotionThreshold === "string" ? parsed.progressionRepPromotionThreshold : current.progressionRepPromotionThreshold,
          progressionCustomRepPromotionTarget: typeof parsed.progressionCustomRepPromotionTarget === "string" ? parsed.progressionCustomRepPromotionTarget : current.progressionCustomRepPromotionTarget,
        }));
        setSelectedTrainingGoal(normalizeTrainingGoalId(parsed.progressionTrainingGoal));
        setCycleLengthInput(String(nextDraft.cycleLengthDays));
      }
    } catch {
      // ignore malformed local drafts
    }
    setLoadedDraft(true);
  }, [normalizedDefaults]);

  useEffect(() => {
    if (!loadedDraft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          ...draft,
          ...progressionDraft,
          progressionTrainingGoal: selectedTrainingGoal,
        }));
        setError(null);
      } catch {
        setError("Could not save local draft.");
        toast.error("Could not save local draft.");
      }
    }, 400);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, loadedDraft, progressionDraft, selectedTrainingGoal, toast]);

  useEffect(() => {
    setCycleLengthInput(String(draft.cycleLengthDays));
  }, [draft.cycleLengthDays]);

  const validation = validateRoutineDetailsDraft(draft);
  const initialSnapshot = buildRoutineDetailsSnapshot(normalizedDefaults);
  const currentSnapshot = buildRoutineDetailsSnapshot(draft);
  const initialProgressionSnapshot = buildProgressionPlaybookFormSnapshot(createProgressionPlaybookFormState());
  const currentProgressionSnapshot = buildProgressionPlaybookFormSnapshot(progressionDraft);
  const isDirty = currentSnapshot !== initialSnapshot || currentProgressionSnapshot !== initialProgressionSnapshot;
  const hasDirtyChanges = hasUserEdited && isDirty;
  const canCreate = validation.valid && isDirty && !isSaving;
  const { isConfirmingDiscard } = useRoutineDetailsExitGuard();
  const trimmedRoutineName = draft.name.trim().slice(0, 15);
  const routineHeaderTitle = useMemo(() => (
    <div data-app-header-raw-title="true" className="mx-auto block w-fit max-w-full">
      <RoutineEditorTitleInput
        name="name"
        value={draft.name}
        onChange={(nextValue) => {
          setHasUserEdited(true);
          setDraft((current) => ({
            ...current,
            name: resolveRoutineDraftFieldValue("name", nextValue),
          }));
        }}
        placeholder="Push/Pull/Legs"
        ariaLabel="Routine Name"
        maxLength={15}
        className="text-center"
      />
    </div>
  ), [draft.name]);

  useRoutineDetailsHeaderTitle(routineHeaderTitle);
  useRoutineDetailsDirtyState(hasDirtyChanges);

  useEffect(() => {
    if (!hasDirtyChanges) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [hasDirtyChanges]);

  const commitCycleLengthInput = () => {
    const committedCycleLength = commitRoutineCycleLengthInput(cycleLengthInput, draft.cycleLengthDays);
    const nextDraft =
      committedCycleLength.cycleLengthDays === draft.cycleLengthDays
        ? draft
        : { ...draft, cycleLengthDays: committedCycleLength.cycleLengthDays };

    setCycleLengthInput(committedCycleLength.inputValue);
    if (nextDraft !== draft) {
      setHasUserEdited(true);
      setDraft(nextDraft);
    }

    return nextDraft;
  };

  return (
    <>
      <RoutineEditorPageBody className={appTokens.routineEditorSectionStack}>
        <div className="space-y-2 pt-4">
          <RoutineEditorFormFields
            fields={["cycleLengthDays", "startWeekday", "timezone", "weightUnit", "distanceUnit"]}
            cycleLengthInputValue={cycleLengthInput}
            cycleLengthDefaultValue={draft.cycleLengthDays}
            startDateDefaultValue={draft.startDate}
            startWeekdayDefaultValue={draft.startWeekday}
            timezoneDefaultValue={draft.timezone}
            weightUnitDefaultValue={draft.weightUnit}
            distanceUnitDefaultValue={draft.distanceUnit}
            values={draft}
            onCycleLengthInputChange={(value) => {
              setHasUserEdited(true);
              setCycleLengthInput(value);
            }}
            onCycleLengthInputCommit={commitCycleLengthInput}
            onFieldChange={(field, value) => {
              setHasUserEdited(true);
              setDraft((current) => ({
                ...current,
                [field]: resolveRoutineDraftFieldValue(field, value),
              }));
            }}
          />
          <ProgressionPlaybookEditor
            value={progressionDraft}
            onChange={(nextValue) => {
              setHasUserEdited(true);
              setProgressionDraft(nextValue);
            }}
            weightUnit={draft.weightUnit === "kg" ? "kg" : "lbs"}
            context="routine-default"
            collapsible
            defaultExpanded={false}
            separateInfoBox
            targetMutationUiModel={targetMutationUiModel}
            showTargetMutationControls
            showQualificationWindowControls
            trainingFocusValue={selectedTrainingGoal}
            trainingFocusCustomized={isTrainingGoalCustomized(selectedTrainingGoal, progressionDraft)}
            onTrainingFocusChange={(goal) => {
              setHasUserEdited(true);
              setSelectedTrainingGoal(goal);
              setProgressionDraft(createProgressionPlaybookFormStateForTrainingGoal(goal));
            }}
          />
        </div>
        <RoutineDetailsSaveState error={error} />
      </RoutineEditorPageBody>

      {isConfirmingDiscard ? (
        <RoutineDetailsDiscardConfirmationDock />
      ) : (
        <RoutineDetailsBottomActionPublisher
          secondary={<RoutineDetailsBackSecondaryAction label="Cancel" intent="danger" />}
          primary={(
            <BottomDockButton
              type="button"
              intent="positive"
              disabled={!canCreate}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const nextDraft = commitCycleLengthInput();
                  const nextValidation = validateRoutineDetailsDraft(nextDraft);
                  if (!nextValidation.valid) {
                    const nextError = nextValidation.error ?? "Please complete all required routine fields.";
                    setError(nextError);
                    toast.error(nextError);
                    return;
                  }

                  const formData = new FormData();
                  formData.set("name", trimmedRoutineName);
                  formData.set("cycleLengthDays", String(nextDraft.cycleLengthDays));
                  formData.set("startDate", nextDraft.startDate);
                  formData.set("startWeekday", nextDraft.startWeekday);
                  formData.set("timezone", nextDraft.timezone);
                  formData.set("weightUnit", nextDraft.weightUnit);
                  formData.set("distanceUnit", nextDraft.distanceUnit);
                  appendProgressionPlaybookFormData(formData, progressionDraft);
                  const result = await createRoutineAction(formData);
                  if (!result.ok) {
                    const nextError = result.error ?? "Could not create routine.";
                    setError(nextError);
                    toast.error(nextError);
                    return;
                  }
                  if (!result.routineId) {
                    const nextError = "Could not create routine.";
                    setError(nextError);
                    toast.error(nextError);
                    return;
                  }
                  window.localStorage.removeItem(STORAGE_KEY);
                  toast.success("Routine created");
                  router.push("/routines");
                });
              }}
            >
              Create
            </BottomDockButton>
          )}
        />
      )}
    </>
  );
}
