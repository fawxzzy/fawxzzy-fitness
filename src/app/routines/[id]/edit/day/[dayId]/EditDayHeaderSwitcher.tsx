"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { SecondaryButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { TopRightBackButton } from "@/components/ui/TopRightBackButton";
import { getRoutineDayEditHref } from "@/lib/routine-day-navigation";

type EditDayHeaderSwitcherDay = {
  id: string;
  dayIndex: number;
  name: string;
  isRest: boolean;
  exerciseSummary: string;
};

type EditDayHeaderSwitcherProps = {
  routineId: string;
  routineName: string;
  days: EditDayHeaderSwitcherDay[];
  activeDayId: string;
  activeDayTitle: string;
  activeDaySummary: string;
  backHref: string;
};

function buildDayHref(routineId: string, dayId: string, backHref: string) {
  return getRoutineDayEditHref(routineId, dayId, backHref);
}

export function EditDayHeaderSwitcher({
  routineId,
  routineName,
  days,
  activeDayId,
  activeDayTitle,
  activeDaySummary,
  backHref,
}: EditDayHeaderSwitcherProps) {
  const [open, setOpen] = useState(false);

  const activeDay = useMemo(
    () => days.find((day) => day.id === activeDayId) ?? null,
    [activeDayId, days],
  );

  return (
    <RoutineEditorPageHeader
      eyebrow="Edit Day"
      title={activeDayTitle}
      subtitle={routineName}
      subtitleRight={activeDaySummary}
      action={<TopRightBackButton href={backHref} ariaLabel="Back to Routine" historyBehavior="fallback-only" />}
      actionClassName="-mt-0.5"
      className="space-y-3 p-4 pt-3"
    >
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <SecondaryButton
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="edit-day-switcher-panel"
            className="min-h-11 px-4"
          >
            {open ? "Hide Days" : "Select Day"}
          </SecondaryButton>
          {activeDay?.isRest ? <AppBadge>Rest Day</AppBadge> : null}
        </div>

        {open ? (
          <div id="edit-day-switcher-panel" className="space-y-2">
            {days.map((day) => {
              const isCurrent = day.id === activeDayId;
              const dayHref = buildDayHref(routineId, day.id, backHref);
              const title = day.name === `Day ${day.dayIndex}` ? day.name : `Day ${day.dayIndex} · ${day.name}`;

              return isCurrent ? (
                <ExerciseCard
                  key={day.id}
                  title={title}
                  subtitle={day.exerciseSummary}
                  state="selected"
                  badgeText="Current"
                />
              ) : (
                <Link key={day.id} href={dayHref} className="block">
                  <ExerciseCard
                    title={title}
                    subtitle={day.exerciseSummary}
                    badgeText={day.isRest ? "Rest" : undefined}
                    rightIcon={<span aria-hidden="true" className="text-muted">›</span>}
                    state={day.isRest ? "empty" : "default"}
                    className="items-center"
                  />
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </RoutineEditorPageHeader>
  );
}
