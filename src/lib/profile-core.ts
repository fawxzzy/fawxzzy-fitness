import type { ProfileRow } from "@/types/db";

const PROFILE_SELECT_WITH_PREFERENCES =
  "id, timezone, active_routine_id, preferred_weight_unit, preferred_distance_unit";
const PROFILE_SELECT_LEGACY = "id, timezone, active_routine_id";
const DEFAULT_WEIGHT_UNIT: NonNullable<ProfileRow["preferred_weight_unit"]> = "lbs";
const DEFAULT_DISTANCE_UNIT: NonNullable<ProfileRow["preferred_distance_unit"]> = "mi";

type LegacyProfileShape = Pick<ProfileRow, "id" | "timezone" | "active_routine_id"> &
  Partial<Pick<ProfileRow, "preferred_weight_unit" | "preferred_distance_unit">>;

type ProfileQueryError = { message?: string } | null | undefined;

type ProfileTableQuery = {
  select(columns: string): ProfileTableQuery;
  eq(column: string, value: string): ProfileTableQuery;
  maybeSingle(): Promise<{ data: unknown; error: ProfileQueryError }>;
  insert(payload: Record<string, unknown>): ProfileTableQuery;
  single(): Promise<{ data: unknown; error: ProfileQueryError }>;
};

export type ProfileSupabaseClient = {
  from(table: "profiles"): ProfileTableQuery;
};

function isMissingProfilePreferenceColumnError(error: ProfileQueryError) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    message.includes("schema cache") &&
    message.includes("profiles") &&
    (message.includes("preferred_weight_unit") || message.includes("preferred_distance_unit"))
  );
}

function hydrateProfile(profile: LegacyProfileShape): ProfileRow {
  return {
    id: profile.id,
    timezone: profile.timezone,
    active_routine_id: profile.active_routine_id ?? null,
    preferred_weight_unit:
      profile.preferred_weight_unit === "kg" || profile.preferred_weight_unit === "lbs"
        ? profile.preferred_weight_unit
        : DEFAULT_WEIGHT_UNIT,
    preferred_distance_unit:
      profile.preferred_distance_unit === "km" || profile.preferred_distance_unit === "mi"
        ? profile.preferred_distance_unit
        : DEFAULT_DISTANCE_UNIT,
  };
}

export async function ensureProfileWithClient(userId: string, supabase: ProfileSupabaseClient) {
  const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto";
  let hasPreferenceColumns = true;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_WITH_PREFERENCES)
    .eq("id", userId)
    .maybeSingle();

  if (error && !isMissingProfilePreferenceColumnError(error)) {
    throw new Error(error.message ?? "Unable to load profile");
  }

  if (error && isMissingProfilePreferenceColumnError(error)) {
    hasPreferenceColumns = false;
    const { data: legacyData, error: legacyError } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_LEGACY)
      .eq("id", userId)
      .maybeSingle();

    if (legacyError) {
      throw new Error(legacyError.message ?? "Unable to load profile");
    }

    if (legacyData) {
      return hydrateProfile(legacyData as LegacyProfileShape);
    }
  }

  if (data) {
    return hydrateProfile(data as LegacyProfileShape);
  }

  const insertPayload: {
    id: string;
    timezone: string;
    preferred_weight_unit?: NonNullable<ProfileRow["preferred_weight_unit"]>;
    preferred_distance_unit?: NonNullable<ProfileRow["preferred_distance_unit"]>;
  } = {
    id: userId,
    timezone: defaultTimeZone,
  };
  const insertSelect = hasPreferenceColumns ? PROFILE_SELECT_WITH_PREFERENCES : PROFILE_SELECT_LEGACY;

  if (hasPreferenceColumns) {
    insertPayload.preferred_weight_unit = DEFAULT_WEIGHT_UNIT;
    insertPayload.preferred_distance_unit = DEFAULT_DISTANCE_UNIT;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert(insertPayload)
    .select(insertSelect)
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "Unable to create profile");
  }

  return hydrateProfile(inserted as LegacyProfileShape);
}
