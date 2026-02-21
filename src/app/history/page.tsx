import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionRow } from "@/types/db";

export const dynamic = "force-dynamic";

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
      <h1 className="text-2xl font-semibold text-white">History</h1>

      <ul className="space-y-3">
        {sessions.map((session) => (
          <li key={session.id} className="rounded-xl border border-slate-300 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-base font-semibold text-white">{session.name || "Session"}</p>
                <p className="text-sm text-slate-600">
                  {session.routine_day_name || (session.routine_day_index ? `Day ${session.routine_day_index}` : "Day")}
                </p>
                <p className="text-xs text-slate-500">{new Date(session.performed_at).toLocaleString()}</p>
              </div>
              <span className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600">
                {formatDuration(session.duration_seconds)}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href={`/session/${session.id}`}
                className="inline-flex items-center justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
              >
                View
              </Link>
              <Link
                href={`/history/${session.id}/edit`}
                className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Edit
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {sessions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No sessions yet.</p>
      ) : null}

      <AppNav />
    </section>
  );
}
