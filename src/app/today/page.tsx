import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { requireUser } from "@/lib/auth";
import { getExerciseName } from "@/lib/exercise-options";
import { ensureProfile } from "@/lib/profile";
import { getRoutineDayComputation, getTodayDateInTimeZone } from "@/lib/routines";
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

      const { data: recentSessions } = await supabase
        .from("sessions")
        .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, duration_seconds")
        .eq("user_id", user.id)
        .eq("routine_id", activeRoutine.id)
        .order("performed_at", { ascending: false })
        .limit(100);

      const todayKey = getTodayDateInTimeZone(profile.timezone);
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: profile.timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      completedTodayCount = ((recentSessions ?? []) as SessionRow[]).filter((session) => formatter.format(new Date(session.performed_at)) === todayKey).length;
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Today</h1>

      {activeRoutine && todayRoutineDay && todayDayIndex ? (
        <div className="space-y-3 rounded-md bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">{activeRoutine.name}: {todayRoutineDay.name ?? `Day ${todayDayIndex}`}</h2>
          {todayRoutineDay.is_rest ? <p className="text-sm">Rest day</p> : null}
          <p className="text-xs text-slate-500">Completed today: {completedTodayCount}</p>

          <ul className="space-y-1 text-sm">
            {dayExercises.map((exercise) => (
              <li key={exercise.id} className="rounded-md bg-slate-50 px-3 py-2">
                {getExerciseName(exercise.exercise_id)}
                {exercise.target_sets
                  ? ` · ${exercise.target_sets} × ${exercise.target_reps_min ?? exercise.target_reps ?? "-"}-${exercise.target_reps_max ?? exercise.target_reps ?? "-"}`
                  : ""}
              </li>
            ))}
            {dayExercises.length === 0 ? <li className="rounded-md bg-slate-50 px-3 py-2 text-slate-500">No template exercises.</li> : null}
          </ul>

          <form action={startSessionAction}>
            <button type="submit" className="w-full rounded-lg bg-emerald-600 px-4 py-5 text-lg font-semibold text-white">Start Session</button>
          </form>
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
