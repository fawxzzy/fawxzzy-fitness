import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { getAppButtonClassName } from "@/components/ui/appButtonClasses";
import { Glass } from "@/components/ui/Glass";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionRow } from "@/types/db";
import { HistorySessionsClient } from "./HistorySessionsClient";

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

  const sessionItems = sessions.map((session) => ({
    id: session.id,
    name: session.name || "Session",
    dayLabel: session.day_name_override
      || (session.routine_id && session.routine_day_index ? routineDayNameByKey.get(`${session.routine_id}:${session.routine_day_index}`) : null)
      || session.routine_day_name
      || (session.routine_day_index ? `Day ${session.routine_day_index}` : "Day")
      || "Custom session",
    durationSeconds: session.duration_seconds ?? 0,
    performedAt: session.performed_at,
  }));

  return (
    <section className="flex h-[100dvh] min-h-[100dvh] flex-col space-y-4">
      <AppNav />

      <Glass variant="base" className="flex min-h-0 flex-1 flex-col p-2" interactive={false}>
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
          <HistorySessionsClient sessions={sessionItems} />
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-6 text-center">
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
