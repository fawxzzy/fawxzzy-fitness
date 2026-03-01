"use client";

import { useState } from "react";
import { AppButton } from "@/components/ui/AppButton";
import { ConfirmDestructiveModal } from "@/components/ui/ConfirmDestructiveModal";

export function RoutineSaveButton({ formId, originalCycleLength }: { formId: string; originalCycleLength: number }) {
  const [open, setOpen] = useState(false);

  const submitForm = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    form?.requestSubmit();
  };

  const handleSaveClick = () => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    const cycleField = form?.elements.namedItem("cycleLengthDays") as HTMLInputElement | null;
    const nextCycle = Number(cycleField?.value ?? originalCycleLength);

    if (Number.isFinite(nextCycle) && nextCycle < originalCycleLength) {
      setOpen(true);
      return;
    }

    submitForm();
  };

  return (
    <>
      <AppButton type="button" variant="primary" fullWidth onClick={handleSaveClick}>Save Routine</AppButton>
      <ConfirmDestructiveModal
        open={open}
        title="Reduce cycle length?"
        description="Reducing cycle length will delete days beyond the new length."
        confirmLabel="Delete"
        onCancel={() => setOpen(false)}
        onConfirm={submitForm}
      />
    </>
  );
}
