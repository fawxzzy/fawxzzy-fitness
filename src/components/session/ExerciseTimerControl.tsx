"use client";

import { useEffect, useState, useTransition } from "react";
import { SecondaryButton } from "@/components/ui/AppButton";
import { useToast } from "@/components/ui/ToastProvider";
import {
  formatExerciseTimerClock,
  getExerciseTimerDisplaySeconds,
  isExerciseTimerTargetComplete,
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

  useEffect(() => {
    if (timer.status === "running" && isExerciseTimerTargetComplete(timer, nowMs) && !isPending) {
      runCommand("complete");
    }
  }, [isPending, nowMs, timer]);

  const displaySeconds = getExerciseTimerDisplaySeconds(timer, nowMs);
  const isComplete = timer.status === "completed";

  return (
    <section className="mx-3 mb-3 rounded-2xl border border-[rgb(var(--accent)/0.28)] bg-[linear-gradient(180deg,rgb(var(--surface-2-rgb)/0.98),rgb(var(--surface-1-rgb)/0.96))] p-3" aria-label="Exercise timer">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[rgb(var(--accent)/0.92)]">Exercise Timer</p>
          <p className="text-xs text-[rgb(var(--text-secondary)/0.9)]">
            {timer.mode === "countdown" ? "Countdown for this exercise" : "Elapsed time for this exercise"}
          </p>
        </div>
        <output className="text-3xl font-black tabular-nums text-[rgb(var(--text-primary))]" aria-live="off">
          {formatExerciseTimerClock(displaySeconds)}
        </output>
      </div>
      {isComplete ? <p className="mt-2 text-sm font-bold text-[rgb(var(--success-rgb))]">Target complete</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {timer.status === "running" ? (
          <SecondaryButton type="button" size="sm" disabled={isPending} onClick={() => runCommand("pause")}>Pause</SecondaryButton>
        ) : (
          <SecondaryButton type="button" size="sm" disabled={isPending} onClick={() => runCommand("start")}>
            {timer.status === "paused" ? "Resume" : "Start"}
          </SecondaryButton>
        )}
        <SecondaryButton type="button" size="sm" disabled={isPending} onClick={() => runCommand("reset")}>Reset</SecondaryButton>
        {timer.mode === "count_up" && timer.status !== "completed" ? (
          <SecondaryButton type="button" size="sm" disabled={isPending} onClick={() => runCommand("complete")}>Done</SecondaryButton>
        ) : null}
      </div>
    </section>
  );
}
