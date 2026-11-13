import type { FitnessSupabaseClient } from "@/lib/supabase/schema";
import { resolveHistoryTimeZone } from "@/lib/timezones";

type ProfileZoneSource = {
  timezone?: string | null;
  active_routine_id?: string | null;
};

type LookupError = { code?: string | null } | null | undefined;

/** Logs a failed lookup by source and error code only (never the message, ids or row data) before falling back. */
function warnLookupFailed(source: "profiles" | "routines" | "exception", error: LookupError | unknown) {
  const code = typeof (error as { code?: unknown } | null)?.code === "string"
    ? (error as { code: string }).code
    : (error instanceof Error ? error.name : null);
  console.warn("[history-time-zone] lookup failed, falling back", { source, code });
}

/**
 * Loads the zone History buckets a user's days with: the active routine's device-derived zone, then the profile
 * zone, then the default (`resolveHistoryTimeZone`). For server surfaces that need to bucket sessions or
 * progression events by local day but do not already hold a routine row. Pass `profile` when it is already
 * loaded to skip that query. A failed query is logged (source and error code only) and the next source in the
 * chain is used: the fallback is never silent, and this function never rejects.
 */
export async function loadHistoryTimeZone(args: {
  supabase: FitnessSupabaseClient;
  userId: string;
  profile?: ProfileZoneSource | null;
}): Promise<string> {
  try {
    let profile: ProfileZoneSource | null = args.profile ?? null;
    if (!args.profile) {
      const { data, error } = await args.supabase
        .from("profiles")
        .select("timezone, active_routine_id")
        .eq("id", args.userId)
        .maybeSingle();
      if (error) {
        warnLookupFailed("profiles", error);
      }
      profile = (data as ProfileZoneSource | null) ?? null;
    }

    const activeRoutineId = typeof profile?.active_routine_id === "string" && profile.active_routine_id.trim().length > 0
      ? profile.active_routine_id.trim()
      : null;

    let activeRoutineTimeZone: string | null = null;
    if (activeRoutineId) {
      const { data: routine, error } = await args.supabase
        .from("routines")
        .select("timezone")
        .eq("id", activeRoutineId)
        .eq("user_id", args.userId)
        .maybeSingle();
      if (error) {
        warnLookupFailed("routines", error);
      }
      activeRoutineTimeZone = typeof routine?.timezone === "string" ? routine.timezone : null;
    }

    return resolveHistoryTimeZone({
      activeRoutineTimeZone,
      profileTimeZone: typeof profile?.timezone === "string" ? profile.timezone : null,
    });
  } catch (error) {
    warnLookupFailed("exception", error);
    return resolveHistoryTimeZone({});
  }
}
