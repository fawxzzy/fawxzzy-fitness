"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { QA_LLEL_VISIBILITY_COOKIE } from "@/lib/qa-data-visibility";
import { getRequestAccessToken, supabaseServer } from "@/lib/supabase/server";
import { updateUserWithAccessToken, type UserUpdateFailureReason } from "@/lib/supabase/update-user";
import { isUsernameIdentifier, USERNAME_VALIDATION_MESSAGE } from "@/lib/username-policy";

export type EmailUpdateState = {
  status: "idle" | "success" | "error";
  message?: string;
  updatedDisplayName?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROFILE_PREFERENCE_COLUMN_MISSING_MESSAGE =
  "Unit preferences require the latest profile migration. Run migrations and try again.";
// Fixed copy for a failed account-details update. The provider's message is never shown: for an email change it would
// say whether another account already uses that address.
const ACCOUNT_UPDATE_ERROR_COPY: Partial<Record<UserUpdateFailureReason, string>> = {
  session_expired: "Your session ended. Sign in again, then try once more.",
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
  username_taken: "That username is taken. Pick another one.",
};
const ACCOUNT_UPDATE_FAILED_COPY = "We could not update your account details. Check them and try again.";
const PROFILE_QA_VISIBILITY_COLUMN_MISSING_MESSAGE =
  "QA visibility settings require the latest profile migration. Run migrations and try again.";

function isMissingProfileSettingsColumnError(error: { message?: string } | null | undefined) {
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

function toMetadataRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function updateAccountEmailAction(formData: FormData): Promise<EmailUpdateState> {
  const user = await requireUser();
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

  if (nextUsername && !isUsernameIdentifier(nextUsername)) {
    return {
      status: "error",
      message: USERNAME_VALIDATION_MESSAGE,
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

  // `auth.updateUser` fails on the request-bound server client (no stored session), so the write goes through the
  // access token directly; the refresh token is never touched.
  const result = await updateUserWithAccessToken(
    {
      email: emailChanged ? nextEmail : undefined,
      data: usernameChanged ? nextMetadata : undefined,
    },
    { supabaseUrl: SUPABASE_URL(), anonKey: SUPABASE_ANON_KEY(), accessToken: getRequestAccessToken() },
  );

  if (!result.ok) {
    // Machine code and status only: no message, no address.
    console.error("Account update failed", { code: result.code, status: result.status });
    return { status: "error", message: ACCOUNT_UPDATE_ERROR_COPY[result.reason] ?? ACCOUNT_UPDATE_FAILED_COPY };
  }

  revalidatePath("/settings");
  revalidatePath("/account");
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
    if (isMissingProfileSettingsColumnError(error)) {
      return { ok: false, error: PROFILE_PREFERENCE_COLUMN_MISSING_MESSAGE };
    }
    return { ok: false, error: error.message || "Unable to save preferences." };
  }

  revalidatePath("/settings");
  return { ok: true };
}

export async function updateQaLlelVisibilityAction(formData: FormData): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  const supabase = supabaseServer();
  const showQaLlelData = String(formData.get("showQaLlelData") ?? "") === "1";
  const cookieStore = cookies();

  const { error } = await supabase
    .from("profiles")
    .update({
      show_qa_llel_data: showQaLlelData,
    })
    .eq("id", user.id);

  if (error) {
    if (isMissingProfileSettingsColumnError(error)) {
      if (process.env.NODE_ENV !== "production") {
        cookieStore.set(QA_LLEL_VISIBILITY_COOKIE, showQaLlelData ? "1" : "0", {
          path: "/",
          sameSite: "lax",
        });
        revalidatePath("/settings");
        revalidatePath("/routines");
        revalidatePath("/history");
        return { ok: true };
      }
      return { ok: false, error: PROFILE_QA_VISIBILITY_COLUMN_MISSING_MESSAGE };
    }
    return { ok: false, error: error.message || "Unable to save QA visibility." };
  }

  cookieStore.set(QA_LLEL_VISIBILITY_COOKIE, showQaLlelData ? "1" : "0", {
    path: "/",
    sameSite: "lax",
  });
  revalidatePath("/settings");
  revalidatePath("/routines");
  revalidatePath("/history");
  return { ok: true };
}
