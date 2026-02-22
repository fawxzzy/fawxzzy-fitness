import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { TodayClientShell } from "@/app/today/TodayClientShell";
import { TodayOfflineBridge } from "@/app/today/TodayOfflineBridge";
import { requireUser } from "@/lib/auth";
import { getExerciseNameMap } from "@/lib/exercises";
import { TODAY_CACHE_SCHEMA_VERSION, type TodayCacheSnapshot } from "@/lib/offline/today-cache";
import { ensureProfile } from "@/lib/profile";
import { formatRepTarget, getRoutineDayComputation, getTimeZoneDayWindow } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow, SessionRow } from "@/types/db";

export const dynamic = "force-dynamic";

async function startSessionAction() {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const profile = await ensureProfile(user.id);

  if (!profile.active_routine_id) {
    redirect("/today?error=No%20active%20routine%20selected");
  }

  const { data: activeRoutine, error: routineError } = await supabase
    .from("routines")
    .select("id, name, cycle_length_days, start_date")
    .eq("id", profile.active_routine_id)
    .eq("user_id", user.id)
    .single();

  if (routineError || !activeRoutine) {
    redirect(`/today?error=${encodeURIComponent(routineError?.message ?? "Active routine not found")}`);
  }

  const { dayIndex: routineDayIndex } = getRoutineDayComputation({
    cycleLengthDays: activeRoutine.cycle_length_days,
    startDate: activeRoutine.start_date,
    profileTimeZone: profile.timezone,
  });

  const { data: routineDay, error: routineDayError } = await supabase
    .from("routine_days")
    .select("id, name")
    .eq("routine_id", activeRoutine.id)
    .eq("day_index", routineDayIndex)
    .eq("user_id", user.id)
    .single();

  if (routineDayError || !routineDay) {
    redirect(`/today?error=${encodeURIComponent(routineDayError?.message ?? "Routine day not found")}`);
  }

  const routineDayName = routineDay.name || `Day ${routineDayIndex}`;

  const { data: templateExercises, error: templateError } = await supabase
    .from("routine_day_exercises")
    .select("exercise_id, position, notes")
    .eq("routine_day_id", routineDay.id)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (templateError) {
    redirect(`/today?error=${encodeURIComponent(templateError.message)}`);
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      routine_id: activeRoutine.id,
      routine_day_index: routineDayIndex,
      name: activeRoutine.name,
      routine_day_name: routineDayName,
      status: "in_progress",
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    redirect(`/today?error=${encodeURIComponent(sessionError?.message ?? "Could not create session")}`);
  }

  if ((templateExercises ?? []).length > 0) {
    const { error: exerciseError } = await supabase.from("session_exercises").insert(
      (templateExercises ?? []).map((exercise) => ({
        session_id: session.id,
        user_id: user.id,
        exercise_id: exercise.exercise_id,
        position: exercise.position,
        notes: exercise.notes,
        is_skipped: false,
      })),
    );

    if (exerciseError) {
      redirect(`/today?error=${encodeURIComponent(exerciseError.message)}`);
    }
  }

  redirect(`/session/${session.id}`);
}

