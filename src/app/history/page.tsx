import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { MainTabScreen } from "@/components/ui/app/MainTabScreen";
import { AppPanel } from "@/components/ui/app/AppPanel";
import { ScrollContainer } from "@/components/ui/app/ScrollContainer";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionExerciseRow, SessionRow, SetRow } from "@/types/db";
import { HistorySessionsClient } from "./HistorySessionsClient";
import { buildSessionSummary, type SessionSummary } from "./session-summary";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

type HistoryCursor = {
  performedAt: string;
  id: string;
};

function encodeCursor(cursor: HistoryCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(value?: string): HistoryCursor | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<HistoryCursor>;
    if (!parsed.performedAt || !parsed.id) return null;
    return { performedAt: parsed.performedAt, id: parsed.id };
  } catch {
    return null;
  }
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: { cursor?: string; view?: string; tab?: string };
}) {
  const user = await requireUser();
  const supabase = supabaseServer();
  const cursor = decodeCursor(searchParams?.cursor);
  const viewMode = searchParams?.view === "compact" ? "compact" : "list";

  let query = supabase
    .from("sessions")
    .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, day_name_override, duration_seconds, status")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("performed_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) {
    query = query.or(
      `performed_at.lt.${cursor.performedAt},and(performed_at.eq.${cursor.performedAt},id.lt.${cursor.id})`,
    );
  }

  const { data } = await query;

  const fetchedSessions = (data ?? []) as SessionRow[];
  const hasMore = fetchedSessions.length > PAGE_SIZE;
  const sessions = hasMore ? fetchedSessions.slice(0, PAGE_SIZE) : fetchedSessions;
  const lastSession = sessions[sessions.length - 1];
  const nextCursor =
    hasMore && lastSession?.performed_at
      ? encodeCursor({ performedAt: lastSession.performed_at, id: lastSession.id })
      : null;

  const routineIds = Array.from(new Set(sessions.map((session) => session.routine_id).filter((routineId): routineId is string => Boolean(routineId))));
  const sessionIds = sessions.map((session) => session.id);

  const { data: routines } = routineIds.length
    ? await supabase
      .from("routines")
      .select("id, name")
      .in("id", routineIds)
      .eq("user_id", user.id)
    : { data: [] };

  const routineNameById = new Map<string, string>();
  for (const routine of routines ?? []) {
    routineNameById.set(routine.id, routine.name ?? "");
  }

  const { data: routineDays } = routineIds.length
    ? await supabase
      .from("routine_days")
      .select("routine_id, day_index, name")
      .in("routine_id", routineIds)
      .eq("user_id", user.id)
    : { data: [] };

  const routineDayNameByKey = new Map<string, string>();
  for (const day of routineDays ?? []) {
    routineDayNameByKey.set(`${day.routine_id}:${day.day_index}`, day.name ?? "");
  }

  const { data: sessionExercisesData } = sessionIds.length
    ? await supabase
      .from("session_exercises")
      .select("id, session_id, exercise_id")
      .in("session_id", sessionIds)
      .eq("user_id", user.id)
    : { data: [] };

  const sessionExercises = (sessionExercisesData ?? []) as Pick<SessionExerciseRow, "id" | "session_id" | "exercise_id">[];
  const exerciseIds = Array.from(new Set(sessionExercises.map((row) => row.exercise_id)));
  const sessionExerciseIds = sessionExercises.map((row) => row.id);

  const { data: setsData } = sessionExerciseIds.length
    ? await supabase
      .from("sets")
      .select("session_exercise_id, weight, reps, weight_unit")
      .in("session_exercise_id", sessionExerciseIds)
      .eq("user_id", user.id)
    : { data: [] };

  const sets = (setsData ?? []) as Pick<SetRow, "session_exercise_id" | "weight" | "reps" | "weight_unit">[];

  const { data: exerciseNamesData } = exerciseIds.length
    ? await supabase
      .from("exercises")
      .select("id, name")
      .in("id", exerciseIds)
    : { data: [] };

  const exerciseNameById = new Map<string, string>();
  for (const exercise of exerciseNamesData ?? []) {
    exerciseNameById.set(exercise.id, exercise.name ?? "Exercise");
  }

  const { data: exerciseStatsData } = exerciseIds.length
    ? await supabase
      .from("exercise_stats_cache")
      .select("exercise_id, actual_pr_at")
      .eq("user_id", user.id)
      .in("exercise_id", exerciseIds)
    : { data: [] };

  const actualPrAtByExerciseId = new Map<string, string>();
  for (const stat of exerciseStatsData ?? []) {
    if (stat.actual_pr_at) actualPrAtByExerciseId.set(stat.exercise_id, stat.actual_pr_at);
  }

  const exercisesBySessionId = new Map<string, Pick<SessionExerciseRow, "id" | "session_id" | "exercise_id">[]>();
  for (const row of sessionExercises) {
    const current = exercisesBySessionId.get(row.session_id) ?? [];
    current.push(row);
    exercisesBySessionId.set(row.session_id, current);
  }

  const setsBySessionExerciseId = new Map<string, Pick<SetRow, "session_exercise_id" | "weight" | "reps" | "weight_unit">[]>();
  for (const set of sets) {
    const current = setsBySessionExerciseId.get(set.session_exercise_id) ?? [];
    current.push(set);
    setsBySessionExerciseId.set(set.session_exercise_id, current);
  }

  const sessionSummaryById = new Map<string, SessionSummary>();
  for (const session of sessions) {
    const dayTitle = session.day_name_override
      || (session.routine_id && session.routine_day_index ? routineDayNameByKey.get(`${session.routine_id}:${session.routine_day_index}`) : null)
      || session.routine_day_name
      || (session.routine_day_index ? `Day ${session.routine_day_index}` : null);
    const routineTitle = (session.routine_id ? routineNameById.get(session.routine_id) : null) ?? session.name;
    const exercisesForSession = exercisesBySessionId.get(session.id) ?? [];
    const prExerciseIds = new Set<string>();

    for (const exercise of exercisesForSession) {
      const actualPrAt = actualPrAtByExerciseId.get(exercise.exercise_id);
      if (actualPrAt && actualPrAt === session.performed_at) {
        prExerciseIds.add(exercise.exercise_id);
      }
    }

    sessionSummaryById.set(session.id, buildSessionSummary({
      sessionRow: session,
      routineTitle,
      dayTitle,
      sessionExercises: exercisesForSession,
      setsBySessionExerciseId,
      exerciseNameById,
      prExerciseIds,
    }));
  }

  const sessionItems = sessions.map((session) => sessionSummaryById.get(session.id)).filter((item): item is SessionSummary => Boolean(item));

  return (
    <MainTabScreen>
      <AppNav />

      <ScrollContainer className="px-1">
        <AppPanel className="flex min-h-0 flex-1 flex-col gap-3 p-3">
          <HistorySessionsClient sessions={sessionItems} initialViewMode={viewMode} />

          {nextCursor ? (
            <div className="flex justify-center">
              <Link
                href={`/history?tab=sessions&view=${viewMode}&cursor=${encodeURIComponent(nextCursor)}`}
                className={getAppButtonClassName({ variant: "secondary", size: "md" })}
              >
                Load more
              </Link>
            </div>
          ) : null}
        </AppPanel>
      </ScrollContainer>
    </MainTabScreen>
  );
}
