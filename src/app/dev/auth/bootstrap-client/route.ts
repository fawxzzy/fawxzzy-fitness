import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function deny(request: NextRequest) {
  return NextResponse.json({ error: "Not found" }, { status: 404, headers: { "cache-control": "no-store" } });
}

function isLocalRequest(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ?? request.headers.get("host") ?? "").trim().toLowerCase();
  const hostname = host.split(":")[0] ?? "";
  return hostname === "127.0.0.1" || hostname === "localhost";
}

function renderBootstrapDocument({
  nextPath,
}: {
  nextPath: string;
}) {
  const safeNextPath = nextPath.startsWith("/") ? nextPath : "/today";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="cache-control" content="no-store" />
    <title>Bootstrapping session</title>
  </head>
  <body>
    <p>Bootstrapping session…</p>
    <script>
      window.setTimeout(() => {
        window.location.replace(${JSON.stringify(safeNextPath)});
      }, 80);
    </script>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production" && !isLocalRequest(request)) {
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

  const response = new NextResponse(renderBootstrapDocument({ nextPath }), {
    status: 200,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
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
