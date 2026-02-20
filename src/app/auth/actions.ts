"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

function normalizeEmail(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

function getOrigin() {
  const requestHeaders = headers();
  const origin = requestHeaders.get("origin");
  if (origin) {
    return origin;
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";

  if (!host) {
    return "http://localhost:3000";
  }

  return `${protocol}://${host}`;
}

function getAppOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;

  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, "");
  }

  return getOrigin();
}

function getResetPasswordErrorCode(message: string | undefined) {
  const normalizedMessage = (message ?? "").toLowerCase();

  if (normalizedMessage.includes("rate limit")) {
    return "rate_limited";
  }

  return "send_failed";
}

function setSessionCookies(session: { access_token: string; refresh_token: string }) {
  const cookieStore = cookies();
  cookieStore.set("sb-access-token", session.access_token, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });
  cookieStore.set("sb-refresh-token", session.refresh_token, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });
}

export async function login(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? "Invalid email or password")}`);
  }

  setSessionCookies(data.session);
  redirect("/today");
}

export async function signup(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppOrigin()}/auth/confirm`,
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    setSessionCookies(data.session);
    redirect("/today");
  }

  redirect(`/signup?info=${encodeURIComponent("Check your email to confirm your account.")}`);
}

export async function requestPasswordReset(formData: FormData) {
  const email = normalizeEmail(formData.get("email"));
  const supabase = supabaseServer();
  const redirectTo = `${getAppOrigin()}/auth/confirm?next=${encodeURIComponent("/reset-password")}`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error("Password reset email request failed", {
      email,
      redirectTo,
      message: error.message,
      status: error.status,
      name: error.name,
    });

    const errorCode = getResetPasswordErrorCode(error.message);
    redirect(`/forgot-password?error=${encodeURIComponent(errorCode)}`);
  }

  redirect(`/forgot-password?info=${encodeURIComponent("reset_requested")}`);
}
