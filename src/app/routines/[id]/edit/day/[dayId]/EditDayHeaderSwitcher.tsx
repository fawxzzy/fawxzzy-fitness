"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { RoutineEditorPageHeader } from "@/components/routines/RoutineEditorShared";
import { SecondaryButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { SubtitleText } from "@/components/ui/text-roles";
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
      action={(
        <Link href={backHref} className={getAppButtonClassName({ variant: "secondary", size: "sm" })}>
          Back
        </Link>
      )}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SecondaryButton
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls="edit-day-switcher-panel"
            className="min-h-11 px-4"
          >
            {open ? "Hide days" : "Select day"}
          </SecondaryButton>
          {activeDay?.isRest ? <AppBadge>Rest day</AppBadge> : null}
        </div>
        <SubtitleText className="text-xs">
          Day switching stays owned by this header while primary Back resolves explicit return targets first, then the editor family&apos;s canonical parent route.
        </SubtitleText>

        {open ? (
          <div id="edit-day-switcher-panel" className="space-y-2">
            {days.map((day) => {
              const isCurrent = day.id === activeDayId;
              const dayHref = buildDayHref(routineId, day.id, backHref);

              return isCurrent ? (
                <ExerciseCard
                  key={day.id}
                  title={`Day ${day.dayIndex} | ${day.name}`}
                  subtitle={day.exerciseSummary}
                  state="selected"
                  badgeText="Current"
                />
              ) : (
                <Link key={day.id} href={dayHref} className="block">
                  <ExerciseCard
                    title={`Day ${day.dayIndex} | ${day.name}`}
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
