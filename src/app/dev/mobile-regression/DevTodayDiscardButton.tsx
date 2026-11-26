"use client";

import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { CONFIRM_ACTION_LABELS } from "@/lib/action-labels";

const DEV_DISCARD_FAILED_MESSAGE = "Could not discard the workout. Try again.";

/**
 * Dev fixture copy of Today's Discard button (same props as `src/app/today/page.tsx`). The fixture has no database,
 * so confirming always reports a failed discard: this is the screen for checking the confirm dialog and the failure
 * notice without touching real data.
 */
export function DevTodayDiscardButton() {
  return (
    <ConfirmedServerFormButton
      action={async () => ({ ok: false as const, error: DEV_DISCARD_FAILED_MESSAGE })}
      hiddenFields={{ sessionId: "dev-session" }}
      triggerLabel="Discard"
      triggerIntent="info"
      triggerClassName="h-full w-full"
      size="md"
      modalTitle="Discard workout?"
      modalConsequenceText="Current workout will be removed."
      confirmLabel={CONFIRM_ACTION_LABELS.discardWorkout}
      failureMessage={DEV_DISCARD_FAILED_MESSAGE}
    />
  );
}
