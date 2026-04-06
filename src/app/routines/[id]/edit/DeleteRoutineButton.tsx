"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { DockButton } from "@/components/layout/BottomActionDock";
import { useToast } from "@/components/ui/ToastProvider";
import { deleteRoutineAction } from "@/app/routines/actions";

export function DeleteRoutineButton({
  routineId,
  routineName,
}: {
  routineId: string;
  routineName: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <DockButton
        type="button"
        intent="danger"
        onClick={() => setIsOpen(true)}
        disabled={isPending}
      >
        {isPending ? "Deleting..." : "Delete Routine"}
      </DockButton>

      <ConfirmDestructiveModal
        open={isOpen}
        title="Delete routine?"
        consequenceText="This will permanently delete this routine and all its days/exercises. This can’t be undone."
        confirmLabel="Delete Routine"
        contextLines={[`Routine: ${routineName}`]}
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
