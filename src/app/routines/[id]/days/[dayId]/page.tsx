import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { PublishBottomActions } from "@/components/layout/PublishBottomActions";
import { BottomActionSplit } from "@/components/layout/CanonicalBottomActions";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { TodayStartButton } from "@/app/today/TodayStartButton";
import { RoutineDayExerciseList } from "@/app/routines/[id]/days/[dayId]/RoutineDayExerciseList";
import { requireUser } from "@/lib/auth";
import { ensureProfile } from "@/lib/profile";
import { mapRoutineDayGoalToSessionColumns } from "@/lib/exercise-goal-payload";
import { buildCanonicalDaySummaries } from "@/lib/routine-day-loader";
import { getSessionStartErrorMessage, isRunnableDayState } from "@/lib/runnable-day";
import {
  defaultUnitForSessionExerciseMeasurementType,
  resolveSessionExerciseMeasurementType,
  warnOnSessionExerciseUnitMismatch,
} from "@/lib/session-exercise-measurement";
import { supabaseServer } from "@/lib/supabase/server";
import { getExerciseCountSummaryFromCanonicalExercises } from "@/lib/day-summary";
import type { ActionResult } from "@/lib/action-result";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow } from "@/types/db";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
    dayId: string;
  };
};

async function startSessionFromViewDayAction(payload: { routineId: string; dayId: string }): Promise<ActionResult<{ sessionId: string }>> {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  await ensureProfile(user.id);

  const { data: routine, error: routineError } = await supabase
    .from("routines")
    .select("id, user_id, name")
    .eq("id", payload.routineId)
    .eq("user_id", user.id)
    .single();

  if (routineError || !routine) {
    return { ok: false, error: "That routine could not be loaded." };
  }

  const { data: day, error: dayError } = await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("id", payload.dayId)
    .eq("routine_id", payload.routineId)
    .eq("user_id", user.id)
    .single();

  if (dayError || !day) {
    return { ok: false, error: "That routine day could not be loaded." };
  }

  const { data: templateExercises, error: templateError } = await supabase
    .from("routine_day_exercises")
    .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, notes, measurement_type, default_unit")
    .eq("routine_day_id", day.id)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (templateError) {
    return { ok: false, error: "Could not load exercises for this day." };
  }

  const { summaries } = await buildCanonicalDaySummaries({
    supabase,
    routineDays: [day as RoutineDayRow],
    allDayExercises: (templateExercises ?? []) as RoutineDayExerciseRow[],
  });
  const canonicalDay = summaries[0] ?? null;
  const runnableExercises = canonicalDay?.runnableExercises ?? [];
  const invalidExercises = canonicalDay?.invalidExercises ?? [];
  const startError = getSessionStartErrorMessage({
    isRest: Boolean(day.is_rest),
    runnableExerciseCount: runnableExercises.length,
    invalidExerciseCount: invalidExercises.length,
  });

  if (startError) {
    return { ok: false, error: startError };
  }

  const routineDayName = day.name || `Day ${day.day_index}`;
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      routine_id: routine.id,
      routine_day_index: day.day_index,
      name: routine.name,
      routine_day_name: routineDayName,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { ok: false, error: "Could not create workout session." };
  }

  if (runnableExercises.length > 0) {
    const { error: exerciseError } = await supabase.from("session_exercises").insert(
      runnableExercises.map((exercise) => {
        const mappedGoalColumns = mapRoutineDayGoalToSessionColumns({
          target_sets: exercise.target_sets,
          target_reps: exercise.target_reps,
          target_reps_min: exercise.target_reps_min,
          target_reps_max: exercise.target_reps_max,
          target_weight: exercise.target_weight,
          target_weight_unit: exercise.target_weight_unit,
          target_duration_seconds: exercise.target_duration_seconds,
          target_distance: exercise.target_distance,
          target_distance_unit: exercise.target_distance_unit,
          target_calories: exercise.target_calories,
          measurement_type: exercise.measurement_type ?? null,
          default_unit: exercise.default_unit ?? null,
        });

        const measurementType = resolveSessionExerciseMeasurementType(
          mappedGoalColumns.measurement_type ?? exercise.details?.measurement_type,
        );
        const defaultUnit = defaultUnitForSessionExerciseMeasurementType(measurementType);
        warnOnSessionExerciseUnitMismatch({ measurementType, defaultUnit, context: "startSessionFromViewDayAction" });

        return {
          session_id: session.id,
          user_id: user.id,
          exercise_id: exercise.exercise_id,
          routine_day_exercise_id: exercise.id,
          position: exercise.position,
          notes: exercise.notes,
          is_skipped: false,
          ...mappedGoalColumns,
          measurement_type: measurementType,
          default_unit: defaultUnit,
        };
      }),
    );

    if (exerciseError) {
      await supabase.from("sessions").delete().eq("id", session.id).eq("user_id", user.id);
      return { ok: false, error: "Could not start workout for this day." };
    }
  }

  return { ok: true, data: { sessionId: session.id } };
}

