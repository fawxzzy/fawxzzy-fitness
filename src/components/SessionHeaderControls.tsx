"use client";

import { useState } from "react";
import { SessionTimerCard } from "@/components/SessionTimers";

type ServerAction = (formData: FormData) => void | Promise<void>;

export function SessionHeaderControls({
  sessionId,
  initialDurationSeconds,
  saveSessionAction,
}: {
  sessionId: string;
  initialDurationSeconds: number | null;
  saveSessionAction: ServerAction;
}) {
  const [durationSeconds, setDurationSeconds] = useState(initialDurationSeconds ?? 0);

  return (
    <div className="space-y-3">
      <form action={saveSessionAction}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="durationSeconds" value={String(durationSeconds)} />
        <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
          Save Session
        </button>
      </form>

      <SessionTimerCard initialDurationSeconds={initialDurationSeconds} onDurationChange={setDurationSeconds} />
    </div>
  );
}
