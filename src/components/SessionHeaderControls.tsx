"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionBackButton } from "@/components/SessionBackButton";
import { SecondaryButton } from "@/components/ui/AppButton";
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
    <SecondaryButton
      type="submit"
      disabled={pending}
      className="px-3"
    >
      {pending ? "Saving..." : "Save Session"}
    </SecondaryButton>
  );
}

export function SessionHeaderControls({
  sessionId,
  initialDurationSeconds,
  performedAt,
  saveSessionAction,
  quickAddAction,
}: {
  sessionId: string;
  initialDurationSeconds: number | null;
  performedAt: string;
  saveSessionAction: ServerAction;
  quickAddAction: React.ReactNode;
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
    <div className="sticky top-0 z-30 -mx-4 min-h-[calc(env(safe-area-inset-top)+64px)] border-b border-white/10 bg-surface px-4 pt-[calc(env(safe-area-inset-top)+8px)] pb-2">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
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
          className="shrink-0"
        >
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="durationSeconds" value={String(durationSeconds)} />
          <SaveSessionButton />
        </form>
        <p className="whitespace-nowrap text-center text-xs text-muted">
          <span className="font-medium tabular-nums text-[rgb(var(--text)/0.75)]">{formatDurationClock(durationSeconds)}</span>
        </p>
        <div className="flex items-center justify-end gap-2">
          {quickAddAction}
          <SessionBackButton />
        </div>
      </div>
      <OfflineSyncBadge />
    </div>
  );
}
