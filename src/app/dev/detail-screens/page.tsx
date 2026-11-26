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
  detailScreenFixtureManyExercises,
  detailScreenFixtureStats,
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

async function failActionResult(_: FormData) {
  "use server";
  return { ok: false as const, error: "Could not reach the server. Check your connection and try again." };
}

async function slowActionResult(_: FormData) {
  "use server";
  // Holds the add for a minute so a capture can show the pending state of the Add button.
  await new Promise((resolve) => setTimeout(resolve, 60_000));
  return { ok: true as const };
}

async function decisionStateActionResult(_: FormData) {
  "use server";
  return {
    ok: true as const,
    workoutPlanId: "fixture-plan",
    requiresWorkoutPlanEditDecision: true,
    syncMode: undefined,
  };
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
 * Add-exercise screens also take `&stats=1` (a last-used setup so "Use last" works), `&empty=1` (no exercises in the
 * library), `&many=1` (a long library), `&fail=1` (the add action answers with a server error), `&slow=1` (the add
 * action takes a minute, to show the pending Add button) and, for the routine
 * screen, `&decision=1` (the day is shared, so Add asks Update or Save new first).
 * Each screen renders the route's own frame (CreateDayScreen, DaysLibraryScreen, AddExerciseScaffold) with static
 * fixture data: no Supabase client, no session, and every action is a local no-op. Availability is the shared
 * dev-route guard: middleware answers 404 for `/dev/*` on production hosts before this page runs; the first
 * statement below repeats it (a layout alone cannot stop its page). See `src/lib/dev-route-guard.ts`.
 */
export default async function DevDetailScreensPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await assertDevPageAvailable();
  const searchParams = await props.searchParams;

  const screenParam = Array.isArray(searchParams?.screen) ? searchParams?.screen[0] : searchParams?.screen;
  const longParam = Array.isArray(searchParams?.long) ? searchParams?.long[0] : searchParams?.long;
  const flag = (name: string) => {
    const value = searchParams?.[name];
    return (Array.isArray(value) ? value[0] : value) === "1";
  };
  const screen = screenParam ?? "create-day";
  if (!isDetailScreenFixtureId(screen)) {
    notFound();
  }
  const fixtureExercises = flag("empty")
    ? []
    : [
      ...(flag("many") ? detailScreenFixtureManyExercises() : detailScreenFixtureExercises),
      // `&custom=1`: one of your own custom exercises, so the Rename / Delete menu shows (never submitted here).
      ...(flag("custom") ? [{ ...detailScreenFixtureExercises[2], id: "fx-custom-fly", name: "My Cable Fly", user_id: "fixture-user", is_global: false, equipment: "Cable" }] : []),
    ];
  const fixtureStats = flag("stats") ? detailScreenFixtureStats() : [];
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
            dayName={names.dayLabel}
            dayIndex={1}
            cycleLengthDays={4}
            exercises={fixtureExercises}
            weightUnit="lbs"
            addExerciseAction={flag("fail") ? failActionResult : flag("slow") ? slowActionResult : noopActionResult}
            resolveWorkoutPlanDecisionAction={noopActionResult}
            loadWorkoutPlanDecisionStateAction={flag("decision") ? decisionStateActionResult : noopActionResult}
            existingWorkoutPlanNames={flag("decision") ? ["Lower A", "Upper B"] : []}
            exerciseStats={fixtureStats}
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
            exercises={fixtureExercises}
            weightUnit="lbs"
            exerciseStats={fixtureStats}
            backHref="/session/fixture-session"
            addExerciseAction={flag("fail") ? failActionResult : flag("slow") ? slowActionResult : noopActionResult}
          />
        </AddExerciseScaffold>
      );
    default:
      notFound();
  }
}
