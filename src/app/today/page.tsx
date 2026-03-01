import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { TodayClientShell } from "@/app/today/TodayClientShell";
import { TodayOfflineBridge } from "@/app/today/TodayOfflineBridge";
import { TodayDayPicker } from "@/app/today/TodayDayPicker";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { OfflineSyncBadge } from "@/components/OfflineSyncBadge";
import { AppBadge } from "@/components/ui/app/AppBadge";
import { AppHeader } from "@/components/ui/app/AppHeader";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { AppRow } from "@/components/ui/app/AppRow";
import { StickyActionBar } from "@/components/ui/app/StickyActionBar";
import { appTokens } from "@/components/ui/app/tokens";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { requireUser } from "@/lib/auth";
import { getExerciseNameMap } from "@/lib/exercises";
import { TODAY_CACHE_SCHEMA_VERSION, type TodayCacheSnapshot } from "@/lib/offline/today-cache";
import { ensureProfile } from "@/lib/profile";
import { mapRoutineDayGoalToSessionColumns } from "@/lib/exercise-goal-payload";
import { getRoutineDayComputation, getTimeZoneDayWindow } from "@/lib/routines";
import { supabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/action-result";
import type { RoutineDayExerciseRow, RoutineDayRow, RoutineRow, SessionRow } from "@/types/db";

export const dynamic = "force-dynamic";

function formatTodayExerciseTargets(exercise: Pick<RoutineDayExerciseRow, "target_sets" | "target_reps" | "target_reps_min" | "target_reps_max">) {
  if (!exercise.target_sets) {
    return null;
  }

  const minReps = exercise.target_reps_min ?? exercise.target_reps ?? null;
  const maxReps = exercise.target_reps_max ?? exercise.target_reps ?? null;
  const repsTarget =
    minReps !== null && maxReps !== null
      ? minReps === maxReps
        ? `${minReps}`
        : `${minReps}–${maxReps}`
      : minReps !== null
        ? `${minReps}`
        : maxReps !== null
          ? `${maxReps}`
          : null;

  return repsTarget ? `${exercise.target_sets} sets • ${repsTarget}` : `${exercise.target_sets} sets`;
}

async function startSessionAction(payload?: { dayIndex?: number }): Promise<ActionResult<{ sessionId: string }>> {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const profile = await ensureProfile(user.id);

  if (!profile.active_routine_id) {
    return { ok: false, error: "No active routine selected" };
  }

  const { data: activeRoutine, error: routineError } = await supabase
    .from("routines")
    .select("id, name, cycle_length_days, start_date, timezone")
    .eq("id", profile.active_routine_id)
    .eq("user_id", user.id)
    .single();

  if (routineError || !activeRoutine) {
    return { ok: false, error: routineError?.message ?? "Active routine not found" };
  }

  const defaultDay = getRoutineDayComputation({
    cycleLengthDays: activeRoutine.cycle_length_days,
    startDate: activeRoutine.start_date,
    profileTimeZone: activeRoutine.timezone || profile.timezone,
  });

  const routineDayIndex = payload?.dayIndex && Number.isInteger(payload.dayIndex)
    ? payload.dayIndex
    : defaultDay.dayIndex;

  const { data: routineDay, error: routineDayError } = await supabase
    .from("routine_days")
    .select("id, name")
    .eq("routine_id", activeRoutine.id)
    .eq("day_index", routineDayIndex)
    .eq("user_id", user.id)
    .single();

  if (routineDayError || !routineDay) {
    return { ok: false, error: routineDayError?.message ?? "Routine day not found" };
  }

  const routineDayName = routineDay.name || `Day ${routineDayIndex}`;

  const { data: templateExercises, error: templateError } = await supabase
    .from("routine_day_exercises")
    .select("id, exercise_id, position, notes, measurement_type, default_unit, target_sets, target_reps, target_reps_min, target_reps_max, target_weight, target_weight_unit, target_duration_seconds, target_distance, target_distance_unit, target_calories")
    .eq("routine_day_id", routineDay.id)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  if (templateError) {
    return { ok: false, error: templateError.message };
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
    return { ok: false, error: sessionError?.message ?? "Could not create session" };
  }

  if ((templateExercises ?? []).length > 0) {
    const templateExerciseIds = Array.from(new Set((templateExercises ?? []).map((exercise) => exercise.exercise_id)));
    const { data: exerciseRows } = templateExerciseIds.length
      ? await supabase
          .from("exercises")
          .select("id, measurement_type, default_unit")
          .in("id", templateExerciseIds)
      : { data: [] };

    const exerciseFallbackById = new Map((exerciseRows ?? []).map((exercise) => [exercise.id, {
      measurement_type: exercise.measurement_type,
      default_unit: exercise.default_unit,
    }]));

    const { error: exerciseError } = await supabase.from("session_exercises").insert(
      (templateExercises ?? []).map((exercise) => {
        const fallback = exerciseFallbackById.get(exercise.exercise_id);
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
          measurement_type: exercise.measurement_type,
          default_unit: exercise.default_unit,
        });

        return {
          session_id: session.id,
          user_id: user.id,
          exercise_id: exercise.exercise_id,
          routine_day_exercise_id: exercise.id,
          position: exercise.position,
          notes: exercise.notes,
          is_skipped: false,
          ...mappedGoalColumns,
          measurement_type: mappedGoalColumns.measurement_type ?? fallback?.measurement_type ?? "reps",
          default_unit: mappedGoalColumns.default_unit ?? fallback?.default_unit ?? "mi",
        };
      }),
    );

    if (exerciseError) {
      return { ok: false, error: exerciseError.message };
    }
  }

  return { ok: true, data: { sessionId: session.id } };
}


