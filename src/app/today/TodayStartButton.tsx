"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";
import { useToast } from "@/components/ui/ToastProvider";


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
    <button
      type="button"
      disabled={isPending}
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
      className="w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white [-webkit-tap-highlight-color:transparent] transition-colors hover:bg-accent-strong active:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:cursor-not-allowed disabled:bg-accent/80 disabled:text-white"
    >
      {isPending ? "Starting…" : "Start Workout"}
    </button>
  );
}
