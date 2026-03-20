"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { ExerciseInfo } from "@/components/ExerciseInfo";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AnchoredSelectorPanel } from "@/components/ui/app/AnchoredSelectorPanel";
import { ExerciseCard } from "@/components/ExerciseCard";
import { StandardExerciseRow } from "@/components/StandardExerciseRow";
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
    return "No exercises yet.";
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
  const editDayHref = selectedDay ? `/routines/${routineId}/edit/day/${selectedDay.id}?returnTo=${encodeURIComponent("/today")}` : null;
  const isRunnableDay = selectedDay?.state === "runnable" || selectedDay?.state === "partial";
  const daySummary = selectedDay ? getDaySummary(selectedDay) : null;
  const daySummaryTone = selectedDay ? getDaySummaryTone(selectedDay) : null;

  const actionsNode = useMemo(() => (
    <BottomActionUtilityCluster className="[&>*]:basis-[calc(50%-0.25rem)]">
      {isRunnableDay ? (
        <TodayStartButton
          startSessionAction={startSessionAction}
          selectedDayIndex={selectedDayIndex}
          returnTo="/today"
          fullWidth
          className="w-full"
        />
      ) : (
        <div aria-hidden="true" className="min-h-[44px] w-full invisible" />
      )}
      <SecondaryButton
        id="today-day-picker"
        type="button"
        className="w-full min-h-[44px] justify-center border-white/14 bg-transparent text-center text-[rgb(var(--text)/0.78)] shadow-none hover:bg-white/[0.05]"
        onClick={togglePicker}
        aria-expanded={isPickerOpen}
        aria-controls="today-day-selector-list"
      >
        <span>{isPickerOpen ? "Hide days" : "Select day"}</span>
      </SecondaryButton>
      {viewDayHref ? (
        <Link
          href={viewDayHref}
          className={getAppButtonClassName({ variant: "secondary", size: "md", fullWidth: true })}
        >
          View Day
        </Link>
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
    </BottomActionUtilityCluster>
  ), [editDayHref, isPickerOpen, isRunnableDay, selectedDayIndex, startSessionAction, togglePicker, viewDayHref]);

  usePublishBottomActions(actionsNode);

  return (
    <div className="flex min-h-0 flex-col gap-4">
      {selectedDay ? (
        <AnchoredSelectorPanel
          title={`${routineName} | ${selectedDay.name}`}
          subtitleRight={selectedDay.state === "rest" ? "Rest day" : `${selectedDay.exercises.length} exercises`}
          action={completedTodayCount > 0 && selectedDay.dayIndex === currentDayIndex ? <AppBadge>Completed</AppBadge> : undefined}
          revealOpen={isPickerOpen}
          revealId="today-day-selector-list"
          revealLabel="Routine days"
          revealContent={days.map((day) => {
            const isSelected = selectedDayIndex === day.dayIndex;
            return (
              <ExerciseCard
                key={day.id}
                title={`${day.name}${day.isRest ? " (Rest)" : ""}`}
                subtitle={day.state === "runnable" || day.state === "partial" ? `${day.exercises.length} exercises` : getDaySummary(day) ?? undefined}
                onPress={() => {
                  setSelectedDayIndex(day.dayIndex);
                  setIsPickerOpen(false);
                }}
                state={isSelected ? "selected" : day.isRest ? "empty" : "default"}
                badgeText={day.dayIndex === currentDayIndex ? "Today" : undefined}
                rightIcon={null}
              />
            );
          })}
        >
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
                <StandardExerciseRow
                  exercise={exercise}
                  summary={exercise.targets}
                  onPress={() => {
                    if (process.env.NODE_ENV === "development") {
                      console.debug("[ExerciseInfo:open] TodayDayPicker", { exerciseId: exercise.exerciseId, exercise });
                    }
                    setSelectedExerciseId(exercise.exerciseId);
                  }}
                />
              </li>
            ))}
            {selectedDay.exercises.length === 0 ? <li className="px-3 py-3 text-muted">{selectedDay.state === "rest" ? "Rest day." : "No exercises yet."}</li> : null}
          </ul>
        </AnchoredSelectorPanel>
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
