"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { ContentRail } from "@/components/layout/ContentRail";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { RoutineEditorPageBody, RoutineEditorTitleInput } from "@/components/routines/RoutineEditorShared";
import {
  RoutineDetailsDiscardConfirmationDock,
  useRoutineDetailsDirtyState,
  useRoutineDetailsExitGuard,
} from "@/components/routines/RoutineDetailsExitGuard";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { DestructiveButton, SecondaryButton } from "@/components/ui/AppButton";
import { NavigationReturnInput } from "@/components/ui/NavigationReturnInput";
import { appTokens } from "@/components/ui/app/tokens";
import { useToast } from "@/components/ui/ToastProvider";
import { useToastMessageEffect } from "@/components/ui/useToastMessageEffect";
import { updateRoutineAction } from "@/app/routines/actions";
import { ProgressionPlaybookEditor } from "@/components/routines/ProgressionPlaybookEditor";
import { MoreOptionsDisclosure, OptionSwitchRow } from "@/components/ui/measurements/OptionControls";
import {
  buildRoutineDetailsSnapshot,
  commitRoutineCycleLengthInput,
  type RoutineDetailsDraft,
  validateRoutineDetailsDraft,
} from "@/lib/routine-details-form";
import {
  appendProgressionPlaybookFormData,
  buildProgressionPlaybookFormSnapshot,
  createProgressionPlaybookFormState,
  createProgressionPlaybookFormStateForTrainingGoal,
  isTrainingGoalCustomized,
} from "@/lib/progression-playbook-form-state";
import type { ProgressionPlaybookId, TrainingGoalId } from "@/lib/progression-playbooks";
import { normalizeRoutineTimezone } from "@/lib/timezones";
import { buildRoutineSettingsFormData, describeRoutineSchedule } from "@/app/routines/[id]/edit/routine-settings";

function getDeviceTimezone(fallback: string) {
  if (typeof window === "undefined") {
    return normalizeRoutineTimezone(fallback);
  }

  const resolved = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
  return normalizeRoutineTimezone(resolved || fallback);
}

type Props = {
  routineId: string;
  existingStartDate: string;
  returnHref: string;
  name: string;
  cycleLengthDays: number;
  scheduleMode: "weekday_anchored" | "rolling_n_day";
  startDate: string;
  startWeekday: string;
  timezone: string;
  weightUnit: string;
  distanceUnit?: "mi" | "km";
  defaultProgressionPlaybookId?: ProgressionPlaybookId | null;
  defaultProgressionPlaybookConfig?: Record<string, unknown> | null;
  error?: string;
  /** Opened from the routine menu's Rename: focus the name field. */
  focusName?: boolean;
  /** 1-based day slots marked rest, so the schedule line names only the training weekdays. */
  restDayIndexes?: number[];
};

function resolveRoutineDraftFieldValue(field: string, value: string) {
  if (field === "name") {
    return value.slice(0, 15);
  }

  return value;
}

