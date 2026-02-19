"use client";

import { useEffect, useMemo, useState } from "react";

type ServerAction = (formData: FormData) => void | Promise<void>;

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function SessionTimerCard({
  sessionId,
  initialDurationSeconds,
  saveAction,
}: {
  sessionId: string;
  initialDurationSeconds: number | null;
  saveAction: ServerAction;
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialDurationSeconds ?? 0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  return (
    <section className="space-y-2 rounded-md bg-white p-3 shadow-sm">
      <h2 className="text-sm font-semibold">Session Timer</h2>
      <p className="text-3xl font-semibold tabular-nums">{formatSeconds(elapsedSeconds)}</p>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => setIsRunning(true)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          Start
        </button>
        <button type="button" onClick={() => setIsRunning(false)} className="rounded-md border border-slate-300 px-3 py-2 text-sm">
          Pause
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRunning(false);
            setElapsedSeconds(0);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          Reset
        </button>
      </div>
      <form action={saveAction}>
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="durationSeconds" value={String(elapsedSeconds)} />
        <button type="submit" className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
          Save Session Time
        </button>
      </form>
    </section>
  );
}

export function SetTimerForm({
  sessionId,
  sessionExerciseId,
  addSetAction,
}: {
  sessionId: string;
  sessionExerciseId: string;
  addSetAction: ServerAction;
}) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [tapReps, setTapReps] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isRunning]);

  const averageSecondsPerRep = useMemo(() => {
    if (tapReps <= 0) {
      return null;
    }
    return (elapsedSeconds / tapReps).toFixed(1);
  }, [elapsedSeconds, tapReps]);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setElapsedSeconds(0);
            setTapReps(0);
            setDurationSeconds("");
            setIsRunning(true);
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          Start Set
        </button>
        <button
          type="button"
          onClick={() => {
            setIsRunning(false);
            setDurationSeconds(String(elapsedSeconds));
            if (tapReps > 0) {
              setReps(String(tapReps));
            }
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          Stop
        </button>
      </div>

      <p className="text-sm text-slate-600">Set timer: {formatSeconds(elapsedSeconds)}</p>

      {isRunning ? (
        <div className="space-y-2 rounded-md bg-slate-50 p-2">
          <button
            type="button"
            onClick={() => setTapReps((value) => value + 1)}
            className="w-full rounded-md bg-emerald-600 px-4 py-4 text-base font-semibold text-white"
          >
            Tap Rep
          </button>
          <p className="text-sm">
            Reps tapped: <span className="font-semibold">{tapReps}</span>
            {averageSecondsPerRep ? <span> · Avg {averageSecondsPerRep}s/rep</span> : null}
          </p>
        </div>
      ) : null}

      <form action={addSetAction} className="grid grid-cols-3 gap-2">
        <input type="hidden" name="sessionId" value={sessionId} />
        <input type="hidden" name="sessionExerciseId" value={sessionExerciseId} />
        <input
          type="number"
          name="weight"
          min={0}
          step="0.5"
          required
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
          placeholder="Weight"
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        />
        <input
          type="number"
          name="reps"
          min={0}
          required
          value={reps}
          onChange={(event) => setReps(event.target.value)}
          placeholder="Reps"
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        />
        <input
          type="number"
          name="durationSeconds"
          min={0}
          value={durationSeconds}
          onChange={(event) => setDurationSeconds(event.target.value)}
          placeholder="Time (sec)"
          className="rounded-md border border-slate-300 px-2 py-2 text-sm"
        />
        <button type="submit" className="col-span-3 rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
          Log Set
        </button>
      </form>
    </div>
  );
}
