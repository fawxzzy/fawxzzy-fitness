import { NextRequest, NextResponse } from "next/server";
import { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || null;

  const supabase = supabaseServer();
  const failureRedirect = new URL("/login", request.url);
  failureRedirect.searchParams.set("error", "Could not verify your link. Please request a new one.");

  let session: { access_token: string; refresh_token: string } | null = null;

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error || !data.session) {
      console.error("Auth confirm verifyOtp failed", {
        message: error?.message,
        status: error?.status,
        type,
      });
      return NextResponse.redirect(failureRedirect);
    }

    session = data.session;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      console.error("Auth confirm exchangeCodeForSession failed", {
        message: error?.message,
        status: error?.status,
      });
      return NextResponse.redirect(failureRedirect);
    }

    session = data.session;
  } else {
    return NextResponse.redirect(failureRedirect);
  }

  const isRecoveryFlow = type === "recovery" || next === "/reset-password" || next?.startsWith("/reset-password?");
  const redirectPath = isRecoveryFlow ? "/reset-password" : next || "/today";

  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  response.cookies.set("sb-access-token", session.access_token, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });
  response.cookies.set("sb-refresh-token", session.refresh_token, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });

  return response;
}
