import { NextRequest, NextResponse } from "next/server";
import { EmailOtpType, createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const email = url.searchParams.get("email") ?? "";

  if (tokenHash && type) {
    const supabase = createClient(SUPABASE_URL(), SUPABASE_ANON_KEY());
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
  }

  const redirectTo = new URL("/login", request.url);
  redirectTo.searchParams.set("verified", "1");
  if (email) {
    redirectTo.searchParams.set("email", email);
  }

  return NextResponse.redirect(redirectTo);
}
