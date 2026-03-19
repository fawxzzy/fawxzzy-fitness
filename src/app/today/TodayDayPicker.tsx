"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AppRow } from "@/components/ui/app/AppRow";
import { ExerciseCard } from "@/components/ExerciseCard";
import { usePublishBottomActions } from "@/components/layout/bottom-actions";
import { BottomActionUtilityCluster } from "@/components/layout/CanonicalBottomActions";
import { SecondaryButton } from "@/components/ui/AppButton";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import type { ActionResult } from "@/lib/action-result";

type TodayExercise = {
  id: string;
  exerciseId: string;
  name: string;
  targets: string | null;
  primary_muscle: string | null;
  equipment: string | null;
  movement_pattern: string | null;
  image_howto_path: string | null;
  image_icon_path: string | null;
  slug: string | null;
  how_to_short: string | null;
};

type TodayDayState = "rest" | "empty" | "partial" | "runnable";

type TodayDay = {
  id: string;
  dayIndex: number;
  name: string;
  isRest: boolean;
  state: TodayDayState;
  invalidExerciseCount: number;
  exercises: TodayExercise[];
};

function getDaySummary(day: TodayDay) {
  if (day.state === "rest") {
    return "Rest day. Recovery and mobility only.";
  }

  if (day.state === "empty" && day.invalidExerciseCount > 0) {
    return "This day has invalid exercises. Edit the day before starting a workout.";
  }

  if (day.state === "empty") {
    return "No exercises are planned for this day yet.";
  }

  if (day.state === "partial") {
    return "Some exercises could not be loaded and will be skipped when you start this workout.";
  }

  return null;
}

function getDaySummaryTone(day: TodayDay): "blocking" | "warning" | null {
  if (day.state === "empty" && day.invalidExerciseCount > 0) {
    return "blocking";
  }

  if (day.state === "partial") {
    return "warning";
  }

  return null;
}

