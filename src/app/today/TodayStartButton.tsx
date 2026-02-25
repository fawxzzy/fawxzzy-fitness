"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/ToastProvider";
import { PrimaryButton } from "@/components/ui/AppButton";


export function TodayStartButton({
  startSessionAction,
  selectedDayIndex,
}: {
  startSessionAction: (payload?: { dayIndex?: number }) => Promise<ActionResult<{ sessionId: string }>>;
  selectedDayIndex?: number;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  return (
    <PrimaryButton
      type="button"
      loading={isPending}
      fullWidth
      onClick={() => {
        startTransition(async () => {
          const result = await startSessionAction({ dayIndex: selectedDayIndex });
          if (!result.ok || !result.data?.sessionId) {
            toast.error(result.ok ? "Could not start session" : result.error);
            return;
          }

          router.push(`/session/${result.data.sessionId}`);
        });
      }}
    >
      {isPending ? "Starting…" : "Start Workout"}
    </PrimaryButton>
  );
}
