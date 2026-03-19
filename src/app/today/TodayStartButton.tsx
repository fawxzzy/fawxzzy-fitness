"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/ToastProvider";
import { PrimaryButton } from "@/components/ui/AppButton";


export function TodayStartButton({
  startSessionAction,
  selectedDayIndex,
  returnTo,
  fullWidth = true,
  className,
}: {
  startSessionAction: (payload?: { dayIndex?: number }) => Promise<ActionResult<{ sessionId: string }>>;
  selectedDayIndex?: number;
  returnTo?: string;
  fullWidth?: boolean;
  className?: string;
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
          const result = await startSessionAction({ dayIndex: selectedDayIndex });
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
      {isPending ? "Starting…" : "Start Workout"}
    </PrimaryButton>
  );
}
