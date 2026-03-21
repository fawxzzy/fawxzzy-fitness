"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/ToastProvider";
import { PrimaryButton } from "@/components/ui/AppButton";

async function requestSessionStart(payload: { selectedDayIndex?: number; routineId?: string; dayId?: string }) {
  const response = await fetch("/api/sessions/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as ActionResult<{ sessionId: string }>;
  if (!response.ok && result.ok) {
    return { ok: false, error: "Could not start session" } satisfies ActionResult<{ sessionId: string }>;
  }
  return result;
}

export function TodayStartButton({
  selectedDayIndex,
  routineId,
  dayId,
  returnTo,
  fullWidth = true,
  className,
  label = "Start Workout",
}: {
  selectedDayIndex?: number;
  routineId?: string;
  dayId?: string;
  returnTo?: string;
  fullWidth?: boolean;
  className?: string;
  label?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <PrimaryButton
      type="button"
      loading={isPending}
      fullWidth={fullWidth}
      className={`min-h-[44px] border-emerald-400/45 bg-emerald-500/20 text-emerald-50 transition-transform hover:bg-emerald-500/26 active:scale-[0.98] active:bg-emerald-500/32 ${className ?? ""}`}
      onClick={() => {
        startTransition(async () => {
          const result = await requestSessionStart({ selectedDayIndex, routineId, dayId });
          if (!result.ok || !result.data?.sessionId) {
            toast.error(result.ok ? "Could not start session" : result.error);
            return;
          }
          const sessionHref = returnTo
            ? `/session/${result.data.sessionId}?returnTo=${encodeURIComponent(returnTo)}`
            : `/session/${result.data.sessionId}`;
          router.push(sessionHref);
        });
      }}
    >
      {isPending ? "Starting…" : label}
    </PrimaryButton>
  );
}
