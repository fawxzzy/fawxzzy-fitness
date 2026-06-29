export const ACCESS_COOKIE_NAME = "sb-access-token";
export const REFRESH_COOKIE_NAME = "sb-refresh-token";
export const SESSION_EXPIRED_LOGIN_ERROR = "session_expired";
export const SESSION_RECOVERY_ROUTE = "/auth/session-recovery";
export const PERSISTENT_SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 400;

import { isSafeAppPath } from "@/lib/navigation-return";

const PUBLIC_AUTHLESS_PATH_PREFIXES = [
  "/auth",
  "/dev",
  "/forgot-password",
  "/install",
  "/login",
  "/reset-password",
  "/signup",
];
const PUBLIC_AUTHLESS_PATHS = new Set([
  "/api/app-version",
  "/api/discord/interactions",
  "/api/discord/message-commands/poll",
]);

type SessionCookieOptions = {
  expires?: Date;
  httpOnly: boolean;
  maxAge?: number;
  path: string;
  sameSite: "lax";
  secure: boolean;
};

type SessionCookieWriter = {
  set(name: string, value: string, options: SessionCookieOptions): unknown;
};

export type SessionCookiePayload = {
  accessToken: string;
  refreshToken: string;
};

export type AuthSessionFailure =
  | {
      loginErrorCode: typeof SESSION_EXPIRED_LOGIN_ERROR;
      reason:
        | "auth-session-missing"
        | "auth-token-missing-sub"
        | "jwt-expired"
        | "jwt-invalid"
        | "refresh-token-expired"
        | "refresh-token-invalid";
    }
  | null;

export type SessionCookieLifetime = Pick<SessionCookieOptions, "expires" | "maxAge">;

function buildBaseCookieOptions(): Omit<SessionCookieOptions, "expires" | "maxAge"> {
  return {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
}

export function decodeJwtExp(token: string): number | null {
  const tokenParts = token.split(".");
  if (tokenParts.length < 2) {
    return null;
  }

  const base64Url = tokenParts[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;

  try {
    const payloadText = atob(padded);
    const payload = JSON.parse(payloadText) as { exp?: unknown };
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function buildCookieLifetimeFromMaxAge(maxAgeSeconds: number): SessionCookieLifetime {
  return {
    maxAge: maxAgeSeconds,
    expires: new Date(Date.now() + (maxAgeSeconds * 1000)),
  };
}

export function buildPersistentSessionCookieLifetime() {
  return buildCookieLifetimeFromMaxAge(PERSISTENT_SESSION_COOKIE_MAX_AGE_SECONDS);
}

export function buildAccessTokenCookieLifetime(accessToken: string): SessionCookieLifetime | null {
  const exp = decodeJwtExp(accessToken);
  if (!exp) {
    return null;
  }

  const expiresAtMs = exp * 1000;
  const maxAgeSeconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));

  return {
    expires: new Date(expiresAtMs),
    maxAge: maxAgeSeconds,
  };
}

function normalizeCookieValue(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function matchesPathPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  if (typeof error === "string") {
    return error;
  }

  return "";
}

function getErrorStatus(error: unknown) {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status?: unknown }).status;
    return typeof status === "number" ? status : null;
  }

  return null;
}

export function shouldRefreshAuthSession(pathname: string) {
  if (pathname === "/") {
    return true;
  }

  if (PUBLIC_AUTHLESS_PATHS.has(pathname)) {
    return false;
  }

  return !PUBLIC_AUTHLESS_PATH_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix));
}

export function setSessionCookies(writer: SessionCookieWriter, session: SessionCookiePayload) {
  const accessCookieLifetime = buildAccessTokenCookieLifetime(session.accessToken);
  writer.set(ACCESS_COOKIE_NAME, session.accessToken, {
    ...buildBaseCookieOptions(),
    ...(accessCookieLifetime ?? {}),
  });
  writer.set(REFRESH_COOKIE_NAME, session.refreshToken, {
    ...buildBaseCookieOptions(),
    ...buildPersistentSessionCookieLifetime(),
  });
}

export function clearSessionCookies(writer: SessionCookieWriter) {
  writer.set(ACCESS_COOKIE_NAME, "", {
    ...buildBaseCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
  writer.set(REFRESH_COOKIE_NAME, "", {
    ...buildBaseCookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
}

export function hasSessionCookieValues(args: {
  accessToken?: string | null;
  refreshToken?: string | null;
}) {
  return Boolean(normalizeCookieValue(args.accessToken) || normalizeCookieValue(args.refreshToken));
}

export function buildSessionRecoveryPath(
  loginErrorCode = SESSION_EXPIRED_LOGIN_ERROR,
  returnTo?: string | null,
) {
  const params = new URLSearchParams();
  params.set("error", loginErrorCode);
  if (isSafeAppPath(returnTo)) {
    params.set("returnTo", returnTo);
  }

  return `${SESSION_RECOVERY_ROUTE}?${params.toString()}`;
}

export function serializeRequestCookiesWithSession(
  existingCookies: Array<{ name: string; value: string }>,
  session: SessionCookiePayload,
) {
  const nextCookies = new Map<string, string>();

  for (const cookie of existingCookies) {
    nextCookies.set(cookie.name, cookie.value);
  }

  nextCookies.set(ACCESS_COOKIE_NAME, session.accessToken);
  nextCookies.set(REFRESH_COOKIE_NAME, session.refreshToken);

  return Array.from(nextCookies.entries())
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
}

export function classifyAuthSessionFailure(error: unknown): AuthSessionFailure {
  const message = getErrorMessage(error).toLowerCase();
  const status = getErrorStatus(error);
  const isAuthStatus = status === 400 || status === 401 || status === 403;

  if (!message && !isAuthStatus) {
    return null;
  }

  if (message.includes("auth session missing")) {
    return {
      reason: "auth-session-missing",
      loginErrorCode: SESSION_EXPIRED_LOGIN_ERROR,
    };
  }

  if (message.includes("missing sub claim")) {
    return {
      reason: "auth-token-missing-sub",
      loginErrorCode: SESSION_EXPIRED_LOGIN_ERROR,
    };
  }

  if (message.includes("jwt expired")) {
    return {
      reason: "jwt-expired",
      loginErrorCode: SESSION_EXPIRED_LOGIN_ERROR,
    };
  }

  if (
    message.includes("invalid jwt")
    || message.includes("jwt malformed")
    || message.includes("jwt invalid")
  ) {
    return {
      reason: "jwt-invalid",
      loginErrorCode: SESSION_EXPIRED_LOGIN_ERROR,
    };
  }

  if (
    message.includes("refresh token")
    && (
      message.includes("expired")
      || message.includes("revoked")
    )
  ) {
    return {
      reason: "refresh-token-expired",
      loginErrorCode: SESSION_EXPIRED_LOGIN_ERROR,
    };
  }

  if (
    message.includes("refresh token is not valid")
    || message.includes("refresh token not valid")
    || message.includes("refresh token invalid")
    || message.includes("invalid refresh token")
    || (
      message.includes("refresh token")
      && (
        message.includes("invalid")
        || message.includes("not found")
        || message.includes("already used")
      )
    )
  ) {
    return {
      reason: "refresh-token-invalid",
      loginErrorCode: SESSION_EXPIRED_LOGIN_ERROR,
    };
  }

  if (isAuthStatus && message.includes("session")) {
    return {
      reason: "auth-session-missing",
      loginErrorCode: SESSION_EXPIRED_LOGIN_ERROR,
    };
  }

  return null;
}
