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
    <div className="flex min-h-0 flex-col gap-4 pb-4">
      {selectedDay ? (
        <div className="space-y-3 rounded-xl border border-white/10 bg-[rgb(var(--surface-2-soft)/0.72)] px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <h2 className="pr-1 text-xl font-semibold leading-tight text-[rgb(var(--text)/0.96)]">
                {selectedDay.isRest ? `${routineName} (Rest Day)` : selectedDay.name}
              </h2>
              <p className="text-sm text-muted">Day {selectedDay.dayIndex} • {routineName}</p>
              {selectedDay.exercises.length > 0 ? (
                <p className="text-xs text-[rgb(var(--text)/0.58)]">{selectedDay.exercises.length} exercises</p>
              ) : null}
            </div>
            {completedTodayCount > 0 && selectedDay.dayIndex === currentDayIndex ? (
              <p className="inline-flex rounded-full border border-emerald-400/35 bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-200">Completed</p>
            ) : null}
          </div>

          <ul className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/5 bg-[rgb(var(--surface)/0.62)] text-sm">
            {selectedDay.exercises.map((exercise) => (
              <li key={exercise.id} className="space-y-1.5 px-3 py-3 text-text">
                <p className="line-clamp-2 text-[0.96rem] font-medium leading-snug text-[rgb(var(--text)/0.95)]">{exercise.name}</p>
                {exercise.targets ? <p className="text-xs leading-snug text-[rgb(var(--text)/0.62)]">{exercise.targets}</p> : null}
              </li>
            ))}
            {selectedDay.exercises.length === 0 ? <li className="px-3 py-3 text-muted">No routine exercises planned for this day.</li> : null}
          </ul>
        </div>
      ) : null}

      {isPickerOpen ? (
        <div className="space-y-3 rounded-lg border border-white/10 bg-[rgb(var(--surface-2-soft)/0.62)] p-3">
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

      <div className="sticky bottom-0 z-20 -mx-1 border-t border-white/10 bg-[rgb(var(--surface)/0.96)] px-3 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-sm">
        <div className="space-y-2">
          <TodayStartButton startSessionAction={startSessionAction} selectedDayIndex={selectedDayIndex} />
          <SecondaryButton
            id="today-day-picker"
            type="button"
            fullWidth
            className="h-11 border-white/14 bg-transparent text-[rgb(var(--text)/0.78)] shadow-none hover:bg-white/[0.05]"
            onClick={() => {
              setIsPickerOpen((previous) => !previous);
            }}
            aria-expanded={isPickerOpen}
          >
            <span>{isPickerOpen ? "Hide options" : "Change Workout"}</span>
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
