"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";
import { AppButton } from "@/components/ui/AppButton";
import { useToast } from "@/components/ui/ToastProvider";
import { deleteRoutineAction } from "@/app/routines/actions";

export function DeleteRoutineButton({
  routineId,
  routineName,
  className = "w-full min-h-[44px]",
}: {
  routineId: string;
  routineName: string;
  className?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <AppButton
        type="button"
        variant="destructive"
        size="md"
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        className={className}
      >
        {isPending ? "Deleting..." : "Delete Routine"}
      </AppButton>

      <ConfirmDestructiveModal
        open={isOpen}
        title="Delete routine?"
        description="This will permanently delete this routine and all its days/exercises. This can’t be undone."
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