export default async function TodayPage({ searchParams }: { searchParams?: { error?: string } }) {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const supabase = supabaseServer();

  let activeRoutine: RoutineRow | null = null;
  let todayRoutineDay: RoutineDayRow | null = null;
  let dayExercises: RoutineDayExerciseRow[] = [];
  let todayDayIndex: number | null = null;
  let completedTodayCount = 0;
  let inProgressSession: SessionRow | null = null;
  let fetchFailed = false;

  if (profile.active_routine_id) {
    try {
      const { data: routine } = await supabase
        .from("routines")
        .select("id, user_id, name, cycle_length_days, start_date, timezone, updated_at, weight_unit")
        .eq("id", profile.active_routine_id)
        .eq("user_id", user.id)
        .maybeSingle();

      activeRoutine = (routine as RoutineRow | null) ?? null;

      if (activeRoutine) {
        const { dayIndex } = getRoutineDayComputation({
          cycleLengthDays: activeRoutine.cycle_length_days,
          startDate: activeRoutine.start_date,
          profileTimeZone: profile.timezone,
        });

        todayDayIndex = dayIndex;

        const { data: routineDay } = await supabase
          .from("routine_days")
          .select("id, user_id, routine_id, day_index, name, is_rest, notes")
          .eq("routine_id", activeRoutine.id)
          .eq("day_index", todayDayIndex)
          .eq("user_id", user.id)
          .single();

        todayRoutineDay = (routineDay as RoutineDayRow | null) ?? null;

        if (todayRoutineDay) {
          const { data: exercises } = await supabase
            .from("routine_day_exercises")
            .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, notes")
            .eq("routine_day_id", todayRoutineDay.id)
            .eq("user_id", user.id)
            .order("position", { ascending: true });

          dayExercises = (exercises ?? []) as RoutineDayExerciseRow[];
        }

        const { startIso, endIso } = getTimeZoneDayWindow(activeRoutine.timezone);

        const { count: completedTodayCountValue } = await supabase
          .from("sessions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "completed")
          .eq("routine_id", activeRoutine.id)
          .gte("performed_at", startIso)
          .lt("performed_at", endIso)
          .limit(1);

        completedTodayCount = completedTodayCountValue ?? 0;

        const { data: inProgress } = await supabase
          .from("sessions")
          .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, duration_seconds, status")
          .eq("user_id", user.id)
          .eq("routine_id", activeRoutine.id)
          .eq("status", "in_progress")
          .gte("performed_at", startIso)
          .lt("performed_at", endIso)
          .order("performed_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        inProgressSession = (inProgress as SessionRow | null) ?? null;
      }
    } catch {
      fetchFailed = true;
    }
  }

  const exerciseNameMap = await getExerciseNameMap();
  const routineName = activeRoutine?.name ?? null;
  const routineDayName = todayRoutineDay ? todayRoutineDay.name ?? `Day ${todayDayIndex ?? todayRoutineDay.day_index}` : null;

  const todayPayload = {
    routine:
      activeRoutine && todayRoutineDay && todayDayIndex !== null && routineDayName
        ? {
            id: activeRoutine.id,
            name: routineName ?? "Routine",
            dayIndex: todayDayIndex,
            dayName: routineDayName,
            isRest: todayRoutineDay.is_rest,
          }
        : null,
    exercises: dayExercises.map((exercise) => ({
      id: exercise.id,
      name: exerciseNameMap.get(exercise.exercise_id) ?? exercise.exercise_id,
      targets: exercise.target_sets
        ? `${exercise.target_sets} sets · ${formatRepTarget(exercise.target_reps_min, exercise.target_reps_max, exercise.target_reps)}`
        : null,
      notes: exercise.notes,
    })),
    completedTodayCount,
    inProgressSessionId: inProgressSession?.id ?? null,
  };

  const todaySnapshot: TodayCacheSnapshot | null =
    todayPayload.routine === null
      ? null
      : {
          schemaVersion: TODAY_CACHE_SCHEMA_VERSION,
          capturedAt: new Date().toISOString(),
          routine: todayPayload.routine,
          exercises: todayPayload.exercises,
          hints: {
            inProgressSessionId: todayPayload.inProgressSessionId,
            completedTodayCount,
            recentExerciseIds: dayExercises.map((exercise) => exercise.exercise_id),
          },
        };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Today</h1>

      {todayPayload.routine && !fetchFailed ? (
        <div className="space-y-3 rounded-xl border border-border bg-surface/95 p-4">
          <h2 className="text-lg font-semibold text-text">{todayPayload.routine.name}: {todayPayload.routine.isRest ? `REST DAY — ${todayPayload.routine.dayName}` : todayPayload.routine.dayName}</h2>
          {todayPayload.inProgressSessionId ? <p className="inline-flex rounded-full border border-accent/25 bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">In progress</p> : null}
          <p className="text-xs text-muted">Completed (this routine) today: {todayPayload.completedTodayCount}</p>

          <ul className="space-y-1 text-sm">
            {todayPayload.exercises.map((exercise) => (
              <li key={exercise.id} className="rounded-md bg-surface-2-strong px-3 py-2 text-text">
                {exercise.name}
                {exercise.targets ? ` · ${exercise.targets}` : ""}
              </li>
            ))}
            {todayPayload.exercises.length === 0 ? <li className="rounded-md bg-surface-2-strong px-3 py-2 text-muted">No routine exercises planned today.</li> : null}
          </ul>

          {todayPayload.inProgressSessionId ? (
            <Link href={`/session/${todayPayload.inProgressSessionId}`} className="block w-full rounded-lg bg-accent px-4 py-5 text-center text-lg font-semibold text-white transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">Start Workout</Link>
          ) : (
            <form action={startSessionAction}>
              <button type="submit" className="w-full rounded-lg bg-accent px-4 py-5 text-lg font-semibold text-white transition-colors hover:bg-accent/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25">Start Workout</button>
            </form>
          )}
        </div>
      ) : (
        <TodayClientShell payload={todayPayload} fetchFailed={fetchFailed} />
      )}

      <TodayOfflineBridge snapshot={todaySnapshot} />

      {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}

      <AppNav />
    </section>
  );
}
