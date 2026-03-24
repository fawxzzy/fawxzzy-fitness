"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RoutineBackButton } from "@/components/RoutineBackButton";
import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { RoutineEditorFormFields } from "@/components/routines/RoutineEditorForm";
import { BottomActionSingle } from "@/components/layout/CanonicalBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { AppButton } from "@/components/ui/AppButton";
import { AccentSubtitleText, SubtitleText } from "@/components/ui/text-roles";
import { useToast } from "@/components/ui/ToastProvider";
import { createRoutineAction } from "@/app/routines/actions";

const STORAGE_KEY = "routine-new-draft-v1";

type Draft = {
  name: string;
  cycleLengthDays: number;
  startWeekday: string;
  timezone: string;
  weightUnit: string;
};

export function NewRoutineDraftForm({ defaults }: { defaults: Draft }) {
  const toast = useToast();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(defaults);
  const [loadedDraft, setLoadedDraft] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Draft>;
        setDraft((current) => ({
          ...current,
          ...parsed,
          cycleLengthDays: typeof parsed.cycleLengthDays === "number" ? parsed.cycleLengthDays : current.cycleLengthDays,
        }));
      }
    } catch {
      // ignore malformed local drafts
    }
    setLoadedDraft(true);
  }, []);

  useEffect(() => {
    if (!loadedDraft) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatus("saving");
    saveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        setStatus("saved");
        setError(null);
      } catch {
        setStatus("error");
        setError("Could not save local draft.");
      }
    }, 400);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [draft, loadedDraft]);

  const subtitleRight = useMemo(() => (
    <SubtitleText className="text-xs text-muted">
      {status === "saving" ? "Saving..." : status === "saved" ? "Saved" : status === "error" ? "Could not save draft" : "Draft autosaves locally"}
    </SubtitleText>
  ), [status]);

  return (
    <>
      <div className="space-y-4 px-1 pb-4">
        <RoutineEditorPageHeader
          title="NEW ROUTINE DETAILS"
          action={<RoutineBackButton href="/routines" hasUnsavedChanges={false} />}
          actionClassName="-mt-1"
          subtitleRight={subtitleRight}
          className="space-y-5"
        >
          <RoutineEditorFormFields
            titleInput
            cycleLengthDefaultValue={draft.cycleLengthDays}
            startWeekdayDefaultValue={draft.startWeekday}
            timezoneDefaultValue={draft.timezone}
            weightUnitDefaultValue={draft.weightUnit}
            values={draft}
            onFieldChange={(field, value) => {
              setDraft((current) => ({
                ...current,
                [field]: field === "cycleLengthDays" ? Number(value || current.cycleLengthDays) : value,
              }));
            }}
          />
        </RoutineEditorPageHeader>
        <SubtitleText className="px-1 text-xs text-muted">Leave anytime — this draft will be here when you come back.</SubtitleText>
        {error ? <AccentSubtitleText className="rounded-[1rem] border border-red-300/40 bg-red-50/10 px-3 py-2 text-red-200">{error}</AccentSubtitleText> : null}
      </div>

      <PublishBottomActions>
        <BottomActionSingle>
          <AppButton
            type="button"
            variant="primary"
            fullWidth
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const formData = new FormData();
                formData.set("name", draft.name);
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
                if (!result.routineId || !result.firstDayId) {
                  const nextError = "Could not create routine.";
                  setError(nextError);
                  toast.error(nextError);
                  return;
                }
                window.localStorage.removeItem(STORAGE_KEY);
                toast.success("Routine created");
                router.push(`/routines/${result.routineId}/edit/day/${result.firstDayId}`);
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
