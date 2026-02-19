import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/db";

export async function ensureProfile(userId: string) {
  const supabase = supabaseServer();

  const { data } = await supabase
    .from("profiles")
    .select("id, timezone, active_routine_id")
    .eq("id", userId)
    .maybeSingle();

  if (data) {
    return data as ProfileRow;
  }

  const { data: inserted, error } = await supabase
    .from("profiles")
    .insert({ id: userId })
    .select("id, timezone, active_routine_id")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Unable to create profile");
  }

  return inserted as ProfileRow;
}
