import { NextRequest, NextResponse } from "next/server";
import { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") || null;

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/login?error=confirm_failed", request.url));
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error || !data.session) {
    return NextResponse.redirect(new URL("/login?error=confirm_failed", request.url));
  }

  const redirectPath =
    type === "recovery" ? "/reset-password" : next || (type === "signup" || type === "email" ? "/today" : "/today");

  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  response.cookies.set("sb-access-token", data.session.access_token, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });
  response.cookies.set("sb-refresh-token", data.session.refresh_token, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
  });

  return response;
}
