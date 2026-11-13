"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import {
  CHANGE_PASSWORD_COPY,
  CHANGE_PASSWORD_SUCCESS_MESSAGE,
  classifyChangePasswordProviderError,
  validateChangePasswordInput,
  type ChangePasswordProblem,
} from "@/lib/password-policy";
import { QA_LLEL_VISIBILITY_COOKIE } from "@/lib/qa-data-visibility";
import { supabaseServer, supabaseServerWithSession } from "@/lib/supabase/server";
import { createFitnessSupabaseClient } from "@/lib/supabase/schema";
import { isUsernameIdentifier, USERNAME_VALIDATION_MESSAGE } from "@/lib/username-policy";

export type EmailUpdateState = {
  status: "idle" | "success" | "error";
  message?: string;
  updatedDisplayName?: string;
};

export type PasswordUpdateState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PROFILE_PREFERENCE_COLUMN_MISSING_MESSAGE =
  "Unit preferences require the latest profile migration. Run migrations and try again.";
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
  const supabase = await supabaseServerWithSession();
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

  const { error } = await supabase.auth.updateUser({
    email: emailChanged ? nextEmail : undefined,
    data: usernameChanged ? nextMetadata : undefined,
  });

  if (error) {
    return { status: "error", message: error.message || "Unable to update email right now." };
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

function passwordUpdateFailure(problem: ChangePasswordProblem): PasswordUpdateState {
  return { status: "error", message: CHANGE_PASSWORD_COPY[problem] };
}

/**
 * Change the signed-in member's password (FF-ACCOUNT-003).
 *
 * The current password is verified first by signing in on a throwaway client, so a borrowed or stolen session alone
 * cannot change the password. That fresh session then performs the update: `auth.updateUser` needs a session held by
 * the client (the request-bound client only forwards a bearer header, so `updateUser` on it fails with "Auth session
 * missing"), and a fresh sign-in also satisfies the provider's optional "secure password change" recency rule without
 * any provider setting. The throwaway session is revoked (`scope: "local"`, so the member's own session and their
 * other devices are untouched).
 */
export async function changePasswordAction(formData: FormData): Promise<PasswordUpdateState> {
  const user = await requireUser();
  const input = validateChangePasswordInput({
    current: formData.get("currentPassword"),
    next: formData.get("newPassword"),
    confirmation: formData.get("confirmPassword"),
  });
  if (!input.ok) {
    return passwordUpdateFailure(input.problem);
  }

  const email = user.email?.trim();
  if (!email) {
    return passwordUpdateFailure("update_failed");
  }

  const { auth } = createFitnessSupabaseClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const verified = await auth.signInWithPassword({ email, password: input.current });
    if (verified.error || !verified.data.session) {
      // Machine code and status only: no message, no address.
      console.error("Change-password verification failed", { code: verified.error?.code ?? null, status: verified.error?.status ?? null });
      return passwordUpdateFailure(classifyChangePasswordProviderError("verify", verified.error));
    }

    const updated = await auth.updateUser({ password: input.next });
    if (updated.error) {
      console.error("Change-password update failed", { code: updated.error.code ?? null, status: updated.error.status ?? null });
      return passwordUpdateFailure(classifyChangePasswordProviderError("update", updated.error));
    }

    return { status: "success", message: CHANGE_PASSWORD_SUCCESS_MESSAGE };
  } catch (error) {
    console.error("Change-password request failed", { name: error instanceof Error ? error.name : null });
    return passwordUpdateFailure("update_failed");
  } finally {
    // Revoke only the throwaway verification session; failures here never change the outcome.
    await auth.signOut({ scope: "local" }).catch(() => undefined);
  }
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
