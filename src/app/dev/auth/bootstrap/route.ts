import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function deny(request: NextRequest) {
  return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "cache-control": "no-store" } });
}

function getRequestOrigin(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host") ?? "127.0.0.1:3000";
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";
  const safeHost = host.startsWith("0.0.0.0") ? "127.0.0.1:3000" : host;
  return `${protocol}://${safeHost}`;
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return deny(request);
  }

  const url = new URL(request.url);
  const accessToken = url.searchParams.get("access_token")?.trim() ?? "";
  const refreshToken = url.searchParams.get("refresh_token")?.trim() ?? "";
  const nextPath = url.searchParams.get("next")?.trim() || "/today";

  if (!accessToken || !refreshToken) {
    return NextResponse.json(
      { error: "Missing auth tokens." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }

  const redirectTarget = new URL(nextPath.startsWith("/") ? nextPath : "/today", getRequestOrigin(request));
  const response = NextResponse.redirect(redirectTarget, {
    headers: {
      "cache-control": "no-store",
    },
  });

  response.cookies.set("sb-access-token", accessToken, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: false,
  });
  response.cookies.set("sb-refresh-token", refreshToken, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: false,
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
