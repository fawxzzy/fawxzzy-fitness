"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export type EmailUpdateState = {
  status: "idle" | "success" | "error";
  message?: string;
  updatedDisplayName?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[A-Za-z0-9._-]{2,24}$/;
const PROFILE_PREFERENCE_COLUMN_MISSING_MESSAGE =
  "Unit preferences require the latest profile migration. Run migrations and try again.";

function isMissingProfilePreferenceColumnError(error: { message?: string } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  const referencesPreferenceColumn =
    message.includes("preferred_weight_unit") || message.includes("preferred_distance_unit");
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

function toMetadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function updateAccountEmailAction(formData: FormData): Promise<EmailUpdateState> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const nextEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  const nextUsername = String(formData.get("username") ?? "").trim();
  const currentMetadata = toMetadataRecord(user.user_metadata);
  const currentUsername = typeof currentMetadata.username === "string"
    ? currentMetadata.username.trim()
    : typeof currentMetadata.display_name === "string"
      ? currentMetadata.display_name.trim()
      : "";

  if (!nextEmail || !EMAIL_REGEX.test(nextEmail)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  if (nextUsername && !USERNAME_REGEX.test(nextUsername)) {
    return {
      status: "error",
      message: "Username must be 2-24 characters and use letters, numbers, periods, underscores, or hyphens.",
    };
  }

  const emailChanged = (user.email ?? "").toLowerCase() !== nextEmail;
  const usernameChanged = currentUsername !== nextUsername;

  if (!emailChanged && !usernameChanged) {
    return { status: "success", message: "Account details are already up to date.", updatedDisplayName: nextUsername };
  }

  const nextMetadata = {
    ...currentMetadata,
    username: nextUsername || null,
    display_name: nextUsername || null,
  };

  const { error } = await supabase.auth.updateUser({
    email: emailChanged ? nextEmail : undefined,
    data: usernameChanged ? nextMetadata : undefined,
  });

  if (error) {
    return { status: "error", message: error.message || "Unable to update email right now." };
  }

  revalidatePath("/settings");
  return {
    status: "success",
    message: emailChanged
      ? "Account updated. Check your inbox to confirm the new email if required."
      : "Username updated.",
    updatedDisplayName: nextUsername,
  };
}

export async function updateUnitPreferencesAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = supabaseServer();

  const weightUnit = String(formData.get("weightUnit") ?? "");
  const distanceUnit = String(formData.get("distanceUnit") ?? "");

  if (weightUnit !== "lbs" && weightUnit !== "kg") {
    return { ok: false, error: "Weight unit must be lbs or kg." };
  }

  if (distanceUnit !== "mi" && distanceUnit !== "km") {
    return { ok: false, error: "Distance unit must be mi or km." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      preferred_weight_unit: weightUnit,
      preferred_distance_unit: distanceUnit,
    })
    .eq("id", user.id);

  if (error) {
    if (isMissingProfilePreferenceColumnError(error)) {
      return { ok: false, error: PROFILE_PREFERENCE_COLUMN_MISSING_MESSAGE };
    }
    return { ok: false, error: error.message || "Unable to save preferences." };
  }

  revalidatePath("/settings");
  return { ok: true };
}
