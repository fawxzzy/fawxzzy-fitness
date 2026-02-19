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
      <div className="sticky top-2 z-10 rounded-md bg-slate-900 p-2 shadow-sm">
        <form action={saveSessionAction}>
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="durationSeconds" value={String(durationSeconds)} />
          <div className="flex items-center justify-end">
            <button type="submit" className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
              Save Session
            </button>
          </div>
        </form>
      </div>

      <SessionTimerCard initialDurationSeconds={initialDurationSeconds} onDurationChange={setDurationSeconds} />
    </div>
  );
}
