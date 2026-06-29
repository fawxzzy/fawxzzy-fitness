import { NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/auth-session";
import {
  isTrustedLocalDevHostname,
  type LocalDevAutoLoginAccount,
  readConfiguredLocalDevAutoLoginCredentials,
} from "@/lib/local-dev-auto-entry";
import { isSafeAppPath } from "@/lib/navigation-return";
import { buildRequestScopedUrl } from "@/lib/request-origin";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function buildRedirectUrl(request: Request, pathname: string) {
  return buildRequestScopedUrl(request, pathname);
}

function resolvePreferredLocalDevAccount(request: Request): LocalDevAutoLoginAccount | null {
  const preferredAccount = new URL(request.url).searchParams.get("account")?.trim().toLowerCase();
  if (preferredAccount === "qa" || preferredAccount === "zac") {
    return preferredAccount;
  }

  return null;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const returnTo = isSafeAppPath(requestUrl.searchParams.get("returnTo"))
    ? requestUrl.searchParams.get("returnTo")
    : null;

  const buildLoginHref = (query: string) => {
    const params = new URLSearchParams(query);
    if (returnTo) {
      params.set("returnTo", returnTo);
    }
    return `/login?${params.toString()}`;
  };

  if (!isTrustedLocalDevHostname(new URL(request.url).hostname)) {
    return NextResponse.redirect(buildRedirectUrl(request, buildLoginHref("manual=1")));
  }

  const localDevCredentials = readConfiguredLocalDevAutoLoginCredentials(resolvePreferredLocalDevAccount(request));
  if (!localDevCredentials) {
    return NextResponse.redirect(buildRedirectUrl(request, buildLoginHref("manual=1")));
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword(localDevCredentials);

  if (error || !data.session) {
    const errorMessage = encodeURIComponent(error?.message ?? "Local dev auto-login failed.");
    return NextResponse.redirect(buildRedirectUrl(request, buildLoginHref(`localAutoAuth=failed&error=${errorMessage}`)));
  }

  const response = NextResponse.redirect(buildRedirectUrl(request, returnTo ?? "/entry"));
  setSessionCookies(response.cookies, {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
  return response;
}
