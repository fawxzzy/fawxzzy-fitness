import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionRow } from "@/types/db";

export const dynamic = "force-dynamic";

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
      <h1 className="text-2xl font-semibold">History</h1>
      <ul className="space-y-2">
        {sessions.map((session) => (
          <li key={session.id}>
            <Link href={`/session/${session.id}`} className="block rounded-md bg-white p-3 shadow-sm">
              <p className="font-semibold">{session.name || "Session"}</p>
              <p className="text-sm text-slate-600">{session.routine_day_name || (session.routine_day_index ? `Day ${session.routine_day_index}` : "Day X")}</p>
              <p className="text-xs text-slate-500">{new Date(session.performed_at).toLocaleString()}</p>
            </Link>
          </li>
        ))}
        {sessions.length === 0 ? <li className="rounded-md bg-white p-3 text-sm text-slate-500 shadow-sm">No sessions yet.</li> : null}
      </ul>
      <AppNav />
    </section>
  );
}
