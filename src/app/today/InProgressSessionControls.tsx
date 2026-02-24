"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/lib/action-result";

type RoutineDayOption = {
  id: string;
  dayIndex: number;
  name: string;
  isRest: boolean;
};

export function InProgressSessionControls({
  sessionId,
  days,
  currentDayIndex,
  changeSessionDayAction,
}: {
  sessionId: string;
  days: RoutineDayOption[];
  currentDayIndex: number;
  changeSessionDayAction: (payload: { sessionId: string; dayIndex: number }) => Promise<ActionResult>;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectedDayIndexes, setSelectedDayIndexes] = useState<number[]>([currentDayIndex]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleOk = async () => {
    const nextDayIndex = selectedDayIndexes[0];
    if (!Number.isInteger(nextDayIndex)) {
      setError("Please select a day.");
      return;
    }

    setPending(true);
    setError(null);
    const result = await changeSessionDayAction({ sessionId, dayIndex: nextDayIndex });
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setIsModalOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <Link href={`/session/${sessionId}`} className="block w-full rounded-lg bg-accent px-4 py-5 text-center text-lg font-semibold text-white transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">Resume Workout</Link>
      <button
        type="button"
        onClick={() => {
          setSelectedDayIndexes([currentDayIndex]);
          setError(null);
          setIsModalOpen(true);
        }}
        className="block w-full rounded-md border border-border bg-surface-2-soft px-3 py-2 text-center text-sm font-normal tracking-[0.08em] text-text transition-colors hover:bg-surface-2-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
      >
        CHANGE DAY
      </button>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-bg p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-text">Select Day(s)</h3>
            <p className="mt-1 text-xs text-muted">Choose a routine day for this active session.</p>

            <ul className="mt-3 max-h-52 space-y-2 overflow-auto">
              {days.map((day) => {
                const checked = selectedDayIndexes.includes(day.dayIndex);
                return (
                  <li key={day.id} className="rounded-md border border-border bg-surface-2-soft px-3 py-2">
                    <label className="flex items-center gap-2 text-sm text-text">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedDayIndexes([day.dayIndex]);
                            return;
                          }

                          setSelectedDayIndexes([]);
                        }}
                      />
                      <span>
                        {day.name}
                        {day.isRest ? " (Rest)" : ""}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>

            {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-md border border-border px-3 py-1.5 text-xs text-text"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOk}
                disabled={pending}
                className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {pending ? "Saving..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
