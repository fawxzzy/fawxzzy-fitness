"use client";

import { useEffect, useState, useTransition } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { AttachedCardActionStripFrame, getAttachedCardActionButtonClassName } from "@/components/session/SessionExerciseBlock";
import { cn } from "@/lib/cn";
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
    setTimer(initialTimer);
    setNowMs(Date.now());
  }, [initialTimer]);

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
    <section className="mx-3 mb-3 overflow-hidden rounded-2xl border border-[rgb(var(--accent)/0.28)] bg-[linear-gradient(180deg,rgb(var(--surface-2-rgb)/0.98),rgb(var(--surface-1-rgb)/0.96))]" aria-label="Exercise timer">
      <div className="flex items-center justify-between gap-3 px-3 py-3">
        <p className="shrink-0 text-xs font-black uppercase tracking-[0.16em] text-[rgb(var(--accent)/0.92)]">Exercise Timer</p>
        <output className="shrink-0 text-xs font-black tabular-nums tracking-[0.16em] text-[rgb(var(--accent)/0.92)]" aria-live="off">
          {formatExerciseTimerClock(displaySeconds)}
        </output>
      </div>
      <AttachedCardActionStripFrame
        className="rounded-none border-x-0 border-b-0 border-t-[rgb(var(--accent-divider-rgb)/0.28)] bg-[rgb(var(--surface-1-rgb)/0.16)]"
        gridClassName={isComplete ? "grid-cols-1" : "grid-cols-3"}
      >
        {!isComplete ? (
          <button
            type="button"
            disabled={isPending || timer.status !== "running"}
            onClick={() => runCommand("pause")}
            data-bottom-action-intent="info"
            className={cn(
              getAttachedCardActionButtonClassName({
                intent: "info",
                className: "!h-12 rounded-bl-[var(--card-radius)] !border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)]",
              }),
              isPending || timer.status !== "running" ? "opacity-55" : undefined,
            )}
          >
            <span className="bottom-action__label">Pause</span>
          </button>
        ) : null}
        <button
          type="button"
          disabled={isPending}
          onClick={() => runCommand("reset")}
          data-bottom-action-intent="info"
          className={cn(
            getAttachedCardActionButtonClassName({
              intent: "info",
              className: cn("!h-12", isComplete ? "rounded-bl-[var(--card-radius)] rounded-br-[var(--card-radius)]" : "!border-r !border-r-[rgb(var(--secondary-action-rgb)/0.18)]"),
            }),
            isPending ? "opacity-55" : undefined,
          )}
        >
          <span className="bottom-action__label">Reset</span>
        </button>
        {!isComplete ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => runCommand("complete")}
            data-bottom-action-intent="positive"
            className={cn(
              getAttachedCardActionButtonClassName({
                intent: "positive",
                className: "!h-12 rounded-br-[var(--card-radius)]",
              }),
              isPending ? "opacity-55" : undefined,
            )}
          >
            <span className="bottom-action__label">Done</span>
          </button>
        ) : null}
      </AttachedCardActionStripFrame>
    </section>
  );
}
