import {
  buildSessionRecoveryPath,
  classifyAuthSessionFailure,
  hasSessionCookieValues,
  type SessionCookiePayload,
} from "@/lib/auth-session";
import { isTrustedLocalDevHost } from "@/lib/supabase/local-dev-host";

export type ServerSessionTokenSource = "cookie" | "trusted-local-dev-header" | null;

export type ServerSessionTokenSnapshot = {
  accessToken: string | null;
  refreshToken: string | null;
  accessTokenSource: ServerSessionTokenSource;
  refreshTokenSource: ServerSessionTokenSource;
  canTrustLocalDevHeaders: boolean;
  hasSessionCookies: boolean;
  hostname: string;
};

type ResolveServerSessionTokensArgs = {
  cookieAccessToken?: string | null;
  cookieRefreshToken?: string | null;
  headerAccessToken?: string | null;
  headerRefreshToken?: string | null;
  hostHeader?: string | null;
};

type ResolveRequireUserRedirectPathArgs = {
  error?: unknown;
  loginPath?: string;
  session: Pick<ServerSessionTokenSnapshot, "hasSessionCookies"> | SessionCookiePayload;
};

function normalizeHostHeader(hostHeader: string | null | undefined) {
  return (hostHeader ?? "").trim().toLowerCase().split(":")[0] ?? "";
}

function normalizeSessionToken(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized ? normalized : null;
}

export function resolveServerSessionTokens(args: ResolveServerSessionTokensArgs): ServerSessionTokenSnapshot {
  const hostname = normalizeHostHeader(args.hostHeader);
  const cookieAccessToken = normalizeSessionToken(args.cookieAccessToken);
  const cookieRefreshToken = normalizeSessionToken(args.cookieRefreshToken);
  const headerAccessToken = normalizeSessionToken(args.headerAccessToken);
  const headerRefreshToken = normalizeSessionToken(args.headerRefreshToken);
  const canTrustLocalDevHeaders = isTrustedLocalDevHost(hostname);

  const accessToken = cookieAccessToken ?? (canTrustLocalDevHeaders ? headerAccessToken : null);
  const refreshToken = cookieRefreshToken ?? (canTrustLocalDevHeaders ? headerRefreshToken : null);

  return {
    accessToken,
    refreshToken,
    accessTokenSource: cookieAccessToken ? "cookie" : accessToken ? "trusted-local-dev-header" : null,
    refreshTokenSource: cookieRefreshToken ? "cookie" : refreshToken ? "trusted-local-dev-header" : null,
    canTrustLocalDevHeaders,
    hasSessionCookies: hasSessionCookieValues({
      accessToken: cookieAccessToken,
      refreshToken: cookieRefreshToken,
    }),
    hostname,
  };
}

export function resolveRequireUserRedirectPath(args: ResolveRequireUserRedirectPathArgs) {
  const failure = classifyAuthSessionFailure(args.error);

  if (failure) {
    return buildSessionRecoveryPath(failure.loginErrorCode);
  }

  const hasSessionCookies = "hasSessionCookies" in args.session
    ? args.session.hasSessionCookies
    : hasSessionCookieValues(args.session);

  return hasSessionCookies
    ? buildSessionRecoveryPath()
    : (args.loginPath ?? "/login");
}
