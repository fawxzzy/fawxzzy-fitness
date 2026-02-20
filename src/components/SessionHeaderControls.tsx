"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { SessionTimerCard } from "@/components/SessionTimers";

type ServerAction = (formData: FormData) => void | Promise<void>;
type PersistDurationAction = (payload: { sessionId: string; durationSeconds: number }) => Promise<{ ok: boolean }>;

function SaveSessionButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Saving..." : "✓ Save Session"}
    </button>
  );
}

export function SessionHeaderControls({
  sessionId,
  initialDurationSeconds,
  saveSessionAction,
  persistDurationAction,
}: {
  sessionId: string;
  initialDurationSeconds: number | null;
  saveSessionAction: ServerAction;
  persistDurationAction: PersistDurationAction;
}) {
  const [durationSeconds, setDurationSeconds] = useState(initialDurationSeconds ?? 0);

  return (
    <div className="space-y-3">
      <div className="sticky top-2 z-10 rounded-md bg-slate-900 p-2 shadow-sm">
        <form action={saveSessionAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="durationSeconds" value={String(durationSeconds)} />
          <div className="flex items-center justify-end">
            <SaveSessionButton />
          </div>
        </form>
      </div>

      <SessionTimerCard
        sessionId={sessionId}
        initialDurationSeconds={initialDurationSeconds}
        onDurationChange={setDurationSeconds}
        persistDurationAction={persistDurationAction}
      />
    </div>
  );
}
