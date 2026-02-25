import { notFound } from "next/navigation";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { Glass } from "@/components/ui/Glass";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { tapFeedbackClass } from "@/components/ui/interactionClasses";
import { requireUser } from "@/lib/auth";
import { getExerciseNameMap } from "@/lib/exercises";
import { listExercises } from "@/lib/exercises";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionExerciseRow, SessionRow, SetRow } from "@/types/db";
import { LogAuditClient } from "./LogAuditClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { sessionId: string };
};

function formatDuration(durationSeconds: number | null): string {
  if (!durationSeconds || durationSeconds <= 0) {
    return "No timer";
  }

  const minutes = Math.round(durationSeconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export default async function HistoryLogDetailsPage({ params }: PageProps) {
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
    .select("id, session_id, user_id, exercise_id, position, notes, is_skipped")
    .eq("session_id", params.sessionId)
    .eq("user_id", user.id)
    .order("position", { ascending: true });

  const sessionExercises = (sessionExercisesData ?? []) as SessionExerciseRow[];
  const sessionExerciseIds = sessionExercises.map((row) => row.id);

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

  return (
    <section className="space-y-4">
      <AppNav />

      <Glass variant="base" className="p-4" interactive={false}>
        <Link href="/history" className={`mb-3 inline-flex rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 ${tapFeedbackClass}`}>
          ← Back to history
        </Link>
        <h1 className="text-2xl font-semibold">Log Details</h1>
        <p className="mt-1 text-sm text-slate-600">
          {routineName} • {effectiveDayName} • <LocalDateTime value={sessionRow.performed_at} /> • {formatDuration(sessionRow.duration_seconds)}
        </p>
      </Glass>

      <LogAuditClient
        logId={sessionRow.id}
        initialDayName={effectiveDayName}
        initialNotes={sessionRow.notes}
        unitLabel={unitLabel}
        exerciseNameMap={exerciseNameRecord}
        exerciseOptions={exerciseOptions}
        exercises={sessionExercises.map((exercise) => ({
          id: exercise.id,
          exercise_id: exercise.exercise_id,
          notes: exercise.notes,
          sets: (setsByExercise.get(exercise.id) ?? []).map((set) => ({
            id: set.id,
            set_index: set.set_index,
            weight: set.weight,
            reps: set.reps,
            duration_seconds: set.duration_seconds,
            weight_unit: set.weight_unit,
          })),
        }))}
      />
    </section>
  );
}
