import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionRow } from "@/types/db";

export const dynamic = "force-dynamic";

function formatDuration(durationSeconds: number | null): string {
  if (!durationSeconds || durationSeconds <= 0) {
    return "—";
  }

  const minutes = Math.round(durationSeconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export default async function HistoryPage() {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data } = await supabase
    .from("sessions")
    .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, duration_seconds, status")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .order("performed_at", { ascending: false })
    .limit(20);

  const sessions = (data ?? []) as SessionRow[];

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">History</h1>
      <ul className="space-y-3">
        {sessions.map((session) => (
          <li key={session.id}>
            <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-base font-semibold leading-tight text-slate-900">{session.name || "Session"}</p>
                  <p className="text-sm font-medium text-slate-600">
                    {session.routine_day_name || (session.routine_day_index ? `Day ${session.routine_day_index}` : "Day X")}
                  </p>
                  <p className="text-xs text-slate-500">{new Date(session.performed_at).toLocaleString()}</p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
                  {formatDuration(session.duration_seconds)}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <Link
                  href={`/session/${session.id}`}
                  className="inline-flex flex-1 items-center justify-center rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  View
                </Link>
                <Link
                  href={`/history/${session.id}/edit`}
                  className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
                >
                  Edit
                </Link>
              </div>
            </article>
          </li>
        ))}
        {sessions.length === 0 ? (
          <li className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500 shadow-sm">No sessions yet.</li>
        ) : null}
      </ul>
      <AppNav />
    </section>
  );
}