async function discardInProgressSessionAction(formData: FormData): Promise<void> {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const sessionId = String(formData.get("sessionId") ?? "").trim();

  if (!sessionId) {
    redirect(`/today?error=${encodeURIComponent("Missing session")}`);
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "in_progress")
    .maybeSingle();

  if (sessionError) {
    redirect(`/today?error=${encodeURIComponent(sessionError.message)}`);
  }

  if (!session) {
    redirect(`/today?error=${encodeURIComponent("In-progress session not found")}`);
  }

  const { data: sessionExerciseRows, error: sessionExerciseReadError } = await supabase
    .from("session_exercises")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (sessionExerciseReadError) {
    redirect(`/today?error=${encodeURIComponent(sessionExerciseReadError.message)}`);
  }

  const sessionExerciseIds = (sessionExerciseRows ?? []).map((row) => row.id);
  if (sessionExerciseIds.length > 0) {
    const { error: setsDeleteError } = await supabase
      .from("sets")
      .delete()
      .in("session_exercise_id", sessionExerciseIds)
      .eq("user_id", user.id);

    if (setsDeleteError) {
      redirect(`/today?error=${encodeURIComponent(setsDeleteError.message)}`);
    }

    const { error: sessionExerciseDeleteError } = await supabase
      .from("session_exercises")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", user.id);

    if (sessionExerciseDeleteError) {
      redirect(`/today?error=${encodeURIComponent(sessionExerciseDeleteError.message)}`);
    }
  }

  const { error: sessionDeleteError } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "in_progress");

  if (sessionDeleteError) {
    redirect(`/today?error=${encodeURIComponent(sessionDeleteError.message)}`);
  }

  redirect("/today");
}

