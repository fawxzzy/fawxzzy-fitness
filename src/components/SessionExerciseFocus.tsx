"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SetLoggerCard } from "@/components/SessionTimers";
import type { SetRow } from "@/types/db";

type AddSetPayload = {
  sessionId: string;
  sessionExerciseId: string;
  weight: number;
  reps: number;
  durationSeconds: number | null;
  isWarmup: boolean;
  rpe: number | null;
  notes: string | null;
};

type AddSetActionResult = {
  ok: boolean;
  error?: string;
  set?: SetRow;
};

type SessionExerciseFocusItem = {
  id: string;
  name: string;
  isSkipped: boolean;
  goalText: string | null;
  initialSets: SetRow[];
  loggedSetCount: number;
};

export function SessionExerciseFocus({
  sessionId,
  unitLabel,
  exercises,
  addSetAction,
  toggleSkipAction,
  removeExerciseAction,
}: {
  sessionId: string;
  unitLabel: string;
  exercises: SessionExerciseFocusItem[];
  addSetAction: (payload: AddSetPayload) => Promise<AddSetActionResult>;
  toggleSkipAction: (formData: FormData) => Promise<void>;
  removeExerciseAction: (formData: FormData) => Promise<void>;
}) {
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const focusedRef = useRef<HTMLElement | null>(null);
  const selectedExercise = useMemo(
    () => exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null,
    [exercises, selectedExerciseId],
  );

  useEffect(() => {
    if (!selectedExerciseId || !focusedRef.current) return;
    focusedRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedExerciseId]);

  return (
    <div className="space-y-3">
      {selectedExerciseId === null ? (
        <ul className="space-y-2">
          {exercises.map((exercise) => (
            <li key={exercise.id}>
              <button
                type="button"
                onClick={() => setSelectedExerciseId(exercise.id)}
                className="w-full rounded-md bg-white p-3 text-left shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{exercise.name}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {exercise.loggedSetCount} set{exercise.loggedSetCount === 1 ? "" : "s"}
                  </span>
                </div>
                {exercise.goalText ? <p className="text-xs text-slate-500">{exercise.goalText}</p> : null}
                {exercise.isSkipped ? <p className="mt-1 text-xs text-amber-700">Skipped</p> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-md bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{selectedExercise?.name ?? "Exercise"}</p>
            <button type="button" onClick={() => setSelectedExerciseId(null)} className="rounded-md border border-slate-300 px-2 py-1 text-xs">Close</button>
          </div>
        </div>
      )}

      {exercises.map((exercise) => {
        const isVisible = selectedExerciseId === exercise.id;

        return (
          <article
            key={exercise.id}
            ref={isVisible ? focusedRef : null}
            className="space-y-2 rounded-md bg-white p-3 shadow-sm"
            style={{ display: isVisible ? "block" : "none" }}
            aria-hidden={!isVisible}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{exercise.name}</p>
              <div className="flex gap-2">
                <form action={toggleSkipAction}>
                  <input type="hidden" name="sessionId" value={sessionId} />
                  <input type="hidden" name="sessionExerciseId" value={exercise.id} />
                  <input type="hidden" name="nextSkipped" value={String(!exercise.isSkipped)} />
                  <button type="submit" className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                    {exercise.isSkipped ? "Unskip" : "Skip"}
                  </button>
                </form>
                <form action={removeExerciseAction}>
                  <input type="hidden" name="sessionId" value={sessionId} />
                  <input type="hidden" name="sessionExerciseId" value={exercise.id} />
                  <button type="submit" className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700">Remove</button>
                </form>
              </div>
            </div>

            {exercise.goalText ? <p className="text-xs text-slate-500">{exercise.goalText}</p> : null}
            {exercise.isSkipped ? <p className="text-sm text-amber-700">Marked skipped for this session.</p> : null}

            <SetLoggerCard
              sessionId={sessionId}
              sessionExerciseId={exercise.id}
              addSetAction={addSetAction}
              unitLabel={unitLabel}
              initialSets={exercise.initialSets}
            />
          </article>
        );
      })}
    </div>
  );
}
