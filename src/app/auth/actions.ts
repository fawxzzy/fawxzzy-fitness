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
      emailRedirectTo: `${getOrigin()}/auth/confirm`,
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

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getOrigin()}/auth/confirm`,
  });

  redirect(
    `/forgot-password?info=${encodeURIComponent(
      "If that email is registered, a reset link has been sent. Check your inbox.",
    )}`,
  );
}
