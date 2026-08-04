import type { PostgrestError } from "@supabase/supabase-js";
import type { supabaseServer } from "@/lib/supabase/server";

// Kept in a module with no @/lib/auth (or other Next.js request-scoped)
// imports so these two functions can be unit-tested directly, without
// pulling in next/headers via requireUser's import chain.
type ServerSupabase = ReturnType<typeof supabaseServer>;

// Duplicate-session detection is the ONLY defense against creating two
// concurrent in-progress sessions for the same user+routine today -- there
// is no DB-level unique constraint on sessions(user_id, routine_id,
// status='in_progress'). A failed existence check must therefore never be
// treated as "no session exists": doing so would let the caller proceed to
// create a brand-new session on every transient DB error during this check,
// silently producing duplicate in-progress sessions.
export async function findExistingInProgressSession(args: {
  supabase: ServerSupabase;
  userId: string;
  routineId: string;
}): Promise<{ session: { id: string } | null; error: PostgrestError | null }> {
  const { data, error } = await args.supabase
    .from("sessions")
    .select("id")
    .eq("user_id", args.userId)
    .eq("routine_id", args.routineId)
    .eq("status", "in_progress")
    .order("performed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { session: error ? null : (data ?? null), error };
}

// Rolls back a session row created immediately before its exercise rows
// failed to insert. Reports whether the rollback itself succeeded so the
// caller can tell an ordinary failure (nothing was left behind) apart from a
// worse one (an empty in-progress session may still exist, which would then
// be returned by findExistingInProgressSession on every future start
// attempt for this user+routine until it's cleaned up out-of-band).
export async function rollbackFailedSessionStart(args: {
  supabase: ServerSupabase;
  sessionId: string;
  userId: string;
}): Promise<{ rollbackSucceeded: boolean }> {
  const { error } = await args.supabase
    .from("sessions")
    .delete()
    .eq("id", args.sessionId)
    .eq("user_id", args.userId);

  return { rollbackSucceeded: !error };
}
