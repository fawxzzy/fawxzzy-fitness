"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { SessionBackButton } from "@/components/SessionBackButton";
import { AppButton } from "@/components/ui/AppButton";
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
    <AppButton
      type="submit"
      variant="primary"
      disabled={pending}
      className="min-h-10 w-full justify-center px-3 text-sm font-semibold"
    >
      {pending ? "Saving..." : "Save Session"}
    </AppButton>
  );
}

export function SessionHeaderControls({
  sessionId,
  durationSeconds,
  saveSessionAction,
  quickAddAction,
}: {
  sessionId: string;
  durationSeconds: number;
  saveSessionAction: ServerAction;
  quickAddAction: ReactNode;
}) {
  const toast = useToast();
  const router = useRouter();

  return (
    <div className="sticky top-0 z-50 -mx-4 border-b border-white/10 bg-[rgb(var(--surface)/0.95)] backdrop-blur-md">
      <div className="space-y-3 px-4 pb-3 pt-[max(0.625rem,env(safe-area-inset-top))]">
        <div className="flex items-start justify-between gap-3">
          <div className="shrink-0 pt-0.5">
            <SessionBackButton />
          </div>
          <div className="min-w-0 flex-1 rounded-xl border border-border/45 bg-surface/60 px-3 py-2 text-center shadow-[0_4px_12px_rgba(0,0,0,0.14)]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Session time</p>
            <p className="mt-1 font-semibold tabular-nums text-[1.1rem] leading-none text-[rgb(var(--text)/0.88)]">{formatDurationClock(durationSeconds)}</p>
          </div>
          <div className="shrink-0">{quickAddAction}</div>
        </div>

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
          className="w-full"
        >
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="durationSeconds" value={String(durationSeconds)} />
          <SaveSessionButton />
        </form>

        <div className="min-h-[1.75rem]">
          <OfflineSyncBadge />
        </div>
      </div>
    </div>
  );
}
