"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { setSessionCookies } from "@/lib/auth-session";
import { supabaseServerWithSession } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { createFitnessSupabaseClient } from "@/lib/supabase/schema";

import { isValidNewPassword, NEW_PASSWORD_REQUIREMENT } from "@/lib/password-policy";

const RECOVERY_SESSION_ERROR = "Reset link expired. Request a new password reset.";

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

  const supabase = await supabaseServerWithSession();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return {
      ok: false as const,
      error: RECOVERY_SESSION_ERROR,
    };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (!error) {
    return { ok: true as const };
  }

  const message = error.message.toLowerCase();
  if (message.includes("auth session missing") || message.includes("jwt") || message.includes("session")) {
    return {
      ok: false as const,
      error: RECOVERY_SESSION_ERROR,
    };
  }

  return { ok: false as const, error: "Could not update password. Please try again." };
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
