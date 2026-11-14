"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setSessionCookies } from "@/lib/auth-session";
import { evaluateRecoverySessionToken } from "@/lib/recovery-session";
import { getRequestAccessToken } from "@/lib/supabase/server";
import { updateUserWithAccessToken, type UserUpdateFailureReason } from "@/lib/supabase/update-user";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { createFitnessSupabaseClient } from "@/lib/supabase/schema";

import { isValidNewPassword } from "@/lib/password-policy";
import {
  buildResetPasswordErrorHref,
  RESET_PASSWORD_ERROR_COPY,
  type ResetPasswordErrorCode,
} from "@/lib/auth-route-feedback";

const RECOVERY_SESSION_ERROR = RESET_PASSWORD_ERROR_COPY.session_expired;

const RESET_UPDATE_ERROR_CODE: Record<UserUpdateFailureReason, ResetPasswordErrorCode> = {
  session_expired: "session_expired",
  rate_limited: "rate_limited",
  same_password: "same_password",
  weak_password: "weak_password",
  username_taken: "failed",
  failed: "failed",
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
    return { ok: false as const, error: RESET_PASSWORD_ERROR_COPY.password_requirement, code: "password_requirement" as const };
  }

  // One token for the whole step: it is checked for proof of a recovery session here and then used, unchanged, for the
  // write (the provider verifies its signature and session on that same request). This path never refreshes or
  // rotates anything: /reset-password is a public authless path, so middleware does not refresh the cookie either.
  const accessToken = getRequestAccessToken();
  const recovery = evaluateRecoverySessionToken(accessToken);
  if (!recovery.ok) {
    const code: ResetPasswordErrorCode = recovery.reason === "not_recovery" ? "not_recovery_session" : "session_expired";
    return { ok: false as const, error: RESET_PASSWORD_ERROR_COPY[code], code };
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
  const code = RESET_UPDATE_ERROR_CODE[result.reason];
  return { ok: false as const, error: RESET_PASSWORD_ERROR_COPY[code], code };
}

export async function updatePasswordAction(formData: FormData) {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (!isValidNewPassword(password)) {
    redirect(buildResetPasswordErrorHref("password_requirement"));
  }

  if (password !== confirmPassword) {
    redirect(buildResetPasswordErrorHref("passwords_must_match"));
  }

  const result = await updatePassword(password);

  if (!result.ok) {
    redirect(buildResetPasswordErrorHref(result.code));
  }

  redirect("/today");
}