export function TodayDayPicker({
  routineName,
  routineId,
  days,
  currentDayIndex,
  completedTodayCount,
  startSessionAction,
}: {
  routineName: string;
  routineId: string;
  days: TodayDay[];
  currentDayIndex: number;
  completedTodayCount: number;
  startSessionAction: (payload?: { dayIndex?: number }) => Promise<ActionResult<{ sessionId: string }>>;
}) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(currentDayIndex);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const selectedDay = useMemo(
    () => days.find((day) => day.dayIndex === selectedDayIndex) ?? days.find((day) => day.dayIndex === currentDayIndex) ?? null,
    [currentDayIndex, days, selectedDayIndex],
  );

  const togglePicker = useCallback(() => {
    setIsPickerOpen((previous) => !previous);
  }, []);

  const viewDayHref = selectedDay ? `/routines/${routineId}/days/${selectedDay.id}` : null;
  const editDayHref = selectedDay ? `/routines/${routineId}/edit/day/${selectedDay.id}` : null;
  const isRunnableDay = selectedDay?.state === "runnable" || selectedDay?.state === "partial";
  const daySummary = selectedDay ? getDaySummary(selectedDay) : null;
  const daySummaryTone = selectedDay ? getDaySummaryTone(selectedDay) : null;

  const actionsNode = useMemo(() => (
    <BottomActionUtilityCluster>
      {isRunnableDay ? (
        <TodayStartButton
          startSessionAction={startSessionAction}
          selectedDayIndex={selectedDayIndex}
          fullWidth
          className="w-full"
        />
      ) : null}
      {editDayHref ? (
        <Link
          href={editDayHref}
          className={getAppButtonClassName({
            variant: isRunnableDay ? "secondary" : "primary",
            size: "md",
            fullWidth: true,
            className: isRunnableDay ? undefined : "border-white/15 bg-white/10 text-white hover:bg-white/14",
          })}
        >
          Edit Day
        </Link>
      ) : null}
      {viewDayHref ? (
        <Link
          href={viewDayHref}
          className={getAppButtonClassName({ variant: "secondary", size: "md", fullWidth: true })}
        >
          View Day
        </Link>
      ) : null}
      <SecondaryButton
        id="today-day-picker"
        type="button"
        className="w-full min-h-[44px] justify-center border-white/14 bg-transparent text-center text-[rgb(var(--text)/0.78)] shadow-none hover:bg-white/[0.05]"
        onClick={togglePicker}
        aria-expanded={isPickerOpen}
      >
        <span>{isPickerOpen ? "Hide options" : "Change Workout"}</span>
      </SecondaryButton>
    </BottomActionUtilityCluster>
  ), [editDayHref, isPickerOpen, isRunnableDay, selectedDayIndex, startSessionAction, togglePicker, viewDayHref]);

  usePublishBottomActions(actionsNode);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {selectedDay ? (
        <AppPanel className="space-y-3 p-4">
          <AppHeader
            title={`${routineName} | ${selectedDay.name}`}
            subtitleRight={selectedDay.state === "rest" ? "Rest day" : `${selectedDay.exercises.length} exercises`}
            action={completedTodayCount > 0 && selectedDay.dayIndex === currentDayIndex ? <AppBadge>Completed</AppBadge> : undefined}
          />

          {daySummary ? (
            <p
              className={[
                "rounded-md px-3 py-2 text-sm",
                daySummaryTone === "blocking"
                  ? "border border-red-400/30 bg-red-500/10 text-red-100"
                  : daySummaryTone === "warning"
                    ? "border border-amber-400/20 bg-amber-500/10 text-amber-100"
                    : "border border-border/70 bg-[rgb(var(--bg)/0.35)] text-muted",
              ].join(" ")}
            >
              {daySummary}
            </p>
          ) : null}

          <ul className="space-y-2">
            {selectedDay.exercises.map((exercise) => (
              <li key={exercise.id}>
                <ExerciseCard
                  title={exercise.name}
                  onPress={() => {
                    if (process.env.NODE_ENV === "development") {
                      console.debug("[ExerciseInfo:open] TodayDayPicker", { exerciseId: exercise.exerciseId, exercise });
                    }
                    setSelectedExerciseId(exercise.exerciseId);
                  }}
                >
                  <p className="min-w-0 text-xs leading-snug whitespace-normal break-words text-[rgb(var(--text)/0.7)]">{exercise.targets ?? "Goal: Not set"}</p>
                </ExerciseCard>
              </li>
            ))}
            {selectedDay.exercises.length === 0 ? <li className="px-3 py-3 text-muted">{selectedDay.state === "rest" ? "No workout is scheduled for this rest day." : "No runnable exercises planned for this day."}</li> : null}
          </ul>
        </AppPanel>
      ) : null}

      {isPickerOpen ? (
        <AppPanel className="space-y-3 rounded-lg border-white/15 bg-[rgb(var(--surface-2-soft)/0.7)] p-3 shadow-none">
          <p className="text-sm font-semibold text-muted">Choose workout day</p>
          <div aria-label="Routine days" className="space-y-2">
            {days.map((day) => {
              const isSelected = selectedDayIndex === day.dayIndex;
              return (
                <AppRow
                  key={day.id}
                  tone={isSelected ? "active" : "default"}
                  leftTop={<span>{day.name}{day.isRest ? " (Rest)" : ""}</span>}
                  leftBottom={day.state === "runnable" || day.state === "partial" ? `${day.exercises.length} exercises` : getDaySummary(day) ?? undefined}
                  onClick={() => {
                    setSelectedDayIndex(day.dayIndex);
                    setIsPickerOpen(false);
                  }}
                  className={isSelected ? "border-accent/70 bg-accent/26" : "border-border/85 bg-surface-2-soft/95"}
                />
              );
            })}
          </div>
        </AppPanel>
      ) : null}

      <ExerciseInfo
        exerciseId={selectedExerciseId}
        open={Boolean(selectedExerciseId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExerciseId(null);
          }
        }}
        onClose={() => {
          setSelectedExerciseId(null);
        }}
        sourceContext="TodayDayPicker"
      />
    </div>
  );
}
