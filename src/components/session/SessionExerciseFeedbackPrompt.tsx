"use client";

import { useEffect, useRef, useState } from "react";
import { ChipButton } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import type { ActionResult } from "@/lib/action-result";
import { resolveSessionExerciseFeedbackSaveOutcome } from "@/lib/session-feedback-ui";
import {
  formatSessionCopilotFeedbackLabel,
  getSessionCopilotFeedbackTone,
  isSessionCopilotFeedbackComplete,
  normalizeSessionCopilotFeedbackNote,
  SESSION_COPILOT_FEEDBACK_NOTE_MAX_LENGTH,
  SESSION_COPILOT_FEEDBACK_SIGNALS,
  type SessionCopilotFeedbackSignal,
} from "@/lib/session-copilot-feedback";

type PersistedFeedback = {
  signal: SessionCopilotFeedbackSignal | null;
  note: string | null;
  effort: number | null;
  updatedAt: string | null;
};

type FeedbackAction = (payload: {
  sessionId: string;
  sessionExerciseId: string;
  signal: SessionCopilotFeedbackSignal | null;
  note: string | null;
  effort: number | null;
}) => Promise<ActionResult<PersistedFeedback>>;

function hasFeedbackAnswer(args: {
  signal: SessionCopilotFeedbackSignal | null;
  note: string;
  effort: number | null;
}) {
  // A note is supporting context, not a standalone answer. Keep the card open until
  // the user has supplied both the qualitative signal and the effort rating.
  return isSessionCopilotFeedbackComplete(args);
}

export function SessionExerciseFeedbackPrompt({
  sessionId,
  sessionExerciseId,
  initialFeedback,
  updateFeedbackAction,
  onSaved,
}: {
  sessionId: string;
  sessionExerciseId: string;
  initialFeedback: Pick<PersistedFeedback, "signal" | "note" | "effort">;
  updateFeedbackAction: FeedbackAction;
  onSaved: (feedback: { signal: SessionCopilotFeedbackSignal | null; note: string | null; effort: number | null }) => void;
}) {
  const [signal, setSignal] = useState<SessionCopilotFeedbackSignal | null>(initialFeedback.signal);
  const [effort, setEffort] = useState<number | null>(initialFeedback.effort);
  const [note, setNote] = useState(initialFeedback.note ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const savedSignatureRef = useRef<string | null>(null);
  const canSave = hasFeedbackAnswer({ signal, note, effort });

  useEffect(() => {
    if (!canSave || isSaving) return;

    const normalizedNote = normalizeSessionCopilotFeedbackNote(note);
    const signature = JSON.stringify([signal, normalizedNote, effort]);
    if (savedSignatureRef.current === signature) return;

    const timeoutId = window.setTimeout(() => {
      savedSignatureRef.current = signature;
      setIsSaving(true);
      void updateFeedbackAction({
        sessionId,
        sessionExerciseId,
        signal,
        note: normalizedNote,
        effort,
      }).then((result) => {
        const persistedFeedback = result.ok ? result.data : undefined;
        const outcome = resolveSessionExerciseFeedbackSaveOutcome({
          saveSucceeded: result.ok,
          persistedSignal: persistedFeedback?.signal,
          persistedEffort: persistedFeedback?.effort,
        });
        if (persistedFeedback && outcome.shouldDismiss) {
          onSaved(persistedFeedback);
          return;
        }

        if (outcome.shouldRetry) {
          savedSignatureRef.current = null;
        }
      }).finally(() => {
        setIsSaving(false);
      });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [canSave, effort, isSaving, note, onSaved, sessionExerciseId, sessionId, signal, updateFeedbackAction]);

  return (
    <div
      role="group"
      aria-label="Exercise feedback"
      data-session-feedback-prompt="true"
      className="border-t border-[rgb(var(--accent-divider-rgb)/0.2)] bg-[rgb(var(--surface-1-rgb)/0.24)] px-3 pb-3 pt-2.5"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--accent)/0.95)]">
          Feedback
        </p>
        {isSaving ? <span role="status" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--text-secondary)/0.95)]">Saving</span> : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SESSION_COPILOT_FEEDBACK_SIGNALS.map((value) => (
          <ChipButton
            key={value}
            type="button"
            active={signal === value}
            tone={signal === value ? getSessionCopilotFeedbackTone(value) : "default"}
            aria-pressed={signal === value}
            onClick={() => setSignal((current) => current === value ? null : value)}
            className={cn(
              "min-h-11 shrink-0 px-3 py-1 text-[11px] font-semibold tracking-[0.1em]",
              signal === value
                ? "!border-[rgb(var(--accent)/0.96)] !bg-[rgb(var(--accent)/0.3)] !text-[rgb(var(--text-primary))] ring-1 ring-[rgb(var(--accent)/0.7)] shadow-[0_0_14px_rgb(var(--accent)/0.28)]"
                : undefined,
            )}
          >
            {formatSessionCopilotFeedbackLabel(value)}
          </ChipButton>
        ))}
      </div>
      <div role="group" aria-label="Effort, 1 to 10" className="mt-1.5 grid grid-cols-5 gap-1.5">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
          <ChipButton
            key={value}
            type="button"
            active={effort === value}
            tone={effort === value ? "success" : "default"}
            aria-pressed={effort === value}
            aria-label={`Effort ${value} out of 10`}
            onClick={() => setEffort((current) => current === value ? null : value)}
            className={cn(
              "inline-flex min-h-11 w-full min-w-11 items-center justify-center px-0 py-0 text-[13px] font-semibold tracking-normal tabular-nums",
              effort === value
                ? "!border-[rgb(var(--accent)/0.96)] !bg-[rgb(var(--accent)/0.3)] !text-[rgb(var(--text-primary))] ring-1 ring-[rgb(var(--accent)/0.7)] shadow-[0_0_14px_rgb(var(--accent)/0.28)]"
                : undefined,
            )}
          >
            {value}
          </ChipButton>
        ))}
      </div>
      <input
        type="text"
        value={note}
        maxLength={SESSION_COPILOT_FEEDBACK_NOTE_MAX_LENGTH}
        onChange={(event) => setNote(event.currentTarget.value)}
        placeholder="Optional note"
        aria-label="Feedback note (optional)"
        className="mt-2 h-11 w-full border-0 border-b border-[rgb(var(--accent-divider-rgb)/0.28)] bg-transparent px-0 text-sm text-[rgb(var(--text-primary)/0.96)] outline-none placeholder:text-[rgb(var(--text-muted)/0.8)] focus:border-[rgb(var(--accent)/0.42)]"
      />
    </div>
  );
}
