"use client";

import { CONFIRM_ACTION_LABELS } from "@/lib/action-labels";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { BottomDockButton } from "@/components/layout/BottomDockButton";
import { useToast } from "@/components/ui/ToastProvider";
import { deleteRoutineAction } from "@/app/routines/actions";

export function DeleteRoutineButton({
  routineId,
  routineName,
}: {
  routineId: string;
  routineName?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <BottomDockButton
        type="button"
        intent="danger"
        onClick={() => setIsOpen(true)}
        disabled={isPending}
      >
        {isPending ? "Deleting..." : "Delete"}
      </BottomDockButton>

      <ConfirmDestructiveModal
        open={isOpen}
        title="Delete routine?"
        objectName={routineName}
        consequenceText="This permanently deletes the routine, its days and exercises, and the workouts you logged with it, along with their progression history. It can't be undone."
        confirmLabel={CONFIRM_ACTION_LABELS.deleteRoutine}
        titleVariant="raw"
        isLoading={isPending}
        onCancel={() => {
          if (!isPending) {
            setIsOpen(false);
          }
        }}
        onConfirm={() => {
          startTransition(async () => {
            const result = await deleteRoutineAction({ routineId });

            if (!result.ok) {
              toast.error(result.error || "Failed to delete routine.");
              return;
            }

            setIsOpen(false);
            toast.success("Routine deleted.");
            router.push("/routines");
            router.refresh();
          });
        }}
      />
    </>
  );
}
