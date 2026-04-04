"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { AppButton } from "@/components/ui/AppButton";
import { useToast } from "@/components/ui/ToastProvider";
import { createRoutineAction } from "@/app/routines/actions";
import { buildRoutineDetailsSnapshot, normalizeRoutineDetailsDraft, validateRoutineDetailsDraft, type RoutineDetailsDraft } from "@/lib/routine-details-form";
import { RoutineDetailsSaveState } from "@/components/routines/RoutineDetailsFormState";

const STORAGE_KEY = "routine-new-draft-v1";

export function NewRoutineDraftForm({ defaults }: { defaults: RoutineDetailsDraft }) {
  const toast = useToast();
  const router = useRouter();
  const [draft, setDraft] = useState<RoutineDetailsDraft>(defaults);
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
        setDraft((current) => normalizeRoutineDetailsDraft(parsed, current));
      }
    } catch {
      // ignore malformed local drafts
    }
    setLoadedDraft(true);
  }, []);

  useEffect(() => {
    if (!loadedDraft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setError(null);
      } catch {
        setError("Could not save local draft.");
      }
    }, 400);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, loadedDraft]);

  const validation = validateRoutineDetailsDraft(draft);
  const initialSnapshot = buildRoutineDetailsSnapshot(defaults);
  const currentSnapshot = buildRoutineDetailsSnapshot(draft);
  const isDirty = currentSnapshot !== initialSnapshot;
  const hasDirtyChanges = hasUserEdited && isDirty;
  const canCreate = validation.valid && isDirty && !isSaving;

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
      <div className="space-y-4 px-1 pb-4">
        <RoutineEditorPageHeader
          eyebrow="New Routine"
          title="Routine Details"
          action={<RoutineBackButton href="/routines" hasUnsavedChanges={hasDirtyChanges} />}
        >
          <RoutineEditorFormFields
            titleInput
            cycleLengthDefaultValue={draft.cycleLengthDays}
            startWeekdayDefaultValue={draft.startWeekday}
            timezoneDefaultValue={draft.timezone}
            weightUnitDefaultValue={draft.weightUnit}
            values={draft}
            onFieldChange={(field, value) => {
              setHasUserEdited(true);
              setDraft((current) => ({
                ...current,
                [field]: field === "cycleLengthDays" ? Number(value || current.cycleLengthDays) : value,
              }));
            }}
          />
        </RoutineEditorPageHeader>
        <RoutineDetailsSaveState error={error} isSaving={isSaving} isDirty={hasDirtyChanges} mode="create" />
      </div>

      <PublishBottomActions>
        <BottomActionSingle>
          <AppButton
            type="button"
            variant="primary"
            fullWidth
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
                formData.set("name", draft.name.trim());
                formData.set("cycleLengthDays", String(draft.cycleLengthDays));
                formData.set("startWeekday", draft.startWeekday);
                formData.set("timezone", draft.timezone);
                formData.set("weightUnit", draft.weightUnit);
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
            Create Routine
          </AppButton>
        </BottomActionSingle>
      </PublishBottomActions>
    </>
  );
}
