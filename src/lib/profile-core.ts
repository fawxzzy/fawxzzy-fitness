import type { ProfileRow } from "@/types/db";

const PROFILE_SELECT_WITH_PREFERENCES =
  "id, timezone, active_routine_id, preferred_weight_unit, preferred_distance_unit, user_number, user_kind, user_number_assigned_at";
const PROFILE_SELECT_LEGACY = "id, timezone, active_routine_id";
const DEFAULT_WEIGHT_UNIT: NonNullable<ProfileRow["preferred_weight_unit"]> = "lbs";
const DEFAULT_DISTANCE_UNIT: NonNullable<ProfileRow["preferred_distance_unit"]> = "mi";
const DEFAULT_USER_KIND: ProfileRow["user_kind"] = "unknown";

type HydratableProfileShape = Pick<ProfileRow, "id" | "timezone" | "active_routine_id"> &
  Partial<
    Pick<
      ProfileRow,
      | "preferred_weight_unit"
      | "preferred_distance_unit"
      | "user_number"
      | "user_kind"
      | "user_number_assigned_at"
    >
  >;

type ProfileQueryError = { code?: string; details?: string; message?: string } | null | undefined;

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

const PROFILE_RECOVERABLE_ERROR_CODES = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "08P01",
  "40001",
  "40P01",
  "53300",
  "53400",
  "57014",
  "57P01",
  "57P02",
  "57P03",
  "58000",
  "PGRST000",
  "PGRST001",
  "PGRST002",
  "PGRST003",
]);
const PROFILE_BOOTSTRAP_ATTEMPT_LIMIT = 3;

type ReadProfileResult = {
  hasExtendedColumns: boolean | null;
  profile: ProfileRow | null;
  error: ProfileQueryError;
};

type InsertProfileResult = {
  hasExtendedColumns: boolean;
  profile: ProfileRow | null;
  error: ProfileQueryError;
};

type EntryBootstrapLogger = (message: string, details: Record<string, unknown>) => void;

function isMissingProfilePreferenceColumnError(error: ProfileQueryError) {
  const message = error?.message?.toLowerCase() ?? "";
  const referencesExtendedColumn = [
    "preferred_weight_unit",
    "preferred_distance_unit",
    "user_number",
    "user_kind",
    "user_number_assigned_at",
  ].some((column) => message.includes(column));
  const referencesProfilesTable = message.includes("profiles");
  const schemaCacheMissingColumn = message.includes("schema cache");
  const postgresMissingColumn =
    message.includes("column") && message.includes("does not exist") && referencesProfilesTable;

  return (
    referencesExtendedColumn &&
    referencesProfilesTable &&
    (schemaCacheMissingColumn || postgresMissingColumn)
  );
}

function hydrateProfile(profile: HydratableProfileShape): ProfileRow {
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
    user_number: typeof profile.user_number === "number" ? profile.user_number : null,
    user_kind:
      profile.user_kind === "human"
      || profile.user_kind === "automation"
      || profile.user_kind === "unknown"
        ? profile.user_kind
        : DEFAULT_USER_KIND,
    user_number_assigned_at:
      typeof profile.user_number_assigned_at === "string" ? profile.user_number_assigned_at : null,
  };
}

async function readProfile(userId: string, supabase: ProfileSupabaseClient) {
  let hasExtendedColumns = true;
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_WITH_PREFERENCES)
    .eq("id", userId)
    .maybeSingle();

  if (error && !isMissingProfilePreferenceColumnError(error)) {
    return {
      hasExtendedColumns: null,
      profile: null,
      error,
    } satisfies ReadProfileResult;
  }

  if (error && isMissingProfilePreferenceColumnError(error)) {
    hasExtendedColumns = false;
    const { data: legacyData, error: legacyError } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_LEGACY)
      .eq("id", userId)
      .maybeSingle();

    if (legacyError) {
      return {
        hasExtendedColumns,
        profile: null,
        error: legacyError,
      } satisfies ReadProfileResult;
    }

    if (legacyData) {
      return {
        hasExtendedColumns,
        profile: hydrateProfile(legacyData as HydratableProfileShape),
        error: null,
      };
    }
  }

  if (data) {
    return {
      hasExtendedColumns,
      profile: hydrateProfile(data as HydratableProfileShape),
      error: null,
    };
  }

  return {
    hasExtendedColumns,
    profile: null,
    error: null,
  };
}

function isProfileAlreadyExistsError(error: ProfileQueryError) {
  const message = error?.message?.toLowerCase() ?? "";
  const details = error?.details?.toLowerCase() ?? "";

  return (
    error?.code === "23505"
    || message.includes("duplicate key")
    || message.includes("already exists")
    || details.includes("already exists")
  );
}

function isRecoverableProfileError(error: ProfileQueryError) {
  if (!error) {
    return false;
  }

  if (isMissingProfilePreferenceColumnError(error) || isProfileAlreadyExistsError(error)) {
    return false;
  }

  if (typeof error.code === "string" && PROFILE_RECOVERABLE_ERROR_CODES.has(error.code)) {
    return true;
  }

  const message = error.message?.toLowerCase() ?? "";
  const details = error.details?.toLowerCase() ?? "";
  const combined = `${message} ${details}`;

  return (
    combined.includes("fetch failed")
    || combined.includes("network")
    || combined.includes("timed out")
    || combined.includes("timeout")
    || combined.includes("connection")
    || combined.includes("temporar")
    || combined.includes("try again")
  );
}