export default async function TodayPage({ searchParams }: { searchParams?: { error?: string } }) {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const supabase = supabaseServer();

  let activeRoutine: RoutineRow | null = null;
  let todayRoutineDay: RoutineDayRow | null = null;
  let dayExercises: RoutineDayExerciseRow[] = [];
  let allDayExercises: RoutineDayExerciseRow[] = [];
  let todayDayIndex: number | null = null;
  let completedTodayCount = 0;
  let inProgressSession: SessionRow | null = null;
  let fetchFailed = false;
  let routineDays: RoutineDayRow[] = [];

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
          profileTimeZone: activeRoutine.timezone || profile.timezone,
        });

        todayDayIndex = dayIndex;

        const { data: routineDayRows } = await supabase
          .from("routine_days")
          .select("id, user_id, routine_id, day_index, name, is_rest, notes")
          .eq("routine_id", activeRoutine.id)
          .eq("user_id", user.id)
          .order("day_index", { ascending: true });

        routineDays = (routineDayRows ?? []) as RoutineDayRow[];
        todayRoutineDay = routineDays.find((day) => day.day_index === todayDayIndex) ?? null;

        if (routineDays.length > 0) {
          const { data: allExercises } = await supabase
            .from("routine_day_exercises")
            .select("id, user_id, routine_day_id, exercise_id, position, target_sets, target_reps, target_reps_min, target_reps_max, notes")
            .in("routine_day_id", routineDays.map((day) => day.id))
            .eq("user_id", user.id)
            .order("position", { ascending: true });

          allDayExercises = (allExercises ?? []) as RoutineDayExerciseRow[];
        }

        if (todayRoutineDay) {
          dayExercises = allDayExercises.filter((exercise) => exercise.routine_day_id === todayRoutineDay?.id);
        }

        const { startIso, endIso } = getTimeZoneDayWindow(activeRoutine.timezone || profile.timezone);

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
  // Manual QA checklist:
  // - Change day on Today, start workout, leave, return: displayed day matches Resume target.
  const effectiveDayIndex = inProgressSession?.routine_day_index ?? todayDayIndex;
  const effectiveRoutineDay = effectiveDayIndex === null
    ? todayRoutineDay
    : routineDays.find((day) => day.day_index === effectiveDayIndex) ?? todayRoutineDay;
  const effectiveDayExercises = effectiveRoutineDay
    ? allDayExercises.filter((exercise) => exercise.routine_day_id === effectiveRoutineDay.id)
    : dayExercises;
  const routineName = activeRoutine?.name ?? null;
  const routineDayName = effectiveRoutineDay ? effectiveRoutineDay.name ?? `Day ${effectiveDayIndex ?? effectiveRoutineDay.day_index}` : null;

  const todayPayload = {
    routine:
      activeRoutine && effectiveRoutineDay && effectiveDayIndex !== null && routineDayName
        ? {
            id: activeRoutine.id,
            name: routineName ?? "Routine",
            dayIndex: effectiveDayIndex,
            dayName: routineDayName,
            isRest: effectiveRoutineDay.is_rest,
            routineId: activeRoutine.id,
            routineDayId: effectiveRoutineDay.id,
          }
        : null,
    exercises: effectiveDayExercises.map((exercise) => ({
      id: exercise.id,
      name: exerciseNameMap.get(exercise.exercise_id) ?? exercise.exercise_id,
      targets: formatTodayExerciseTargets(exercise),
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
            recentExerciseIds: effectiveDayExercises.map((exercise) => exercise.exercise_id),
          },
        };

  return (
    <section className="space-y-4 pb-32">
      <AppNav />

      {todayPayload.routine && !fetchFailed ? (
        <div className="space-y-4 px-1">
          <OfflineSyncBadge />
        {todayPayload.inProgressSessionId ? (
            <div className="space-y-4 pb-4">
              <AppPanel className="space-y-3">
                <AppHeader
                  title={todayPayload.routine.isRest ? `${todayPayload.routine.name} (Rest Day)` : todayPayload.routine.dayName}
                  subtitleLeft={`Day ${todayPayload.routine.dayIndex} • ${todayPayload.routine.name}`}
                  subtitleRight={todayPayload.exercises.length > 0 ? `${todayPayload.exercises.length} exercises` : undefined}
                  action={todayPayload.completedTodayCount > 0 ? <AppBadge>Completed</AppBadge> : undefined}
                />

                <ul className={`${appTokens.listDivider} overflow-hidden rounded-lg border border-white/15 bg-[rgb(var(--surface)/0.72)] text-sm`}>
                  {todayPayload.exercises.map((exercise) => (
                    <li key={exercise.id}>
                      <AppRow
                        leftTop={exercise.name}
                        leftBottom={exercise.targets || undefined}
                        className="rounded-none border-x-0 border-t-0 border-b-white/12 bg-transparent px-3"
                      />
                    </li>
                  ))}
                  {todayPayload.exercises.length === 0 ? <li className="px-3 py-3 text-muted">No routine exercises planned today.</li> : null}
                </ul>
              </AppPanel>

              <StickyActionBar
                primary={<Link href={`/session/${todayPayload.inProgressSessionId}`} className={getAppButtonClassName({ variant: "primary", fullWidth: true, className: "h-12 border-emerald-300/60 bg-emerald-500/28 text-emerald-50 shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-transform hover:bg-emerald-500/34 active:scale-[0.98] active:bg-emerald-500/38" })}>Resume Workout</Link>}
                secondary={(
                  <ConfirmedServerFormButton
                    action={discardInProgressSessionAction}
                    hiddenFields={{ sessionId: todayPayload.inProgressSessionId }}
                    triggerLabel="Discard Workout"
                    triggerClassName="w-full"
                    modalTitle="Discard workout?"
                    modalDescription="This will delete your in-progress workout, including exercises and sets."
                    confirmLabel="Discard"
                  />
                )}
              />
            </div>
          ) : (
            <TodayDayPicker
              routineName={todayPayload.routine.name}
              days={routineDays.map((day) => ({
                id: day.id,
                dayIndex: day.day_index,
                name: day.name || `Day ${day.day_index}`,
                isRest: day.is_rest,
                exercises: allDayExercises
                  .filter((exercise) => exercise.routine_day_id === day.id)
                  .map((exercise) => ({
                    id: exercise.id,
                    name: exerciseNameMap.get(exercise.exercise_id) ?? exercise.exercise_id,
                    targets: formatTodayExerciseTargets(exercise),
                  })),
              }))}
              currentDayIndex={todayPayload.routine.dayIndex}
              completedTodayCount={todayPayload.completedTodayCount}
              startSessionAction={startSessionAction}
            />
          )}
        </div>
      ) : (
        <TodayClientShell payload={todayPayload} fetchFailed={fetchFailed} />
      )}

      <TodayOfflineBridge snapshot={todaySnapshot} />

      {searchParams?.error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{searchParams.error}</p> : null}
    </section>
  );
}
