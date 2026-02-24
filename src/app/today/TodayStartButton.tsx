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
      className="w-full rounded-lg bg-emerald-500 px-4 py-5 text-lg font-semibold text-white transition-colors hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/40 disabled:cursor-not-allowed disabled:bg-emerald-500/85"
    >
      {isPending ? "Starting…" : "Start Workout"}
    </button>
  );
}
