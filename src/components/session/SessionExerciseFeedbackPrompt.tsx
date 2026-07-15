"use client";

import { useEffect, useRef, useState } from "react";
import { ChipButton } from "@/components/ui/Chip";
import type { ActionResult } from "@/lib/action-result";
import {
  formatSessionCopilotFeedbackLabel,
  getSessionCopilotFeedbackTone,
  isSessionCopilotFeedbackComplete,
  normalizeSessionCopilotFeedbackNote,
  SESSION_COPILOT_FEEDBACK_NOTE_MAX_LENGTH,
  SESSION_COPILOT_FEEDBACK_SIGNALS,
  type SessionCopilotFeedbackSignal,
} from "@/lib/session-copilot-feedback";

type FeedbackAction = (payload: {
  sessionId: string;
  sessionExerciseId: string;
  signal: SessionCopilotFeedbackSignal | null;
  note: string | null;
  effort: number | null;
}) => Promise<ActionResult<unknown>>;

function hasFeedbackAnswer(args: {
  signal: SessionCopilotFeedbackSignal | null;
  note: string;
  effort: number | null;
}) {
  // A note is supporting context, not a standalone answer. Keep the card open until
  // the user has supplied both the qualitative signal and the effort rating.
  return isSessionCopilotFeedbackComplete(args);
}

export function hasSavedSessionExerciseFeedback(args: {
  signal?: SessionCopilotFeedbackSignal | null;
  note?: string | null;
  effort?: number | null;
}) {
  return hasFeedbackAnswer({
    signal: args.signal ?? null,
    note: args.note ?? "",
    effort: args.effort ?? null,
  });
}

export function SessionExerciseFeedbackPrompt({
  sessionId,
  sessionExerciseId,
  updateFeedbackAction,
  onSaved,
}: {
  sessionId: string;
  sessionExerciseId: string;
  updateFeedbackAction: FeedbackAction;
  onSaved: (feedback: { signal: SessionCopilotFeedbackSignal | null; note: string | null; effort: number | null }) => void;
}) {
  const [signal, setSignal] = useState<SessionCopilotFeedbackSignal | null>(null);
  const [effort, setEffort] = useState<number | null>(null);
  const [note, setNote] = useState("");
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
        if (result.ok) {
          onSaved({ signal, note: normalizedNote, effort });
          return;
        }

        savedSignatureRef.current = null;
      }).finally(() => {
        setIsSaving(false);
      });
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [canSave, effort, isSaving, note, onSaved, sessionExerciseId, sessionId, signal, updateFeedbackAction]);

  return (
    <div
      className="border-t border-[rgb(var(--accent-divider-rgb)/0.2)] bg-[rgb(var(--surface-1-rgb)/0.24)] px-3 pb-3 pt-2.5"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent)/0.88)]">
          Feedback
        </p>
        {isSaving ? <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgb(var(--text-muted)/0.72)]">Saving</span> : null}
      </div>
      <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {SESSION_COPILOT_FEEDBACK_SIGNALS.map((value) => (
          <ChipButton
            key={value}
            type="button"
            tone={signal === value ? getSessionCopilotFeedbackTone(value) : "default"}
            aria-pressed={signal === value}
            onClick={() => setSignal((current) => current === value ? null : value)}
            className="shrink-0 px-2.5 py-1 text-[9px] font-semibold tracking-[0.12em]"
          >
            {formatSessionCopilotFeedbackLabel(value)}
          </ChipButton>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
          <ChipButton
            key={value}
            type="button"
            tone={effort === value ? "success" : "default"}
            aria-pressed={effort === value}
            aria-label={`Effort ${value} out of 10`}
            onClick={() => setEffort((current) => current === value ? null : value)}
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center px-0 py-0 text-[10px] font-semibold tracking-normal"
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
        className="mt-2 h-7 w-full border-0 border-b border-[rgb(var(--accent-divider-rgb)/0.28)] bg-transparent px-0 text-[12px] text-[rgb(var(--text-primary)/0.96)] outline-none placeholder:text-[rgb(var(--text-muted)/0.56)] focus:border-[rgb(var(--accent)/0.42)]"
      />
    </div>
  );
}
