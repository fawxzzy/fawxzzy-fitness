import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CreateDayScreen } from "@/app/routines/[id]/new-workout-plan/CreateDayScreen";
import { CreateRoutineDayClient } from "@/app/routines/CreateRoutineDayClient";
import { EditDayAddExerciseScreen } from "@/app/routines/[id]/edit/day/[dayId]/EditDayAddExerciseScreen";
import { WorkoutPlansPageClient } from "@/app/routines/WorkoutPlansPageClient";
import { DaysLibraryScreen } from "@/app/routines/workout-plans/DaysLibraryScreen";
import { SessionQuickAddExerciseForm } from "@/app/session/[id]/SessionQuickAddExerciseForm";
import { AddExerciseScaffold } from "@/components/exercises/AddExerciseScaffold";
import { formatAddExerciseSubtitle } from "@/lib/header-meta";
import { assertDevPageAvailable } from "@/lib/dev-route-guard-page";
import {
  detailScreenFixtureDays,
  detailScreenFixtureExercises,
  isDetailScreenFixtureId,
  resolveDetailScreenFixtureNames,
} from "@/app/dev/detail-screens/fixtureData";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

async function noopActionResult(_: FormData) {
  "use server";
  return { ok: true as const };
}

async function noopCreateDayAction(_: FormData) {
  "use server";
  return { ok: true as const, routineDayId: "fixture-new-day" };
}

const FIXTURE_ROUTINE_HREF = "/routines/fixture-routine";
const FIXTURE_DAY_EDIT_HREF = "/routines/fixture-routine/edit/day/fixture-day-1";

/**
 * Dev-only fixtures of the signed-in detail screens that had no fixture (header lane H3):
 * `?screen=create-day | copy-day | days | days-empty | routine-add-exercise | session-add-exercise`;
 * `&long=1` swaps in a long routine and day name to check the one-line title and subtitle ellipsis.
 * Each screen renders the route's own frame (CreateDayScreen, DaysLibraryScreen, AddExerciseScaffold) with static
 * fixture data: no Supabase client, no session, and every action is a local no-op. Availability is the shared
 * dev-route guard: middleware answers 404 for `/dev/*` on production hosts before this page runs; the first
 * statement below repeats it (a layout alone cannot stop its page). See `src/lib/dev-route-guard.ts`.
 */
export default function DevDetailScreensPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  assertDevPageAvailable();

  const screenParam = Array.isArray(searchParams?.screen) ? searchParams?.screen[0] : searchParams?.screen;
  const longParam = Array.isArray(searchParams?.long) ? searchParams?.long[0] : searchParams?.long;
  const screen = screenParam ?? "create-day";
  if (!isDetailScreenFixtureId(screen)) {
    notFound();
  }
  const names = resolveDetailScreenFixtureNames(longParam === "1");
  const days = detailScreenFixtureDays(names.routineName);

  switch (screen) {
    case "create-day":
    case "copy-day": {
      const isCopy = screen === "copy-day";
      return (
        <CreateDayScreen
          targetDayLabel={isCopy ? names.dayLabel : null}
          routineName={names.routineName}
          backHref={FIXTURE_ROUTINE_HREF}
        >
          <CreateRoutineDayClient
            routineId="fixture-routine"
            backHref={FIXTURE_ROUTINE_HREF}
            routineEditHref={`${FIXTURE_ROUTINE_HREF}/edit`}
            createRoutineDayAction={noopCreateDayAction}
            populateRoutineDayFromSourceAction={noopCreateDayAction}
            targetRoutineDayId={isCopy ? "fixture-day-2" : undefined}
            targetDayEditHref={isCopy ? `${FIXTURE_ROUTINE_HREF}/edit/day/fixture-day-2` : undefined}
            days={days}
          />
        </CreateDayScreen>
      );
    }
    case "days":
    case "days-empty":
      return (
        <DaysLibraryScreen>
          <WorkoutPlansPageClient
            routinesHref="/routines"
            newWorkoutPlanHref={`${FIXTURE_ROUTINE_HREF}/new-workout-plan`}
            deleteWorkoutPlanSourceAction={noopActionResult}
            workoutPlans={screen === "days-empty"
              ? []
              : days.map((day) => ({ ...day, href: `/routines/${day.sourceRoutineId}/edit/day/${day.sourceRoutineDayId}` }))}
          />
        </DaysLibraryScreen>
      );
    case "routine-add-exercise":
      return (
        <AddExerciseScaffold
          subtitle={formatAddExerciseSubtitle(names.dayLabel, names.routineName)}
          backHref={FIXTURE_DAY_EDIT_HREF}
          backLabel="Back to day"
        >
          <EditDayAddExerciseScreen
            routineId="fixture-routine"
            routineDayId="fixture-day-1"
            dayIndex={1}
            cycleLengthDays={4}
            exercises={[...detailScreenFixtureExercises]}
            weightUnit="lbs"
            addExerciseAction={noopActionResult}
            resolveWorkoutPlanDecisionAction={noopActionResult}
            loadWorkoutPlanDecisionStateAction={noopActionResult}
            exerciseStats={[]}
            backHref={FIXTURE_DAY_EDIT_HREF}
          />
        </AddExerciseScaffold>
      );
    case "session-add-exercise":
      return (
        <AddExerciseScaffold
          recipe="sessionAddExercise"
          subtitle={formatAddExerciseSubtitle(names.dayLabel, names.routineName)}
          backHref="/session/fixture-session"
          backLabel="Back to workout"
        >
          <SessionQuickAddExerciseForm
            sessionId="fixture-session"
            exercises={[...detailScreenFixtureExercises]}
            weightUnit="lbs"
            exerciseStats={[]}
            backHref="/session/fixture-session"
            addExerciseAction={noopActionResult}
          />
        </AddExerciseScaffold>
      );
    default:
      notFound();
  }
}
