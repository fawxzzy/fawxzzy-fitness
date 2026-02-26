"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { PrimaryButton } from "@/components/ui/AppButton";
import { useToast } from "@/components/ui/ToastProvider";
import { toastActionResult } from "@/lib/action-feedback";
import type { ActionResult } from "@/lib/action-result";

type ServerAction = (formData: FormData) => Promise<ActionResult<{ sessionId: string }>>;

function formatDurationClock(totalSeconds: number) {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

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
  performedAt,
  saveSessionAction,
}: {
  sessionId: string;
  initialDurationSeconds: number | null;
  performedAt: string;
  saveSessionAction: ServerAction;
}) {
  const baseDurationSeconds = initialDurationSeconds ?? 0;
  const performedAtMs = useMemo(() => {
    const parsed = Date.parse(performedAt);
    return Number.isNaN(parsed) ? null : parsed;
  }, [performedAt]);
  const [durationSeconds, setDurationSeconds] = useState(baseDurationSeconds);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    const computeElapsed = () => {
      if (!performedAtMs) {
        return baseDurationSeconds;
      }

      const elapsed = Math.floor((Date.now() - performedAtMs) / 1000);
      return elapsed > 0 ? elapsed : baseDurationSeconds;
    };

    setDurationSeconds(computeElapsed());
    const timer = window.setInterval(() => {
      setDurationSeconds(computeElapsed());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [baseDurationSeconds, performedAtMs]);

  return (
    <div className="space-y-3">
      <div className="sticky top-2 z-10 space-y-2">
        <OfflineSyncBadge />
        <p className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          Session time: <span className="font-semibold tabular-nums">{formatDurationClock(durationSeconds)}</span>
        </p>
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
