import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/db";

export async function ensureProfile(userId: string) {
  const supabase = supabaseServer();
  const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto";

  const { data } = await supabase
    .from("profiles")
    .select("id, timezone, active_routine_id, preferred_weight_unit, preferred_distance_unit")
    .eq("id", userId)
    .maybeSingle();

  if (data) {
    return data as ProfileRow;
  }

  const { data: inserted, error } = await supabase
    .from("profiles")
    .insert({ id: userId, timezone: defaultTimeZone, preferred_weight_unit: "lbs", preferred_distance_unit: "mi" })
    .select("id, timezone, active_routine_id, preferred_weight_unit, preferred_distance_unit")
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? "Unable to create profile");
  }

  return inserted as ProfileRow;
}
