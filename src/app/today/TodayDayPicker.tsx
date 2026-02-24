"use client";

import { useEffect, useMemo, useState } from "react";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { PrimaryButton, SecondaryButton } from "@/components/ui/AppButton";
import type { ActionResult } from "@/lib/action-result";

type TodayExercise = {
  id: string;
  name: string;
  targets: string | null;
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
  const [pendingDayIndexes, setPendingDayIndexes] = useState<number[]>([currentDayIndex]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPickerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPickerOpen]);

  const selectedDay = useMemo(
    () => days.find((day) => day.dayIndex === selectedDayIndex) ?? days.find((day) => day.dayIndex === currentDayIndex) ?? null,
    [currentDayIndex, days, selectedDayIndex],
  );

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {selectedDay ? (
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
              <li key={exercise.id} className="flex items-center justify-between gap-3 rounded-md bg-surface-2-strong px-3 py-2 text-text">
                <span className="truncate">{exercise.name}</span>
                {exercise.targets ? <span className="shrink-0 text-xs text-muted">Goal: {exercise.targets}</span> : null}
              </li>
            ))}
            {selectedDay.exercises.length === 0 ? <li className="rounded-md bg-surface-2-strong px-3 py-2 text-muted">No routine exercises planned for this day.</li> : null}
          </ul>
        </div>
      ) : null}

      <TodayStartButton startSessionAction={startSessionAction} selectedDayIndex={selectedDayIndex} />
      <SecondaryButton
        id="today-day-picker"
        type="button"
        fullWidth
        onClick={() => {
          setPendingDayIndexes([selectedDayIndex]);
          setIsPickerOpen(true);
        }}
        aria-expanded={isPickerOpen}
        className="font-light tracking-[0.2em]"
      >
        CHANGE DAY
      </SecondaryButton>

      {isPickerOpen ? (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4"
          onClick={() => setIsPickerOpen(false)}
        >
          <div className="w-full max-w-xs space-y-3 rounded-lg border border-border bg-surface p-3" onClick={(event) => event.stopPropagation()}>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">Choose workout day</p>
            <div aria-label="Routine days" className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {days.map((day) => {
                const isSelected = pendingDayIndexes.includes(day.dayIndex);
                return (
                  <label key={day.id} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${isSelected ? "border-accent/60 bg-accent/20" : "border-border bg-surface-2-soft"}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setPendingDayIndexes((current) => (
                          current.includes(day.dayIndex)
                            ? current.filter((value) => value !== day.dayIndex)
                            : [...current, day.dayIndex]
                        ));
                      }}
                    />
                    <span>{day.name}{day.isRest ? " (Rest)" : ""}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-2">
              <SecondaryButton type="button" onClick={() => setIsPickerOpen(false)}>Cancel</SecondaryButton>
              <PrimaryButton
                type="button"
                onClick={() => {
                  const nextDay = [...pendingDayIndexes].sort((a, b) => a - b)[0];
                  if (nextDay) {
                    setSelectedDayIndex(nextDay);
                  }
                  setIsPickerOpen(false);
                }}
              >
                OK
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
