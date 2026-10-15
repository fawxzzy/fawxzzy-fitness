"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { setSessionCookies } from "@/lib/auth-session";
import { SUPABASE_URL } from "@/lib/env";
import { isSafeAppPath } from "@/lib/navigation-return";
import { hasSupabaseAdminCredential, resolveSupabaseAdminCredential, supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { isUsernameIdentifier, USERNAME_VALIDATION_MESSAGE } from "@/lib/username-policy";
import { resolveLoginIdentifierEmail, resolveUsernameEmailFromIndex } from "@/lib/username-signin-index";
import { requestResetForIdentifier } from "@/lib/password-reset-request";
import { isValidNewPassword, NEW_PASSWORD_REQUIREMENT } from "@/lib/password-policy";

function normalizeLoginIdentifier(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

function isEmailIdentifier(identifier: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
}

async function resolveIndexedUsername(username: string) {
  if (!hasSupabaseAdminCredential()) return null;
  return resolveUsernameEmailFromIndex({
    identifier: username,
    clientAddress: headers().get("x-forwarded-for")?.split(",", 1)[0]?.trim() || "unknown",
    supabaseUrl: SUPABASE_URL(),
    serviceCredential: resolveSupabaseAdminCredential(),
    onLookupFailure: (code) => console.error("Username identity lookup failed", { code }),
    getUserById: async (id) => {
      const { data, error } = await supabaseAdmin().auth.admin.getUserById(id);
      return error ? null : data.user;
    },
  });
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

function buildLoginRedirectHref(args: {
  error?: string | null;
  info?: string | null;
  returnTo?: string | null;
}) {
  const params = new URLSearchParams();
  if (args.error) {
    params.set("error", args.error);
  }
  if (args.info) {
    params.set("info", args.info);
  }
  if (isSafeAppPath(args.returnTo)) {
    params.set("returnTo", args.returnTo);
  }

  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export async function login(formData: FormData) {
  const identifier = normalizeLoginIdentifier(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const returnTo = isSafeAppPath(String(formData.get("returnTo") ?? "").trim())
    ? String(formData.get("returnTo") ?? "").trim()
    : null;
  const email = await resolveLoginIdentifierEmail(identifier, resolveIndexedUsername);

  if (!email) {
    redirect(buildLoginRedirectHref({
      error: "Invalid email, username, or password",
      returnTo,
    }));
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    redirect(buildLoginRedirectHref({
      error: error?.message ?? "Invalid email or password",
      returnTo,
    }));
  }

  setSessionCookies(cookies(), {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
  redirect(returnTo ?? "/entry");
}

export async function signup(formData: FormData) {
  const email = normalizeLoginIdentifier(formData.get("email"));
  const password = formData.get("password");

  if (!isValidNewPassword(password)) {
    redirect(`/signup?error=${encodeURIComponent(NEW_PASSWORD_REQUIREMENT)}`);
  }
  const username = String(formData.get("username") ?? "").trim();

  if (username && !isUsernameIdentifier(username)) {
    redirect(
      `/signup?error=${encodeURIComponent(
        USERNAME_VALIDATION_MESSAGE,
      )}`,
    );
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getAppOrigin()}/auth/confirm`,
      data: username
        ? {
          username,
          display_name: username,
        }
        : undefined,
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    setSessionCookies(cookies(), {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
    redirect("/entry");
  }

  redirect(`/signup?info=${encodeURIComponent("Check your email to confirm your account.")}`);
}

export async function requestPasswordReset(formData: FormData) {
  const identifier = normalizeLoginIdentifier(formData.get("email"));
  const usesEmailIdentifier = isEmailIdentifier(identifier);
  const usesUsernameIdentifier = isUsernameIdentifier(identifier);

  if (!usesEmailIdentifier && !usesUsernameIdentifier) {
    redirect(`/login?error=${encodeURIComponent("Enter your email or username to reset your password.")}`);
  }

  if (usesUsernameIdentifier && !hasSupabaseAdminCredential()) {
    redirect(`/login?error=${encodeURIComponent("Use your email to reset your password.")}`);
  }

  const supabase = supabaseServer();
  const redirectTo = `${getAppOrigin()}/reset-password?recovery=1`;
  const result = await requestResetForIdentifier({
    identifier,
    resolveUsername: resolveIndexedUsername,
    sendReset: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo }),
    onSendError: (code) => console.error("Password reset email request failed", { code }),
  });
  if (result !== "requested") redirect(`/login?error=${encodeURIComponent(result)}`);

  redirect(`/login?info=${encodeURIComponent("reset_requested")}`);
}

export async function requestPasswordResetInline(identifier: string) {
  const normalizedIdentifier = normalizeLoginIdentifier(identifier);
  const usesEmailIdentifier = isEmailIdentifier(normalizedIdentifier);
  const usesUsernameIdentifier = isUsernameIdentifier(normalizedIdentifier);

  if (!usesEmailIdentifier && !usesUsernameIdentifier) {
    return {
      ok: false,
      error: "Enter your email or username to reset your password.",
    };
  }

  if (usesUsernameIdentifier && !hasSupabaseAdminCredential()) {
    return {
      ok: false,
      error: "Use your email to reset your password.",
    };
  }

  const supabase = supabaseServer();
  const redirectTo = `${getAppOrigin()}/reset-password?recovery=1`;
  const result = await requestResetForIdentifier({
    identifier: normalizedIdentifier,
    resolveUsername: resolveIndexedUsername,
    sendReset: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo }),
    onSendError: (code) => console.error("Password reset email request failed", { code }),
  });
  if (result !== "requested") {
    return {
      ok: false,
      error: result === "rate_limited"
        ? "Too many reset requests. Please wait a few minutes and try again."
        : "Could not send reset email. Please try again in a few minutes.",
    };
  }

  return {
    ok: true,
  };
}
