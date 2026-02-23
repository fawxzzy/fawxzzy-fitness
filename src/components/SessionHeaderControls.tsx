"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { SessionTimerCard } from "@/components/SessionTimers";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { useToast } from "@/components/ui/ToastProvider";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";

type ServerAction = (formData: FormData) => Promise<ActionResult>;
type PersistDurationAction = (payload: { sessionId: string; durationSeconds: number }) => Promise<ActionResult>;

function SaveSessionButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`w-full rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/25 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${tapFeedbackClass}`}
    >
      {pending ? "Saving..." : "Save Session"}
    </button>
  );
}

export function SessionHeaderControls({
  sessionId,
  initialDurationSeconds,
  saveSessionAction,
  persistDurationAction,
}: {
  sessionId: string;
  initialDurationSeconds: number | null;
  saveSessionAction: ServerAction;
  persistDurationAction: PersistDurationAction;
}) {
  const [durationSeconds, setDurationSeconds] = useState(initialDurationSeconds ?? 0);
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
              router.push("/today?completed=1");
            }
          }}
        >
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="durationSeconds" value={String(durationSeconds)} />
          <SaveSessionButton />
        </form>
      </div>

      <SessionTimerCard
        sessionId={sessionId}
        initialDurationSeconds={initialDurationSeconds}
        onDurationChange={setDurationSeconds}
        persistDurationAction={persistDurationAction}
      />
    </div>
  );
}
