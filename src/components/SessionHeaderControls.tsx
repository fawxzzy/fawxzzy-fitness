"use client";

import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { PrimaryButton } from "@/components/ui/AppButton";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";

type ServerAction = (formData: FormData) => Promise<ActionResult<{ sessionId: string }>>;

function SaveSessionButton() {
  const { pending } = useFormStatus();

  // Manual QA checklist:
  // - Save session redirects to History detail (or History list fallback) only after success.
  return (
    <PrimaryButton
      type="submit"
      fullWidth
      disabled={pending}
      className="sm:w-auto"
    >
      {pending ? "Saving..." : "Save Session"}
    </PrimaryButton>
  );
}

export function SessionHeaderControls({
  sessionId,
  initialDurationSeconds,
  saveSessionAction,
}: {
  sessionId: string;
  initialDurationSeconds: number | null;
  saveSessionAction: ServerAction;
}) {
  const durationSeconds = initialDurationSeconds ?? 0;
  const toast = useToast();
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="sticky top-2 z-10 space-y-2">
        <OfflineSyncBadge />
        <form
          action={async (formData) => {
            const result = await saveSessionAction(formData);
            toastActionResult(toast, result, {
              success: "Workout saved.",
              error: "Could not save workout.",
            });

            if (result.ok) {
              router.push(result.data?.sessionId ? `/history/${result.data.sessionId}` : "/history");
            }
          }}
        >
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="durationSeconds" value={String(durationSeconds)} />
          <SaveSessionButton />
        </form>
      </div>

    </div>
  );
}
