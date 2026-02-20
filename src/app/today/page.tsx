import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { requireUser } from "@/lib/auth";
import { getExerciseName } from "@/lib/exercise-options";
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

  if (profile.active_routine_id) {
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
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Today</h1>

      {activeRoutine && todayRoutineDay && todayDayIndex ? (
        <div className="space-y-3 rounded-md bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">{activeRoutine.name}: {todayRoutineDay.is_rest ? `REST DAY — ${todayRoutineDay.name ?? `Day ${todayDayIndex}`}` : todayRoutineDay.name ?? `Day ${todayDayIndex}`}</h2>
          {inProgressSession ? <p className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">In progress</p> : null}
          <p className="text-xs text-slate-500">Completed (this routine) today: {completedTodayCount}</p>

          <ul className="space-y-1 text-sm">
            {dayExercises.map((exercise) => (
              <li key={exercise.id} className="rounded-md bg-slate-50 px-3 py-2">
                {getExerciseName(exercise.exercise_id)}
                {exercise.target_sets
                  ? ` · ${exercise.target_sets} sets · ${formatRepTarget(exercise.target_reps_min, exercise.target_reps_max, exercise.target_reps)}`
                  : ""}
              </li>
            ))}
            {dayExercises.length === 0 ? <li className="rounded-md bg-slate-50 px-3 py-2 text-slate-500">No routine exercises planned today.</li> : null}
          </ul>

          {inProgressSession ? (
            <Link href={`/session/${inProgressSession.id}`} className="block w-full rounded-lg bg-amber-500 px-4 py-5 text-center text-lg font-semibold text-white">Resume Session</Link>
          ) : (
            <form action={startSessionAction}>
              <button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-5 text-lg font-semibold text-white">{todayRoutineDay.is_rest ? "Start Optional Session" : "Start Session"}</button>
            </form>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-md bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">No active routine selected.</p>
          <Link href="/routines" className="block rounded-md border border-slate-300 px-3 py-2 text-center text-sm">Go to Routines</Link>
        </div>
      )}

      {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}

      <AppNav />
    </section>
  );
}
