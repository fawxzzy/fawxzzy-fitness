import Link from "next/link";
import { revalidatePath } from "next/cache";
import { AppNav } from "@/components/AppNav";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { SessionRow } from "@/types/db";

export const dynamic = "force-dynamic";

async function deleteHistorySessionAction(formData: FormData) {
  "use server";

  const user = await requireUser();
  const supabase = supabaseServer();
  const sessionId = String(formData.get("sessionId") ?? "");

  if (!sessionId) {
    throw new Error("Missing session id");
  }

  const { error } = await supabase.from("sessions").delete().eq("id", sessionId).eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/history");
  revalidatePath("/today");
}

export default async function HistoryPage() {
  const user = await requireUser();
  const supabase = supabaseServer();

  const { data } = await supabase
    .from("sessions")
    .select("id, user_id, performed_at, notes, routine_id, routine_day_index, name, routine_day_name, duration_seconds")
    .eq("user_id", user.id)
    .order("performed_at", { ascending: false })
    .limit(20);

  const sessions = (data ?? []) as SessionRow[];

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">History</h1>
      <ul className="space-y-2">
        {sessions.map((session) => (
          <li key={session.id} className="rounded-md bg-white p-3 shadow-sm">
            <p className="font-semibold">{session.name || "Session"}</p>
            <p className="text-sm text-slate-600">{session.routine_day_name || (session.routine_day_index ? `Day ${session.routine_day_index}` : "Day X")}</p>
            <p className="text-xs text-slate-500">{new Date(session.performed_at).toLocaleString()}</p>
            <div className="mt-2 flex gap-3 text-sm">
              <Link href={`/session/${session.id}`} className="underline">Open</Link>
              <Link href={`/history/${session.id}/edit`} className="underline">Edit</Link>
              <form action={deleteHistorySessionAction}>
                <input type="hidden" name="sessionId" value={session.id} />
                <button type="submit" className="text-red-600 underline">Delete</button>
              </form>
            </div>
          </li>
        ))}
        {sessions.length === 0 ? <li className="rounded-md bg-white p-3 text-sm text-slate-500 shadow-sm">No sessions yet.</li> : null}
      </ul>
      <AppNav />
    </section>
  );
}
