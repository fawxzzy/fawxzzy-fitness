import { notFound } from "next/navigation";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScrollContainer } from "@/components/ui/app/ScrollContainer";
import { getExerciseNameMap, listExercises } from "@/lib/exercises";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionExerciseRow, SessionRow, SetRow } from "@/types/db";
import { LogAuditClient } from "./LogAuditClient";
import { buildSessionSummary } from "../session-summary";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { sessionId: string };
  searchParams?: { returnTab?: string; view?: string; edit?: string };
};

export default async function HistoryLogDetailsPage({ params, searchParams }: PageProps) {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, day_name_override, duration_seconds, status, routines(name, weight_unit)")
    .eq("id", params.sessionId)
    .eq("user_id", user.id)
    .eq("status", "completed")
    .single();

  if (!session) {
    notFound();
  }

  const { data: sessionExercisesData } = await supabase
    .from("session_exercises")
    .select("id, session_id, user_id, exercise_id, position, performed_index, notes, is_skipped, measurement_type, default_unit, exercise:exercises(measurement_type, default_unit)")
    .eq("session_id", params.sessionId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const sessionExercises = (sessionExercisesData ?? []) as Array<SessionExerciseRow & { exercise?: { measurement_type?: "reps" | "time" | "distance" | "time_distance"; default_unit?: "mi" | "km" | "m" | null } | null }>;
  const orderedSessionExercises = (() => {
    const performed = sessionExercises
      .filter((exercise) => typeof exercise.performed_index === "number")
      .sort((a, b) => (a.performed_index ?? 0) - (b.performed_index ?? 0));
    const untouched = sessionExercises.filter((exercise) => typeof exercise.performed_index !== "number");
    return [...performed, ...untouched];
  })();
  const sessionExerciseIds = orderedSessionExercises.map((row) => row.id);

  const { data: setsData } = sessionExerciseIds.length
    ? await supabase
      .from("sets")
      .select("id, session_exercise_id, user_id, set_index, weight, reps, is_warmup, notes, duration_seconds, distance, distance_unit, calories, rpe, weight_unit")
      .in("session_exercise_id", sessionExerciseIds)
      .eq("user_id", user.id)
      .order("set_index", { ascending: true })
    : { data: [] };

  const sets = (setsData ?? []) as SetRow[];
  const setsByExercise = new Map<string, SetRow[]>();

  for (const set of sets) {
    const current = setsByExercise.get(set.session_exercise_id) ?? [];
    current.push(set);
    setsByExercise.set(set.session_exercise_id, current);
  }

  const sessionRow = session as SessionRow & { routines?: Array<{ name: string; weight_unit: "lbs" | "kg" | null }> | { name: string; weight_unit: "lbs" | "kg" | null } | null };

  const { data: routineDay } = sessionRow.routine_id && sessionRow.routine_day_index
    ? await supabase
      .from("routine_days")
      .select("name")
      .eq("routine_id", sessionRow.routine_id)
      .eq("day_index", sessionRow.routine_day_index)
      .eq("user_id", user.id)
      .maybeSingle()
    : { data: null };

  const exerciseNameMap = await getExerciseNameMap();
  const exerciseNameRecord = Object.fromEntries(exerciseNameMap.entries());
  const routineField = sessionRow.routines;
  const routineName = Array.isArray(routineField)
    ? routineField[0]?.name ?? sessionRow.name ?? "Session"
    : routineField?.name ?? sessionRow.name ?? "Session";
  const unitLabel = Array.isArray(routineField)
    ? routineField[0]?.weight_unit ?? "kg"
    : routineField?.weight_unit ?? "kg";
  const effectiveDayName = sessionRow.day_name_override
    ?? routineDay?.name
    ?? sessionRow.routine_day_name
    ?? (sessionRow.routine_day_index ? `Day ${sessionRow.routine_day_index}` : "Day");
  const exerciseOptions = await listExercises();
  const returnView = searchParams?.view === "compact" ? "compact" : "list";
  const backHref = `/history?tab=sessions&view=${returnView}`;

  const exerciseIds = orderedSessionExercises.map((exercise) => exercise.exercise_id);
  const { data: exerciseStats } = exerciseIds.length
    ? await supabase
      .from("exercise_stats_cache")
      .select("exercise_id, actual_pr_at")
      .eq("user_id", user.id)
      .in("exercise_id", exerciseIds)
    : { data: [] };
  const prExerciseIds = new Set<string>();
  for (const stat of exerciseStats ?? []) {
    if (stat.actual_pr_at && stat.actual_pr_at === sessionRow.performed_at) {
      prExerciseIds.add(stat.exercise_id);
    }
  }

  const sessionSummary = buildSessionSummary({
    sessionRow,
    routineTitle: routineName,
    dayTitle: effectiveDayName,
    sessionExercises: orderedSessionExercises.map((exercise) => ({
      id: exercise.id,
      session_id: exercise.session_id,
      exercise_id: exercise.exercise_id,
    })),
    setsBySessionExerciseId: new Map(Array.from(setsByExercise.entries())),
    exerciseNameById: exerciseNameMap,
    prExerciseIds,
  });

  const initialIsEditing = searchParams?.edit === "1";

  return (
    <AppShell className="gap-4" topNavMode="none">
      <ScrollContainer className="flex flex-col gap-3 px-1">
        <LogAuditClient
          logId={sessionRow.id}
          initialDayName={effectiveDayName}
          initialNotes={sessionRow.notes}
          unitLabel={unitLabel}
          exerciseNameMap={exerciseNameRecord}
          exerciseOptions={exerciseOptions}
          sessionSummary={sessionSummary}
          initialIsEditing={initialIsEditing}
          backHref={backHref}
          exercises={orderedSessionExercises.map((exercise) => ({
            id: exercise.id,
            exercise_id: exercise.exercise_id,
            notes: exercise.notes,
            measurement_type: exercise.measurement_type ?? (Array.isArray(exercise.exercise) ? exercise.exercise[0]?.measurement_type : exercise.exercise?.measurement_type) ?? "reps",
            default_unit: exercise.default_unit ?? (Array.isArray(exercise.exercise) ? exercise.exercise[0]?.default_unit : exercise.exercise?.default_unit) ?? "mi",
            sets: (setsByExercise.get(exercise.id) ?? []).map((set) => ({
              id: set.id,
              set_index: set.set_index,
              weight: set.weight,
              reps: set.reps,
              duration_seconds: set.duration_seconds,
              distance: set.distance,
              distance_unit: set.distance_unit,
              calories: set.calories,
              weight_unit: set.weight_unit,
            })),
          }))}
        />
      </ScrollContainer>
    </AppShell>
  );
}
