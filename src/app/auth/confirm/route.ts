import { NextRequest, NextResponse } from "next/server";
import { EmailOtpType, createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const email = url.searchParams.get("email") ?? "";

  let sessionToken: string | null = null;

  if (tokenHash && type) {
    const supabase = createClient(SUPABASE_URL(), SUPABASE_ANON_KEY());
    const { data } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    sessionToken = data.session?.access_token ?? null;
  }

  const redirectPath = type === "recovery" ? "/reset-password" : "/login";
  const redirectTo = new URL(redirectPath, request.url);
  if (type !== "recovery") {
    redirectTo.searchParams.set("verified", "1");
  }
  if (email) {
    redirectTo.searchParams.set("email", email);
  }

  const response = NextResponse.redirect(redirectTo);

  if (sessionToken) {
    response.cookies.set("sb-access-token", sessionToken, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
  }

  return response;
}
