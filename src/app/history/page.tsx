import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { DestructiveButton } from "@/components/ui/AppButton";
import { Glass } from "@/components/ui/Glass";
import { listShellClasses } from "@/components/ui/listShellClasses";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { revalidateHistoryViews } from "@/lib/revalidation";
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

async function deleteSessionAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    throw new Error("Missing session ID");
  }

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "completed");

  if (error) {
    throw new Error(error.message);
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

      {sessions.length > 0 ? (
        <Glass variant="base" className="p-2" interactive={false}>
          <ul className={`${listShellClasses.viewport} ${listShellClasses.list}`}>
            {sessions.map((session, index) => {
              const resolvedDayName = session.day_name_override
                || (session.routine_id && session.routine_day_index ? routineDayNameByKey.get(`${session.routine_id}:${session.routine_day_index}`) : null)
                || session.routine_day_name
                || (session.routine_day_index ? `Day ${session.routine_day_index}` : "Day");

              return (
              <li key={session.id} className={`${listShellClasses.card} relative overflow-hidden border-[rgb(var(--glass-tint-rgb)/0.2)] bg-[rgb(var(--glass-tint-rgb)/0.58)] p-0`}>
                <Link
                  href={`/history/${session.id}`}
                  aria-label={`View session log ${sessions.length - index} details`}
                  className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--button-focus-ring)]"
                >
                  <span className="sr-only">View session details</span>
                </Link>

                <div className="relative z-10 pointer-events-none p-4">
                  <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                    <span className="rounded-md border border-slate-300/65 bg-slate-100/80 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {(session.name || "Session")} Log #{sessions.length - index}: {resolvedDayName}
                    </span>

                    <form action={deleteSessionAction} className="pointer-events-auto">
                      <input type="hidden" name="sessionId" value={session.id} />
                      <DestructiveButton
                        type="submit"
                        size="sm"
                        aria-label="Delete session"
                        className={`${listShellClasses.iconAction} h-8 w-8 shrink-0 border border-rose-300/45 !bg-transparent !px-0 !py-0 !text-rose-500 hover:!bg-rose-50/50`}
                      >
                        🗑
                      </DestructiveButton>
                    </form>
                  </div>

                  <p className="mt-3 text-xs text-slate-500"><LocalDateTime value={session.performed_at} /></p>

                  <p className="mt-2 text-sm text-slate-400">Tap anywhere to open details</p>
                </div>
              </li>
              );
            })}
          </ul>
        </Glass>
      ) : (
        <p className="px-1 text-sm text-muted">No sessions yet.</p>
      )}

      {nextCursor ? (
        <div className="flex justify-center">
          <Link
            href={`/history?cursor=${encodeURIComponent(nextCursor)}`}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Load more
          </Link>
        </div>
      ) : null}
    </section>
  );
}
