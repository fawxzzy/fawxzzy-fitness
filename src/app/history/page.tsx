import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { Glass } from "@/components/ui/Glass";
import { requireUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/datetime";
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
      <AppNav />

      <Glass variant="base" className="p-2" interactive={false}>
        <ul className="h-[68vh] space-y-3 overflow-y-auto overscroll-contain pr-1 scroll-py-2 snap-y snap-mandatory md:h-auto md:max-h-[72vh]">
          {sessions.map((session, index) => (
            <li key={session.id} className="snap-start rounded-xl border border-[rgb(var(--glass-tint-rgb)/var(--glass-current-border-alpha))] bg-[rgb(var(--glass-tint-rgb)/0.72)] p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {(session.name || "Session")} Log #{sessions.length - index}: {session.routine_day_name || (session.routine_day_index ? `Day ${session.routine_day_index}` : "Day")}
                </span>
                <span className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600">
                  {formatDuration(session.duration_seconds)}
                </span>
              </div>

              <p className="text-xs text-slate-500">{formatDateTime(session.performed_at)}</p>

              <div className="mt-3">
                <Link
                  href={`/session/${session.id}`}
                  className="inline-flex w-full items-center justify-center rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
                >
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Glass>

      {sessions.length === 0 ? (
        <Glass variant="base" className="border-dashed p-4 text-sm text-slate-500" interactive={false}>No sessions yet.</Glass>
      ) : null}
    </section>
  );
}
