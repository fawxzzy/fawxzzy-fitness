import { NextResponse } from "next/server";
import { setSessionCookies } from "@/lib/auth-session";
import {
  isTrustedLocalDevHostname,
  readConfiguredLocalDevAutoLoginCredentials,
} from "@/lib/local-dev-auto-entry";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function buildRedirectUrl(request: Request, pathname: string) {
  return new URL(pathname, request.url);
}

export async function GET(request: Request) {
  if (!isTrustedLocalDevHostname(new URL(request.url).hostname)) {
    return NextResponse.redirect(buildRedirectUrl(request, "/login?manual=1"));
  }

  const localDevCredentials = readConfiguredLocalDevAutoLoginCredentials();
  if (!localDevCredentials) {
    return NextResponse.redirect(buildRedirectUrl(request, "/login?manual=1"));
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword(localDevCredentials);

  if (error || !data.session) {
    const errorMessage = encodeURIComponent(error?.message ?? "Local dev auto-login failed.");
    return NextResponse.redirect(buildRedirectUrl(request, `/login?localAutoAuth=failed&error=${errorMessage}`));
  }

  const response = NextResponse.redirect(buildRedirectUrl(request, "/entry"));
  setSessionCookies(response.cookies, {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
  });
  return response;
}