export default async function RoutineDayDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: routine } = await supabase
    .from("routines")
    .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at, weight_unit")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!routine) {
    notFound();
  }

  const { data: day } = await supabase
    .from("routine_days")
    .select("id, user_id, routine_id, day_index, name, is_rest, notes")
    .eq("id", params.dayId)
    .eq("routine_id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!day) {
    notFound();
  }

  const { data: exercises } = await supabase
    .from("routine_day_exercises")
    .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories, measurement_type, default_unit, notes")
    .eq("routine_day_id", day.id)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const routineRow = routine as RoutineRow;
  const dayRow = day as RoutineDayRow;
  const dayExercises = (exercises ?? []) as RoutineDayExerciseRow[];
  const { summaries } = await buildCanonicalDaySummaries({
    supabase,
    routineDays: [dayRow],
    allDayExercises: dayExercises,
  });
  const canonicalDay = summaries[0] ?? null;
  const dayLabel = dayRow.name?.trim() || (dayRow.is_rest ? "Rest" : `Day ${dayRow.day_index}`);
  const daySummary = dayRow.is_rest
    ? "Rest day"
    : getExerciseCountSummaryFromCanonicalExercises(canonicalDay?.runnableExercises ?? []).label;
  const returnToPath = `/routines/${routineRow.id}/days/${dayRow.id}`;

  return (
    <MainTabScreen topNavMode="none" className="space-y-0">
      <ScrollScreenWithBottomActions className="px-4 pb-0 pt-0">
        <section className="mx-auto w-full max-w-md space-y-4 pb-4 pt-[var(--app-safe-top)]">
          <AppPanel className="space-y-3">
            <AppHeader
              title={`${routineRow.name} | ${dayLabel}`}
              subtitleRight={daySummary}
            />

            {canonicalDay?.state === "partial" ? (
              <p className="rounded-md border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                Some exercises could not be loaded and will be skipped when you start this workout.
              </p>
            ) : null}

            {canonicalDay && !isRunnableDayState(canonicalDay.state) ? (
              <p className="rounded-lg border border-border/45 bg-surface/52 px-3 py-3 text-sm text-muted">
                {canonicalDay.state === "rest"
                  ? "Rest day. No workout to start today."
                  : canonicalDay.invalidExercises.length > 0
                    ? "This day has invalid exercises. Edit the day before starting a workout."
                    : "No runnable exercises planned for this day."}
              </p>
            ) : (
              <RoutineDayExerciseList
                exercises={(canonicalDay?.runnableExercises ?? []).map((exercise) => ({
                  id: exercise.id,
                  name: exercise.displayName,
                  goalLine: exercise.goalLine,
                  exerciseId: exercise.details?.id ?? exercise.exercise_id,
                  image_icon_path: exercise.details?.image_icon_path ?? null,
                  image_howto_path: exercise.details?.image_howto_path ?? null,
                  slug: exercise.details?.slug ?? null,
                }))}
              />
            )}
          </AppPanel>
        </section>

        <PublishBottomActions>
          <BottomActionSplit
            primary={(
              <TodayStartButton
                startSessionAction={() => startSessionFromViewDayAction({ routineId: routineRow.id, dayId: dayRow.id })}
                returnTo={returnToPath}
                className="w-full"
              />
            )}
            secondary={(
              <Link
                href="/routines"
                className={getAppButtonClassName({ variant: "secondary", size: "md", fullWidth: true, className: "w-full" })}
              >
                Select Day
              </Link>
            )}
          />
        </PublishBottomActions>
      </ScrollScreenWithBottomActions>
    </MainTabScreen>
  );
}
