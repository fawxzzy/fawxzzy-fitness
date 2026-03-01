import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { ConfirmedServerFormButton } from "@/components/destructive/ConfirmedServerFormButton";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { Glass } from "@/components/ui/Glass";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { recomputeExerciseStatsForExercises } from "@/lib/exercise-stats";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/datetime";
import { formatDurationClock } from "@/lib/duration";
import { revalidateHistoryViews } from "@/lib/revalidation";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionRow } from "@/types/db";

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

function formatSessionTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

async function deleteSessionAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    throw new Error("Missing session ID");
  }

  const { data: affectedExerciseRows, error: affectedExerciseError } = await supabase
    .from("session_exercises")
    .select("exercise_id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id);

  if (affectedExerciseError) {
    throw new Error(affectedExerciseError.message);
  }

  const affectedExerciseIds = Array.from(new Set((affectedExerciseRows ?? []).map((row) => row.exercise_id)));

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "completed");

  if (error) {
    throw new Error(error.message);
  }

  if (affectedExerciseIds.length > 0) {
    await recomputeExerciseStatsForExercises(user.id, affectedExerciseIds);
  }

  revalidateHistoryViews();
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams?: { cursor?: string };
}) {
  const user = await requireUser();
  const supabase = supabaseServer();
  const cursor = decodeCursor(searchParams?.cursor);

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

  return (
    <section className="space-y-4">
      <AppNav />

      <Glass variant="base" className="p-2" interactive={false}>
        <div className="sticky top-2 z-20 mb-3 flex justify-center rounded-xl bg-[rgb(var(--surface-rgb)/0.4)] px-2 py-1 backdrop-blur-sm">
          <SegmentedControl
            options={[
              { label: "Sessions", value: "sessions", href: "/history" },
              { label: "Exercises", value: "exercises", href: "/history/exercises" },
            ]}
            value="sessions"
          />
        </div>

        {sessions.length > 0 ? (
          <ul className={`${listShellClasses.viewport} ${listShellClasses.list}`}>
            {sessions.map((session) => {
              const resolvedDayName = session.day_name_override
                || (session.routine_id && session.routine_day_index ? routineDayNameByKey.get(`${session.routine_id}:${session.routine_day_index}`) : null)
                || session.routine_day_name
                || (session.routine_day_index ? `Day ${session.routine_day_index}` : "Day");
              const duration = session.duration_seconds ? formatDurationClock(session.duration_seconds) : "0:00";

              return (
                <li
                  key={session.id}
                  className={`${listShellClasses.card} relative overflow-hidden border-[rgb(var(--glass-tint-rgb)/0.14)] bg-[rgb(var(--glass-tint-rgb)/0.52)] p-0 shadow-[0_8px_22px_-18px_rgba(0,0,0,0.8)]`}
                >
                  <Link
                    href={`/history/${session.id}`}
                    aria-label={`Open log details for ${session.name || "session"}`}
                    className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
                  >
                    <span className="sr-only">Open log details</span>
                  </Link>

                  <div className="pointer-events-none relative z-10 p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="truncate text-sm font-semibold text-slate-100">{session.name || "Session"}</p>
                        <p className="truncate text-xs font-normal text-slate-300">{resolvedDayName || "Custom session"}</p>
                        <p className="text-xs text-slate-400">
                          <span className="font-medium text-slate-300">{duration}</span>
                          <span className="mx-1.5 text-slate-500">•</span>
                          <LocalDateTime value={session.performed_at} options={{ dateStyle: "medium" }} />
                          {formatSessionTime(session.performed_at) ? (
                            <>
                              <span className="mx-1 text-slate-500">·</span>
                              <span className="text-[11px] text-slate-500">{formatSessionTime(session.performed_at)}</span>
                            </>
                          ) : null}
                        </p>
                      </div>

                      <div className="flex items-center">
                        <div className="pointer-events-auto">
                          <ConfirmedServerFormButton
                            action={deleteSessionAction}
                            hiddenFields={{ sessionId: session.id }}
                            triggerLabel="⋯"
                            triggerAriaLabel="Delete session"
                            triggerClassName={`${listShellClasses.iconAction} h-8 w-8 shrink-0 !rounded-lg !border !border-white/10 !bg-black/15 !px-0 !py-0 !text-slate-300 hover:!border-white/20 hover:!text-white`}
                            modalTitle="Delete session?"
                            modalDescription="This will permanently delete this workout session and all logged sets."
                            confirmLabel="Delete"
                            contextLines={[
                              `${session.name || "Session"}`,
                              `${formatDateTime(session.performed_at)} • ${duration}`,
                            ]}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-sm font-medium text-slate-200">No completed sessions yet.</p>
            <p className="mt-1 text-xs text-slate-400">Finish a workout and your performance timeline will appear here.</p>
          </div>
        )}
      </Glass>

      {nextCursor ? (
        <div className="flex justify-center">
          <Link
            href={`/history?cursor=${encodeURIComponent(nextCursor)}`}
            className={getAppButtonClassName({ variant: "secondary", size: "md" })}
          >
            Load more
          </Link>
        </div>
      ) : null}
    </section>
  );
}
