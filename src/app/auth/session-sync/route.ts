import { NextResponse } from "next/server";

type SessionSyncBody = {
  accessToken?: unknown;
  refreshToken?: unknown;
};

function buildResponse() {
  return NextResponse.json({ ok: true });
}

function setSessionCookies(response: NextResponse, session: { accessToken: string; refreshToken: string }) {
  response.cookies.set("sb-access-token", session.accessToken, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  response.cookies.set("sb-refresh-token", session.refreshToken, {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

function clearSessionCookies(response: NextResponse) {
  response.cookies.set("sb-access-token", "", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
  });
  response.cookies.set("sb-refresh-token", "", {
    path: "/",
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: new Date(0),
  });
}

export async function POST(request: Request) {
  let body: SessionSyncBody | null = null;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid session payload." }, { status: 400 });
  }

  const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";
  const refreshToken = typeof body?.refreshToken === "string" ? body.refreshToken.trim() : "";

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ ok: false, error: "Missing session tokens." }, { status: 400 });
  }

  const response = buildResponse();
  setSessionCookies(response, { accessToken, refreshToken });
  return response;
}

export async function DELETE() {
  const response = buildResponse();
  clearSessionCookies(response);
  return response;
}
