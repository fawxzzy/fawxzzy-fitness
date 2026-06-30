import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { HistoryRouteScaffold } from "@/components/history/HistoryRouteScaffold";
import { BottomActionsProvider } from "@/components/layout/bottom-actions";
import { ContentRail } from "@/components/layout/ContentRail";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { EMPTY_PR_COUNTS, evaluatePrSummaries, type PrEvaluationSet } from "@/lib/pr-evaluator";
import { loadHistoryDetailRows, resolveHistoryExerciseName } from "@/lib/history-session-detail-loader";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { SessionRow, SetRow } from "@/types/db";
import { HistoryLogPageClient } from "@/app/history/[sessionId]/HistoryLogPageClient";
import { buildSessionSummary } from "@/app/history/session-summary";

export const dynamic = "force-dynamic";

function isLocalRequest() {
  const host = (headers().get("x-forwarded-host") ?? headers().get("host") ?? "").trim().toLowerCase();
  const hostname = host.split(":")[0] ?? "";
  return hostname === "127.0.0.1" || hostname === "localhost";
}

function buildAccessTokenClient(accessToken: string) {
  return createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="app-page-scroll min-h-[100dvh] px-4 py-6">
      <div className="mx-auto max-w-md rounded-[28px] border border-[rgb(var(--border-strong)/0.18)] bg-[rgb(var(--surface-1-rgb)/0.9)] px-4 py-5 text-sm text-[rgb(var(--text)/0.92)]">
        {message}
      </div>
    </main>
  );
}

