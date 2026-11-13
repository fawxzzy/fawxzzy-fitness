"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setSessionCookies } from "@/lib/auth-session";
import { evaluateRecoverySessionToken } from "@/lib/recovery-session";
import { getRequestAccessToken } from "@/lib/supabase/server";
import { updateUserWithAccessToken, type UserUpdateFailureReason } from "@/lib/supabase/update-user";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { createFitnessSupabaseClient } from "@/lib/supabase/schema";

import { isValidNewPassword, NEW_PASSWORD_REQUIREMENT } from "@/lib/password-policy";

const RECOVERY_SESSION_ERROR = "Reset link expired. Request a new password reset.";

// Shown when the cookie session is a normal sign-in rather than a recovery link: no write happens.
const NOT_RECOVERY_SESSION_ERROR = "To change your password while signed in, use Account > Change password.";

const RESET_UPDATE_ERROR_COPY: Record<UserUpdateFailureReason, string> = {
  session_expired: RECOVERY_SESSION_ERROR,
  rate_limited: "Too many attempts. Please wait a few minutes and try again.",
  same_password: "Choose a new password that is different from your current one.",
  weak_password: "That password is too easy to guess. Choose a different one.",
  username_taken: "Could not update password. Please try again.",
  failed: "Could not update password. Please try again.",
};

export async function establishRecoverySession(input: { accessToken: string; refreshToken: string }) {
  const accessToken = input.accessToken.trim();
  const refreshToken = input.refreshToken.trim();

  if (!accessToken || !refreshToken) {
    return {
      ok: false as const,
      error: RECOVERY_SESSION_ERROR,
    };
  }

  const supabase = createFitnessSupabaseClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    console.error("Recovery session handoff failed", {
      message: error?.message,
      status: error?.status,
    });

    return {
      ok: false as const,
      error: RECOVERY_SESSION_ERROR,
    };
  }

  setSessionCookies(cookies(), {
    accessToken,
    refreshToken,
  });

  return { ok: true as const };
}

export async function updatePassword(newPassword: string) {
  if (!isValidNewPassword(newPassword)) {
    return { ok: false as const, error: NEW_PASSWORD_REQUIREMENT };
  }

  // One token for the whole step: it is checked for proof of a recovery session here and then used, unchanged, for the
  // write (the provider verifies its signature and session on that same request). This path never refreshes or
  // rotates anything: /reset-password is a public authless path, so middleware does not refresh the cookie either.
  const accessToken = getRequestAccessToken();
  const recovery = evaluateRecoverySessionToken(accessToken);
  if (!recovery.ok) {
    return {
      ok: false as const,
      error: recovery.reason === "not_recovery" ? NOT_RECOVERY_SESSION_ERROR : RECOVERY_SESSION_ERROR,
    };
  }

  // `auth.updateUser` fails on this request-bound client (no stored session), so the write goes through the access
  // token directly. The refresh token is never touched; fixed copy only, never the provider's text.
  const result = await updateUserWithAccessToken(
    { password: newPassword },
    { supabaseUrl: SUPABASE_URL(), anonKey: SUPABASE_ANON_KEY(), accessToken },
  );

  if (result.ok) {
    return { ok: true as const };
  }

  console.error("Password reset update failed", { code: result.code, status: result.status });
  return { ok: false as const, error: RESET_UPDATE_ERROR_COPY[result.reason] };
}

export async function updatePasswordAction(formData: FormData) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (!isValidNewPassword(password)) {
    redirect(`/reset-password?error=${encodeURIComponent(NEW_PASSWORD_REQUIREMENT)}`);
  }

  if (password !== confirmPassword) {
    redirect("/reset-password?error=Passwords%20must%20match");
  }

  const result = await updatePassword(password);

  if (!result.ok) {
    redirect(`/reset-password?error=${encodeURIComponent(result.error)}`);
  }

  redirect("/today");
}
