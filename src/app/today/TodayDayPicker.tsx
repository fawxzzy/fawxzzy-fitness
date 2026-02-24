"use client";

import { useMemo, useState } from "react";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import type { ActionResult } from "@/lib/action-result";

type TodayExercise = {
  id: string;
  name: string;
};

type TodayDay = {
  id: string;
  dayIndex: number;
  name: string;
  isRest: boolean;
  exercises: TodayExercise[];
};

export function TodayDayPicker({
  routineName,
  days,
  currentDayIndex,
  completedTodayCount,
  startSessionAction,
}: {
  routineName: string;
  days: TodayDay[];
  currentDayIndex: number;
  completedTodayCount: number;
  startSessionAction: (payload?: { dayIndex?: number }) => Promise<ActionResult<{ sessionId: string }>>;
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(currentDayIndex);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pendingDayIndex, setPendingDayIndex] = useState<number>(currentDayIndex);

  const selectedDay = useMemo(
    () => days.find((day) => day.dayIndex === selectedDayIndex) ?? days.find((day) => day.dayIndex === currentDayIndex) ?? null,
    [currentDayIndex, days, selectedDayIndex],
  );

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {selectedDay && !isPickerOpen ? (
        <div className="min-h-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="pr-1 text-lg font-semibold leading-tight text-text">
              {routineName}: {selectedDay.isRest ? `REST DAY — ${selectedDay.name}` : selectedDay.name}
            </h2>
            {completedTodayCount > 0 && selectedDay.dayIndex === currentDayIndex ? (
              <p className="inline-flex rounded-full border border-emerald-400/35 bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-200">Completed</p>
            ) : null}
          </div>

          <ul className="max-h-52 space-y-1 overflow-y-auto pr-1 text-sm">
            {selectedDay.exercises.map((exercise) => (
              <li key={exercise.id} className="rounded-md bg-surface-2-strong px-3 py-2 text-text">{exercise.name}</li>
            ))}
            {selectedDay.exercises.length === 0 ? <li className="rounded-md bg-surface-2-strong px-3 py-2 text-muted">No routine exercises planned for this day.</li> : null}
          </ul>
        </div>
      ) : null}

      {!isPickerOpen ? (
        <>
          <TodayStartButton startSessionAction={startSessionAction} selectedDayIndex={selectedDayIndex} />
          <button
            id="today-day-picker"
            type="button"
            onClick={() => {
              setPendingDayIndex(selectedDayIndex);
              setIsPickerOpen(true);
            }}
            aria-expanded={false}
            className="block w-full rounded-md border border-border bg-surface-2-soft px-3 py-2 text-center text-sm font-normal uppercase tracking-wide text-text transition-colors hover:bg-surface-2-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          >
            CHANGE DAY
          </button>
        </>
      ) : (
        <div className="min-h-0 space-y-3 rounded-lg border border-border bg-surface-1 p-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">Choose workout day</p>
          <div role="radiogroup" aria-label="Routine days" className="min-h-0 max-h-72 space-y-2 overflow-y-auto pr-1">
            {days.map((day) => {
              const isSelected = pendingDayIndex === day.dayIndex;
              return (
                <button
                  key={day.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setPendingDayIndex(day.dayIndex)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 ${
                    isSelected
                      ? "border-accent/60 bg-accent/20 text-text"
                      : "border-border bg-surface-2-soft text-text hover:bg-surface-2-strong"
                  }`}
                >
                  {day.name}
                  {day.isRest ? " (Rest)" : ""}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setPendingDayIndex(selectedDayIndex);
                setIsPickerOpen(false);
              }}
              className="rounded-md border border-border bg-surface-2-soft px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-2-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedDayIndex(pendingDayIndex);
                setIsPickerOpen(false);
              }}
              className="rounded-md border border-accent/60 bg-accent/20 px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
