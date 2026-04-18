import { NextRequest, NextResponse } from "next/server";
import { EmailOtpType } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function renderRecoveryFragmentBridge(request: NextRequest) {
  const recoveryRedirect = new URL("/reset-password?recovery=1", request.url).toString();
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Redirecting...</title>
  </head>
  <body>
    <script>
      const target = new URL(${JSON.stringify(recoveryRedirect)});
      if (window.location.hash) {
        target.hash = window.location.hash;
      }
      window.location.replace(target.toString());
    </script>
    <noscript>
      <p>Password reset links require JavaScript to finish signing you in.</p>
      <p><a href="${recoveryRedirect}">Continue to reset password</a></p>
    </noscript>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || null;
  const isRecoveryFlow = type === "recovery" || next === "/reset-password" || next?.startsWith("/reset-password?");

  const supabase = supabaseServer();
  const failureRedirect = new URL("/login", request.url);
  failureRedirect.searchParams.set("error", "confirm_failed");
  const recoverySessionMissingRedirect = new URL("/login", request.url);
  recoverySessionMissingRedirect.searchParams.set("error", "recovery_session_missing");
  const confirmedRedirect = new URL("/login", request.url);
  confirmedRedirect.searchParams.set("info", "confirmed");

  let session: { access_token: string; refresh_token: string } | null = null;

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
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

    if (error) {
      console.error("Auth confirm exchangeCodeForSession failed", {
        message: error?.message,
        status: error?.status,
        type,
        next,
      });
      return NextResponse.redirect(failureRedirect);
    }

    session = data.session;
  } else if (isRecoveryFlow) {
    return renderRecoveryFragmentBridge(request);
  } else {
    return NextResponse.redirect(failureRedirect);
  }

  if (isRecoveryFlow && !session) {
    console.error("Auth confirm recovery session missing", {
      tokenHashPresent: Boolean(tokenHash),
      codePresent: Boolean(code),
      type,
      next,
    });
    return NextResponse.redirect(recoverySessionMissingRedirect);
  }

  if (!session) {
    return NextResponse.redirect(confirmedRedirect);
  }

  const redirectPath = isRecoveryFlow ? "/reset-password" : next || "/entry";

  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  response.cookies.set("sb-access-token", session.access_token, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set("sb-refresh-token", session.refresh_token, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
