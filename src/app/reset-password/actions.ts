"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServerWithSession } from "@/lib/supabase/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

const RECOVERY_SESSION_ERROR = "Reset link expired. Request a new password reset.";

function setSessionCookies(session: { access_token: string; refresh_token: string }) {
  const cookieStore = cookies();
  cookieStore.set("sb-access-token", session.access_token, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  cookieStore.set("sb-refresh-token", session.refresh_token, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function establishRecoverySession(input: { accessToken: string; refreshToken: string }) {
  const accessToken = input.accessToken.trim();
  const refreshToken = input.refreshToken.trim();

  if (!accessToken || !refreshToken) {
    return {
      ok: false as const,
      error: RECOVERY_SESSION_ERROR,
    };
  }

  const supabase = createClient(SUPABASE_URL(), SUPABASE_ANON_KEY(), {
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

  setSessionCookies({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return { ok: true as const };
}

export async function updatePassword(newPassword: string) {
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
  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  if (password.length < 6) {
    redirect("/reset-password?error=Password%20must%20be%20at%20least%206%20characters");
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