export function EditRoutineAutosaveForm(props: Props) {
  const toast = useToast();
  const distanceUnit = props.distanceUnit ?? "mi";
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("");
  const [lastSavedProgressionSnapshot, setLastSavedProgressionSnapshot] = useState("");
  const [draft, setDraft] = useState<RoutineDetailsDraft>({
    name: props.name,
    cycleLengthDays: props.cycleLengthDays,
    scheduleMode: props.scheduleMode,
    startDate: props.startDate,
    startWeekday: props.startWeekday,
    timezone: props.timezone,
    weightUnit: props.weightUnit,
    distanceUnit,
  });
  const [progressionDraft, setProgressionDraft] = useState(() => createProgressionPlaybookFormState({
    playbookId: props.defaultProgressionPlaybookId ?? null,
    config: props.defaultProgressionPlaybookConfig ?? null,
  }));
  const [selectedTrainingGoal, setSelectedTrainingGoal] = useState<TrainingGoalId | "">("");
  // Overwriting every exercise's progress rules is an explicit, confirmed choice, never a side effect of the simple
  // Auto-progress switch (review P1 #2). Off by default; it resets after each save.
  const [applyToAllExercisesConfirmed, setApplyToAllExercisesConfirmed] = useState(false);
  const [isConfirmingApplyToAll, setIsConfirmingApplyToAll] = useState(false);
  const [cycleLengthInput, setCycleLengthInput] = useState(() => String(props.cycleLengthDays));
  const [showProgressHelp, setShowProgressHelp] = useState(false);
  // Turning Auto-progress off and on again brings back the rules that were set, not a fresh default.
  const lastProgressionRulesRef = useRef(progressionDraft.progressionPlaybookId ? progressionDraft : null);
  const [isSaving, startTransition] = useTransition();

  useToastMessageEffect("error", props.error, { id: "edit-routine-route-error" });

  const initialSnapshot = useMemo(
    () =>
      buildRoutineDetailsSnapshot({
        name: props.name,
        cycleLengthDays: props.cycleLengthDays,
        scheduleMode: props.scheduleMode,
        startDate: props.startDate,
        startWeekday: props.startWeekday,
        timezone: props.timezone,
        weightUnit: props.weightUnit,
        distanceUnit,
      }),
    [distanceUnit, props.cycleLengthDays, props.name, props.scheduleMode, props.startDate, props.startWeekday, props.timezone, props.weightUnit],
  );
  const initialProgressionSnapshot = useMemo(() => buildProgressionPlaybookFormSnapshot(createProgressionPlaybookFormState({
    playbookId: props.defaultProgressionPlaybookId ?? null,
    config: props.defaultProgressionPlaybookConfig ?? null,
  })), [props.defaultProgressionPlaybookConfig, props.defaultProgressionPlaybookId]);

  useEffect(() => {
    setLastSavedSnapshot(initialSnapshot);
    setLastSavedProgressionSnapshot(initialProgressionSnapshot);
  }, [initialProgressionSnapshot, initialSnapshot]);

  useEffect(() => {
    setCycleLengthInput(String(draft.cycleLengthDays));
  }, [draft.cycleLengthDays]);

  const currentSnapshot = useMemo(() => buildRoutineDetailsSnapshot(draft), [draft]);
  const currentProgressionSnapshot = useMemo(() => buildProgressionPlaybookFormSnapshot(progressionDraft), [progressionDraft]);
  const baselineSnapshot = lastSavedSnapshot || initialSnapshot;
  const baselineProgressionSnapshot = lastSavedProgressionSnapshot || initialProgressionSnapshot;
  const isDirty = currentSnapshot !== baselineSnapshot
    || currentProgressionSnapshot !== baselineProgressionSnapshot
    || applyToAllExercisesConfirmed;
  const validation = validateRoutineDetailsDraft(draft, { allowLegacyLongName: true });
  const canSave = validation.valid && isDirty && !isSaving;
  const isAutoProgressOn = progressionDraft.progressionPlaybookId !== "";
  // The dock says where things stand instead of a dimmed Save: "Saved" when nothing is waiting (SIMPLIFY #8).
  const saveButtonLabel = isSaving ? "Saving..." : isDirty ? "Save" : "Saved";
  const { isConfirmingDiscard } = useRoutineDetailsExitGuard();
  const routineHeaderTitle = useMemo(() => (
    <RoutineEditorTitleInput
        name="name"
        value={draft.name}
        onChange={(nextValue) => {
          setDraft((current) => ({
            ...current,
            name: resolveRoutineDraftFieldValue("name", nextValue),
          }));
        }}
        label="Routine name"
        placeholder="Routine name"
        maxLength={15}
        autoFocus={props.focusName}
      />
  ), [draft.name, props.focusName]);

  useRoutineDetailsDirtyState(isDirty);

  useEffect(() => {
    if (!isDirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [isDirty]);

  const commitCycleLengthInput = () => {
    const committedCycleLength = commitRoutineCycleLengthInput(cycleLengthInput, draft.cycleLengthDays);
    const nextDraft =
      committedCycleLength.cycleLengthDays === draft.cycleLengthDays
        ? draft
        : { ...draft, cycleLengthDays: committedCycleLength.cycleLengthDays };

    setCycleLengthInput(committedCycleLength.inputValue);
    if (nextDraft !== draft) {
      setDraft(nextDraft);
    }

    return nextDraft;
  };

  const submitChanges = (
    formData: FormData,
    nextDraft: RoutineDetailsDraft,
    progressionSnapshot: string,
    appliedToAllExercises: boolean,
  ) => {
    startTransition(async () => {
      const result = await updateRoutineAction(formData);
      if (!result.ok) {
        const nextError = result.error ?? "Could not save routine.";
        toast.error(nextError);
        return;
      }

      setLastSavedSnapshot(buildRoutineDetailsSnapshot(nextDraft));
      setLastSavedProgressionSnapshot(progressionSnapshot);
      setApplyToAllExercisesConfirmed(false);
      toast.success(appliedToAllExercises
        ? "Routine saved. Exercises now use these progress rules."
        : "Routine changes saved");
    });
  };

  const saveChanges = () => {
    startTransition(() => {
      const nextDraft = commitCycleLengthInput();
      const nextValidation = validateRoutineDetailsDraft(nextDraft, { allowLegacyLongName: true });
      if (!nextValidation.valid) {
        const nextError = nextValidation.error ?? "Please complete all required routine fields.";
        toast.error(nextError);
        return;
      }
      if (!isDirty) {
        toast.info("No changes to save.");
        return;
      }

      const formData = buildRoutineSettingsFormData({
        routineId: props.routineId,
        existingStartDate: props.existingStartDate,
        draft: nextDraft,
        timezone: getDeviceTimezone(nextDraft.timezone),
        progressionDraft,
        returnHref: props.returnHref,
        applyToAllExercisesConfirmed,
      });

      submitChanges(formData, nextDraft, currentProgressionSnapshot, applyToAllExercisesConfirmed);
    });
  };

  return (
    <>
      <form id="routine-update-form" className={appTokens.routineEditorSectionStack}>
        <input type="hidden" name="routineId" value={props.routineId} />
        <input type="hidden" name="existingStartDate" value={props.existingStartDate} />
        <NavigationReturnInput fallbackHref="/routines" value={props.returnHref} />
        <RoutineEditorPageBody>
          <ContentRail className="space-y-2 pt-4">
            {routineHeaderTitle}
            <p className="px-1 text-[0.9rem] text-[rgb(var(--text-secondary))]" data-routine-schedule-summary="">
              {describeRoutineSchedule(draft, props.restDayIndexes)}
            </p>
            <div className="space-y-1">
              <OptionSwitchRow
                label="Auto-progress weights"
                hint={isAutoProgressOn
                  ? "Adds weight or reps when you hit the top of your goal."
                  : "Off: you set each next goal yourself."}
                checked={isAutoProgressOn}
                onCheckedChange={(next) => {
                  setApplyToAllExercisesConfirmed(false);
                  setIsConfirmingApplyToAll(false);
                  if (next) {
                    setProgressionDraft(lastProgressionRulesRef.current ?? createProgressionPlaybookFormState({ playbookId: "double_progression" }));
                    return;
                  }
                  lastProgressionRulesRef.current = progressionDraft;
                  setProgressionDraft(createProgressionPlaybookFormState({ playbookId: null }));
                }}
              />
              <button
                type="button"
                aria-expanded={showProgressHelp}
                onClick={() => setShowProgressHelp((current) => !current)}
                className="inline-flex min-h-11 items-center px-1 text-[0.85rem] font-semibold !text-[rgb(var(--accent-strong)/0.96)] underline decoration-[rgb(var(--accent-strong)/0.4)] underline-offset-4 [button&]:border-0 [button&]:bg-transparent [button&]:shadow-none"
              >
                How it works
              </button>
              {showProgressHelp ? (
                <p className="px-1 pb-1 text-[0.85rem] leading-snug text-[rgb(var(--text-muted))]">
                  Each exercise has a goal, like 3 × 8–12. When you hit the top of the range on every set, the next workout
                  adds a little weight and drops back to the bottom of the range. Fine-tune the steps under More options,
                  in Progress rules.
                </p>
              ) : null}
            </div>
            <MoreOptionsDisclosure>
            <RoutineEditorFormFields
              fields={["cycleLengthDays", "scheduleMode", "startWeekday", "timezone", "weightUnit", "distanceUnit"]}
              sectionsDefaultExpanded
              showCycleSection
              cycleLengthInputValue={cycleLengthInput}
              cycleLengthDefaultValue={draft.cycleLengthDays}
              scheduleModeDefaultValue={draft.scheduleMode}
              startDateDefaultValue={draft.startDate}
              startWeekdayDefaultValue={draft.startWeekday}
              timezoneDefaultValue={draft.timezone}
              weightUnitDefaultValue={draft.weightUnit}
              distanceUnitDefaultValue={draft.distanceUnit}
              values={draft}
              onCycleLengthInputChange={setCycleLengthInput}
              onCycleLengthInputCommit={commitCycleLengthInput}
              onFieldChange={(field, value) => {
                setDraft((current) => ({
                  ...current,
                  [field]: resolveRoutineDraftFieldValue(field, value),
                }));
              }}
            />
            <ProgressionPlaybookEditor
              value={progressionDraft}
              onChange={(nextValue) => {
                setProgressionDraft(nextValue);
              }}
              weightUnit={draft.weightUnit === "kg" ? "kg" : "lbs"}
              distanceUnit={draft.distanceUnit === "km" ? "km" : "mi"}
              cycleLengthDays={draft.cycleLengthDays}
              context="routine-default"
              title="Progress rules"
              defaultExpanded={false}
              collapsible={false}
              showProgressionInfo={false}
              hideDayAdjustmentSettingsSection
              trainingFocusValue={selectedTrainingGoal}
              trainingFocusCustomized={isTrainingGoalCustomized(selectedTrainingGoal, progressionDraft)}
              onTrainingFocusChange={(goal) => {
                setSelectedTrainingGoal(goal);
                setProgressionDraft(createProgressionPlaybookFormStateForTrainingGoal(goal));
              }}
            />
            <div className="space-y-2" data-routine-apply-to-all="">
              <OptionSwitchRow
                label="Apply to all exercises"
                hint={applyToAllExercisesConfirmed
                  ? "On: Save replaces every exercise's progress rules with these."
                  : "Off: exercises keep their own progress rules."}
                checked={applyToAllExercisesConfirmed}
                onCheckedChange={(next) => {
                  if (next) {
                    setIsConfirmingApplyToAll(true);
                    return;
                  }
                  setApplyToAllExercisesConfirmed(false);
                  setIsConfirmingApplyToAll(false);
                }}
              />
              {isConfirmingApplyToAll ? (
                <div
                  role="alertdialog"
                  aria-label="Replace progress rules on all exercises?"
                  className="space-y-3 rounded-2xl border border-[rgb(var(--border-strong)/0.26)] bg-[rgb(var(--surface-2-rgb)/0.5)] px-3 py-3"
                >
                  <p className="text-[0.9rem] leading-snug text-[rgb(var(--text-primary))]">
                    This replaces the progress rules on every exercise in this routine (stretches are skipped), including
                    any you set one by one. It happens when you tap Save.
                  </p>
                  <div className="flex gap-2">
                    <SecondaryButton type="button" fullWidth onClick={() => setIsConfirmingApplyToAll(false)}>
                      Keep mine
                    </SecondaryButton>
                    <DestructiveButton
                      type="button"
                      fullWidth
                      onClick={() => {
                        setApplyToAllExercisesConfirmed(true);
                        setIsConfirmingApplyToAll(false);
                      }}
                    >
                      Replace all
                    </DestructiveButton>
                  </div>
                </div>
              ) : null}
            </div>
            </MoreOptionsDisclosure>
          </ContentRail>
        </RoutineEditorPageBody>
      </form>

      {isConfirmingDiscard ? (
        <RoutineDetailsDiscardConfirmationDock />
      ) : (
        <PublishBottomActions>
          <BottomActionSingle>
            {/* "Saved" is a calm status, not a dimmed button: nothing to do, so a tap does nothing. */}
            <BottomDockButton
              type="button"
              intent={!isDirty && !isSaving ? "toggleActive" : "positive"}
              disabled={isDirty ? !canSave : isSaving}
              aria-disabled={!canSave}
              onClick={canSave ? saveChanges : undefined}
              aria-live="polite"
              data-routine-save-state={isSaving ? "saving" : isDirty ? "dirty" : "saved"}
            >
              {saveButtonLabel}
            </BottomDockButton>
          </BottomActionSingle>
        </PublishBottomActions>
      )}
    </>
  );
}
