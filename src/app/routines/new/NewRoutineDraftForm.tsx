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
import { RoutineEditorCycleAnchorField, RoutineEditorCycleLengthField, RoutineEditorFormFields, RoutineEditorInlineCycleControls, RoutineEditorInlineCycleModeControl } from "@/components/routines/RoutineEditorForm";
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
import { TRAINING_GOAL_IDS, type TrainingGoalId } from "@/lib/progression-playbooks";
import { cycleSetFlowDirection } from "@/lib/set-flow-directions";

const STORAGE_KEY = "routine-new-draft-v1";
const LEGACY_SET_FLOW_DRAFT_DEFAULTS = {
  load: "5",
  reps: "2",
  duration: "30",
  distance: "0.5",
} as const;

function createNewRoutineProgressionDraft() {
  return createProgressionPlaybookFormState({
    playbookId: "double_progression",
  });
}

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
      scheduleMode: defaults.scheduleMode,
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
  const [progressionDraft, setProgressionDraft] = useState(() => createNewRoutineProgressionDraft());
  const [selectedTrainingGoal, setSelectedTrainingGoal] = useState<TrainingGoalId | "">("");
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
          progressionDayMode?: "synced" | "unsynced";
          progressionDayLoadStep?: string;
          progressionDayRepStep?: string;
          progressionDayDurationStep?: string;
          progressionDayDistanceStep?: string;
          progressionDayLoweredLoadStep?: string;
          progressionDayLoweredRepStep?: string;
          progressionDayLoweredDurationStep?: string;
          progressionDayLoweredDistanceStep?: string;
          progressionEffortWaveDirections?: Array<"straight" | "up" | "down">;
          progressionSetFlowTimeDirection?: "straight" | "up" | "down";
          progressionSetFlowDistanceDirection?: "straight" | "up" | "down";
          progressionSetFlowRepDirection?: "straight" | "up" | "down";
          progressionSetFlowLoadDirection?: "straight" | "up" | "down";
          progressionPromotionBasis?: "weight_only" | "reps_only" | "weight_and_reps";
          progressionRepPromotionThreshold?: "top_of_range" | "top_half_of_range" | "custom";
          progressionCustomRepPromotionTarget?: string;
          progressionPromotionSessionCountMap?: Record<string, string>;
          progressionPromotionGroupedSessionCountMap?: Record<string, string>;
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

        const shouldUpgradeLegacySetFlowDefaults =
          parsed.progressionSetFlowLoadStep === LEGACY_SET_FLOW_DRAFT_DEFAULTS.load
          && parsed.progressionSetFlowRepStep === LEGACY_SET_FLOW_DRAFT_DEFAULTS.reps
          && parsed.progressionSetFlowDurationStep === LEGACY_SET_FLOW_DRAFT_DEFAULTS.duration
          && parsed.progressionSetFlowDistanceStep === LEGACY_SET_FLOW_DRAFT_DEFAULTS.distance;
        setDraft(nextDraft);
        const fallbackProgressionDraft = createNewRoutineProgressionDraft();
        const resolvedPlaybookId =
          typeof parsed.progressionPlaybookId === "string" && parsed.progressionPlaybookId.trim().length > 0
            ? parsed.progressionPlaybookId
            : fallbackProgressionDraft.progressionPlaybookId;
        setProgressionDraft((current) => ({
          ...createProgressionPlaybookFormState({
            playbookId: resolvedPlaybookId ?? current.progressionPlaybookId,
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
          progressionSetFlowDurationStep: shouldUpgradeLegacySetFlowDefaults
            ? "60"
            : typeof parsed.progressionSetFlowDurationStep === "string" ? parsed.progressionSetFlowDurationStep : current.progressionSetFlowDurationStep,
          progressionSetFlowDistanceStep: shouldUpgradeLegacySetFlowDefaults
            ? "1"
            : typeof parsed.progressionSetFlowDistanceStep === "string" ? parsed.progressionSetFlowDistanceStep : current.progressionSetFlowDistanceStep,
          progressionDayMode: parsed.progressionDayMode === "synced" || parsed.progressionDayMode === "unsynced"
            ? parsed.progressionDayMode
            : current.progressionDayMode,
          progressionDayLoadStep: typeof parsed.progressionDayLoadStep === "string" ? parsed.progressionDayLoadStep : current.progressionDayLoadStep,
          progressionDayRepStep: typeof parsed.progressionDayRepStep === "string" ? parsed.progressionDayRepStep : current.progressionDayRepStep,
          progressionDayDurationStep: typeof parsed.progressionDayDurationStep === "string" ? parsed.progressionDayDurationStep : current.progressionDayDurationStep,
          progressionDayDistanceStep: typeof parsed.progressionDayDistanceStep === "string" ? parsed.progressionDayDistanceStep : current.progressionDayDistanceStep,
          progressionDayLoweredLoadStep: typeof parsed.progressionDayLoweredLoadStep === "string" ? parsed.progressionDayLoweredLoadStep : current.progressionDayLoweredLoadStep,
          progressionDayLoweredRepStep: typeof parsed.progressionDayLoweredRepStep === "string" ? parsed.progressionDayLoweredRepStep : current.progressionDayLoweredRepStep,
          progressionDayLoweredDurationStep: typeof parsed.progressionDayLoweredDurationStep === "string" ? parsed.progressionDayLoweredDurationStep : current.progressionDayLoweredDurationStep,
          progressionDayLoweredDistanceStep: typeof parsed.progressionDayLoweredDistanceStep === "string" ? parsed.progressionDayLoweredDistanceStep : current.progressionDayLoweredDistanceStep,
          progressionEffortWaveDirections: Array.isArray(parsed.progressionEffortWaveDirections) && parsed.progressionEffortWaveDirections.length > 0
            ? parsed.progressionEffortWaveDirections.map((direction) => (
              direction === "up" || direction === "down" || direction === "straight" ? direction : "straight"
            ))
            : current.progressionEffortWaveDirections,
          progressionSetFlowTimeDirection: parsed.progressionSetFlowTimeDirection ?? current.progressionSetFlowTimeDirection,
          progressionSetFlowDistanceDirection: parsed.progressionSetFlowDistanceDirection ?? current.progressionSetFlowDistanceDirection,
          progressionSetFlowRepDirection: parsed.progressionSetFlowRepDirection ?? current.progressionSetFlowRepDirection,
          progressionSetFlowLoadDirection: parsed.progressionSetFlowLoadDirection ?? current.progressionSetFlowLoadDirection,
          progressionPromotionBasis: typeof parsed.progressionPromotionBasis === "string" ? parsed.progressionPromotionBasis : current.progressionPromotionBasis,
          progressionRepPromotionThreshold: typeof parsed.progressionRepPromotionThreshold === "string" ? parsed.progressionRepPromotionThreshold : current.progressionRepPromotionThreshold,
          progressionCustomRepPromotionTarget: typeof parsed.progressionCustomRepPromotionTarget === "string" ? parsed.progressionCustomRepPromotionTarget : current.progressionCustomRepPromotionTarget,
          progressionPromotionSessionCountMap: parsed.progressionPromotionSessionCountMap && typeof parsed.progressionPromotionSessionCountMap === "object"
            ? parsed.progressionPromotionSessionCountMap
            : current.progressionPromotionSessionCountMap,
          progressionPromotionGroupedSessionCountMap: parsed.progressionPromotionGroupedSessionCountMap && typeof parsed.progressionPromotionGroupedSessionCountMap === "object"
            ? parsed.progressionPromotionGroupedSessionCountMap
            : current.progressionPromotionGroupedSessionCountMap,
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
  const initialProgressionSnapshot = buildProgressionPlaybookFormSnapshot(createNewRoutineProgressionDraft());
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
        placeholder="Enter Routine Name"
        ariaLabel="Routine Name"
        maxLength={15}
        className="text-center"
        hideLabel
        plainShell
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
            fields={["cycleLengthDays", "scheduleMode", "startWeekday", "timezone", "weightUnit", "distanceUnit"]}
            showCycleSection={false}
            cycleLengthInputValue={cycleLengthInput}
            cycleLengthDefaultValue={draft.cycleLengthDays}
            scheduleModeDefaultValue={draft.scheduleMode}
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
            distanceUnit={draft.distanceUnit === "km" ? "km" : "mi"}
            cycleLengthDays={draft.cycleLengthDays}
            topMethodRailContent={(
              <RoutineEditorInlineCycleModeControl
                scheduleMode={draft.scheduleMode}
                onScheduleModeChange={(nextValue) => {
                  setHasUserEdited(true);
                  setDraft((current) => ({ ...current, scheduleMode: nextValue }));
                }}
              />
            )}
            preSessionSettingsGroups={[
              {
                key: "cycle-settings",
                infoSection: "routine_setup",
                fields: [
                  ...(draft.scheduleMode === "weekday_anchored"
                    ? [(
                      <div key="cycle-anchor" className="shrink-0">
                        <RoutineEditorCycleAnchorField
                          value={draft.startDate}
                          onChange={(nextValue) => {
                            setHasUserEdited(true);
                            setDraft((current) => ({ ...current, startDate: nextValue }));
                          }}
                        />
                      </div>
                    )]
                    : []),
                  <div key="cycle-count" className="shrink-0">
                    <RoutineEditorCycleLengthField
                      value={cycleLengthInput}
                      onCycleLengthInputChange={(nextValue) => {
                        setHasUserEdited(true);
                        setCycleLengthInput(nextValue);
                      }}
                      onCycleLengthInputCommit={commitCycleLengthInput}
                    />
                  </div>,
                ],
              },
            ]}
            preSessionSettingsContent={progressionDraft.progressionPlaybookId ? (
              <RoutineEditorInlineCycleControls
                scheduleMode={draft.scheduleMode}
                startDate={draft.startDate}
                cycleLengthDays={draft.cycleLengthDays}
                cycleLengthInputValue={cycleLengthInput}
                effortWaveDirections={progressionDraft.progressionEffortWaveDirections}
                onStartDateChange={(nextValue) => {
                  setHasUserEdited(true);
                  setDraft((current) => ({ ...current, startDate: nextValue }));
                }}
                onCycleLengthInputChange={(nextValue) => {
                  setHasUserEdited(true);
                  setCycleLengthInput(nextValue);
                }}
                onCycleLengthInputCommit={commitCycleLengthInput}
                onFieldChange={(field, nextValue) => {
                  setHasUserEdited(true);
                  setDraft((current) => ({
                    ...current,
                    [field]: resolveRoutineDraftFieldValue(field, nextValue),
                  }));
                }}
                showModeControl={false}
                showSectionTitle={false}
                showCycleFields={false}
                onToggleEffortWaveDirection={(dayIndex) => {
                  setHasUserEdited(true);
                  setProgressionDraft((current) => {
                    const visibleDayCount = (() => {
                      const parsed = Number.parseInt(cycleLengthInput, 10);
                      if (Number.isFinite(parsed) && parsed > 0) {
                        return Math.min(parsed, 365);
                      }
                      return Math.max(1, draft.cycleLengthDays);
                    })();
                    const nextDirections = Array.from(
                      { length: visibleDayCount },
                      (_, index) => current.progressionEffortWaveDirections[index] ?? "straight",
                    );
                    const currentDirection = nextDirections[dayIndex] ?? "straight";
                    nextDirections[dayIndex] = cycleSetFlowDirection({
                      current: currentDirection,
                      hasStepValue: false,
                    });
                    return {
                      ...current,
                      progressionEffortWaveDirections: nextDirections,
                    };
                  });
                }}
              />
            ) : null}
            context="routine-default"
            title=""
            defaultExpanded
            collapsible={false}
            separateInfoBox
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
                  formData.set("scheduleMode", nextDraft.scheduleMode);
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
