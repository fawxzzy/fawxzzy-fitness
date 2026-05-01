"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import {
  RoutineDetailsBottomActionPublisher,
  RoutineEditorPageBody,
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
import { buildRoutineDetailsSnapshot, normalizeRoutineDetailsDraft, validateRoutineDetailsDraft, type RoutineDetailsDraft } from "@/lib/routine-details-form";
import { RoutineDetailsSaveState } from "@/components/routines/RoutineDetailsFormState";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "routine-new-draft-v1";

type NewRoutineDraftDefaults = Omit<RoutineDetailsDraft, "distanceUnit"> & {
  distanceUnit?: string;
};

function resolveRoutineDraftFieldValue(field: string, value: string, previousCycleLength: number) {
  if (field === "cycleLengthDays") {
    const nextCycleLength = Math.floor(Number(value));
    return Number.isFinite(nextCycleLength)
      ? Math.max(1, Math.min(365, nextCycleLength))
      : previousCycleLength;
  }

  if (field === "name") {
    return value.slice(0, 15);
  }

  return value;
}

export function NewRoutineDraftForm({ defaults }: { defaults: NewRoutineDraftDefaults }) {
  const toast = useToast();
  const router = useRouter();
  const normalizedDefaults = normalizeRoutineDetailsDraft(defaults, {
    name: defaults.name,
    cycleLengthDays: defaults.cycleLengthDays,
    startWeekday: defaults.startWeekday,
    timezone: defaults.timezone,
    weightUnit: defaults.weightUnit,
    distanceUnit: defaults.distanceUnit === "km" ? "km" : "mi",
  });
  const [draft, setDraft] = useState<RoutineDetailsDraft>(normalizedDefaults);
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSaving, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<RoutineDetailsDraft>;
        const normalizedParsed = normalizeRoutineDetailsDraft(parsed, normalizedDefaults);
        const shouldResetStartWeekday =
          normalizedParsed.name.trim().length === 0
          && normalizedParsed.cycleLengthDays === normalizedDefaults.cycleLengthDays;

        setDraft({
          ...normalizedParsed,
          startWeekday: shouldResetStartWeekday ? normalizedDefaults.startWeekday : normalizedParsed.startWeekday,
        });
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
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setError(null);
      } catch {
        setError("Could not save local draft.");
        toast.error("Could not save local draft.");
      }
    }, 400);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, loadedDraft, toast]);

  const validation = validateRoutineDetailsDraft(draft);
  const initialSnapshot = buildRoutineDetailsSnapshot(normalizedDefaults);
  const currentSnapshot = buildRoutineDetailsSnapshot(draft);
  const isDirty = currentSnapshot !== initialSnapshot;
  const hasDirtyChanges = hasUserEdited && isDirty;
  const canCreate = validation.valid && isDirty && !isSaving;
  const { isConfirmingDiscard } = useRoutineDetailsExitGuard();
  const trimmedRoutineName = draft.name.trim().slice(0, 15);

  useRoutineDetailsHeaderTitle(trimmedRoutineName ? `New Routine | ${trimmedRoutineName}` : "New Routine");

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

  return (
    <>
      <RoutineEditorPageBody className={appTokens.routineEditorSectionStack}>
        <div className={cn("pt-4", appTokens.routineEditorCompactStack)}>
          <RoutineEditorFormFields
            titleInput
            fields={["name", "cycleLengthDays"]}
            cycleLengthDefaultValue={draft.cycleLengthDays}
            startWeekdayDefaultValue={draft.startWeekday}
            timezoneDefaultValue={draft.timezone}
            weightUnitDefaultValue={draft.weightUnit}
            distanceUnitDefaultValue={draft.distanceUnit}
            values={draft}
            onFieldChange={(field, value) => {
              setHasUserEdited(true);
              setDraft((current) => ({
                ...current,
                [field]: resolveRoutineDraftFieldValue(field, value, current.cycleLengthDays),
              }));
            }}
          />
        </div>

        <div className={appTokens.routineEditorCompactStack}>
          <RoutineEditorFormFields
            fields={["startWeekday", "timezone", "weightUnit", "distanceUnit"]}
            cycleLengthDefaultValue={draft.cycleLengthDays}
            startWeekdayDefaultValue={draft.startWeekday}
            timezoneDefaultValue={draft.timezone}
            weightUnitDefaultValue={draft.weightUnit}
            distanceUnitDefaultValue={draft.distanceUnit}
            values={draft}
            onFieldChange={(field, value) => {
              setHasUserEdited(true);
              setDraft((current) => ({
                ...current,
                [field]: resolveRoutineDraftFieldValue(field, value, current.cycleLengthDays),
              }));
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
                  const nextValidation = validateRoutineDetailsDraft(draft);
                  if (!nextValidation.valid) {
                    const nextError = nextValidation.error ?? "Please complete all required routine fields.";
                    setError(nextError);
                    toast.error(nextError);
                    return;
                  }

                  const formData = new FormData();
                  formData.set("name", trimmedRoutineName);
                  formData.set("cycleLengthDays", String(draft.cycleLengthDays));
                  formData.set("startWeekday", draft.startWeekday);
                  formData.set("timezone", draft.timezone);
                  formData.set("weightUnit", draft.weightUnit);
                  formData.set("distanceUnit", draft.distanceUnit);
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
                  router.push("/routines?view=list");
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
