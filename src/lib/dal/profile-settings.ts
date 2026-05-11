type ProfileSettingsError = {
  message?: string;
};

export type ProfileSettingsClient = {
  from(table: "profiles"): {
    update(values: Record<string, unknown>): {
      eq(column: "id", value: string): Promise<{ error: ProfileSettingsError | null }>;
    };
  };
};

export const PROFILE_PREFERENCE_COLUMN_MISSING_MESSAGE =
  "Unit preferences require the latest profile migration. Run migrations and try again.";
export const PROFILE_QA_VISIBILITY_COLUMN_MISSING_MESSAGE =
  "QA visibility settings require the latest profile migration. Run migrations and try again.";

export type ProfileSettingsMutationResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
      reason: "missing-column" | "unknown";
    };

export function isMissingProfileSettingsColumnError(error: ProfileSettingsError | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  const referencesPreferenceColumn =
    message.includes("preferred_weight_unit") || message.includes("preferred_distance_unit") || message.includes("show_qa_llel_data");
  const referencesProfilesTable = message.includes("profiles");
  const schemaCacheMissingColumn = message.includes("schema cache");
  const postgresMissingColumn =
    message.includes("column") && message.includes("does not exist") && referencesProfilesTable;

  return (
    referencesPreferenceColumn &&
    referencesProfilesTable &&
    (schemaCacheMissingColumn || postgresMissingColumn)
  );
}

export async function updateProfileUnitPreferences(args: {
  distanceUnit: "km" | "mi";
  supabase: ProfileSettingsClient;
  userId: string;
  weightUnit: "kg" | "lbs";
}): Promise<ProfileSettingsMutationResult> {
  const { error } = await args.supabase
    .from("profiles")
    .update({
      preferred_weight_unit: args.weightUnit,
      preferred_distance_unit: args.distanceUnit,
    })
    .eq("id", args.userId);

  if (!error) {
    return { ok: true };
  }

  if (isMissingProfileSettingsColumnError(error)) {
    return {
      ok: false,
      error: PROFILE_PREFERENCE_COLUMN_MISSING_MESSAGE,
      reason: "missing-column",
    };
  }

  return {
    ok: false,
    error: error.message || "Unable to save preferences.",
    reason: "unknown",
  };
}

export async function updateProfileQaLlelVisibility(args: {
  showQaLlelData: boolean;
  supabase: ProfileSettingsClient;
  userId: string;
}): Promise<ProfileSettingsMutationResult> {
  const { error } = await args.supabase
    .from("profiles")
    .update({
      show_qa_llel_data: args.showQaLlelData,
    })
    .eq("id", args.userId);

  if (!error) {
    return { ok: true };
  }

  if (isMissingProfileSettingsColumnError(error)) {
    return {
      ok: false,
      error: PROFILE_QA_VISIBILITY_COLUMN_MISSING_MESSAGE,
      reason: "missing-column",
    };
  }

  return {
    ok: false,
    error: error.message || "Unable to save QA visibility.",
    reason: "unknown",
  };
}
