"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { setSessionCookies } from "@/lib/auth-session";
import { optionalEnv } from "@/lib/env";
import { isSafeAppPath } from "@/lib/navigation-return";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

function normalizeLoginIdentifier(value: FormDataEntryValue | null) {
  return String(value ?? "").trim().toLowerCase();
}

function isEmailIdentifier(identifier: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
}

function isUsernameIdentifier(identifier: string) {
  return /^[a-z0-9][a-z0-9._-]{1,14}$/i.test(identifier);
}

async function resolveEmailForLogin(identifier: string) {
  if (isEmailIdentifier(identifier)) {
    return identifier;
  }

  if (!isUsernameIdentifier(identifier)) {
    return null;
  }

  if (!optionalEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    return null;
  }

  const admin = supabaseAdmin();
  let page = 1;
  let nextPage: number | null = 1;

  while (nextPage) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      return null;
    }

    const matchedUser = (data?.users ?? []).find((user) => {
      const metadata = user.user_metadata ?? {};
      const username = typeof metadata.username === "string" ? metadata.username.trim().toLowerCase() : "";
      const displayName = typeof metadata.display_name === "string" ? metadata.display_name.trim().toLowerCase() : "";
      return username === identifier || displayName === identifier;
    });

    const email = matchedUser?.email?.trim().toLowerCase();
    if (email) {
      return email;
    }

    nextPage = data?.nextPage ?? null;
    page = nextPage ?? 0;
  }

  return null;
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

function getResetPasswordErrorMessage(message: string | undefined) {
  const errorCode = getResetPasswordErrorCode(message);
  if (errorCode === "rate_limited") {
    return "Too many reset requests. Please wait a few minutes and try again.";
  }

  return "Could not send reset email. Please try again in a few minutes.";
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
  const email = await resolveEmailForLogin(identifier);

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
  const password = String(formData.get("password") ?? "");
  const username = String(formData.get("username") ?? "").trim();

  if (username && !isUsernameIdentifier(username)) {
    redirect(
      `/signup?error=${encodeURIComponent(
        "Username must be 2-15 characters and use letters, numbers, periods, underscores, or hyphens.",
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

  if (usesUsernameIdentifier && !optionalEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    redirect(`/login?error=${encodeURIComponent("Use your email to reset your password.")}`);
  }

  const email = await resolveEmailForLogin(identifier);

  if (!email) {
    redirect(`/login?info=${encodeURIComponent("reset_requested")}`);
  }

  const supabase = supabaseServer();
  const redirectTo = `${getAppOrigin()}/reset-password?recovery=1`;

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
    redirect(`/login?error=${encodeURIComponent(errorCode)}`);
  }

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

  if (usesUsernameIdentifier && !optionalEnv("SUPABASE_SERVICE_ROLE_KEY")) {
    return {
      ok: false,
      error: "Use your email to reset your password.",
    };
  }

  const email = await resolveEmailForLogin(normalizedIdentifier);

  if (!email) {
    return {
      ok: true,
    };
  }

  const supabase = supabaseServer();
  const redirectTo = `${getAppOrigin()}/reset-password?recovery=1`;
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

    return {
      ok: false,
      error: getResetPasswordErrorMessage(error.message),
    };
  }

  return {
    ok: true,
  };
}
