import { notFound } from "next/navigation";
import { AppShell } from "@/components/ui/app/AppShell";
import { ScrollContainer } from "@/components/ui/app/ScrollContainer";
import { BOTTOM_ACTION_BAR_CONTENT_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { getExerciseNameMap, listExercises } from "@/lib/exercises";
import { requireUser } from "@/lib/auth";
import { EMPTY_PR_COUNTS, evaluatePrSummaries, type PrEvaluationSet } from "@/lib/pr-evaluator";
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
  const { data: historicalSetRows } = exerciseIds.length
    ? await supabase
      .from("sets")
      .select("set_index, weight, reps, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(performed_at, status))")
      .eq("user_id", user.id)
      .eq("session_exercise.user_id", user.id)
      .eq("session_exercise.session.status", "completed")
      .in("session_exercise.exercise_id", exerciseIds)
    : { data: [] };

  const prEvaluationSets: PrEvaluationSet[] = ((historicalSetRows ?? []) as Array<{
    set_index: number;
    weight: number | null;
    reps: number | null;
    session_exercise:
      | {
        session_id: string;
        exercise_id: string;
        session: { performed_at: string; status: "in_progress" | "completed" } | Array<{ performed_at: string; status: "in_progress" | "completed" }> | null;
      }
      | Array<{
        session_id: string;
        exercise_id: string;
        session: { performed_at: string; status: "in_progress" | "completed" } | Array<{ performed_at: string; status: "in_progress" | "completed" }> | null;
      }>
      | null;
  }>).flatMap((row) => {
    const sessionExercise = Array.isArray(row.session_exercise)
      ? (row.session_exercise[0] ?? null)
      : (row.session_exercise ?? null);
    const session = Array.isArray(sessionExercise?.session)
      ? (sessionExercise?.session[0] ?? null)
      : (sessionExercise?.session ?? null);
    if (!sessionExercise?.exercise_id || !sessionExercise?.session_id || !session?.performed_at || session.status !== "completed") {
      return [];
    }

    return [{
      exerciseId: sessionExercise.exercise_id,
      sessionId: sessionExercise.session_id,
      performedAt: session.performed_at,
      setIndex: row.set_index,
      weight: row.weight,
      reps: row.reps,
    }];
  });
  const { sessionCountsById } = evaluatePrSummaries(prEvaluationSets);

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
    prCounts: sessionCountsById.get(sessionRow.id) ?? { ...EMPTY_PR_COUNTS },
  });

  const initialIsEditing = searchParams?.edit === "1";

  return (
    <AppShell className="gap-4" topNavMode="none">
      <ScrollContainer className={`flex flex-col gap-3 px-1 ${BOTTOM_ACTION_BAR_CONTENT_RESERVE_CLASS}`}>
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
