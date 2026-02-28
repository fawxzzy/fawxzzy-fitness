"use client";

import { useMemo, useState } from "react";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { SecondaryButton } from "@/components/ui/AppButton";
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
  const [isPickerOpen, setIsPickerOpen] = useState(false);

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

          <ul className="max-h-52 divide-y divide-border/70 overflow-y-auto rounded-lg bg-surface/70 pr-1 text-sm">
            {selectedDay.exercises.map((exercise) => (
              <li key={exercise.id} className="flex items-center justify-between gap-3 px-3 py-2 text-text">
                <span className="truncate">{exercise.name}</span>
                {exercise.targets ? <span className="shrink-0 text-xs text-muted">Goal: {exercise.targets}</span> : null}
              </li>
            ))}
            {selectedDay.exercises.length === 0 ? <li className="px-3 py-2 text-muted">No routine exercises planned for this day.</li> : null}
          </ul>
        </div>
      ) : null}

      <TodayStartButton startSessionAction={startSessionAction} selectedDayIndex={selectedDayIndex} />
      <SecondaryButton
        id="today-day-picker"
        type="button"
        fullWidth
        onClick={() => {
          setIsPickerOpen((previous) => !previous);
        }}
        aria-expanded={isPickerOpen}
      >
        <span>{isPickerOpen ? "Hide options" : "Change Workout"}</span>
      </SecondaryButton>

      {isPickerOpen ? (
        <div className="space-y-3 rounded-lg bg-surface/60 p-2">
          <p className="text-sm font-semibold text-muted">Choose workout day</p>
          <div aria-label="Routine days" className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {days.map((day) => {
              const isSelected = selectedDayIndex === day.dayIndex;
              return (
                <button
                  key={day.id}
                  type="button"
                  className={`flex w-full items-center rounded-md border px-3 py-2 text-left text-sm ${isSelected ? "border-accent/60 bg-accent/20" : "border-border bg-surface-2-soft"}`}
                  onClick={() => {
                    setSelectedDayIndex(day.dayIndex);
                    setIsPickerOpen(false);
                  }}
                >
                  <span>{day.name}{day.isRest ? " (Rest)" : ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
