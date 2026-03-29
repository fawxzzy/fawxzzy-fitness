import { notFound } from "next/navigation";
import { AppShell } from "@/components/ui/app/AppShell";
import { FIXED_CTA_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { ScrollScreenWithBottomActions } from "@/components/layout/ScrollScreenWithBottomActions";
import { ScreenScaffold } from "@/components/ui/app/ScreenScaffold";
import { getExerciseNameMap } from "@/lib/exercises";
import { requireUser } from "@/lib/auth";
import { EMPTY_PR_COUNTS, evaluatePrSummaries, type PrEvaluationSet } from "@/lib/pr-evaluator";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionRow, SetRow } from "@/types/db";
import { HistoryLogPageClient } from "./HistoryLogPageClient";
import { buildSessionSummary } from "../session-summary";
import { loadHistoryDetailRows, resolveHistoryExerciseName } from "@/lib/history-session-detail-loader";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { sessionId: string };
};

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

  const {
    orderedSessionExercises,
    exerciseMetadataById,
    sessionExerciseIds,
    sets,
    summary: loaderSummary,
  } = await loadHistoryDetailRows({
    supabase,
    sessionId: session.id,
    userId: user.id,
    sessionFound: Boolean(session),
  });

  if (process.env.NODE_ENV !== "production") {
    console.info("[history-detail-loader]", loaderSummary);
  }

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
  const backHref = `/history?tab=sessions&selected=${sessionRow.id}`;

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

  return (
    <AppShell className="gap-4" topNavMode="none">
      <ScrollScreenWithBottomActions className={`flex flex-col gap-3 px-1 ${FIXED_CTA_RESERVE_CLASS}`}>
        <ScreenScaffold className="space-y-2">
          <HistoryLogPageClient
            logId={sessionRow.id}
            initialDayName={effectiveDayName}
            initialNotes={sessionRow.notes}
            unitLabel={unitLabel}
            exerciseNameMap={exerciseNameRecord}
            sessionSummary={sessionSummary}
            backHref={backHref}
            exercises={orderedSessionExercises.map((exercise) => {
              const exerciseId = String(exercise.exercise_id);
              const metadata = exerciseMetadataById.get(exerciseId);
              const resolvedExerciseName = resolveHistoryExerciseName({
                metadataName: metadata?.name,
                rowExerciseName: (exercise as { exercise_name?: string | null }).exercise_name,
                rowName: (exercise as { name?: string | null }).name,
                mapExerciseName: exerciseNameRecord[exerciseId] ?? null,
              });
              return ({
                id: exercise.id,
                exercise_id: exerciseId,
                exercise_name: resolvedExerciseName,
                exercise_slug: metadata?.slug ?? null,
                exercise_image_path: metadata?.image_path ?? null,
                exercise_image_icon_path: metadata?.image_icon_path ?? null,
                exercise_image_howto_path: metadata?.image_howto_path ?? null,
                notes: exercise.notes,
                measurement_type: exercise.measurement_type ?? metadata?.measurement_type ?? "reps",
                default_unit: exercise.default_unit ?? metadata?.default_unit ?? null,
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
              });
            })}
          />
        </ScreenScaffold>
      </ScrollScreenWithBottomActions>
    </AppShell>
  );
}