function toClientPlainObject<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default async function DevHistorySessionDetailLivePage({
  searchParams,
}: {
  searchParams?: {
    sessionId?: string;
    userId?: string;
    accessToken?: string;
    capture?: string;
    expandExerciseId?: string;
  };
}) {
  if (process.env.NODE_ENV === "production" && !isLocalRequest()) {
    return <ErrorState message="Not found." />;
  }

  const sessionId = searchParams?.sessionId?.trim() ?? "";
  const userId = searchParams?.userId?.trim() ?? "";
  const accessToken = searchParams?.accessToken?.trim() ?? "";
  const captureMode = searchParams?.capture === "1";
  const initialExpandedExerciseId = searchParams?.expandExerciseId?.trim() || null;

  if (!sessionId || !userId) {
    return <ErrorState message="Missing session id or user id." />;
  }

  const supabase = accessToken ? buildAccessTokenClient(accessToken) : supabaseAdmin();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, day_name_override, duration_seconds, status, routines(name, weight_unit)")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("status", "completed")
    .single();

  if (!session) {
    return <ErrorState message="Session not found for this user." />;
  }

  const {
    orderedSessionExercises,
    exerciseMetadataById,
    sets,
  } = await loadHistoryDetailRows({
    supabase,
    sessionId: session.id,
    userId,
    sessionFound: true,
  });

  const setsByExercise = new Map<string, SetRow[]>();
  for (const set of sets) {
    const current = setsByExercise.get(set.session_exercise_id) ?? [];
    current.push(set);
    setsByExercise.set(set.session_exercise_id, current);
  }

  const sessionRow = session as SessionRow & {
    routines?: Array<{ name: string; weight_unit: "lbs" | "kg" | null }> | { name: string; weight_unit: "lbs" | "kg" | null } | null;
  };

  const { data: routineDay } = sessionRow.routine_id && sessionRow.routine_day_index
    ? await supabase
      .from("routine_days")
      .select("name")
      .eq("routine_id", sessionRow.routine_id)
      .eq("day_index", sessionRow.routine_day_index)
      .eq("user_id", userId)
      .maybeSingle()
      : { data: null };

  const exerciseIds = orderedSessionExercises.map((exercise) => exercise.exercise_id);
  const { data: exerciseRows } = exerciseIds.length
    ? await supabase
      .from("exercises")
      .select("id, name")
      .in("id", exerciseIds)
    : { data: [] };
  const exerciseNameMap = new Map(
    (exerciseRows ?? [])
      .flatMap((row) => (row?.id ? [[String(row.id), row.name?.trim() || "Exercise"] as const] : [])),
  );
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

  const { data: historicalSetRows } = exerciseIds.length
    ? await supabase
      .from("sets")
      .select("set_index, weight, reps, session_exercise:session_exercises!inner(session_id, exercise_id, session:sessions!inner(performed_at, status))")
      .eq("user_id", userId)
      .eq("session_exercise.user_id", userId)
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
    const nestedSession = Array.isArray(sessionExercise?.session)
      ? (sessionExercise?.session[0] ?? null)
      : (sessionExercise?.session ?? null);

    if (!sessionExercise?.exercise_id || !sessionExercise?.session_id || !nestedSession?.performed_at || nestedSession.status !== "completed") {
      return [];
    }

    return [{
      exerciseId: sessionExercise.exercise_id,
      sessionId: sessionExercise.session_id,
      performedAt: nestedSession.performed_at,
      setIndex: row.set_index,
      weight: row.weight,
      reps: row.reps,
    }];
  });

  const { sessionCountsById, sessionPrExerciseIdsById } = evaluatePrSummaries(prEvaluationSets);
  const sessionSummary = buildSessionSummary({
    sessionRow,
    routineTitle: routineName,
    dayTitle: effectiveDayName,
    sessionExercises: orderedSessionExercises.map((exercise) => ({
      id: exercise.id,
      session_id: exercise.session_id,
      exercise_id: exercise.exercise_id,
      notes: exercise.notes ?? null,
      copilot_feedback_note: exercise.copilot_feedback_note ?? null,
    })),
    setsBySessionExerciseId: new Map(Array.from(setsByExercise.entries())),
    exerciseNameById: exerciseNameMap,
    prCounts: sessionCountsById.get(sessionRow.id) ?? { ...EMPTY_PR_COUNTS },
    prExerciseNames: Array.from(sessionPrExerciseIdsById.get(sessionRow.id) ?? [])
      .map((exerciseId) => exerciseNameMap.get(exerciseId) ?? "")
      .filter(Boolean),
  });

  const clientExercises = toClientPlainObject(orderedSessionExercises.map((exercise) => {
    const exerciseId = String(exercise.exercise_id);
    const metadata = exerciseMetadataById.get(exerciseId);
    const resolvedExerciseName = resolveHistoryExerciseName({
      metadataName: metadata?.name,
      rowExerciseName: (exercise as { exercise_name?: string | null }).exercise_name,
      rowName: (exercise as { name?: string | null }).name,
      mapExerciseName: exerciseNameRecord[exerciseId] ?? null,
    });
    return {
      id: exercise.id,
      exercise_id: exerciseId,
      exercise_name: resolvedExerciseName,
      exercise_slug: metadata?.slug ?? null,
      exercise_image_path: metadata?.image_path ?? null,
      exercise_image_icon_path: metadata?.image_icon_path ?? null,
      exercise_image_howto_path: metadata?.image_howto_path ?? null,
      notes: exercise.notes,
      copilot_feedback_signal: exercise.copilot_feedback_signal ?? null,
      copilot_feedback_note: exercise.copilot_feedback_note ?? null,
      copilot_feedback_effort: exercise.copilot_feedback_effort ?? null,
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
    };
  }));

  const detailClient = (
    <HistoryLogPageClient
      logId={sessionRow.id}
      initialDayName={effectiveDayName}
      initialNotes={sessionRow.notes}
      unitLabel={unitLabel}
      exerciseNameMap={exerciseNameRecord}
      sessionSummary={toClientPlainObject(sessionSummary)}
      backHref={backHref}
      initialExpandedExerciseId={initialExpandedExerciseId}
      exercises={clientExercises}
    />
  );

  if (captureMode) {
    return (
      <MainTabScreen topNavMode="none" ambientPreset="history">
        <BottomActionsProvider>
          <ContentRail className="space-y-4 pt-5">
            <div id="history-log-floating-header" className="w-full" />
            {detailClient}
          </ContentRail>
        </BottomActionsProvider>
      </MainTabScreen>
    );
  }

  return (
    <HistoryRouteScaffold mode="detail" floatingHeader={<div id="history-log-floating-header" />}>
      {detailClient}
    </HistoryRouteScaffold>
  );
}
