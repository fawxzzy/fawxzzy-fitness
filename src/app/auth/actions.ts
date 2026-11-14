"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { setSessionCookies } from "@/lib/auth-session";
import { SUPABASE_URL } from "@/lib/env";
import { isSafeAppPath } from "@/lib/navigation-return";
import { hasSupabaseAdminCredential, resolveSupabaseAdminCredential, supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { isUsernameIdentifier } from "@/lib/username-policy";
import {
  getLoginResolutionFailureMessage,
  getLoginSignInFailureMessage,
  resolveLoginIdentifierEmail,
  resolveUsernameEmailFromIndex,
  type UsernameLookupFailureCode,
} from "@/lib/username-signin-index";
import { enforceLoginFailureFloor } from "@/lib/login-failure-floor";
import { buildFitnessRecoveryRedirectUrl, requestResetForIdentifier } from "@/lib/password-reset-request";
import { isValidNewPassword } from "@/lib/password-policy";
import { buildSignupRedirectHref, classifySignupProviderError } from "@/components/auth/signupFeedback";

function normalizeLoginIdentifier(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

function isEmailIdentifier(identifier: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
}

async function resolveIndexedUsername(username: string, onLookupFailure?: (code: UsernameLookupFailureCode) => void) {
  if (!hasSupabaseAdminCredential()) {
    onLookupFailure?.("resolver_unavailable");
    return null;
  }
  return resolveUsernameEmailFromIndex({
    identifier: username,
    clientAddress: headers().get("x-forwarded-for")?.split(",", 1)[0]?.trim() || "unknown",
    supabaseUrl: SUPABASE_URL(),
    serviceCredential: resolveSupabaseAdminCredential(),
    onLookupFailure: (code) => {
      console.error("Username identity lookup failed", { code });
      onLookupFailure?.(code);
    },
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
  const startedAt = Date.now();
  const identifier = normalizeLoginIdentifier(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const returnTo = isSafeAppPath(String(formData.get("returnTo") ?? "").trim())
    ? String(formData.get("returnTo") ?? "").trim()
    : null;
  let lookupFailure: UsernameLookupFailureCode | null = null;
  const email = await resolveLoginIdentifierEmail(identifier, (username) =>
    resolveIndexedUsername(username, (code) => {
      lookupFailure = code;
    }));

  if (!email) {
    await enforceLoginFailureFloor(startedAt);
    redirect(buildLoginRedirectHref({
      error: getLoginResolutionFailureMessage({ identifier, lookupFailure }),
      returnTo,
    }));
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    if (error?.code !== "invalid_credentials") {
      console.error("Password sign-in failed", { code: error?.code ?? null, status: error?.status ?? null });
    }
    await enforceLoginFailureFloor(startedAt);
    // Never forward the provider's raw message: for a username it would confirm that the account exists.
    redirect(buildLoginRedirectHref({
      error: getLoginSignInFailureMessage({ identifier, error }),
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

  // Failures redirect with an allow-listed code, never free text: the provider's message is not forwarded (an
  // "already registered" message would confirm that an address has an account) and /signup renders fixed copy per
  // code.
  if (!isValidNewPassword(password)) {
    redirect(buildSignupRedirectHref({ error: "password_too_short" }));
  }
  const username = String(formData.get("username") ?? "").trim();

  if (username && !isUsernameIdentifier(username)) {
    redirect(buildSignupRedirectHref({ error: "username_invalid" }));
  }

  if (!isEmailIdentifier(email)) {
    redirect(buildSignupRedirectHref({ error: "email_invalid" }));
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
    // Log the provider's machine code and status only (no message, no address) for diagnosis.
    console.error("Sign-up failed", { code: error.code ?? null, status: error.status ?? null });
    redirect(buildSignupRedirectHref({ error: classifySignupProviderError(error) }));
  }

  if (data.session) {
    setSessionCookies(cookies(), {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
    redirect("/entry");
  }

  redirect(buildSignupRedirectHref({ info: "check_email" }));
}

export async function requestPasswordReset(formData: FormData) {
  const identifier = normalizeLoginIdentifier(formData.get("email"));
  const usesEmailIdentifier = isEmailIdentifier(identifier);
  const usesUsernameIdentifier = isUsernameIdentifier(identifier);

  if (!usesEmailIdentifier && !usesUsernameIdentifier) {
    redirect(buildLoginRedirectHref({ error: "identifier_required" }));
  }

  if (usesUsernameIdentifier && !hasSupabaseAdminCredential()) {
    redirect(buildLoginRedirectHref({ error: "email_required" }));
  }

  const supabase = supabaseServer();
  const redirectTo = buildFitnessRecoveryRedirectUrl(getAppOrigin());
  const result = await requestResetForIdentifier({
    identifier,
    resolveUsername: resolveIndexedUsername,
    sendReset: (email) => supabase.auth.resetPasswordForEmail(email, { redirectTo }),
    onSendError: (code) => console.error("Password reset email request failed", { code }),
  });
  if (result !== "requested") redirect(buildLoginRedirectHref({ error: result }));

  redirect(buildLoginRedirectHref({ info: "reset_requested" }));
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
  const redirectTo = buildFitnessRecoveryRedirectUrl(getAppOrigin());
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
