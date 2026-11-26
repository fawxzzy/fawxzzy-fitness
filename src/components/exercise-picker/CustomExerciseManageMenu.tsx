"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { deleteCustomExerciseAction, renameCustomExerciseAction } from "@/app/actions/exercises";
import { AppButton } from "@/components/ui/AppButton";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { FormField, formFieldControlClassName } from "@/components/ui/FormField";
import { Menu } from "@/components/ui/Menu";
import { Sheet } from "@/components/ui/Sheet";

// Rename / delete for one of your own custom exercises (DESIGN #9). Uses only the existing owner-scoped server actions
// (they update/delete where user_id = you and is_global = false, and delete refuses an exercise any routine or past
// workout still uses). Both actions redirect back to `returnTo` with ?success= / ?error=, which ActionFeedbackToasts
// shows as the in-flow notice, so there is no inline error text here.

export const CUSTOM_EXERCISE_NAME_MAX_LENGTH = 80;

export function shouldOfferCustomExerciseManagement(
  exercise: { user_id: string | null; is_global: boolean } | null | undefined,
  pathname: string | null,
) {
  if (!exercise || exercise.user_id === null || exercise.is_global) return false;
  // The workout quick-add belongs to the session screen; a redirect there would close the live workout sheet.
  return Boolean(pathname) && !pathname!.startsWith("/session");
}

export function CustomExerciseManageMenu({ exerciseId, exerciseName }: { exerciseId: string; exerciseName: string }) {
  const pathname = usePathname() ?? "/";
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draftName, setDraftName] = useState(exerciseName);
  // A transition, not a flag: both actions redirect back to this same path, so the component can stay mounted and a
  // plain "submitting" flag would never clear. isPending ends when the redirect (toast) lands; then the sheets close.
  const [isSubmitting, startSubmit] = useTransition();
  const wasSubmittingRef = useRef(false);
  const deleteFormRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (wasSubmittingRef.current && !isSubmitting) {
      setRenameOpen(false);
      setDeleteOpen(false);
    }
    wasSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  const submitTo = (action: (formData: FormData) => Promise<void>) => (event: FormEvent<HTMLFormElement>) => {
    // React bubbles submit through the portal to the add-exercise form; keep it here.
    event.preventDefault();
    event.stopPropagation();
    const formData = new FormData(event.currentTarget);
    startSubmit(async () => {
      await action(formData);
    });
  };
  const renameFormId = `custom-exercise-rename-${exerciseId}`;
  const trimmedDraftName = draftName.trim().replace(/\s+/g, " ");
  // The action throws (no friendly redirect) on a name outside 2-80 characters, so the button stays off until it fits.
  const canSaveName = trimmedDraftName.length >= 2 && trimmedDraftName !== exerciseName.trim();

  return (
    <>
      <Menu
        label={`Manage ${exerciseName}`}
        items={[
          {
            id: "rename",
            label: "Rename",
            onSelect: () => {
              setDraftName(exerciseName);
              setRenameOpen(true);
            },
          },
          { id: "delete", label: "Delete", tone: "danger", onSelect: () => setDeleteOpen(true) },
        ]}
      />
      <Sheet
        open={renameOpen}
        title="Rename exercise"
        onClose={() => {
          if (!isSubmitting) setRenameOpen(false);
        }}
        showCloseButton
        footer={(
          <AppButton type="submit" form={renameFormId} variant="primary" size="md" fullWidth disabled={!canSaveName} loading={isSubmitting}>
            Save name
          </AppButton>
        )}
      >
        <form id={renameFormId} onSubmit={submitTo(renameCustomExerciseAction)} className="pb-1">
          <input type="hidden" name="exerciseId" value={exerciseId} />
          <input type="hidden" name="returnTo" value={pathname} />
          <FormField label="Exercise name">
            {(control) => (
              <input
                {...control}
                name="name"
                type="text"
                value={draftName}
                onChange={(event) => setDraftName(event.target.value.slice(0, CUSTOM_EXERCISE_NAME_MAX_LENGTH))}
                maxLength={CUSTOM_EXERCISE_NAME_MAX_LENGTH}
                autoComplete="off"
                className={formFieldControlClassName}
              />
            )}
          </FormField>
        </form>
      </Sheet>
      <ConfirmDestructiveModal
        open={deleteOpen}
        title="Delete custom exercise?"
        titleVariant="raw"
        objectName={exerciseName}
        consequenceText="It leaves your exercise list. You can only delete it when no routine or past workout uses it."
        confirmLabel="Delete"
        confirmActionLabel="Delete"
        confirmVariant="destructive"
        isLoading={isSubmitting}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => deleteFormRef.current?.requestSubmit()}
      >
        {/* Inside the sheet (a portal), so it is never a form nested in the add-exercise form. */}
        <form ref={deleteFormRef} onSubmit={submitTo(deleteCustomExerciseAction)} hidden>
          <input type="hidden" name="exerciseId" value={exerciseId} />
          <input type="hidden" name="returnTo" value={pathname} />
        </form>
      </ConfirmDestructiveModal>
    </>
  );
}