function toProfileError(error: ProfileQueryError, fallbackMessage: string) {
  return new Error(error?.message ?? fallbackMessage);
}

function getEntryBootstrapErrorDetails(error: unknown) {
  if (error instanceof Error) {
    const details: Record<string, unknown> = {
      errorMessage: error.message,
      errorName: error.name,
    };

    const maybeError = error as Error & { code?: string; details?: string };
    if (typeof maybeError.code === "string") {
      details.errorCode = maybeError.code;
    }
    if (typeof maybeError.details === "string") {
      details.errorDetails = maybeError.details;
    }
    if (process.env.NODE_ENV !== "production" && typeof error.stack === "string") {
      details.errorStack = error.stack;
    }

    return details;
  }

  return {
    errorMessage: typeof error === "string" ? error : "Unknown profile bootstrap failure",
  };
}

async function insertProfile(
  userId: string,
  supabase: ProfileSupabaseClient,
  hasExtendedColumnsHint: boolean | null,
): Promise<InsertProfileResult> {
  const defaultTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Toronto";

  async function attemptInsert(hasExtendedColumns: boolean): Promise<InsertProfileResult> {
    const insertPayload: {
      id: string;
      timezone: string;
      preferred_weight_unit?: NonNullable<ProfileRow["preferred_weight_unit"]>;
      preferred_distance_unit?: NonNullable<ProfileRow["preferred_distance_unit"]>;
    } = {
      id: userId,
      timezone: defaultTimeZone,
    };

    if (hasExtendedColumns) {
      insertPayload.preferred_weight_unit = DEFAULT_WEIGHT_UNIT;
      insertPayload.preferred_distance_unit = DEFAULT_DISTANCE_UNIT;
    }

    const insertSelect = hasExtendedColumns ? PROFILE_SELECT_WITH_PREFERENCES : PROFILE_SELECT_LEGACY;
    const { data: inserted, error } = await supabase
      .from("profiles")
      .insert(insertPayload)
      .select(insertSelect)
      .single();

    if (error || !inserted) {
      return {
        hasExtendedColumns,
        profile: null,
        error: error ?? { message: "Unable to create profile" },
      };
    }

    return {
      hasExtendedColumns,
      profile: hydrateProfile(inserted as HydratableProfileShape),
      error: null,
    };
  }

  if (hasExtendedColumnsHint === false) {
    return attemptInsert(false);
  }

  const preferredInsert = await attemptInsert(true);
  if (preferredInsert.error && isMissingProfilePreferenceColumnError(preferredInsert.error)) {
    return attemptInsert(false);
  }

  return preferredInsert;
}

export async function ensureProfileWithClient(userId: string, supabase: ProfileSupabaseClient) {
  let lastRecoverableError: ProfileQueryError = null;

  for (let attempt = 0; attempt < PROFILE_BOOTSTRAP_ATTEMPT_LIMIT; attempt += 1) {
    const existingProfile = await readProfile(userId, supabase);

    if (existingProfile.profile) {
      return existingProfile.profile;
    }

    if (existingProfile.error && !isRecoverableProfileError(existingProfile.error)) {
      throw toProfileError(existingProfile.error, "Unable to load profile");
    }

    const insertedProfile = await insertProfile(userId, supabase, existingProfile.hasExtendedColumns);
    if (insertedProfile.profile) {
      return insertedProfile.profile;
    }

    if (insertedProfile.error && isProfileAlreadyExistsError(insertedProfile.error)) {
      const conflictedProfile = await readProfile(userId, supabase);

      if (conflictedProfile.profile) {
        return conflictedProfile.profile;
      }

      if (conflictedProfile.error && !isRecoverableProfileError(conflictedProfile.error)) {
        throw toProfileError(conflictedProfile.error, "Unable to load profile");
      }

      lastRecoverableError = conflictedProfile.error ?? insertedProfile.error ?? existingProfile.error;
      continue;
    }

    if (insertedProfile.error && !isRecoverableProfileError(insertedProfile.error)) {
      throw toProfileError(insertedProfile.error, "Unable to create profile");
    }

    const recoveredProfile = await readProfile(userId, supabase);
    if (recoveredProfile.profile) {
      return recoveredProfile.profile;
    }

    if (recoveredProfile.error && !isRecoverableProfileError(recoveredProfile.error)) {
      throw toProfileError(recoveredProfile.error, "Unable to load profile");
    }

    lastRecoverableError = recoveredProfile.error ?? insertedProfile.error ?? existingProfile.error;
  }

  throw toProfileError(lastRecoverableError, "Unable to create profile");
}

export async function ensureProfileForEntryBootstrap(
  userId: string,
  options: {
    ensureProfileImpl: (userId: string) => Promise<ProfileRow>;
    logError?: EntryBootstrapLogger;
  },
) {
  const logError = options.logError ?? console.error;

  try {
    return {
      ok: true as const,
      profile: await options.ensureProfileImpl(userId),
    };
  } catch (error) {
    logError("[entry] profile bootstrap failed; continuing with authenticated fallback", {
      route: "/entry",
      stage: "ensureProfile",
      ...getEntryBootstrapErrorDetails(error),
    });

    return {
      ok: false as const,
      profile: null,
    };
  }
}
