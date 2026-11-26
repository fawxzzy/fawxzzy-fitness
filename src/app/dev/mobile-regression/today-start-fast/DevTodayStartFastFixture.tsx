"use client";

import type { ComponentProps } from "react";
import { TodayDayPicker } from "@/app/today/TodayDayPicker";
import { TodayExerciseRows } from "@/app/today/TodayExerciseRows";
import { TodayInSessionCard } from "@/app/today/TodayInSessionCard";
import { TodayNoRoutinePanel } from "@/app/today/TodayNoRoutinePanel";
import { TodayOverviewContent, TodayOverviewScaffold } from "@/components/today/TodayScreenFamily";
import type { TodayNoRoutineState } from "@/lib/start-fast-guards";

export type DevTodayStartFastState = "first-run" | "restore" | "pick-routine" | "choose" | "plan" | "in-session" | "done";

const NO_ROUTINE_STATES: Partial<Record<DevTodayStartFastState, TodayNoRoutineState>> = {
  "first-run": { kind: "starters" },
  restore: { kind: "starters-with-restore" },
  "pick-routine": {
    kind: "pick-routine",
    routines: [
      { id: "sf-r-1", name: "Upper / lower" },
      { id: "sf-r-2", name: "Home dumbbells" },
      { id: "sf-r-3", name: "Full body · 3 days" },
    ],
    moreCount: 2,
  },
  choose: { kind: "choose" },
};

const fixtureDelay = () => new Promise((resolve) => window.setTimeout(resolve, 600));

type PickerDays = ComponentProps<typeof TodayDayPicker>["days"];
type PickerExercise = PickerDays[number]["exercises"][number];

function exercise(dayIndex: number, index: number, name: string, targets: string, lastLine: string | null): PickerExercise {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return {
    id: `sf-${dayIndex}-${index}`,
    exerciseId: `sf-ex-${slug}`,
    name,
    targets,
    targetSetsMin: 3,
    targetSetsMax: 3,
    primary_muscle: null,
    equipment: null,
    movement_pattern: null,
    measurement_type: "reps",
    image_howto_path: null,
    image_icon_path: `/missing/icon-${slug}.png`,
    slug,
    how_to_short: null,
    lastLine,
  };
}

/** A just-picked "Full body · 3 days" week: Day 1 is today, two later training days, rest days between. */
const DAYS: PickerDays = [
  {
    id: "sf-day-1",
    dayIndex: 1,
    name: "Full body A",
    isRest: false,
    state: "runnable",
    invalidExerciseCount: 0,
    exercises: [
      exercise(1, 0, "Barbell Back Squat", "3 sets • 6-8 reps", "Last: 5 × 225 lb"),
      exercise(1, 1, "Barbell Bench Press", "3 sets • 6-8 reps", "Last: 6 × 185 lb"),
      exercise(1, 2, "Seated Cable Row", "3 sets • 8-12 reps", null),
      exercise(1, 3, "Plank", "3 sets • 8-12 reps", "Last: 10 reps"),
    ],
  },
  { id: "sf-day-2", dayIndex: 2, name: "Rest", isRest: true, state: "rest", invalidExerciseCount: 0, exercises: [] },
  {
    id: "sf-day-3",
    dayIndex: 3,
    name: "Full body B",
    isRest: false,
    state: "runnable",
    invalidExerciseCount: 0,
    exercises: [
      exercise(3, 0, "Romanian Deadlift", "3 sets • 8-10 reps", null),
      exercise(3, 1, "Overhead Press", "3 sets • 6-8 reps", null),
    ],
  },
];

/**
 * Client half of /dev/mobile-regression/today-start-fast: the live Today components with fixture actions (functions
 * cannot cross from the server page). Picking a starter plan answers locally and never writes anything.
 */
export function DevTodayStartFastFixture({ state }: { state: DevTodayStartFastState }) {
  const noRoutineState = NO_ROUTINE_STATES[state];
  if (noRoutineState) {
    return (
      <TodayOverviewContent>
        <TodayOverviewScaffold>
          <TodayNoRoutinePanel
            state={noRoutineState}
            createAction={async () => {
              await fixtureDelay();
              return { ok: false, error: "Dev fixture: nothing was created." };
            }}
            chooseAction={async () => {
              await fixtureDelay();
              return { ok: false, error: "Dev fixture: nothing was changed." };
            }}
          />
        </TodayOverviewScaffold>
      </TodayOverviewContent>
    );
  }

  if (state === "in-session") {
    return (
      <TodayOverviewContent>
        <TodayOverviewScaffold>
          <TodayInSessionCard
            sessionId="sf-session"
            dayName="Full body A"
            loggedSetCount={4}
            action={async () => ({ ok: false })}
            failureMessage="Dev fixture: nothing was discarded."
          />
          <div className="pt-0.5">
            <TodayExerciseRows
              exercises={DAYS[0].exercises.map((row, index) => ({ ...row, loggedSetCount: index === 0 ? 3 : index === 1 ? 1 : 0 }))}
              emptyMessage="No exercises today." isRestDay={false} compact />
          </div>
        </TodayOverviewScaffold>
      </TodayOverviewContent>
    );
  }

  return (
    <TodayOverviewContent>
      <TodayDayPicker
        days={DAYS}
        currentDayIndex={1}
        initialSelectedDayIndex={1}
        completedDayIndexes={state === "done" ? [1] : []}
        routineName="Full body"
        startDate="2026-11-26"
        floatingHeaderSlotId="today-floating-header-slot"
        switchFloatingHeaderSlotId="today-routine-switch-floating-header-slot"
        progressionRoutineId="routine-dev"
        todayDate="2026-11-26"
        doneToday={state === "done"}
      />
    </TodayOverviewContent>
  );
}
