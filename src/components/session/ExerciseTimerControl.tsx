"use client";

import { useEffect, useState, useTransition } from "react";
import { SecondaryButton } from "@/components/ui/AppButton";
import { useToast } from "@/components/ui/ToastProvider";
import { GlowSwitch } from "@/components/ui/GlowSwitch";
import {
  formatExerciseTimerClock,
  getExerciseTimerElapsedSeconds,
  type ExerciseTimerCommand,
  type ExerciseTimerSnapshot,
} from "@/lib/exercise-timer";
import type { ActionResult } from "@/lib/action-result";

type TimerResult = ActionResult<{ timer: ExerciseTimerSnapshot }>;

export function ExerciseTimerControl({
  sessionId,
  sessionExerciseId,
  initialTimer,
  updateTimerAction,
}: {
  sessionId: string;
  sessionExerciseId: string;
  initialTimer: ExerciseTimerSnapshot;
  updateTimerAction: (payload: {
    sessionId: string;
    sessionExerciseId: string;
    command: ExerciseTimerCommand;
  }) => Promise<TimerResult>;
}) {
  const toast = useToast();
  const [timer, setTimer] = useState(initialTimer);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (timer.status !== "running") {
      return;
    }
    const interval = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [timer.status]);

  function runCommand(command: ExerciseTimerCommand) {
    startTransition(async () => {
      const result = await updateTimerAction({ sessionId, sessionExerciseId, command });
      if (!result.ok) {
        toast.error(result.error || "Could not update exercise timer.");
        return;
      }
      if (!result.data?.timer) {
        toast.error("Could not update exercise timer.");
        return;
      }
      setTimer(result.data.timer);
      setNowMs(Date.now());
    });
  }

  const displaySeconds = getExerciseTimerElapsedSeconds(timer, nowMs);
  const isComplete = timer.status === "completed";

  return (
    <section className="mx-3 mb-3 rounded-2xl border border-[rgb(var(--accent)/0.28)] bg-[linear-gradient(180deg,rgb(var(--surface-2-rgb)/0.98),rgb(var(--surface-1-rgb)/0.96))] p-3" aria-label="Exercise timer">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="shrink-0 text-xs font-black uppercase tracking-[0.16em] text-[rgb(var(--accent)/0.92)]">Exercise Timer</p>
          <GlowSwitch
            checked={timer.status === "running"}
            ariaLabel={timer.status === "running" ? "Turn exercise timer off" : "Turn exercise timer on"}
            onLabel="Timer On"
            offLabel="Timer Off"
            disabled={isPending}
            onClick={() => runCommand(timer.status === "running" ? "pause" : "start")}
            className="h-8 w-[6.4rem] shrink-0 text-[8px]"
            stateClassName="min-w-[2.65rem]"
          />
        </div>
        <output className="shrink-0 text-xs font-black tabular-nums tracking-[0.16em] text-[rgb(var(--accent)/0.92)]" aria-live="off">
          {formatExerciseTimerClock(displaySeconds)}
        </output>
      </div>
      {isComplete ? <p className="mt-2 text-sm font-bold text-[rgb(var(--success-rgb))]">Target complete</p> : null}
      <div className={`mt-3 grid ${isComplete ? "grid-cols-1" : "grid-cols-2"} gap-2 border-t border-[rgb(var(--accent-divider-rgb)/0.22)] pt-3`}>
        <SecondaryButton type="button" size="sm" disabled={isPending} onClick={() => runCommand("reset")}>Reset</SecondaryButton>
        {!isComplete ? (
          <SecondaryButton type="button" size="sm" disabled={isPending} onClick={() => runCommand("complete")}>Done</SecondaryButton>
        ) : null}
      </div>
    </section>
  );
}
