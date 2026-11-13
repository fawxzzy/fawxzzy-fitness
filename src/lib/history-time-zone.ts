import type { FitnessSupabaseClient } from "@/lib/supabase/schema";
import { resolveHistoryTimeZone } from "@/lib/timezones";

type ProfileZoneSource = {
  timezone?: string | null;
  active_routine_id?: string | null;
};

/**
 * Loads the zone History buckets a user's days with: the active routine's device-derived zone, then the profile
 * zone, then the default (`resolveHistoryTimeZone`). For server surfaces that need to bucket sessions or
 * progression events by local day but do not already hold a routine row. Pass `profile` when it is already
 * loaded to skip that query.
 */
export async function loadHistoryTimeZone(args: {
  supabase: FitnessSupabaseClient;
  userId: string;
  profile?: ProfileZoneSource | null;
}): Promise<string> {
  const profile: ProfileZoneSource | null = args.profile
    ?? ((await args.supabase
      .from("profiles")
      .select("timezone, active_routine_id")
      .eq("id", args.userId)
      .maybeSingle()).data as ProfileZoneSource | null);

  const activeRoutineId = typeof profile?.active_routine_id === "string" && profile.active_routine_id.trim().length > 0
    ? profile.active_routine_id.trim()
    : null;

  let activeRoutineTimeZone: string | null = null;
  if (activeRoutineId) {
    const { data: routine } = await args.supabase
      .from("routines")
      .select("timezone")
      .eq("id", activeRoutineId)
      .eq("user_id", args.userId)
      .maybeSingle();
    activeRoutineTimeZone = typeof routine?.timezone === "string" ? routine.timezone : null;
  }

  return resolveHistoryTimeZone({
    activeRoutineTimeZone,
    profileTimeZone: typeof profile?.timezone === "string" ? profile.timezone : null,
  });
}
